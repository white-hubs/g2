declare module "*.module.less" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
declare module "*.svg" {
  const classes: string;
  export default classes;
}
declare interface Window {
  videoUrl: string;
  config: {
    feature?: {
      videoAccessMode: string;
    };
  };
  JSPlugin: {
    JS_Play: (playURL: string, { playURL: string, mode: number }, unknownParam: number) => void;
  };
  Jessibuca: {
    play: (url: string) => void;
    mute: () => void;
    cancelMute: () => void;
    pause: () => void;
    setVolume: (volume: number) => void;
    destroy: () => void;
    on: (event: string, callback: (msg?: unknown) => void) => void;
  };
  new265webjs: {
    play: () => void;
    release: () => void;
  };
}

declare interface H5sPlayerInstance {
  disconnect: () => void;
  connect: () => void;
}

declare class JSPlugin {
  public constructor(options: {
    szId: string;
    szBasePath: string;
    iWidth?: number;
    iHeight?: number;
    iMaxSplit: number;
    iCurrentSplit: number;
  }): void;

  public JS_Play: (playURL: string, { playURL: string, mode: number }, curIndex: number) => void;
  public JS_Stop: (curIndex?: number) => Promise<void>;
  public JS_SetConnectTimeOut: (index: number, timer: number) => void;
  public JS_CapturePicture: (index: number, img: string, imgtype: string) => void;
  public JS_SetWindowControlCallback;
}

declare class Jessibuca {
  public constructor(options: {
    container: HTMLElement;
    videoBuffer?: number; // 缓存时长
    isResize?: boolean;
    autoWasm?: boolean;
    useWCS?: boolean;
    useMSE?: boolean;
    text?: string;
    loadingText?: string;
    debug?: boolean;
    supportDblclickFullscreen?: boolean;
    showBandwidth?: boolean; // 显示网速
    operateBtns?: {
      fullscreen?: boolean;
      screenshot?: boolean;
      play?: boolean;
      audio?: boolean;
      recorder?: boolean;
    };
    forceNoOffscreen?: boolean;
    isNotMute?: boolean;
    timeout?: number;
    decoder?: string;
  }): void;

  public play: (url: string) => void;
  public mute: () => void;
  public cancelMute: () => void;
  public pause: () => void;
  public setVolume: (volume: number) => void;
  public destroy: () => void;
  public on: (event: string, callback: (msg?: unknown) => void) => void;
}

declare class new265webjs {
  public player: e;
  public constructor(
    url: string,
    config: {
      player: string;
      width: number;
      height: number;
      token: string;
      extInfo: {
        coreProbePart: number;
        probeSize: number;
        ignoreAudio: number;
      };
    },
  ): void;

  public do: () => void;
  public play: () => void;
  public release: () => void;
  public onLoadFinish: (callback: () => void) => void;
  public onError: (callback: () => void) => void;
  public setVoice: (volume: number) => void;
  public mediaInfo: () => {
    meta: {
      isHEVC: boolean;
      durationMs: number;
      fps: number;
      sampleRate: number;
      size: {
        width: number;
        height: number;
      };
      audioNone: boolean;
    };
    videoType: string;
  };
}
