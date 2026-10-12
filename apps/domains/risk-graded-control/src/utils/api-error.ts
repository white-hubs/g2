import { message } from "@/pc-ui-runtime";

function readErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  if (err && typeof err === "object") {
    const record = err as Record<string, unknown>;
    if (typeof record.errorMessage === "string" && record.errorMessage.trim()) {
      return record.errorMessage.trim();
    }
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
    if (typeof record.toJSON === "function") {
      const json = (record.toJSON as () => Record<string, unknown>)();
      if (typeof json.errorMessage === "string" && json.errorMessage.trim()) {
        return json.errorMessage.trim();
      }
    }
  }
  return fallback;
}

export function showApiError(err: unknown, fallback = "请求失败"): void {
  message.error(readErrorMessage(err, fallback));
}
