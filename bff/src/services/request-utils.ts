export function buildQueryString(params: Record<string, unknown>): string {
  const queryString = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      queryString.set(key, String(value));
    }
  }
  return queryString.toString();
}

export function buildUrl(baseUrl: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  return `${baseUrl}?${buildQueryString(params)}`;
}
