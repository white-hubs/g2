import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { LineLossManagementClient } from "@g2-client/line-loss-management/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext, DomainModule } from "@g2-composition/contract";
import { GEM_ACTION_KEYS, GEM_PAGE_KEYS, type GemCapabilityCodes, type NavigatePage } from "@g2-pages/generic-equipment-monitor";
import { type Component, defineComponent, h } from "vue";
import { useRoute, useRouter } from "vue-router";

import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY } from "./domain-context";

import "./styles.css";

const BASE = "/d/line-loss-management";
const APPLICATION_CODE = "LINE_LOSS_MANAGEMENT";
const GEM_LIBRARY = "genericEquipmentMonitorPages";
let installContext: DomainContext | null = null;

const GEM_CODES: GemCapabilityCodes = {
  page: {
    [GEM_PAGE_KEYS.alarmRecord]: "GEM_ALARM",
    [GEM_PAGE_KEYS.alarmDetail]: "GEM_ALARM_DETAIL",
    [GEM_PAGE_KEYS.alarmConfigList]: "GEM_ALARM_CONFIG",
    [GEM_PAGE_KEYS.alarmConfigureAdd]: "GEM_ALARM_CONFIG_EDIT",
  },
  action: {
    [GEM_ACTION_KEYS.exportAlarm]: "GEM_ALARM_EXPORT",
    [GEM_ACTION_KEYS.ackAlarm]: "GEM_ALARM_ACK",
    [GEM_ACTION_KEYS.alarmRecordDelete]: "GEM_ALARM_DELETE",
    [GEM_ACTION_KEYS.alarmConfigCreate]: "GEM_ALARM_CONFIG_CREATE",
    [GEM_ACTION_KEYS.alarmConfigDetail]: "GEM_ALARM_CONFIG_DETAIL",
    [GEM_ACTION_KEYS.alarmConfigEdit]: "GEM_ALARM_CONFIG_EDIT",
    [GEM_ACTION_KEYS.alarmConfigCopy]: "GEM_ALARM_CONFIG_COPY",
    [GEM_ACTION_KEYS.alarmConfigEnable]: "GEM_ALARM_CONFIG_ENABLE",
    [GEM_ACTION_KEYS.alarmConfigDelete]: "GEM_ALARM_CONFIG_DELETE",
  },
};

function context(): DomainContext {
  if (!installContext) {
    throw new Error("line-loss-management domain not installed");
  }
  return installContext;
}

function sharedPageError(title: string, error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "LineLossSharedPageLoadError",
    setup: () => () =>
      h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [h("h2", title), h("p", { style: "color:#8c8c8c" }, message)]),
  });
}

async function hostGemPage(
  exposedPath: "AlarmRecord" | "AlarmDetail" | "AlarmConfigList" | "AlarmConfigureAdd",
  idAs?: "alarmId" | "ruleId",
): Promise<Component> {
  try {
    const [loaded, contract] = await Promise.all([
      context().loadPageLibrary<{ default?: Component }>(GEM_LIBRARY, exposedPath),
      context().loadPageLibrary<{ contractInfo?: { major?: number } }>(GEM_LIBRARY, "contractInfo"),
    ]);
    if (contract.contractInfo?.major !== 1) {
      throw new Error(`page library contract major ${String(contract.contractInfo?.major)} is incompatible`);
    }
    const Page = loaded.default ?? (loaded as Component);
    return defineComponent({
      name: `LineLoss${exposedPath}Host`,
      setup() {
        const router = useRouter();
        const route = useRoute();
        const id = String(route.query.id ?? "");
        const onNavigatePage: NavigatePage = (payload) => {
          const entry =
            payload.page === GEM_PAGE_KEYS.alarmDetail
              ? "alarmDetail"
              : payload.page === GEM_PAGE_KEYS.alarmConfigureAdd
                ? "alarmConfigureAdd"
                : payload.page;
          void router.push({
            path: `${BASE}/${entry}`,
            query: Object.fromEntries(Object.entries(payload.params ?? {}).map(([key, value]) => [key, String(value)])),
          });
        };
        const idProps =
          idAs === "alarmId"
            ? { alarmId: id }
            : idAs === "ruleId"
              ? { ruleId: id, mode: String(route.query.type ?? (id ? "edit" : "add")), copy: String(route.query.copy ?? "") }
              : {};
        return () =>
          h(Page, {
            codes: GEM_CODES,
            functionCodes: [...context().getFunctionCodes()],
            applicationCode: APPLICATION_CODE,
            onNavigatePage,
            getAlarmClient: () => context().ensureClient<AlarmCenterClient>("alarmCenterClient"),
            getDeviceClient: () => context().ensureClient<DeviceCenterClient>("deviceCenterClient"),
            getDictionaryClient: () => context().ensureClient<DictionaryClient>("dictionaryClient"),
            getFileClient: () => context().ensureClient<FileClient>("fileClient"),
            getOuaaClient: () => context().ensureClient<OuaaClient>("ouaaClient"),
            ...idProps,
          });
      },
    });
  } catch (error) {
    return sharedPageError("共享预警页面加载失败", error);
  }
}

/** 线上菜单指向 /portal/graphEditor/lineLoss，G2 侧托管 pcGraphEditor 的 LineLoss 共享页。 */
async function hostGraphLineLossPage(): Promise<Component> {
  try {
    const loaded = (await context().loadRuntimeCommon("pcGraphEditor", "LineLoss")) as {
      default?: Component;
      LineLossPage?: Component;
    };
    const Page = loaded.default ?? loaded.LineLossPage;
    if (!Page) {
      throw new Error("pcGraphEditor/LineLoss did not export a page component");
    }
    return defineComponent({
      name: "LineLossGraphEditorHost",
      setup() {
        return () =>
          h(Page, {
            getClient: () => context().ensureClient<LineLossManagementClient>("lineLossManagementClient"),
          });
      },
    });
  } catch (error) {
    return sharedPageError("线损拓扑共享页加载失败", error);
  }
}

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "line-loss-management-home", meta: { title: "线损管理" }, redirect: `${BASE}/line-loss` },
    { path: `${BASE}/line-loss`, name: "line-loss-dashboard", meta: { title: "线损管理" }, component: () => hostGraphLineLossPage() },
    {
      path: `${BASE}/alarmRecord`,
      name: "line-loss-alarm-record",
      meta: { title: "预警列表" },
      component: () => hostGemPage("AlarmRecord"),
    },
    {
      path: `${BASE}/alarmDetail`,
      name: "line-loss-alarm-detail",
      meta: { title: "预警详情", hideInMenu: true, activeMenuPath: `${BASE}/alarmRecord` },
      component: () => hostGemPage("AlarmDetail", "alarmId"),
    },
    {
      path: `${BASE}/alarmConfigList`,
      name: "line-loss-alarm-config",
      meta: { title: "预警规则" },
      component: () => hostGemPage("AlarmConfigList"),
    },
    {
      path: `${BASE}/alarmConfigureAdd`,
      name: "line-loss-alarm-config-edit",
      meta: { title: "预警规则配置", hideInMenu: true, activeMenuPath: `${BASE}/alarmConfigList` },
      component: () => hostGemPage("AlarmConfigureAdd", "ruleId"),
    },
    {
      path: `${BASE}/power-relation`,
      name: "line-loss-power-relation",
      meta: { title: "供电关系", hideInMenu: true, activeMenuPath: `${BASE}/line-loss` },
      component: () => import("./views/power-relation"),
    },
    {
      path: `${BASE}/drawing-management`,
      name: "line-loss-drawing-management",
      meta: { title: "图纸管理", hideInMenu: true, activeMenuPath: `${BASE}/line-loss` },
      component: () => import("./views/drawing-management"),
    },
    {
      path: `${BASE}/drawing-management-edit`,
      name: "line-loss-drawing-management-edit",
      meta: { title: "电气图纸", hideInMenu: true, activeMenuPath: `${BASE}/line-loss` },
      component: () => import("./views/drawing-management-edit"),
    },
    {
      path: `${BASE}/collection-cycle`,
      name: "line-loss-collection-cycle",
      meta: { title: "采集周期" },
      component: () => import("./views/collection-cycle"),
    },
    {
      path: `${BASE}/collection-record`,
      name: "line-loss-collection-record",
      meta: { title: "采集记录" },
      component: () => import("./views/collection-record"),
    },
    {
      path: `${BASE}/loss-statistics`,
      name: "line-loss-statistics",
      meta: { title: "损耗统计" },
      component: () => import("./views/loss-statistics"),
    },
  ],
  menuContribution: [
    { label: "线损管理", iconKey: "line-loss-management", entry: "line-loss", path: `${BASE}/line-loss` },
    {
      label: "线损预警",
      iconKey: "line-loss-management",
      children: [
        { label: "预警列表", entry: "alarmRecord", path: `${BASE}/alarmRecord` },
        { label: "预警规则", entry: "alarmConfigList", path: `${BASE}/alarmConfigList` },
      ],
    },
    {
      label: "业务配置",
      iconKey: "line-loss-management",
      children: [{ label: "采集周期", entry: "collection-cycle", path: `${BASE}/collection-cycle` }],
    },
    {
      label: "数据统计",
      iconKey: "line-loss-management",
      children: [
        { label: "采集记录", entry: "collection-record", path: `${BASE}/collection-record` },
        { label: "损耗统计", entry: "loss-statistics", path: `${BASE}/loss-statistics` },
      ],
    },
  ],
  async install(app, ctx) {
    installContext = ctx;
    await Promise.all([ctx.loadRuntimeCommon("pcUi", "index"), ctx.loadRuntimeCommon("pcGraphEditor", "LineLoss")]);
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcGraphEditor", "platform");
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
    app.provide(APPLICATION_CODE_KEY, APPLICATION_CODE);
  },
};

export default domainModule;
