export function joinReleaseKey(...parts: string[]): string {
  return parts
    .map((part) => part.replace(/^\/+/u, "").replace(/\/+$/u, ""))
    .filter(Boolean)
    .join("/");
}
