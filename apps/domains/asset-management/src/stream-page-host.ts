import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import { type Component, defineComponent, h } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getContext } from "./domain-context";
export function streamReturnPath(target: unknown, owner: string): string {
  return typeof target === "string" && (target === owner || target.startsWith(`${owner}?`)) ? target : owner;
}
export async function hostStreamPage(owner: string, businessType: string, title: string): Promise<Component> {
  const context = getContext();
  const [loaded, contract] = await Promise.all([
    context.loadPageLibrary<{ default?: Component }>("streamEnginePages", "StreamEngineRender"),
    context.loadPageLibrary<{ contractInfo?: { major?: number } }>("streamEnginePages", "contractInfo"),
  ]);
  if (contract.contractInfo?.major !== 1) {
    throw new Error("流引擎共享页面版本不兼容");
  }
  const Page = loaded.default ?? (loaded as Component);
  return defineComponent({
    name: "AssetStreamPage",
    setup() {
      const route = useRoute();
      const router = useRouter();
      return () =>
        h(Page, {
          title: businessType === "DEPARTMENT_USE" && route.query.businessType === "FAULT" ? "故障报修" : title,
          applicationCode: "PROPERTY_MANAGEMENT",
          businessType:
            businessType === "DEPARTMENT_USE" ? (route.query.businessType === "FAULT" ? "FAULT" : "CONSUMABLE_REDUCE") : businessType,
          processInstanceId: String(route.query.processInstanceId ?? ""),
          currentTaskId: String(route.query.currentTaskId ?? ""),
          status: String(route.query.status ?? ""),
          type: route.query.type === "detail" ? "detail" : "add",
          getClient: () => context.ensureClient<StreamEngineClient>("streamEngineClient"),
          getFileClient: () => context.ensureClient<FileClient>("fileClient"),
          getOuaaClient: () => context.ensureClient<OuaaClient>("ouaaClient"),
          onClose: () => void router.push(streamReturnPath(route.query.returnPath, owner)),
        });
    },
  });
}
