import type { SecurityOpinionClient } from "@g2-client/security-opinion/client";
import type { SecurityOpinionGateway } from "@g2-contract/security-opinion";

let installedClient: SecurityOpinionClient | null = null;

export function installSecurityOpinionPages(nextClient: SecurityOpinionClient): void {
  installedClient = nextClient;
}

function requireClient(): SecurityOpinionClient {
  if (!installedClient) {
    throw new Error("security opinion pages are not installed");
  }
  return installedClient;
}

export const securityOpinionApi = new Proxy({} as SecurityOpinionGateway, {
  get(_target, property) {
    const value = requireClient()[property as keyof SecurityOpinionClient];
    return typeof value === "function" ? value.bind(requireClient()) : value;
  },
});
