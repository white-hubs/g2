import { isBenignRuntimeNoise, normalizeErrorText } from "./benign-runtime-noise";
import type { Logger } from "./library-platform-apis";

export function installCrashReporting(target: Window, logger: Logger): void {
  target.onerror = (message, _source, _lineno, _colno, error) => {
    if (isBenignRuntimeNoise(message) || isBenignRuntimeNoise(error)) {
      // 抑制默认输出，避免再被 qiankun global handler 当成微应用加载失败
      return true;
    }
    logger.error("uncaught error", { message: normalizeErrorText(message || error) });
  };
  target.onunhandledrejection = (event) => {
    const reason = (event as { reason: unknown; preventDefault?: () => void }).reason;
    if (isBenignRuntimeNoise(reason)) {
      event.preventDefault();
      return;
    }
    logger.error("unhandled promise rejection", { reason });
  };
}
