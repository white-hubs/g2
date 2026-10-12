import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";

import {
  type MfRuntimeConfig,
  bundleMfRuntimeToFile,
  isMfRuntimeModuleId,
  mfRuntimeObjectKey,
  mfRuntimePublicPath,
  mfRuntimePublicUrl,
  readMfRuntimeNpmVersion,
  resolveMfRuntimeBaseUrl,
  resolveMfRuntimeMode,
} from "./mf-runtime.ts";

function corsJsHeaders(res: { setHeader: (k: string, v: string) => void }): void {
  res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
}

/** Host (shell): emit + serve `/_mf/runtime/{ver}/mf-runtime.js` (CDN-isomorphic path). */
export function mfRuntimeHostPlugin(_config: Pick<MfRuntimeConfig, "baseUrl"> = {}): Plugin {
  const version = readMfRuntimeNpmVersion();
  const objectKey = mfRuntimeObjectKey(version);
  const publicPath = mfRuntimePublicPath(version);
  let bytes: Buffer | undefined;

  return {
    name: "g2-mf-runtime-host",
    buildStart() {
      const tmp = join(process.cwd(), "node_modules/.cache", objectKey);
      mkdirSync(dirname(tmp), { recursive: true });
      bundleMfRuntimeToFile(tmp);
      bytes = readFileSync(tmp);
    },
    generateBundle() {
      if (!bytes) {
        return;
      }
      this.emitFile({
        type: "asset",
        fileName: objectKey,
        source: bytes,
      });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== publicPath) {
          return next();
        }
        if (!bytes) {
          res.statusCode = 503;
          res.end("mf-runtime not ready");
          return;
        }
        res.statusCode = 200;
        corsJsHeaders(res);
        res.end(bytes);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== publicPath) {
          return next();
        }
        try {
          const body = readFileSync(join(process.cwd(), "dist", objectKey));
          res.statusCode = 200;
          corsJsHeaders(res);
          res.end(body);
        } catch {
          next();
        }
      });
    },
  };
}

/** Remote: external `@module-federation/runtime` to the shared absolute URL. */
export function mfRuntimeRemoteExternalPlugin(config: Pick<MfRuntimeConfig, "baseUrl"> = {}): Plugin {
  const url = mfRuntimePublicUrl(resolveMfRuntimeBaseUrl(config.baseUrl));
  return {
    name: "g2-mf-runtime-remote-external",
    enforce: "pre",
    resolveId(id) {
      if (!isMfRuntimeModuleId(id)) {
        return null;
      }
      return { id: url, external: true };
    },
  };
}

export function mfRuntimePlugins(config: MfRuntimeConfig): Plugin[] {
  if (config.role === "host") {
    return [mfRuntimeHostPlugin({ baseUrl: config.baseUrl })];
  }
  if (resolveMfRuntimeMode(config.mode) === "bundled") {
    return [];
  }
  return [mfRuntimeRemoteExternalPlugin({ baseUrl: config.baseUrl })];
}

/** Ensure a local file exists for release upload. */
export function materializeMfRuntimeArtifact(outFile: string): { version: string; objectKey: string } {
  const version = readMfRuntimeNpmVersion();
  const objectKey = mfRuntimeObjectKey(version);
  bundleMfRuntimeToFile(outFile);
  return { version, objectKey };
}
