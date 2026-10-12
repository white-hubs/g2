import type { GemPageKey } from "./page-keys";

export interface PageNavigatePayload {
  page: GemPageKey;
  params?: Record<string, string>;
}

export type NavigatePage = (payload: PageNavigatePayload) => void;
