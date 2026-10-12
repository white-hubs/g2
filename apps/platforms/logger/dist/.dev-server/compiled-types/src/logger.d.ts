export interface Logger {
    debug: (message: string, context?: Record<string, unknown>) => void;
    info: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
}
interface ConsoleLike {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}
export interface CreateLoggerOptions {
    console?: ConsoleLike;
}
export declare function createLogger(scope: string, options?: CreateLoggerOptions): Logger;
export {};
//# sourceMappingURL=logger.d.ts.map