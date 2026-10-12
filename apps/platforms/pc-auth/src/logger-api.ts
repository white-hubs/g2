/**
 * pc-auth 经 ctx.loadPlatform("loggerPlatform","api") 绑定（ADR-0056），禁止静态依赖 @g2-shared/logger。
 */
import type { PlatformContext } from "@g2-composition/contract";

export type Logger = {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
};

type LoggerApi = {
  createLogger: (scope: string) => Logger;
};

let loggerApi: LoggerApi | undefined;

export function bindLoggerApiFromModule(api: LoggerApi): void {
  loggerApi = api;
}

export async function bindLoggerApi(ctx: PlatformContext): Promise<void> {
  bindLoggerApiFromModule((await ctx.loadPlatform("loggerPlatform", "api")) as LoggerApi);
}

export function createLogger(scope: string): Logger {
  if (!loggerApi) {
    throw new Error("loggerPlatform API not bound; call bindLoggerApi in platform install (ADR-0056)");
  }
  return loggerApi.createLogger(scope);
}
