import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import { type Component, defineComponent, h } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getRenovationContext, getRenovationRuntime } from "./domain-context";

const PAGE_LIBRARY = "streamEnginePages";
const CONTRACT_MAJOR = 1;

function pageLibraryErrorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "RenovationStreamEngineLoadError",
    setup() {
      return () =>
        h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
          h("h2", "流引擎共享页面加载失败"),
          h("p", { style: "color:#8c8c8c" }, message),
          h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
        ]);
    },
  });
}

export async function hostStreamEnginePage(
  exposedPath: "StreamEngineRender" | "ApprovalConfig",
  options?: { title?: string; activeMenuEntry?: string; notOperates?: boolean },
): Promise<Component> {
  const context = getRenovationContext();
  try {
    const [loaded, contractModule] = await Promise.all([
      context.loadPageLibrary<{ default?: Component }>(PAGE_LIBRARY, exposedPath),
      context.loadPageLibrary<{ contractInfo?: { major?: number } }>(PAGE_LIBRARY, "contractInfo"),
    ]);
    if (contractModule.contractInfo?.major !== CONTRACT_MAJOR) {
      throw new Error(
        `page library "${PAGE_LIBRARY}" contract major ${String(contractModule.contractInfo?.major)} is incompatible; expected ${CONTRACT_MAJOR}`,
      );
    }
    const Page = loaded.default ?? (loaded as Component);
    return defineComponent({
      name: `RenovationHost${exposedPath}`,
      setup() {
        const router = useRouter();
        const route = useRoute();
        const runtime = getRenovationRuntime();
        const getClient = () => context.ensureClient<StreamEngineClient>("streamEngineClient");
        const getFileClient = () => context.ensureClient<FileClient>("fileClient");
        const getOuaaClient = () => context.ensureClient<OuaaClient>("ouaaClient");
        const backPath = `${runtime.basePath}/${options?.activeMenuEntry ?? "renovation-list"}`;
        const notOperates = options?.notOperates === true || route.query.notOperates === "true";
        return () =>
          h(Page, {
            title: String(route.query.title ?? options?.title ?? "更新改造单"),
            type: String(route.query.type ?? "add"),
            businessType: String(route.query.businessType ?? runtime.applicationCode),
            processInstanceId: String(route.query.processInstanceId ?? ""),
            currentTaskId: String(route.query.currentTaskId ?? ""),
            status: String(route.query.status ?? ""),
            notOperates,
            applicationCode: runtime.applicationCode,
            // 旧门户流程配置：`/portal/stream-engine-render/approval/config?api=maintain/retrofit`
            ...(exposedPath === "ApprovalConfig" ? { approvalApiPrefix: "/api/maintain/retrofit" } : {}),
            getClient,
            getFileClient,
            getOuaaClient,
            onClose: () => {
              void router.push(backPath);
            },
          });
      },
    });
  } catch (error) {
    return pageLibraryErrorPage(error);
  }
}
