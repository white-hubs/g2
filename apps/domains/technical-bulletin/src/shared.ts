import type { RecipientOption } from "@g2-contract/technical-bulletin";

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function text(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  return String(value);
}

export function periodValue(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length !== 2) {
    return undefined;
  }
  return `${String(value[0])},${String(value[1])}`;
}

export function recipientId(value: string | RecipientOption): string {
  return typeof value === "string" ? value : String(value.id);
}

export function recipientOption(value: string | RecipientOption): RecipientOption {
  return typeof value === "string" ? { id: value, name: value } : value;
}

export function isTopping(value: unknown): boolean {
  return value === true || value === "1" || value === 1;
}
