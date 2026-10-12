/**
 * 分阶段 `dev:full`：
 * 1) 先起 shell + chrome 首屏硬依赖（含 authClient）
 * 2) 等端口 ready 并预热 remote / TopBar 变换
 * 3) 再起其余 remote，且限制并发，避免 domain optimizeDeps 饿死壳
 *
 * 根因：全量并发冷启动时，已登录路径 `runPlatformInstalls(authenticated chrome)`
 * 会因 pcChrome→antd 与几十个 Vite 抢 CPU，180s 超时「启动失败」。
 */
import { spawn, type ChildProcess } from "node:child_process";

import { CHROME_BOOTSTRAP_PORTS } from "../dev-filter/packages";

const PROFILE = process.argv[2] ?? "deploy/compositions/prod.pc.yaml";
const READY_TIMEOUT_MS = 180_000;
const READY_POLL_MS = 1_000;

function turboFilters(mode: "chrome" | "rest"): string[] {
  const out = Bun.spawnSync(["bun", "tooling/dev-filter/cli.ts", PROFILE, `--mode=${mode}`], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });
  if (out.exitCode !== 0) {
    throw new Error(`dev-filter ${mode} failed: ${out.stderr.toString() || out.stdout.toString()}`);
  }
  const raw = out.stdout.toString().trim();
  return raw ? raw.split(/\s+/).filter(Boolean) : [];
}

function startTurbo(label: string, filters: string[]): ChildProcess {
  if (filters.length === 0) {
    throw new Error(`no turbo filters for ${label}`);
  }
  // persistent `dev` 任务要求 concurrency ≥ 任务数；不能靠降 concurrency 限流。
  console.log(`[dev:full] stage ${label}: turbo run dev ${filters.join(" ")}`);
  const child = spawn("bunx", ["turbo", "run", "dev", ...filters, "--concurrency", String(filters.length + 1)], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      // Agent/低 inotify 环境：让 @g2-tooling/mf-vite 打开 Vite usePolling，避免 EMFILE
      G2_VITE_USE_POLLING: process.env.G2_VITE_USE_POLLING ?? "1",
    },
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[dev:full] stage ${label} exited by signal ${signal}`);
      return;
    }
    if (code && code !== 0) {
      console.error(`[dev:full] stage ${label} exited with code ${code}`);
    }
  });
  return child;
}

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function probePort(port: number, probePath: string): Promise<boolean> {
  // macOS 上偶发仅 IPv6 listen；127.0.0.1 / localhost 都试一次
  return (await probe(`http://127.0.0.1:${port}${probePath}`)) || (await probe(`http://localhost:${port}${probePath}`));
}

async function waitForChromeReady(): Promise<void> {
  const startedAt = Date.now();
  console.log("[dev:full] waiting for chrome-critical ports…");
  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    const results = await Promise.all(
      CHROME_BOOTSTRAP_PORTS.map(async ({ packageName, port, probePath }) => {
        const ok = await probePort(port, probePath);
        return { packageName, port, ok };
      }),
    );
    const pending = results.filter((item) => !item.ok);
    if (pending.length === 0) {
      console.log(`[dev:full] chrome-critical ready in ${Date.now() - startedAt}ms`);
      return;
    }
    if ((Date.now() - startedAt) % 10_000 < READY_POLL_MS) {
      console.log(
        `[dev:full] still waiting (${Date.now() - startedAt}ms): ${pending.map((item) => `${item.packageName}:${item.port}`).join(", ")}`,
      );
    }
    await Bun.sleep(READY_POLL_MS);
  }
  throw new Error(`chrome-critical remotes not ready within ${READY_TIMEOUT_MS}ms`);
}

async function warmChromeRemotes(): Promise<void> {
  const urls = [
    "http://127.0.0.1:5011/remoteEntry.js",
    "http://127.0.0.1:5011/src/platform.ts",
    "http://127.0.0.1:5011/src/components/TopBar.tsx",
    "http://127.0.0.1:5011/src/components/SideMenu.tsx",
    "http://127.0.0.1:5010/remoteEntry.js",
    "http://127.0.0.1:5010/src/platform.ts",
    "http://127.0.0.1:5015/remoteEntry.js",
    "http://127.0.0.1:5017/remoteEntry.js",
    "http://127.0.0.1:5018/remoteEntry.js",
    "http://127.0.0.1:5019/remoteEntry.js",
    "http://127.0.0.1:5016/remoteEntry.js",
    "http://127.0.0.1:5021/remoteEntry.js",
  ];
  console.log("[dev:full] warming chrome remotes…");
  for (const url of urls) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      console.log(`[dev:full] warm ${res.status} ${Date.now() - t0}ms ${url}`);
    } catch (error) {
      console.warn(`[dev:full] warm failed ${url}: ${String(error)}`);
    }
  }
}

function forwardSignals(children: ChildProcess[]): void {
  const stop = (signal: NodeJS.Signals) => {
    for (const child of children) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  };
  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));
}

const chromeFilters = turboFilters("chrome");
const restFilters = turboFilters("rest");

const stage1 = startTurbo("chrome", chromeFilters);
forwardSignals([stage1]);

try {
  await waitForChromeReady();
  await warmChromeRemotes();
} catch (error) {
  console.error(`[dev:full] ${String(error)}`);
  stage1.kill("SIGTERM");
  process.exit(1);
}

console.log("[dev:full] shell ready → http://localhost:5100 （可先打开；其余 remote 后台继续起）");

const stage2 = restFilters.length > 0 ? startTurbo("rest", restFilters) : null;
if (stage2) {
  forwardSignals([stage1, stage2]);
}

const exitCodes = await Promise.all([
  new Promise<number>((resolve) => stage1.on("exit", (code) => resolve(code ?? 1))),
  stage2 ? new Promise<number>((resolve) => stage2.on("exit", (code) => resolve(code ?? 1))) : Promise.resolve(0),
]);

process.exit(exitCodes.some((code) => code !== 0) ? 1 : 0);
