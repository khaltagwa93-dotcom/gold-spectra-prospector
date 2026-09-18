import { prisma } from "@/lib/db";

type LogLevel = "INFO" | "WARN" | "ERROR";

export async function logEvent(
  level: LogLevel,
  scope: string,
  message: string,
  options?: { metadata?: Record<string, unknown>; userId?: string }
) {
  try {
    await prisma.systemLog.create({
      data: {
        level,
        scope,
        message,
        metadata: options?.metadata as never,
        userId: options?.userId
      }
    });
  } catch (err) {
    // Logging must never take down the request it's logging about.
    // eslint-disable-next-line no-console
    console.error(`[logEvent fallback] ${level} ${scope}: ${message}`, err);
  }
}
