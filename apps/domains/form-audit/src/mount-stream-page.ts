import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import { type Component, defineComponent, h } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getFormAuditContext } from "./domain-context";
import { APPLICATION_CODE } from "./shared";

const PAGE_LIBRARY = "streamEnginePages";
const CONTRACT_MAJOR = 1;

function errorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "FormAuditStreamPageLoadError",
    setup: () => () =>
      h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
        h("h2", "流引擎共享页面加载失败"),
        h("p", { style: "color:#8c8c8c" }, message),
        h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
      ]),
  });
}

export async function hostStreamEnginePage(
  exposedPath: "StreamEngineRender" | "WorkOrderDesign",
  options: { title: string; activeMenuPath: string },
): Promise<Component> {
  const context = getFormAuditContext();
  try {
    const [loaded, contractModule] = await Promise.all([
      context.loadPageLibrary<{ default?: Component }>(PAGE_LIBRARY, exposedPath),
      context.loadPageLibrary<{ contractInfo?: { major?: number } }>(PAGE_LIBRARY, "contractInfo"),
    ]);
    if (contractModule.contractInfo?.major !== CONTRACT_MAJOR) {
      throw new Error(`page library "${PAGE_LIBRARY}" contract major is incompatible`);
    }
    const Page = loaded.default ?? (loaded as Component);
    return defineComponent({
      name: `FormAuditHost${exposedPath}`,
      setup() {
        const route = useRoute();
        const router = useRouter();
        const getClient = () => context.ensureClient<StreamEngineClient>("streamEngineClient");
        const getFileClient = () => context.ensureClient<FileClient>("fileClient");
        const getOuaaClient = () => context.ensureClient<OuaaClient>("ouaaClient");
        return () =>
          h(
            Page,
            exposedPath === "WorkOrderDesign"
              ? {
                  formId: String(route.query.id ?? route.query.formId ?? ""),
                  formType: String(route.query.formType ?? route.query.type ?? "CUSTOM_FORM"),
                  isCopy: route.query.isCopy === "true",
                  groupId: route.query.groupId === null || route.query.groupId === undefined ? undefined : String(route.query.groupId),
                  returnUrl: options.activeMenuPath,
                  title: String(route.query.title ?? options.title),
                  applicationCode: APPLICATION_CODE,
                  getClient,
                  getOuaaClient,
                  onClose: () => void router.push(options.activeMenuPath),
                }
              : {
                  title: String(route.query.title ?? options.title),
                  type: String(route.query.type ?? "detail"),
                  businessType: String(route.query.businessType ?? ""),
                  processInstanceId: String(route.query.processInstanceId ?? ""),
                  currentTaskId: String(route.query.currentTaskId ?? ""),
                  status: String(route.query.status ?? ""),
                  notOperates: route.query.notOperates,
                  applicationCode: APPLICATION_CODE,
                  getClient,
                  getFileClient,
                  getOuaaClient,
                  onClose: () => void router.push(options.activeMenuPath),
                },
          );
      },
    });
  } catch (error) {
    return errorPage(error);
  }
}
