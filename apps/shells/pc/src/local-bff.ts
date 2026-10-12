import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";

const DEFAULT_LOCAL_BFF_PORT = 3031;

export interface LocalBffRuntime {
  plugin: Plugin;
  target: string;
}

interface DevServerLifecycle {
  once(event: "close" | "error", listener: () => void): unknown;
}

/**
 * Vite 在监听端口失败时不会触发 `close`；同时监听 error，避免已拉起的本地 BFF 成为孤儿进程。
 */
export function bindLocalBffLifecycle(server: DevServerLifecycle | null | undefined, stop: () => void): void {
  server?.once("close", stop);
  server?.once("error", stop);
}

export function createLocalBffEnvironment(apiTarget: string, port: number): Record<string, string> {
  const gateway = apiTarget.replace(/\/+$/u, "");
  return {
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    DISPATCH_URL: `${gateway}/api/dispatch`,
    FUSION_COMMUNICATE_URL: `${gateway}/api/fusion-communicate`,
    OUAA_URL: `${gateway}/api/ouaa`,
    FILE_SERVICE_URL: `${gateway}/api/file`,
    EMERGENCY_URL: `${gateway}/api/emergency`,
    SECURITY_MANAGEMENT_URL: `${gateway}/api/securitymanagement`,
    // 安全教育上游路径自身已带 `/api/safety-education`，这里必须使用网关根地址。
    SECURE_EDU_URL: gateway,
  };
}

export async function createLocalBffRuntime(apiTarget: string, repoRoot: string): Promise<LocalBffRuntime> {
  const requestedPort = Number(process.env.G2_DEV_BFF_PORT || DEFAULT_LOCAL_BFF_PORT);
  const port = await findAvailablePort(requestedPort);
  const target = `http://127.0.0.1:${port}`;
  let child: ChildProcess | undefined;
  let stopping = false;

  async function start(server: ViteDevServer | PreviewServer): Promise<void> {
    if (child) {
      return;
    }

    child = spawn("bun", ["src/main.ts", `--port=${port}`, "--hostname=127.0.0.1"], {
      cwd: resolve(repoRoot, "bff"),
      detached: true,
      env: { ...process.env, ...createLocalBffEnvironment(apiTarget, port) },
      stdio: "inherit",
    });
    child.once("exit", (code, signal) => {
      if (!stopping) {
        console.error(`[g2-dev] local BFF stopped unexpectedly (code=${String(code)}, signal=${String(signal)})`);
      }
    });

    try {
      await waitUntilHealthy(`${target}/health/`, child);
    } catch (error) {
      stop();
      throw error;
    }

    console.log(`[g2-dev] local migration BFF: ${target} -> ${apiTarget}`);
    bindLocalBffLifecycle(server.httpServer, stop);
  }

  function stop(): void {
    if (stopping) {
      return;
    }
    stopping = true;
    const processToStop = child;
    child = undefined;
    if (!processToStop || processToStop.exitCode !== null || processToStop.pid === undefined) {
      return;
    }
    try {
      process.kill(-processToStop.pid, "SIGTERM");
    } catch {
      processToStop.kill("SIGTERM");
    }
  }

  return {
    target,
    plugin: {
      name: "g2-local-migration-bff",
      apply: "serve",
      configureServer: start,
      configurePreviewServer: start,
      closeBundle: stop,
    },
  };
}

async function findAvailablePort(preferredPort: number): Promise<number> {
  for (let port = preferredPort; port < preferredPort + 100; port += 1) {
    const available = await new Promise<boolean>((done) => {
      const server = createServer();
      server.once("error", () => done(false));
      server.listen(port, "127.0.0.1", () => server.close(() => done(true)));
    });
    if (available) {
      return port;
    }
  }
  throw new Error(`no local BFF port available between ${preferredPort} and ${preferredPort + 99}`);
}

async function waitUntilHealthy(url: string, processToWatch: ChildProcess): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (processToWatch.exitCode !== null) {
      throw new Error(`local BFF exited before becoming healthy (exit ${String(processToWatch.exitCode)})`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // The BFF is still starting.
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`timed out waiting for local BFF health check: ${url}`);
}
