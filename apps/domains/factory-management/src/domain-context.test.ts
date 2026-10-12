import type { DomainContext } from "@g2-composition/contract";
import type { FactoryManagementClient } from "@g2-contract/factory-management";
import { describe, expect, test } from "bun:test";

import { getFactoryManagementTenantCode, installFactoryManagementContext } from "./domain-context";

function contextWithTenant(tenant: string): DomainContext {
  return {
    bus: { publish: () => undefined, subscribe: () => () => undefined },
    getAuthHeaders: () => ({ Authorization: "Bearer test", tenant, terminal: "pc" }),
    loadPlatform: async () => ({}),
    loadPageLibrary: async () => ({}),
    getFunctionCodes: () => new Set<string>(),
    ensureClient: async () => ({}),
  };
}

describe("factory-management domain context", () => {
  test("reads the current tenant from the live G2 auth headers", () => {
    installFactoryManagementContext(contextWithTenant(" park-tenant "), {} as FactoryManagementClient);
    expect(getFactoryManagementTenantCode()).toBe("park-tenant");
  });
});
