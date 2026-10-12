export const SECURITY_MONITOR_BFF_BASE_PATH = "/gw-bff/security-monitor" as const;
export const SECURITY_MONITOR_ALLOWED_UPSTREAM_PREFIXES = ["/vmonitor/"] as const;

export type SecurityMonitorBffBasePath = typeof SECURITY_MONITOR_BFF_BASE_PATH;

export interface SecurityMonitorProxyGateway {
  forwardGet(path: string, query?: Record<string, unknown>): Promise<unknown>;
  forwardPost(path: string, body?: unknown): Promise<unknown>;
  forwardPut(path: string, body?: unknown): Promise<unknown>;
  forwardDelete(path: string, query?: Record<string, unknown>): Promise<unknown>;
}
