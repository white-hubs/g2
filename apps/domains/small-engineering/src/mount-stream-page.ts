import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import { type Component, defineComponent, h } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getSmallEngineeringContext } from "./domain-context";

const BASE = "/d/small-engineering";

export async function hostStreamPage(
  exposedPath: "StreamEngineRender" | "ApprovalConfig",
  options: { title: string; backPath: string; businessType?: string },
): Promise<Component> {
  const context = getSmallEngineeringContext();
  const [loaded, contractModule] = await Promise.all([
    context.loadPageLibrary<{ default?: Component }>("streamEnginePages", exposedPath),
    context.loadPageLibrary<{ contractInfo?: { major?: number } }>("streamEnginePages", "contractInfo"),
  ]);
  if (contractModule.contractInfo?.major !== 1) {
    throw new Error("流程页面版本与小散工程不兼容");
  }
  const Page = loaded.default ?? (loaded as Component);
  return defineComponent({
    name: `SmallEngineering${exposedPath}`,
    setup() {
      const route = useRoute();
      const router = useRouter();
      return () =>
        h(Page, {
          title: String(route.query.title ?? options.title),
          type: String(route.query.type ?? "add"),
          businessType: String(route.query.businessType ?? options.businessType ?? "PROJECT_APPLY"),
          processInstanceId: String(route.query.processInstanceId ?? ""),
          currentTaskId: String(route.query.currentTaskId ?? ""),
          status: String(route.query.status ?? ""),
          notOperates: route.query.notOperates === "true",
          applicationCode: "SMALLENFINEERING",
          ...(exposedPath === "ApprovalConfig" ? { approvalApiPrefix: "/api/loose-works/project" } : {}),
          getClient: () => context.ensureClient<StreamEngineClient>("streamEngineClient"),
          getFileClient: () => context.ensureClient<FileClient>("fileClient"),
          getOuaaClient: () => context.ensureClient<OuaaClient>("ouaaClient"),
          onClose: () => {
            void router.push(`${BASE}/${options.backPath}`);
          },
        });
    },
  });
}
