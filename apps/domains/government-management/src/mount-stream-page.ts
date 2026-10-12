import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import { Button, PageLayout } from "@g2-platform/pc-ui";
import { type Component, defineComponent, h } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getGovernmentContext } from "./domain-context";

/** 复用已迁移的流引擎页面，保持行政管理业务类型和返回菜单上下文。 */
export async function hostGovernmentStreamPage(title: string, activeMenuPath: string): Promise<Component> {
  const context = getGovernmentContext();
  try {
    const [loaded, contract] = await Promise.all([
      context.loadPageLibrary<{ default?: Component }>("streamEnginePages", "StreamEngineRender"),
      context.loadPageLibrary<{ contractInfo?: { major?: number } }>("streamEnginePages", "contractInfo"),
    ]);
    if (contract.contractInfo?.major !== 1) {
      throw new Error("流引擎共享页面版本不兼容");
    }
    const Page = loaded.default ?? (loaded as Component);
    return defineComponent({
      name: "GovernmentStreamPage",
      setup() {
        const route = useRoute();
        const router = useRouter();
        const getClient = () => context.ensureClient<StreamEngineClient>("streamEngineClient");
        const getFileClient = () => context.ensureClient<FileClient>("fileClient");
        const getOuaaClient = () => context.ensureClient<OuaaClient>("ouaaClient");
        return () =>
          h(Page, {
            title: String(route.query.title ?? title),
            applicationCode: "OFFICIAL_MANAGEMENT",
            businessType: String(route.query.businessType ?? ""),
            processInstanceId: String(route.query.processInstanceId ?? ""),
            currentTaskId: String(route.query.currentTaskId ?? ""),
            status: String(route.query.status ?? ""),
            businessKey: String(route.query.businessKey ?? ""),
            type: String(route.query.type ?? "add"),
            getClient,
            getFileClient,
            getOuaaClient,
            onClose: () => {
              const returnPath = route.query.returnPath;
              const target =
                typeof returnPath === "string" &&
                (returnPath === activeMenuPath ||
                  returnPath.startsWith(`${activeMenuPath}?`) ||
                  returnPath.startsWith(`${activeMenuPath}/`))
                  ? returnPath
                  : activeMenuPath;
              void router.push(target);
            },
          });
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return defineComponent({
      name: "GovernmentStreamPageLoadError",
      setup() {
        return () =>
          h(
            PageLayout,
            { title, showFooter: false },
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
