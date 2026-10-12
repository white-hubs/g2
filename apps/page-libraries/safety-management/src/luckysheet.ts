type LuckysheetWindow = Window & {
  $?: unknown;
  jQuery?: unknown;
  luckysheet?: {
    create: (options: Record<string, unknown>) => void;
    destroy?: () => void;
    getAllSheets: () => unknown[];
    setCellValue?: (row: number, column: number, value: unknown) => void;
  };
};

const assetBases = ["/excle", "/resource/v1/safety-supervision/excle"];
let loader: Promise<void> | undefined;

function global(): LuckysheetWindow {
  return window as LuckysheetWindow;
}

function script(src: string, patchPlugin = false): Promise<void> {
  const selector = `script[data-safety-luckysheet="${src}"]`;
  const existing = document.querySelector<HTMLScriptElement>(selector);
  if (existing?.dataset.loaded === "true") {
    return Promise.resolve();
  }
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`加载 ${src} 失败`)), { once: true });
    });
  }
  return fetch(src, { cache: "force-cache" }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`加载 ${src} 失败（${response.status}）`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    const source = await response.text();
    if (contentType.includes("text/html") || /^\s*</u.test(source)) {
      throw new Error(`加载 ${src} 返回了 HTML 页面`);
    }
    const node = document.createElement("script");
    node.dataset.safetyLuckysheet = src;
    node.text = patchPlugin ? source.replaceAll("window.(function(){})", "window.console.log") : source;
    document.head.append(node);
    node.dataset.loaded = "true";
  });
}

async function loadFromBases(path: string, ready: () => boolean, patchPlugin = false): Promise<void> {
  let lastError: unknown;
  for (const base of assetBases) {
    try {
      await script(`${base}${path}`, patchPlugin);
      if (ready()) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`加载 ${path} 失败`);
}

export async function loadLuckysheet(): Promise<NonNullable<LuckysheetWindow["luckysheet"]>> {
  const value = global();
  if (value.luckysheet && (value.$ || value.jQuery)) {
    return value.luckysheet;
  }
  loader ??= (async () => {
    if (!global().$ && !global().jQuery) {
      await loadFromBases("/plugins/js/plugin.js", () => Boolean(global().$ || global().jQuery), true);
    }
    global().$ ??= global().jQuery;
    global().jQuery ??= global().$;
    if (!global().luckysheet) {
      await loadFromBases("/luckysheet.umd.js", () => Boolean(global().luckysheet));
    }
  })();
  await loader;
  const luckysheet = global().luckysheet;
  if (!luckysheet) {
    throw new Error("Luckysheet 初始化失败");
  }
  return luckysheet;
}
