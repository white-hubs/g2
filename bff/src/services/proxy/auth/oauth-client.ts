export interface OAuthClientCredentials {
  clientId: string;
  clientSecret: string;
}

export type OAuthTokenRequestBody = Record<string, string>;

export function normalizeOAuthTokenRequestBody(body: unknown): OAuthTokenRequestBody | undefined {
  if (!body) {
    return undefined;
  }

  if (body instanceof URLSearchParams) {
    return fromEntries(body.entries());
  }

  if (body instanceof FormData) {
    return fromEntries((body as { entries: () => Iterable<[string, unknown]> }).entries());
  }

  if (typeof body === "string") {
    const text = body.trim();
    if (!text) {
      return undefined;
    }
    return fromEntries(new URLSearchParams(text).entries());
  }

  if (typeof body !== "object") {
    return undefined;
  }

  return fromEntries(Object.entries(body as Record<string, unknown>));
}

export function isBlockedOAuthGrantType(grantType: unknown): boolean {
  return typeof grantType === "string" && grantType.trim().toLowerCase() === "client_credentials";
}

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const STRIPPED_UPSTREAM_HEADER_KEYS = new Set(["host", "content-length", "x-oauth-client"]);

export function buildOAuthUpstreamHeaders(incomingHeaders: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(incomingHeaders)) {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey) || STRIPPED_UPSTREAM_HEADER_KEYS.has(normalizedKey)) {
      continue;
    }
    if (value === "") {
      continue;
    }
    result[normalizedKey] = value;
  }
  result["content-type"] = "application/x-www-form-urlencoded";
  return result;
}

export function resolveOAuthClient(
  headers: Record<string, string>,
  defaultClient: OAuthClientCredentials,
  clientMap: Record<string, OAuthClientCredentials>,
): OAuthClientCredentials {
  const candidates = [headers["x-oauth-client"], headers.terminal].filter(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );

  for (const key of candidates) {
    const mapped = clientMap[key.trim()];
    if (mapped) {
      return mapped;
    }
  }

  return defaultClient;
}

export function parseOAuthClientMap(raw: string | undefined): Record<string, OAuthClientCredentials> {
  if (!raw || raw.trim() === "") {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, { id?: string; secret?: string; clientId?: string; clientSecret?: string }>;
    const result: Record<string, OAuthClientCredentials> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const clientId = value.id ?? value.clientId;
      const clientSecret = value.secret ?? value.clientSecret;
      if (clientId && clientSecret) {
        result[key] = { clientId, clientSecret };
      }
    }
    return result;
  } catch {
    return {};
  }
}

function fromEntries(entries: Iterable<[string, unknown]>): OAuthTokenRequestBody {
  const result: OAuthTokenRequestBody = {};
  for (const [key, value] of entries) {
    if (value !== undefined && value !== null && String(value) !== "") {
      result[key] = String(value);
    }
  }
  return result;
}
