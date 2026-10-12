export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    return String(value.errorMessage ?? value.message ?? fallback);
  }
  return fallback;
}

export function text(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  return String(value);
}

export function formatDateTime(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const raw = String(value);
  const date = /^\d{10,13}$/u.test(raw) ? new Date(Number(raw.length === 10 ? `${raw}000` : raw)) : new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("zh-CN", { hour12: false }).replaceAll("/", "-");
}

export function rangePeriod(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length !== 2) {
    return undefined;
  }
  return value.map(String).join(",");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function areaText(value: unknown): string {
  if (!Array.isArray(value)) {
    return "--";
  }
  const names = value
    .map((item) => (item && typeof item === "object" ? String((item as Record<string, unknown>).name ?? "") : ""))
    .filter(Boolean);
  return names.length > 0 ? names.join("/") : "--";
}

export const PATROL_WAY_OPTIONS = [
  { label: "NFC巡更", value: "NFC" },
  { label: "蓝牙巡更", value: "BLUETOOTH" },
  { label: "二维码巡更", value: "QRCODE" },
  { label: "GPS巡更", value: "GPS" },
];

export function patrolWayText(value: unknown): string {
  if (!value) {
    return "--";
  }
  return String(value).replaceAll("QRCODE", "二维码巡更").replaceAll("BLUETOOTH", "蓝牙").replaceAll("NFC", "NFC").replaceAll("GPS", "GPS");
}
