import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import { type Component, defineComponent, h } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getContext } from "./domain-context";
import { BASE } from "./menu-data";
export function streamReturnPath(target: unknown, activeMenuPath: string): string {
  const allowed = [activeMenuPath];
  if (activeMenuPath === `${BASE}/report-statistics`) {
    allowed.push(`${BASE}/record-index`);
  }
  return typeof target === "string" && allowed.some((path) => target === path || target.startsWith(`${path}?`)) ? target : activeMenuPath;
}

export async function hostStreamPage(activeMenuPath: string): Promise<Component> {
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
    name: "WorkReportStreamPage",
    setup() {
      const route = useRoute();
      const router = useRouter();
      return () =>
        h(Page, {
          title: "工作汇报",
          applicationCode: "WORK_REPORT",
          businessType: "REPORT",
          processInstanceId: String(route.query.processInstanceId ?? ""),
          currentTaskId: String(route.query.currentTaskId ?? ""),
          status: String(route.query.status ?? ""),
          type: String(route.query.type ?? "add"),
          getClient: () => context.ensureClient<StreamEngineClient>("streamEngineClient"),
          getFileClient: () => context.ensureClient<FileClient>("fileClient"),
          getOuaaClient: () => context.ensureClient<OuaaClient>("ouaaClient"),
          onClose: () => {
            void router.push(streamReturnPath(route.query.returnPath, activeMenuPath));
          },
        });
    },
  });
}
