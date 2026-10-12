import { isMobile, type H5sParams } from "../hook/use-player";
import { ErrorType } from "./player-core";
// @ts-expect-error
import { H5sPlayerWS, H5sPlayerRTC } from "../lib/h5s-player/h5s-player.js";
import { loadGhyPlayerSDK, loadPlayerSDK } from "./player-assets-load.js";
import { isCsPlayerControlEnabled } from "./player-dictionary-config.js";
// @ts-expect-error
import PlayerManager from "../lib/ws-player/icc/PlayerManager.js";

interface PlayerConfig {
  domId: string;
  videoUrl?: string;
  h5sParams?: H5sParams;
  isReconnect?: boolean;
  useJessibuca?: boolean;
}

export interface PlayerStrategy {
  initPlayer: () => Promise<void>;
  destroy: () => void;
  onError?: (error: Error) => void; // 新增错误回调
}

/** H5S 播放策略 */
export class H5sPlayerStrategy implements PlayerStrategy {
  private playerInstance: H5sPlayerInstance | null = null;
  private reconnectCount = 0;
  private h5sPlayerCheck: NodeJS.Timeout | null = null;

  public constructor(
    private config: PlayerConfig,
    private emitErrorMsg: (msg: string, errorType: ErrorType) => void,
  ) {}

  public async initPlayer(): Promise<void> {
    if (!this.config.h5sParams?.host) {
      this.emitErrorMsg("请检查h5sHost参数", ErrorType.PARAMS_ERROR);
      return;
    }
    if (!this.config.h5sParams?.token) {
      this.emitErrorMsg("请检查第三方设备ID", ErrorType.PARAMS_ERROR);
      return;
    }
    if (!this.config.h5sParams?.session) {
      this.emitErrorMsg("请检查session", ErrorType.PARAMS_ERROR);
      return;
    }
    if (!this.config.h5sParams?.protocol) {
      this.emitErrorMsg("请检查protocol", ErrorType.PARAMS_ERROR);
      return;
    }
    const videoDom = document.getElementById(this.config.domId) as HTMLVideoElement | null;
    if (!videoDom) {
      this.emitErrorMsg("找不到播放器dom", ErrorType.PARAMS_ERROR);
      return;
    }
    const conf = {
      hlsver: "v1",
      host: this.config.h5sParams.host,
      protocol: this.config.h5sParams.protocol,
      session: this.config.h5sParams.session,
      token: this.config.h5sParams.token,
      sub: this.config.h5sParams.token,
      rootpath: "/",
      streamprofile: "sub",
      profile: "sub",
      videodom: videoDom,
      consolelog: "false",
    };
    if (navigator.userAgent.includes("iphone")) {
      this.playerInstance = new H5sPlayerRTC(conf) as H5sPlayerInstance;
    } else {
      this.playerInstance = new H5sPlayerWS(conf) as H5sPlayerInstance;
    }
    this.playerInstance.connect();

    let count = 0;
    let currentTime: number[] = [];
    this.h5sPlayerCheck && clearInterval(this.h5sPlayerCheck);
    this.h5sPlayerCheck = setInterval(() => {
      if (document.visibilityState === "hidden") {
        count = 0;
        currentTime = [];
        return;
      }
      currentTime.push(videoDom.currentTime);
      if (videoDom.paused || (currentTime.length > 1 && currentTime.at(-2) === currentTime.at(-1))) {
        if (count === 5) {
          if (this.config.isReconnect && this.reconnectCount < 5) {
            this.reconnectCount++;
            this.initPlayer();
          } else {
            this.emitErrorMsg("播放错误", ErrorType.PLAY_ERROR);
            this.playerInstance?.disconnect();
          }
          count = 0;
          this.h5sPlayerCheck && clearInterval(this.h5sPlayerCheck);
        }
        count++;
      } else {
        count = 0;
      }

      if (currentTime.length > 2) {
        currentTime.shift();
      }
    }, 2000);
  }

  public destroy(): void {
    this.h5sPlayerCheck && clearInterval(this.h5sPlayerCheck);
    this.playerInstance?.disconnect();
  }
}

/** 海康播放策略 */
export class HikvisionPlayerStrategy implements PlayerStrategy {
  private playerInstance: JSPlugin | null = null;

  public constructor(
    private config: PlayerConfig & { videoUrl: string },
    private emitErrorMsg: (msg: string, errorType: ErrorType) => void,
  ) {}

  public async initPlayer(): Promise<void> {
    await loadPlayerSDK("hikvision-isc");
    this.playerInstance = new JSPlugin({
      szId: this.config.domId,
      szBasePath: "/resource/player-hk-sdk/",
      iMaxSplit: 1,
      iCurrentSplit: 1,
    });
    const playURL = `${window.location.protocol === "http:" ? "ws://" : "wss://"}${this.config.videoUrl.split("//")[1]}`;
    const mode = 1;
    this.playerInstance?.JS_Play(playURL, { playURL, mode }, 0);
    this.playerInstance?.JS_SetWindowControlCallback({
      pluginErrorHandler: async (index: number, iErrorCode: string) => {
        // 插件错误回调
        this.emitErrorMsg(`播放错误${iErrorCode}`, ErrorType.PLAY_ERROR);
        await this.playerInstance?.JS_Stop(0);
      },
    });
  }

  public destroy(): void {
    this.playerInstance?.JS_Stop(0);
  }
}

/** GHY 播放策略（PC 端由字典 CS_PLAYER_CONTROL 控制 Jessibuca / H265） */
export class GhyPlayerStrategy implements PlayerStrategy {
  private playerInstance: new265webjs | Jessibuca | null = null;
  private destroyed = false;
  private useJessibucaEngine = false;

  public constructor(
    private config: PlayerConfig & { videoUrl: string },
    private emitErrorMsg: (msg: string, errorType: ErrorType) => void,
  ) {}

  public async initPlayer(): Promise<void> {
    this.destroyed = false;
    if (!this.config.videoUrl) {
      this.emitErrorMsg("网络加载异常", ErrorType.PARAMS_ERROR);
      return;
    }
    if (!this.getPlayerDom()) {
      this.emitErrorMsg("Dom 不存在", ErrorType.SDK_ERROR);
      return;
    }

    this.useJessibucaEngine = await this.resolveUseJessibuca();

    if (this.config.useJessibuca) {
      await loadPlayerSDK("unisinsight");
    } else {
      await loadGhyPlayerSDK(this.useJessibucaEngine);
    }
    if (this.destroyed || !this.getPlayerDom()) {
      return;
    }

    if (this.useJessibucaEngine) {
      await this.initJessibucaPlayer();
    } else {
      await this.initDesktopPlayer();
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.keepDomForLateH265Callbacks();
    try {
      if (this.useJessibucaEngine) {
        this.playerInstance && (this.playerInstance as Jessibuca).destroy();
      } else {
        this.playerInstance && (this.playerInstance as new265webjs).release();
      }
    } catch {
    } finally {
      this.playerInstance = null;
    }
  }

  private async resolveUseJessibuca(): Promise<boolean> {
    if (this.config.useJessibuca || isMobile()) {
      return true;
    }
    return isCsPlayerControlEnabled();
  }

  private async initJessibucaPlayer(): Promise<void> {
    try {
      const dom = this.getPlayerDom();
      if (this.destroyed || !dom) {
        return;
      }
      this.playerInstance = new Jessibuca({
        container: dom,
        isResize: false,
        loadingText: "加载中",
        useWCS: location.protocol === "https:",
        useMSE: location.protocol === "http:",
        autoWasm: true,
        showBandwidth: false, // 显示网速
        operateBtns: {
          fullscreen: false,
          screenshot: false,
          play: false,
          audio: false,
          recorder: false,
        },
        forceNoOffscreen: false,
        decoder: "/resource/jessibuca-sdk/decoder.js",
      });

      if (this.destroyed || !this.getPlayerDom()) {
        this.destroy();
        return;
      }
      this.playerInstance.play(this.config.videoUrl);
    } catch {
      if (this.destroyed) {
        return;
      }
      this.emitErrorMsg("播放器初始化失败", ErrorType.SDK_ERROR);
    }
  }

  private async initDesktopPlayer(): Promise<void> {
    try {
      const dom = this.getPlayerDom();
      if (this.destroyed) {
        return;
      }
      if (!dom) {
        this.emitErrorMsg("Dom 不存在", ErrorType.PARAMS_ERROR);
        return;
      }
      if (!this.config.videoUrl?.trim()) {
        this.emitErrorMsg("网络加载异常", ErrorType.PARAMS_ERROR);
        return;
      }
      const config = {
        player: this.config.domId,
        width: dom.clientWidth || 640,
        height: dom.clientHeight || 360,
        token:
          "base64:QXV0aG9yOmNoYW5neWFubG9uZ3xudW1iZXJ3b2xmLEdpdGh1YjpodHRwczovL2dpdGh1Yi5jb20vbnVtYmVyd29sZixFbWFpbDpwb3JzY2hlZ3QyM0Bmb3htYWlsLmNvbSxRUTo1MzEzNjU4NzIsSG9tZVBhZ2U6aHR0cDovL3h2aWRlby52aWRlbyxEaXNjb3JkOm51bWJlcndvbGYjODY5NCx3ZWNoYXI6bnVtYmVyd29sZjExLEJlaWppbmcsV29ya0luOkJhaWR1",
        extInfo: {
          coreProbePart: 0.4,
          probeSize: 8192,
          ignoreAudio: 0,
          autoPlay: true,
        },
      };
      const player = new new265webjs(this.config.videoUrl, config);
      this.playerInstance = player;
      // do() 必须与构造同步执行，这是官方推荐用法（构造 -> 绑回调 -> do()）。
      player.do();
    } catch (error) {
      console.error(error);
      if (this.destroyed) {
        return;
      }
      this.emitErrorMsg("桌面端播放器初始化失败", ErrorType.SDK_ERROR);
    }
  }

  private getPlayerDom(): HTMLElement | null {
    const dom = document.getElementById(this.config.domId);
    if (!dom || !dom.isConnected) {
      return null;
    }
    return dom;
  }

  private keepDomForLateH265Callbacks(): void {
    if (this.useJessibucaEngine) {
      return;
    }
    const { domId } = this.config;
    requestAnimationFrame(() => {
      if (document.querySelector(`#${domId}`)) {
        return;
      }
      const placeholder = document.createElement("div");
      placeholder.id = domId;
      placeholder.dataset.cubePlayerH265Placeholder = "true";
      placeholder.style.cssText =
        "position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:-9999px;";
      document.body.append(placeholder);
    });
  }
}

/** 大华播放策略 */
export class DahuaPlayerStrategy implements PlayerStrategy {
  private playerInstance: PlayerManager | null = null;
  public constructor(
    private config: PlayerConfig & { videoUrl: string },
    private emitErrorMsg: (msg: string, errorType: ErrorType) => void,
  ) {}
  public async initPlayer(): Promise<void> {
    await this.createInstance();
    this.play();
  }

  public destroy(): void {
    this.playerInstance?.close();
  }

  private play(): void {
    function replaceProtocol(url: string): string {
      // 获取当前网页的协议头（http: 或 https:）
      const currentProtocol = window.location.protocol;
      // 根据当前网页的协议头，映射目标协议
      const targetProtocol = currentProtocol === "https:" ? "wss://" : "ws://";
      // 提取原 URL 的主机和端口部分
      const match = url.match(/^[^:]+:\/\/([^/]+)/);
      if (!match) {
        return url; // 如果无法匹配到主机和端口，返回原 URL
      }
      // 替换为新的协议头
      const newUrl = targetProtocol + match[1];
      return newUrl;
    }

    this.playerInstance.realByUrl({
      wsURL: replaceProtocol(this.config.videoUrl), // 建立的websocket连接地址, 必传, 根据返回的rtsp的流地址进行拼接，可在demo进行查看
      rtspURL: this.config.videoUrl, // 必传，接口返回的rtsp地址
      channelId: "100001$1$0$1", // 必传
      selectIndex: 0, // 必传, 窗口索引，从0开始，表示第一个窗口播放
    });
  }

  private async createInstance(): Promise<void> {
    return new Promise((resolve) => {
      this.playerInstance = new PlayerManager({
        el: this.config.domId /** 实时预览容器id，创建多个播放器，传入不同的容器id即可 **/,
        type: "real" /** real - 实时预览  record - 录像回放 **/,
        maxNum: 1 /** 一个播放器上限能播放的路数，可根据实际情况设置，支持 1 4 9 16 25 **/,
        num: 1 /** 初始化，页面显示的路数 **/,
        showControl: false /** 是否显示工具栏，默认显示 **/,
        showIcons: false,
        openIvs: false, // true-开启智能帧/规则线/目标框, false-不显示
        // useH265MSE: true // true-表示硬解  false-软解 默认不传该字段
        prefixUrl: "resource",
        receiveMessageFromWSPlayer: (methods: string, data: unknown): void => {
          /* 回调函数，可以在以下回调函数里面做监听 */
          switch (methods) {
            case "initializationCompleted": {
              resolve();
              break;
            }
            case "chromeMemoryOut": {
              this.emitErrorMsg("浏览器资源不足！", ErrorType.PLAY_ERROR);
              break;
            }
            case "errorInfo": {
              // 错误信息提示
              this.emitErrorMsg(JSON.stringify(data), ErrorType.PLAY_ERROR);
              break;
            }
          }
        },
      });
    });
  }
}
