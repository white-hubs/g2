export interface PageQueryRoute {
  path: string;
  query: Record<string, unknown>;
  hash?: string;
}

export interface PageQueryRouter {
  replace: (location: { path: string; query: Record<string, string | string[]>; hash?: string }) => Promise<unknown>;
}

const hasWindow = (): boolean => typeof window !== "undefined" && typeof window.location !== "undefined";

const normalizeQuery = (query: Record<string, unknown>): Record<string, string | string[]> => {
  return Object.entries(query).reduce<Record<string, string | string[]>>((result, [key, value]) => {
    if (Array.isArray(value)) {
      const items = value.filter((item): item is string => typeof item === "string");
      if (items.length > 0) {
        result[key] = items;
      }
    } else if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
    return result;
  }, {});
};

export const readPageQueryValue = (key: string, route?: PageQueryRoute): number | undefined => {
  const routeValue = route?.query[key];
  const rawValue =
    routeValue !== undefined && routeValue !== null
      ? Array.isArray(routeValue)
        ? routeValue[0]
        : routeValue
      : hasWindow()
        ? new URLSearchParams(window.location.search).get(key)
        : undefined;
  if (!rawValue) {
    return undefined;
  }
  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

export const writePageQuery = (pageNumber: number, pageSize: number, router?: PageQueryRouter, route?: PageQueryRoute): void => {
  if (router && route) {
    void router
      .replace({
        path: route.path,
        query: {
          ...normalizeQuery(route.query),
          pageNumber: String(pageNumber),
          pageSize: String(pageSize),
        },
        hash: route.hash,
      })
      .catch(() => undefined);
    return;
  }

  if (!hasWindow()) {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("pageNumber", String(pageNumber));
  url.searchParams.set("pageSize", String(pageSize));
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
};
