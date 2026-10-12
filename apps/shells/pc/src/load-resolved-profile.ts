import type { ResolvedProfile } from "@g2-composition/registry";

export async function loadResolvedProfile(url = defaultProfileUrl()): Promise<ResolvedProfile> {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) throw new Error(`failed to load resolved profile: ${res.status} ${url}`);
  return (await res.json()) as ResolvedProfile;
}

export function defaultProfileUrl(): string {
  // Production builds must not inherit Bun-auto-loaded `.env.development`
  // (`VITE_RESOLVED_PROFILE_URL=/compositions/dev.resolved.json` → localhost Vite ports).
  if (import.meta.env.PROD) {
    return "/compositions/prod.resolved.json";
  }
  return import.meta.env.VITE_RESOLVED_PROFILE_URL ?? "/compositions/dev.resolved.json";
}
