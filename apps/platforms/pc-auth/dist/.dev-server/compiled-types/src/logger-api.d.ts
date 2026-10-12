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
export declare function bindLoggerApiFromModule(api: LoggerApi): void;
export declare function bindLoggerApi(ctx: PlatformContext): Promise<void>;
export declare function createLogger(scope: string): Logger;
export {};
//# sourceMappingURL=logger-api.d.ts.map