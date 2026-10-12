import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import { defineComponent, h, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getProblemsContext } from "./domain-context";

const PAGE_LIBRARY = "streamEnginePages";
const CONTRACT_MAJOR = 1;
const BASE = "/d/problems";

function pageLibraryErrorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "ProblemsStreamEngineLoadError",
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
  options?: { title?: string; activeMenuEntry?: string },
): Promise<Component> {
  const context = getProblemsContext();
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
      name: `ProblemsHost${exposedPath}`,
      setup() {
        const router = useRouter();
        const route = useRoute();
        const getClient = () => context.ensureClient<StreamEngineClient>("streamEngineClient");
        const getFileClient = () => context.ensureClient<FileClient>("fileClient");
        const getOuaaClient = () => context.ensureClient<OuaaClient>("ouaaClient");
        const backPath = options?.activeMenuEntry ? `${BASE}/${options.activeMenuEntry}` : `${BASE}/problems-list`;
        return () =>
          h(Page, {
            title: String(route.query.title ?? options?.title ?? "隐患排查"),
            type: String(route.query.type ?? "add"),
            businessType: String(route.query.businessType ?? "HIDDENDANGER"),
            processInstanceId: String(route.query.processInstanceId ?? ""),
            currentTaskId: String(route.query.currentTaskId ?? ""),
            status: String(route.query.status ?? ""),
            notOperates: route.query.notOperates,
            applicationCode: "HIDDENDANGER",
            approvalApiPrefix: "/api/maintain/hidden",
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
