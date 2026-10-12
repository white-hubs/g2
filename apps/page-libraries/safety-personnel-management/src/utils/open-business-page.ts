/** Retain legacy detail destinations; the shell resolves migrated /portal routes. */
export function openBusinessPage(_applicationCode: string, url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
