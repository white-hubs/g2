import type { LineLossManagementClient } from "@g2-client/line-loss-management/client";
import { inject } from "vue";

import { DOMAIN_CONTEXT_KEY } from "./domain-context";

export function useLineLossClient(): () => Promise<LineLossManagementClient> {
  const context = inject(DOMAIN_CONTEXT_KEY);
  if (!context) {
    throw new Error("LineLossManagement requires DomainContext");
  }
  return () => context.ensureClient<LineLossManagementClient>("lineLossManagementClient");
}

export function unwrap<T>(value: unknown, fallback: T): T {
  let current = value;
  for (let index = 0; index < 4; index += 1) {
    if (current && typeof current === "object" && !Array.isArray(current) && "data" in current) {
      current = (current as { data: unknown }).data;
    } else {
      break;
    }
  }
  return (current ?? fallback) as T;
}
