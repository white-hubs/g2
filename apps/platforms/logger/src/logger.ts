import { formatTimestamp } from "@g2-platform/date/api";

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

const LEVELS: (keyof Logger)[] = ["debug", "info", "warn", "error"];

export function createLogger(scope: string, options: CreateLoggerOptions = {}): Logger {
  const target = options.console ?? console;
  const logger = {} as Logger;
  for (const level of LEVELS) {
    logger[level] = (message: string, context?: Record<string, unknown>) => {
      const prefix = `${formatTimestamp(new Date())} [${level.toUpperCase()}] [${scope}]`;
      const prefixedMessage = `${prefix} ${message}`;
      if (context !== undefined) {
        target[level](prefixedMessage, context);
      } else {
        target[level](prefixedMessage);
      }
    };
  }
  return logger;
}
