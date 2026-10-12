import { federation } from "@g2-tooling/mf-vite";
import tailwindcss from "@tailwindcss/vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type Connect, type Plugin, defineConfig, loadEnv } from "vite";

import { createLocalDevState } from "./dev-server";
import { createRemoteVerifyProxy } from "./src/dev-api-proxy";
import { createLocalBffRuntime } from "./src/local-bff";

const REPO_ROOT = resolve(__dirname, "../../..");

const COMPOSITION_ROUTES: Record<string, string> = {
  "/compositions/dev.resolved.json": resolve(REPO_ROOT, "deploy/compositions/.resolved/dev.pc.resolved.json"),
  "/compositions/prod.resolved.json": resolve(REPO_ROOT, ".deploy-out/prod/resolved.json"),
};

function serveResolvedProfiles(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url?.split("?")[0];
    if (!url || !(url in COMPOSITION_ROUTES)) {
      return next();
    }
    try {
      const body = readFileSync(COMPOSITION_ROUTES[url], "utf8");
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end(`resolved profile not found: ${url}`);
    }
  };
}

function resolvedProfilePlugin(devState: ReturnType<typeof createLocalDevState>): Plugin {
  return {
    name: "g2-compositions-resolved-profile",
    async configureServer(server) {
      await devState.fetchProfile();
      server.middlewares.use((req, res, next) => void devState.middleware(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveResolvedProfiles());
    },
  };
}

/**
 * 开发期把真实业务接口代理到 cube-test 验证环境，用于对照 UI 还原度（截图比对/联调）。
 * `changeOrigin: true` + `secure: false` 让浏览器发往 `http://localhost:5100/api/...` 的请求
 * 被 Vite dev server 原样转发到远端 `https://cube-test.guhecloud.com:3000/api/...`（服务端转发，
 * 不受浏览器同源限制，也不需要远端开 CORS）。只代理已知的后端接口前缀，不代理整站（避免把我们自己
 * 开发中的前端资源误代理出去）。仅用于本地开发验证，不影响生产构建（`build` 不会打包这段 server 配置）。
 */
function workspaceAliasPlugin(aliases: { find: RegExp; replacement: string }[]): Plugin {
  return {
    name: "g2-dev-workspace-aliases",
    enforce: "pre",
    apply: "serve",
    resolveId(source) {
      const alias = aliases.find(({ find }) => find.test(source));
      return alias ? alias.replacement : undefined;
    },
  };
}

export default defineConfig(async ({ mode, command }) => {
  const env = loadEnv(mode, __dirname, "");
  const environmentName = env.G2_DEV_ENV_NAME || "test";
  const apiTarget = env.G2_DEV_API_TARGET || "https://cube-test.guhecloud.com:3000";
  const localBff = command === "serve" ? await createLocalBffRuntime(apiTarget, REPO_ROOT) : undefined;
  const localDevMode = env.G2_DEV_PROFILE_URL ? "g2-profile" : "legacy-compat";
  // The default test environment is still qiankun based. Its complete MF
  // inventory is generated locally; explicitly configured Profiles are fetched
  // and validated at startup instead of silently falling back.
  const profileUrl =
    localDevMode === "legacy-compat" ? resolve(REPO_ROOT, "deploy/compositions/.resolved/dev.pc.resolved.json") : env.G2_DEV_PROFILE_URL!;
  const shellPort = Number(process.env.G2_DEV_SHELL_PORT || 5100);
  const shellOrigin = process.env.G2_DEV_ORIGIN || `http://localhost:${shellPort}`;
  const allowProduction = env.G2_DEV_ALLOW_PRODUCTION === "1";
  const allowLan = env.G2_DEV_ALLOW_LAN === "1";
  if (command === "serve" && /(^|[-_.])prod(uction)?($|[-_.])/iu.test(environmentName) && !allowProduction) {
    throw new Error("Refusing to connect local development to production. Set G2_DEV_ALLOW_PRODUCTION=1 to override.");
  }
  const devState = createLocalDevState({ profileUrl, environmentName, apiTarget, mode: localDevMode, allowLan });
  const devWorkspaceAliases =
    command === "serve"
      ? [
          { find: /^@g2-platform\/pc-ui\/style$/u, replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/src/style.ts") },
          { find: /^@g2-platform\/pc-ui\/message$/u, replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/src/message.ts") },
          { find: /^@g2-platform\/pc-ui$/u, replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/src/index.ts") },
          { find: /^@g2-platform\/http\/client$/u, replacement: resolve(REPO_ROOT, "apps/platforms/http/src/platform.ts") },
          { find: /^@g2-platform\/http$/u, replacement: resolve(REPO_ROOT, "apps/platforms/http/src/platform.ts") },
          { find: /^@g2-platform\/date\/api$/u, replacement: resolve(REPO_ROOT, "apps/platforms/date/src/index.ts") },
        ]
      : undefined;
  // `pcScada` declares its vendored `@cube-scada/*` aliases in its own Vite config
  // (ADR-0061). Loading its source from this Shell needs the same mapping.
  const devScadaVendorAliases = ["core", "elements", "engine", "renderer", "runtime"].map((name) => ({
    find: new RegExp(`^@cube-scada/${name}$`, "u"),
    replacement: resolve(REPO_ROOT, `apps/platforms/pc-scada/vendor/${name}`),
  }));
  // Dependencies owned by a workspace Platform whose source this Shell serves. They live
  // under that Platform's `node_modules`, which the Shell root cannot resolve.
  // These stay out of `workspaceAliasPlugin`: that plugin returns a final resolved id and
  // would bypass dependency pre-bundling, which `jspdf` needs (see `optimizeDeps.include`).
  // Dayjs is an exception: its CJS entry cannot provide the default export when a linked
  // workspace source is served directly, so use its published ESM modules in local mode.
  const devPackageAliases =
    command === "serve"
      ? [
          { find: /^jspdf$/u, replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/jspdf/dist/jspdf.es.min.js") },
          { find: /^qrcode$/u, replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/qrcode/lib/browser.js") },
          { find: /^crypto-js$/u, replacement: resolve(REPO_ROOT, "apps/platforms/pc-auth/node_modules/crypto-js/index.js") },
          {
            find: /^@amap\/amap-jsapi-loader$/u,
            replacement: resolve(REPO_ROOT, "apps/platforms/pc-map/node_modules/@amap/amap-jsapi-loader/dist/index.js"),
          },
          {
            find: /^@isvend\/coord-transform$/u,
            replacement: resolve(REPO_ROOT, "apps/platforms/pc-map/node_modules/@isvend/coord-transform/dist/index.js"),
          },
          { find: /^leaflet$/u, replacement: resolve(REPO_ROOT, "apps/platforms/pc-map/node_modules/leaflet/dist/leaflet-src.js") },
          { find: /^dayjs$/u, replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/dayjs/esm/index.js") },
          {
            find: /^dayjs\/plugin\/advancedFormat$/u,
            replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/dayjs/esm/plugin/advancedFormat/index.js"),
          },
          {
            find: /^dayjs\/plugin\/customParseFormat$/u,
            replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/dayjs/esm/plugin/customParseFormat/index.js"),
          },
          {
            find: /^dayjs\/plugin\/localeData$/u,
            replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/dayjs/esm/plugin/localeData/index.js"),
          },
          {
            find: /^dayjs\/plugin\/quarterOfYear$/u,
            replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/dayjs/esm/plugin/quarterOfYear/index.js"),
          },
          {
            find: /^dayjs\/plugin\/weekday$/u,
            replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/dayjs/esm/plugin/weekday/index.js"),
          },
          {
            find: /^dayjs\/plugin\/weekOfYear$/u,
            replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/dayjs/esm/plugin/weekOfYear/index.js"),
          },
          {
            find: /^dayjs\/plugin\/weekYear$/u,
            replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/dayjs/esm/plugin/weekYear/index.js"),
          },
          {
            find: /^dayjs\/locale\/zh-cn$/u,
            replacement: resolve(REPO_ROOT, "apps/platforms/pc-ui/node_modules/dayjs/esm/locale/zh-cn.js"),
          },
          { find: /^@cube-scada\/studio-sdk$/u, replacement: resolve(REPO_ROOT, "apps/platforms/pc-scada/src/studio-sdk") },
          ...devScadaVendorAliases,
        ]
      : [];
  if (command === "serve") {
    console.log(`[g2-dev] environment=${environmentName}`);
    console.log(`[g2-dev] mode=${localDevMode}`);
    console.log(`[g2-dev] profile=${profileUrl}`);
    console.log(`[g2-dev] api=${apiTarget}`);
    console.log(`[g2-dev] allowLan=${allowLan ? "1" : "0"}`);
    if (localDevMode === "legacy-compat") {
      console.log("[g2-dev] unstarted applications use target environment legacy entries");
    }
  }
  return {
    server: {
      host: true,
      port: shellPort,
      strictPort: true,
      origin: shellOrigin,
      fs: { allow: [resolve(__dirname, "../../..")] },
      proxy: createRemoteVerifyProxy(apiTarget, localBff?.target),
    },
    // Same API proxies as `server` so `vite preview` can exercise login → workbench like `dev`.
    preview: {
      host: true,
      port: 5100,
      strictPort: true,
      proxy: createRemoteVerifyProxy(apiTarget, localBff?.target),
    },
    resolve: devWorkspaceAliases ? { alias: [...devWorkspaceAliases, ...devPackageAliases] } : undefined,
    // Loading a workspace Platform after bootstrap makes Vite 8 discover a new
    // dependency graph. Its optimizer can monopolize the server process before
    // it replies to that module request, leaving the Shell on its loading view.
    // Development intentionally serves those dependencies on demand; builds
    // retain Vite's default optimizer behaviour.
    optimizeDeps:
      command === "serve"
        ? {
            noDiscovery: true,
            // `noDiscovery` also disables the CommonJS→ESM interop wrapper for
            // anything Vite has not prebundled: such a dependency is served as
            // raw `require()` source and its importer fails to link. Every
            // dependency whose own graph reaches CommonJS must be listed here.
            // `qiankun` reaches `lodash/*.js`; `jspdf` reaches `canvg`, which
            // reaches `raf` and `rgbcolor`.
            include: [
              "@module-federation/enhanced/runtime",
              "@babel/runtime/regenerator",
              "qiankun",
              "jspdf",
              "qrcode",
              "crypto-js",
              "@amap/amap-jsapi-loader",
              "@isvend/coord-transform",
              "leaflet",
            ],
            needsInterop: ["qrcode", "crypto-js", "@amap/amap-jsapi-loader", "@isvend/coord-transform", "leaflet"],
          }
        : undefined,
    build: { target: "chrome89", modulePreload: false },
    plugins: [
      ...(localBff ? [localBff.plugin] : []),
      resolvedProfilePlugin(devState),
      ...(devWorkspaceAliases ? [workspaceAliasPlugin(devWorkspaceAliases)] : []),
      {
        name: "g2-local-remote-reload",
        apply: "serve",
        transformIndexHtml() {
          return [
            {
              tag: "script",
              children: `
            (function () {
              var h = null;
              Object.defineProperty(globalThis, '__VUE_HMR_RUNTIME__', {
                get: function () { return h; },
                set: function (v) { if (h === null) h = v; },
                configurable: true,
                enumerable: true,
              });
            })();
          `,
              injectTo: "head-prepend",
            },
            {
              tag: "script",
              children: `
            globalThis.__G2_DEV_WORKSPACE_ROOT__=${JSON.stringify(REPO_ROOT)};
            new EventSource('/__g2_dev/events').addEventListener('changed',()=>location.reload());
            fetch('/__g2_dev/remotes').then(r=>r.json()).then(({remotes=[]})=>Promise.all(remotes.map(async ({manifestUrl})=>{
              try {
                const metadata=await fetch(new URL('/__mf_hmr',manifestUrl)).then(r=>r.ok?r.json():null);
                if(!metadata || !metadata.wsUrl) return;
                const socket=new WebSocket(metadata.wsUrl,'vite-hmr');
                socket.addEventListener('message',({data})=>{try{const m=JSON.parse(data);if(m.type==='custom'&&m.event==='mf:remote-update')window.dispatchEvent(new CustomEvent('__g2_dev_remote_update'))}catch{}});
              } catch {}
            }))).catch(()=>{});
          `,
            },
          ];
        },
      },
      vueJsx(),
      tailwindcss(),
      federation({
        name: "shellPc",
        remotes: {},
        // 仅包装 HTML 中的真实入口；热重载先请求 workspace 库时，不能把库误当成无导出的启动脚本。
        hostInitInjectLocation: "entry",
        // The Shell is a host and exposes no contract. Its federation declaration
        // child compiler has no output to produce and can otherwise keep builds open.
        dts: false,
        dev: { remoteHmr: true, disableDynamicRemoteTypeHints: true },
        mfRuntime: { role: "host", baseUrl: shellOrigin },
        shared: {
          vue: { singleton: true },
          "vue-router": { singleton: true },
          pinia: { singleton: true },
        },
      }),
    ],
  };
});
