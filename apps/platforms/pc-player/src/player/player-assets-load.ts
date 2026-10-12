import { getVideoType, isMobile, type VideoType } from "../hook/use-player";

const assetLoadTimeout = 15000;
const assetRetryCount = 1;
const GHY_H265_ASSETS = ["/resource/h265-web/missile.js", "/resource/h265-web/h265webjs-v20221106.js"];
const GHY_JESSIBUCA_ASSETS = ["/resource/jessibuca-sdk/jessibuca.js"];

function withCacheBust(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}cubePlayerRetry=${Date.now()}`;
}

/**
 * 动态创建script标签
 * @param src
 */
async function createScript(src: string): Promise<void> {
  let lastError: Error | null = null;
  for (let retry = 0; retry <= assetRetryCount; retry++) {
    try {
      await appendScript(retry === 0 ? src : withCacheBust(src), src);
      return;
    } catch (error) {
      lastError = error as Error;
    }
  }
  throw lastError ?? new Error(`Failed to load script ${src}`);
}

function appendScript(src: string, assetKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    const cleanup = (): void => {
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
    };
    const fail = (message: string): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      script.remove();
      reject(new Error(message));
    };
    const timer = window.setTimeout(() => {
      fail(`Load script timeout: ${assetKey}`);
    }, assetLoadTimeout);

    script.src = src;
    script.async = true;
    // 首次冷启动（无缓存）时，播放器 SDK 很容易被同一时间触发的其它请求挤占连接/优先级，
    // 导致这个 15s 超时在浏览器真正发起请求前就先触发了，脚本表现为"莫名其妙没加载成功"。
    // 显式标记高优先级，避免它排在无关请求后面。
    (script as HTMLScriptElement & { fetchPriority?: string }).fetchPriority = "high";
    script.dataset.cubePlayerAsset = assetKey;
    script.onload = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };
    script.onerror = (): void => {
      fail(`Load script failed: ${assetKey}`);
    };
    document.body.appendChild(script);
  });
}

/**
 * 动态创建link css 标签
 * @param href
 */
async function createLink(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    let settled = false;
    const cleanup = (): void => {
      window.clearTimeout(timer);
      link.onload = null;
      link.onerror = null;
    };
    const fail = (message: string): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      link.remove();
      reject(new Error(message));
    };
    const timer = window.setTimeout(() => {
      fail(`Load stylesheet timeout: ${href}`);
    }, assetLoadTimeout);

    link.rel = "stylesheet";
    link.href = href;
    link.dataset.cubePlayerAsset = href;
    link.onload = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };
    link.onerror = (): void => {
      fail(`Load stylesheet failed: ${href}`);
    };
    document.head.appendChild(link);
  });
}

const loadHikSDK = async (): Promise<void> => {
  if (!window.JSPlugin) {
    await createScript("/resource/player-hk-sdk/h5player.min.js");
  }
  if (!window.JSPlugin) {
    throw new Error("JSPlugin is not available after SDK load");
  }
};

const loadH265SDK = async (): Promise<void> => {
  if (!window.new265webjs) {
    await createScript("/resource/h265-web/missile.js");
    await createScript("/resource/h265-web/h265webjs-v20221106.js");
  }
  if (!window.new265webjs) {
    throw new Error("new265webjs is not available after SDK load");
  }
};

const loadWvpSDK = async (): Promise<void> => {
  if (!isMobile()) {
    await loadH265SDK();
    return;
  }
  await loadJessibucaSDK();
};

const loadJessibucaSDK = async (): Promise<void> => {
  if (!window.Jessibuca) {
    await createScript("/resource/jessibuca-sdk/jessibuca.js");
  }
  if (!window.Jessibuca) {
    throw new Error("Jessibuca is not available after SDK load");
  }
};

const loadDahuaSDK = async (): Promise<void> => {
  // @ts-ignore
  if (!window.WSPlayer) {
    await Promise.all([createLink("/resource/WSPlayer/player.css"), createLink("/resource/WSPlayer/window.division.css")]);
    await createScript("/resource/WSPlayer/PlaySDKInterface.js");
    await createScript("/resource/WSPlayer/WSPlayer.js");
  }
  // @ts-ignore
  if (!window.WSPlayer) {
    throw new Error("WSPlayer is not available after SDK load");
  }
};

const sdkLoadingMap = new Map<string, Promise<void>>();

const sdkAssetMap: Partial<Record<VideoType, string[]>> = {
  "hikvision-isc": ["/resource/player-hk-sdk/h5player.min.js"],
  ghy: GHY_H265_ASSETS,
  unisinsight: GHY_JESSIBUCA_ASSETS,
  dahua: [
    "/resource/WSPlayer/player.css",
    "/resource/WSPlayer/window.division.css",
    "/resource/WSPlayer/PlaySDKInterface.js",
    "/resource/WSPlayer/WSPlayer.js",
  ],
};

function getGhySdkCacheKey(useJessibuca: boolean): string {
  return useJessibuca ? "ghy:jessibuca" : "ghy:h265";
}

export const loadGhyPlayerSDK = async (useJessibuca: boolean): Promise<void> => {
  const cacheKey = getGhySdkCacheKey(useJessibuca);
  if (sdkLoadingMap.has(cacheKey)) {
    return sdkLoadingMap.get(cacheKey);
  }
  const loaderPromise = (useJessibuca ? loadJessibucaSDK() : loadH265SDK()).catch((error) => {
    sdkLoadingMap.delete(cacheKey);
    throw new Error(`Failed to load ghy SDK: ${(error as Error).message}`);
  });
  sdkLoadingMap.set(cacheKey, loaderPromise);
  return loaderPromise;
};

export const resetPlayerSDK = (type: VideoType): void => {
  sdkLoadingMap.delete(type);
  sdkLoadingMap.delete(getGhySdkCacheKey(true));
  sdkLoadingMap.delete(getGhySdkCacheKey(false));
  sdkAssetMap[type]?.forEach((asset) => {
    document.querySelectorAll(`[data-cube-player-asset="${asset}"]`).forEach((element) => {
      element.remove();
    });
  });
  const globalWindow = window as unknown as Record<string, unknown>;
  if (type === "hikvision-isc") {
    globalWindow.JSPlugin = undefined;
  } else if (type === "ghy") {
    globalWindow.new265webjs = undefined;
    globalWindow.Jessibuca = undefined;
  } else if (type === "unisinsight") {
    globalWindow.Jessibuca = undefined;
  } else if (type === "dahua") {
    globalWindow.WSPlayer = undefined;
  }
};

export const loadPlayerSDK = async (type?: VideoType): Promise<void> => {
  try {
    const videoType = type ?? (await getVideoType());
    const cacheKey = videoType;

    // 如果已经有正在进行的加载，直接返回该Promise
    if (sdkLoadingMap.has(cacheKey)) {
      return sdkLoadingMap.get(cacheKey);
    }

    const loaders = {
      "hikvision-isc": async (): Promise<void> => loadHikSDK(),
      ghy: async (): Promise<void> => loadWvpSDK(),
      unisinsight: async (): Promise<void> => loadJessibucaSDK(),
      dahua: async (): Promise<void> => loadDahuaSDK(),
    };

    if (videoType in loaders) {
      const loaderPromise = loaders[videoType as keyof typeof loaders]().catch((error) => {
        // 加载失败时从缓存中移除
        sdkLoadingMap.delete(cacheKey);
        throw new Error(`Failed to load ${videoType} SDK: ${error.message}`);
      });

      // 缓存Promise
      sdkLoadingMap.set(cacheKey, loaderPromise);

      return loaderPromise;
    }
  } catch (error) {
    return Promise.reject(error);
  }
};
