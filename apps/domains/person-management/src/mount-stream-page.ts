import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import { Button, PageLayout } from "@g2-platform/pc-ui";
import { type Component, defineComponent, h } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getPersonManagementContext } from "./domain-context";

export async function hostPersonnelStreamPage(
  exposedPath: "ApprovalConfig" | "StreamEngineRender",
  options: { title: string; activeMenuPath?: string },
): Promise<Component> {
  const context = getPersonManagementContext();
  try {
    const [loaded, contract] = await Promise.all([
      context.loadPageLibrary<{ default?: Component }>("streamEnginePages", exposedPath),
      context.loadPageLibrary<{ contractInfo?: { major?: number } }>("streamEnginePages", "contractInfo"),
    ]);
    if (contract.contractInfo?.major !== 1) {
      throw new Error("流引擎共享页面版本不兼容");
    }
    const Page = loaded.default ?? (loaded as Component);

    return defineComponent({
      name: `PersonnelHost${exposedPath}`,
      setup() {
        const router = useRouter();
        const route = useRoute();
        const getClient = () => context.ensureClient<StreamEngineClient>("streamEngineClient");
        const getFileClient = () => context.ensureClient<FileClient>("fileClient");
        const getOuaaClient = () => context.ensureClient<OuaaClient>("ouaaClient");
        return () =>
          h(Page, {
            title: String(route.query.title ?? options.title),
            applicationCode: "PERSONNELMANAGEMENT",
            ...(exposedPath === "ApprovalConfig"
              ? { approvalApiPrefix: "/api/personnel" }
              : {
                  businessType: String(route.query.businessType ?? ""),
                  processInstanceId: String(route.query.processInstanceId ?? ""),
                  currentTaskId: String(route.query.currentTaskId ?? ""),
                  status: String(route.query.status ?? ""),
                  type: String(route.query.type ?? "add"),
                  notOperates: route.query.notOperates === "true",
                }),
            getClient,
            getFileClient,
            getOuaaClient,
            onClose: () => {
              if (!options.activeMenuPath) {
                return;
              }
              const returnPath = route.query.returnPath;
              const target =
                typeof returnPath === "string" &&
                (returnPath === options.activeMenuPath || returnPath.startsWith(`${options.activeMenuPath}?`))
                  ? returnPath
                  : options.activeMenuPath;
              void router.push(target);
            },
          });
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return defineComponent({
      name: "PersonnelStreamPageLoadError",
      setup() {
        return () =>
          h(
            PageLayout,
            { title: options.title, showFooter: false },
            {
              "layout-content": () =>
                h("div", { style: "padding:24px" }, [
                  h("p", `流引擎页面加载失败：${reason}`),
                  h(Button, { onClick: () => globalThis.location.reload() }, { default: () => "重新加载" }),
                ]),
            },
          );
      },
    });
  }
}
