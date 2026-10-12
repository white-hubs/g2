/** 语音输入状态：对齐旧仓 SpeechInputStatus。 */
export type SpeechInputStatus = "idle" | "starting" | "recording" | "transcribing" | "processing" | "error";

export interface SpeechInputControllerOptions {
  onStateChange?: (payload: { status: SpeechInputStatus }) => void;
  onStatusChange?: (status: SpeechInputStatus) => void;
  onResult?: (text: string) => void;
  onTranscribed?: (text: string) => void;
  onPartialResult?: (text: string) => void;
  onError?: (error: unknown) => void;
}

/**
 * 旧仓 `@ghcloud/cube-speech-assistant` 本地替身。
 * G2 尚未接入同款语音 SDK：保留按钮交互空实现，避免迁域阻塞。
 */
export class SpeechInputController {
  private readonly options: SpeechInputControllerOptions;

  public constructor(options: SpeechInputControllerOptions = {}) {
    this.options = options;
  }

  public async start(): Promise<void> {
    this.options.onStatusChange?.("idle");
    this.options.onStateChange?.({ status: "idle" });
  }

  public async stop(): Promise<void> {
    this.options.onStatusChange?.("idle");
    this.options.onStateChange?.({ status: "idle" });
  }

  public async handleClick(): Promise<void> {
    await this.start();
    await this.stop();
  }

  public destroy(): void {
    this.options.onStatusChange?.("idle");
    this.options.onStateChange?.({ status: "idle" });
  }

  public dispose(): void {
    this.destroy();
  }
}
