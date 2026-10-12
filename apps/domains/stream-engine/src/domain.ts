import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { DomainContext, DomainModule } from "@g2-composition/contract";
import { defineComponent, h, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  getStreamEngineApplicationCode,
  getStreamEngineClient,
  getStreamEngineContext,
  installStreamEngineContext,
} from "./domain-context";

const BASE = "/d/stream-engine";
const PAGE_LIBRARY = "streamEnginePages";
const CONTRACT_MAJOR = 1;

function pageLibraryErrorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "StreamEnginePageLibraryLoadError",
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

async function hostPage(
  exposedPath: string,
  options?: {
    title?: string;
    hideInMenuActivePath?: string;
    mapQuery?: boolean;
  },
): Promise<Component> {
  const context = getStreamEngineContext();
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
      name: `StreamEngineHost${exposedPath}`,
      setup() {
        const router = useRouter();
        const route = useRoute();
        const getClient = async (): Promise<StreamEngineClient> => getStreamEngineClient();
        const getOuaaClient = () => context.ensureClient("ouaaClient");
        const onNavigate = (payload: { page: string; query?: Record<string, string | undefined> }) => {
          const pathMap: Record<string, string> = {
            FlowformList: `${BASE}/flowform`,
            FormProcessDesign: `${BASE}/admin/design`,
            WorkOrderDesign: `${BASE}/admin/workOrderDesign`,
          };
          const target = pathMap[payload.page] ?? `${BASE}/flowform`;
          void router.push({ path: target, query: payload.query });
        };
        const queryProps = options?.mapQuery
          ? {
              formId: String(route.query.id ?? route.query.formId ?? ""),
              formType: String(route.query.type ?? "FLOW_FORM"),
              isCopy: route.query.isCopy === "true",
              groupId: route.query.group == null ? undefined : String(route.query.group),
              returnUrl: route.query.returnUrl == null ? undefined : String(route.query.returnUrl),
              title: String(route.query.title ?? options.title ?? ""),
            }
          : { title: options?.title };
        return () =>
          h(Page, {
            ...queryProps,
            applicationCode: getStreamEngineApplicationCode(),
            getClient,
            getOuaaClient,
            onNavigate,
            onClose: () => {
              void router.push(`${BASE}/flowform`);
            },
          });
      },
    });
  } catch (error) {
    return pageLibraryErrorPage(error);
  }
}

const domainModule: DomainModule = {
  routes: [
    { path: BASE, redirect: `${BASE}/flowform` },
    {
      path: `${BASE}/flowform`,
      name: "stream-engine-flowform",
      meta: { title: "表单管理" },
      component: () => hostPage("FlowformList", { title: "表单管理" }),
    },
    {
      path: `${BASE}/admin/design`,
      name: "stream-engine-design",
      meta: {
        title: "表单流程设计",
        hideInMenu: true,
        activeMenuPath: `${BASE}/flowform`,
      },
      component: () => hostPage("FormProcessDesign", { title: "表单流程设计", mapQuery: true }),
    },
    {
      path: `${BASE}/admin/workOrderDesign`,
      name: "stream-engine-work-order-design",
      meta: {
        title: "工单流程设计",
        hideInMenu: true,
        activeMenuPath: `${BASE}/flowform`,
      },
      component: () => hostPage("WorkOrderDesign", { title: "工单流程设计", mapQuery: true }),
    },
  ],
  menuContribution: [
    {
      label: "流引擎管理",
      iconKey: "stream-engine",
      children: [{ label: "表单管理", entry: "flowform", path: `${BASE}/flowform` }],
    },
  ],
  async install(_app, context: DomainContext, config) {
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<StreamEngineClient>("streamEngineClient");
    installStreamEngineContext(context, client, config);
  },
};

export default domainModule;
