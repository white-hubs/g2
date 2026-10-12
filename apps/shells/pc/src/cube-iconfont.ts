/**
 * 壳层托管的 Cube SVG Symbol 精灵（public/cube-icon/iconfont.js）。
 * G2 单 document：主应用启动时注入一次，域内 CubeIcon 只消费 `#icon-*`。
 * 勿经 resolveStaticResourceUrl / CDN（现网 CDN 无此文件）。
 */
export const SHELL_CUBE_ICONFONT_URL = "/cube-icon/iconfont.js";

const SCRIPT_SELECTOR = "script[data-cube-iconfont]";
const SPRITE_SELECTOR = 'svg[aria-hidden="true"] symbol';

function waitForSymbols(timeoutMs = 5000): Promise<void> {
  if (typeof document === "undefined") {
    return Promise.resolve();
  }
  if (document.querySelector(SPRITE_SELECTOR)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = (): void => {
      if (document.querySelector(SPRITE_SELECTOR)) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        resolve();
        return;
      }
      window.setTimeout(tick, 16);
    };
    // iconfont.js 在 script load 后 setTimeout(0) 才写 SVG
    window.setTimeout(tick, 0);
  });
}

/**
 * 在壳 document 注入 iconfont 精灵；与域侧 loader 共用 data-cube-iconfont 去重。
 */
export function loadShellCubeIconfont(): Promise<void> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return Promise.resolve();
  }
  if (document.querySelector(SPRITE_SELECTOR)) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
  if (existing) {
    if (existing.dataset.cubeIconfontState === "loaded") {
      return waitForSymbols();
    }
    return new Promise((resolve, reject) => {
      existing.addEventListener(
        "load",
        () => {
          existing.dataset.cubeIconfontState = "loaded";
          void waitForSymbols().then(resolve);
        },
        { once: true },
      );
      existing.addEventListener("error", () => reject(new Error(`加载壳层 Cube Iconfont 失败：${existing.src}`)), { once: true });
    });
  }

  const script = document.createElement("script");
  script.dataset.cubeIconfont = "true";
  script.dataset.cubeIconfontState = "loading";
  script.src = new URL(SHELL_CUBE_ICONFONT_URL, window.location.href).href;

  const done = new Promise<void>((resolve, reject) => {
    script.addEventListener(
      "load",
      () => {
        script.dataset.cubeIconfontState = "loaded";
        void waitForSymbols().then(resolve);
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        script.dataset.cubeIconfontState = "error";
        script.remove();
        reject(new Error(`加载壳层 Cube Iconfont 失败：${script.src}`));
      },
      { once: true },
    );
  });
  document.head.appendChild(script);
  return done;
}
