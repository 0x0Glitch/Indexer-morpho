import pino from "pino";

/**
 * Production-grade logger configuration using Pino
 * Provides structured logging with different log levels and pretty printing in development
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "error", // Only log errors by default
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "UTC:yyyy-mm-dd HH:MM:ss.l",
            ignore: "pid,hostname",
            singleLine: false,
            messageFormat: "{levelLabel} - {msg}",
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

/**
 * Create a child logger with context
 */
export function createLogger(context: { module?: string; [key: string]: any }) {
  return logger.child(context);
}
