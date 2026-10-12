/**
 * 壳层 public 托管的 Cube SVG Symbol 地址（与 apps/shells/pc/public/cube-icon/iconfont.js 对齐）。
 * 主路径应由壳启动时注入；域侧仅作兜底，禁止 resolveStaticResourceUrl / CDN。
 */
export const DEFAULT_CUBE_ICONFONT_URL = "/cube-icon/iconfont.js";

const ICONFONT_SCRIPT_SELECTOR = "script[data-cube-iconfont]";
/** iconfont.js 注入的隐藏 SVG 精灵（含 symbol）。 */
const ICONFONT_SPRITE_SELECTOR = 'svg[aria-hidden="true"] symbol';

let loadingPromise: Promise<void> | undefined;
let symbolsReady = false;
const readyWaiters: Array<() => void> = [];

export interface LoadCubeIconfontOptions {
  /** 脚本地址；默认壳同源 `/cube-icon/iconfont.js`。 */
  scriptUrl?: string;
  /** 是否附带时间戳绕过缓存。默认开启。 */
  cacheBust?: boolean;
}

function markSymbolsReady(): void {
  if (symbolsReady) {
    return;
  }
  symbolsReady = true;
  while (readyWaiters.length > 0) {
    readyWaiters.shift()?.();
  }
}

/**
 * 等精灵进 DOM。壳可能已注入；此处轮询 DOM，不依赖本模块是否发起过 load。
 */
export function whenCubeIconfontReady(timeoutMs = 5000): Promise<void> {
  if (typeof document === "undefined") {
    return Promise.resolve();
  }
  if (symbolsReady || document.querySelector(ICONFONT_SPRITE_SELECTOR)) {
    markSymbolsReady();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    readyWaiters.push(resolve);
    const startedAt = Date.now();
    const tick = (): void => {
      if (symbolsReady) {
        return;
      }
      if (document.querySelector(ICONFONT_SPRITE_SELECTOR)) {
        markSymbolsReady();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        // 超时解除等待，避免卡片永久不挂 <use>
        const idx = readyWaiters.indexOf(resolve);
        if (idx >= 0) {
          readyWaiters.splice(idx, 1);
        }
        resolve();
        return;
      }
      window.setTimeout(tick, 16);
    };
    window.setTimeout(tick, 0);
  });
}

function waitForSymbolsInjected(timeoutMs = 5000): Promise<void> {
  return whenCubeIconfontReady(timeoutMs);
}

function waitForScript(script: HTMLScriptElement): Promise<void> {
  if (script.dataset.cubeIconfontState === "loaded") {
    return waitForSymbolsInjected();
  }
  if (script.dataset.cubeIconfontState === "error") {
    return Promise.reject(new Error(`加载 Cube Iconfont 失败：${script.src}`));
  }

  return new Promise((resolve, reject) => {
    const handleLoad = (): void => {
      script.dataset.cubeIconfontState = "loaded";
      void waitForSymbolsInjected().then(resolve);
    };
    const handleError = (): void => {
      script.dataset.cubeIconfontState = "error";
      reject(new Error(`加载 Cube Iconfont 失败：${script.src}`));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
  });
}

/**
 * 兜底加载（正常由壳启动注入）。同源 `/cube-icon/iconfont.js`，与壳共用 data-cube-iconfont 去重。
 */
export function loadCubeIconfont(options: LoadCubeIconfontOptions = {}): Promise<void> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return Promise.resolve();
  }

  if (document.querySelector(ICONFONT_SPRITE_SELECTOR)) {
    markSymbolsReady();
    return Promise.resolve();
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  const existingScript = document.querySelector<HTMLScriptElement>(ICONFONT_SCRIPT_SELECTOR);
  if (existingScript) {
    loadingPromise = waitForScript(existingScript);
    return loadingPromise;
  }

  const scriptUrl = options.scriptUrl ?? DEFAULT_CUBE_ICONFONT_URL;
  const resourceUrl = new URL(scriptUrl, window.location.href);
  if (options.cacheBust !== false) {
    resourceUrl.searchParams.set("t", String(Date.now()));
  }

  const script = document.createElement("script");
  script.dataset.cubeIconfont = "true";
  script.dataset.cubeIconfontState = "loading";
  script.src = resourceUrl.href;

  loadingPromise = waitForScript(script).catch((error: unknown) => {
    loadingPromise = undefined;
    script.remove();
    throw error;
  });
  document.head.appendChild(script);
  return loadingPromise;
}
