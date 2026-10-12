import { Button, Empty, Input, Page, PageLayout, Space, Spin, TabPane, Tabs, Tree, message } from "@g2-platform/pc-ui";
import { defineComponent, onBeforeUnmount, onMounted, reactive, ref, type PropType } from "vue";

import DeviceMonitorCard, { type DeviceMonitorRecord, type PanelConfigItem } from "../components/device-monitor-card";
import PanelConfigDrawer from "../components/panel-config-drawer";
import { GEM_PAGE_KEYS } from "../page-keys";
import { normalizeAlarmPage } from "./normalize-page";
import type { GemPageProps } from "./page-props";

import styles from "./equipment-monitor-list.module.css";

type TreeNode = { key: string; title: string; children?: TreeNode[] };

function unwrap(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const root = raw as Record<string, unknown>;
  return root.data !== undefined ? root.data : raw;
}

function asRecordList(raw: unknown): Record<string, unknown>[] {
  const data = unwrap(raw);
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["records", "list", "statusListVos", "children"]) {
      if (Array.isArray(o[key])) return o[key] as Record<string, unknown>[];
    }
  }
  return [];
}

function mapAreaNodes(nodes: Record<string, unknown>[]): TreeNode[] {
  return nodes.map((n) => {
    const id = String(n.id ?? n.key ?? "");
    const children = Array.isArray(n.children) ? mapAreaNodes(n.children as Record<string, unknown>[]) : undefined;
    return {
      key: id,
      title: `${String(n.name ?? n.title ?? id)}${n.deviceNum != null || n.num != null ? `  ${n.deviceNum ?? n.num}` : ""}`,
      children,
    };
  });
}

const STATUS_LABEL: Record<string, string> = {
  ONLINE: "设备在线",
  OFFLINE: "设备离线",
  NORMAL: "设备正常",
  TROUBLE: "设备故障",
  ALARM: "设备报警",
};

function mapStatusNodes(raw: unknown): TreeNode[] {
  const data = unwrap(raw);
  const list =
    data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).statusListVos)
      ? ((data as Record<string, unknown>).statusListVos as Record<string, unknown>[])
      : asRecordList(raw);
  return list.map((item) => {
    const name = String(item.name ?? "");
    return {
      key: name,
      title: `${STATUS_LABEL[name] || String(item.title ?? name)}  ${item.num ?? item.deviceNum ?? ""}`.trim(),
    };
  });
}

function mapGenreNodes(raw: unknown): TreeNode[] {
  return asRecordList(raw).map((item) => {
    const key = String(item.deviceProdCategoryCodeConcat ?? item.genre ?? item.id ?? "");
    const name = String(item.deviceProdCategoryName ?? item.genreName ?? item.name ?? key);
    return { key, title: `${name}  ${item.num ?? item.deviceNum ?? ""}`.trim() };
  });
}

function mapCollectionNodes(raw: unknown): TreeNode[] {
  return asRecordList(raw).map((item) => {
    const key = String(item.deviceId ?? item.id ?? "");
    return {
      key,
      title: `${String(item.deviceName ?? item.name ?? key)}  ${item.num ?? ""}`.trim(),
    };
  });
}

export default defineComponent({
  name: "GemEquipmentMonitorList",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getDeviceClient: { type: Function as PropType<GemPageProps["getDeviceClient"]>, required: true },
    applicationCode: { type: String, default: "" },
    title: { type: String, default: "设备监测" },
  },
  setup(props) {
    const applicationCode = () => props.applicationCode || "DOORMANAGE";
    const activeTab = ref("1");
    const loading = ref(false);
    const cards = ref<DeviceMonitorRecord[]>([]);
    const treeData = ref<TreeNode[]>([]);
    const selectedKeys = ref<string[]>([]);
    const panelConfigList = ref<PanelConfigItem[]>([]);
    const drawerOpen = ref(false);
    const pollTimer = ref<ReturnType<typeof setTimeout> | null>(null);
    const alive = ref(true);
    const fullScreenStatus = ref(false);
    const search = reactive({
      pageNumber: 1,
      pageSize: 24,
      total: 0,
      keyword: "",
      areaId: undefined as string | undefined,
      deviceStatus: undefined as string | undefined,
      deviceProdCategoryCodeConcat: undefined as string | undefined,
      deviceId: undefined as string | undefined,
    });

    const clearFilterFields = () => {
      search.areaId = undefined;
      search.deviceStatus = undefined;
      search.deviceProdCategoryCodeConcat = undefined;
      search.deviceId = undefined;
    };

    const loadTree = async () => {
      const client = await props.getDeviceClient!();
      const code = applicationCode();
      if (activeTab.value === "1") treeData.value = mapAreaNodes(asRecordList(await client.getAreaTree(code)));
      else if (activeTab.value === "2") treeData.value = mapStatusNodes(await client.getStatusList(code));
      else if (activeTab.value === "3") treeData.value = mapGenreNodes(await client.getApplicationGenreVo(code));
      else treeData.value = mapCollectionNodes(await client.getDeviceCollection(code));
    };

    const loadPanelConfig = async () => {
      try {
        const client = await props.getDeviceClient!();
        const models = asRecordList(await client.getApplicationModels(applicationCode()));
        const businessKeys = models.map((m) => String(m.deviceProdId || "")).filter(Boolean);
        if (!businessKeys.length) {
          panelConfigList.value = [];
          return;
        }
        const raw = await client.getDevicePanelConfigList({
          businessKeys,
          applicationCode: applicationCode(),
          sceneType: "LIST_PANEL",
        });
        panelConfigList.value = asRecordList(raw) as PanelConfigItem[];
      } catch {
        panelConfigList.value = [];
      }
    };

    const loadCards = async (silent = false) => {
      if (!silent) loading.value = true;
      try {
        const client = await props.getDeviceClient!();
        const deviceStatus =
          search.deviceStatus === "ONLINE" || search.deviceStatus === "NORMAL"
            ? true
            : search.deviceStatus === "OFFLINE"
              ? false
              : search.deviceStatus || undefined;
        const page = normalizeAlarmPage(
          await client.getDeviceMonitoringPage(applicationCode(), {
            pageNumber: search.pageNumber,
            pageSize: search.pageSize,
            keyword: search.keyword || undefined,
            areaId: search.areaId,
            deviceStatus,
            deviceProdCategoryCodeConcat: search.deviceProdCategoryCodeConcat,
            deviceId: search.deviceId,
          }),
        );
        cards.value = page.records as DeviceMonitorRecord[];
        search.total = page.total;
      } catch (e) {
        if (!silent) {
          cards.value = [];
          search.total = 0;
          message.error(e instanceof Error ? e.message : "加载设备监测失败");
        }
      } finally {
        if (!silent) loading.value = false;
        if (alive.value) {
          if (pollTimer.value) clearTimeout(pollTimer.value);
          pollTimer.value = setTimeout(() => void loadCards(true), 5000);
        }
      }
    };

    const onTabChange = (key: string | number) => {
      activeTab.value = String(key);
      search.keyword = "";
      clearFilterFields();
      selectedKeys.value = [];
      search.pageNumber = 1;
      void loadTree();
      void loadCards();
    };

    const onSelect = (keys: (string | number)[]) => {
      const key = keys[0] != null ? String(keys[0]) : "";
      clearFilterFields();
      selectedKeys.value = key ? [key] : [];
      if (key) {
        if (activeTab.value === "1") search.areaId = key;
        else if (activeTab.value === "2") search.deviceStatus = key;
        else if (activeTab.value === "3") search.deviceProdCategoryCodeConcat = key;
        else search.deviceId = key;
      }
      search.pageNumber = 1;
      void loadCards();
    };

    const goDetail = (record: DeviceMonitorRecord) => {
      props.onNavigatePage({
        page: GEM_PAGE_KEYS.equipmentMonitorDetail,
        params: { id: String(record.deviceId || record.id || "") },
      });
    };

    const toggleCollection = async (record: DeviceMonitorRecord) => {
      const deviceId = String(record.deviceId || record.id || "");
      if (!deviceId) return;
      try {
        const client = await props.getDeviceClient!();
        await client.addDeviceCollection({ applicationCode: applicationCode(), deviceId });
        message.success("操作成功");
        void loadCards(true);
        if (activeTab.value === "4") void loadTree();
      } catch (err) {
        message.error(err instanceof Error ? err.message : "收藏失败");
      }
    };

    const handleFullscreenChange = () => {
      fullScreenStatus.value = Boolean(document.fullscreenElement);
    };

    const enterFullscreen = () => {
      const el = document.getElementById("pc-layout-container") || document.getElementById("pc-layout-content");
      if (!el) return;
      const anyEl = el as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
        mozRequestFullScreen?: () => Promise<void> | void;
        msRequestFullscreen?: () => Promise<void> | void;
      };
      if (anyEl.requestFullscreen) void anyEl.requestFullscreen();
      else if (anyEl.webkitRequestFullscreen) void anyEl.webkitRequestFullscreen();
      else if (anyEl.mozRequestFullScreen) void anyEl.mozRequestFullScreen();
      else if (anyEl.msRequestFullscreen) void anyEl.msRequestFullscreen();
      fullScreenStatus.value = true;
    };

    onMounted(() => {
      void loadPanelConfig();
      void loadTree();
      void loadCards();
      document.addEventListener("fullscreenchange", handleFullscreenChange);
    });

    onBeforeUnmount(() => {
      alive.value = false;
      if (pollTimer.value) clearTimeout(pollTimer.value);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    });

    const slots = {
      "layout-header": () => (
        <div class={styles.headerActions}>
          <div class={styles.searchRow}>
            <span class={styles.searchLabel}>设备名称：</span>
            <Input
              class={styles.searchInput}
              value={search.keyword}
              allowClear
              placeholder="请输入设备名称"
              onUpdate:value={(value: string) => {
                search.keyword = value;
              }}
              onPressEnter={() => {
                search.pageNumber = 1;
                void loadCards();
              }}
            />
            <Space size={16}>
              <Button
                type="primary"
                onClick={() => {
                  search.pageNumber = 1;
                  void loadCards();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  search.keyword = "";
                  search.pageNumber = 1;
                  void loadCards();
                }}
              >
                重置
              </Button>
            </Space>
          </div>
          <Space>
            <Button type="primary" onClick={() => (drawerOpen.value = true)}>
              面板配置
            </Button>
            <Button type="primary" onClick={enterFullscreen}>
              全屏
            </Button>
          </Space>
        </div>
      ),
      "layout-content": () => (
        <div class={styles.body}>
          {fullScreenStatus.value ? null : (
            <aside class={styles.left}>
              <Tabs activeKey={activeTab.value} size="small" destroyInactiveTabPane onChange={onTabChange}>
                <TabPane key="1" tab="设备区域" />
                <TabPane key="2" tab="设备状态" />
                <TabPane key="3" tab="产品品类" />
                <TabPane key="4" tab="我的收藏" />
              </Tabs>
              <div class={styles.treeWrap}>
                {treeData.value.length ? (
                  <Tree treeData={treeData.value} selectedKeys={selectedKeys.value} defaultExpandAll blockNode onSelect={onSelect} />
                ) : (
                  <Empty description="暂无数据" />
                )}
              </div>
            </aside>
          )}
          <section class={styles.right}>
            <div class={[styles.cardContent, fullScreenStatus.value ? styles.fullScreen : ""]}>
              {fullScreenStatus.value ? <div class={styles.sysTitle}>{props.title}</div> : null}
              {loading.value ? (
                <div class={styles.spinWrap}>
                  <Spin />
                </div>
              ) : cards.value.length ? (
                <div class={styles.cardData}>
                  {cards.value.map((item, index) => (
                    <div
                      key={String(item.deviceId || item.id || index)}
                      class={fullScreenStatus.value ? styles.cardFull : styles.cardNormal}
                    >
                      <DeviceMonitorCard
                        item={item}
                        panelsConfig={panelConfigList.value}
                        onMore={goDetail}
                        onToggleCollection={(rec) => void toggleCollection(rec)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div class={styles.emptyWrap}>
                  <Empty />
                </div>
              )}
            </div>
          </section>
          <PanelConfigDrawer
            open={drawerOpen.value}
            applicationCode={applicationCode()}
            getDeviceClient={props.getDeviceClient!}
            panelsConfig={panelConfigList.value}
            previewItem={cards.value[0] || null}
            onUpdate:open={(v: boolean) => {
              drawerOpen.value = v;
            }}
            onSaved={() => {
              void loadPanelConfig();
            }}
          />
        </div>
      ),
      "footer-page": () => (
        <Page
          current={search.pageNumber}
          pageSize={search.pageSize}
          total={search.total}
          showSizeChanger
          pageSizeOptions={["24", "36", "48"]}
          showTotal={(total: number) => `共 ${total} 条数据`}
          onPageChange={(pageNumber: number, pageSize: number) => {
            search.pageNumber = pageNumber;
            search.pageSize = pageSize;
            void loadCards();
          }}
        />
      ),
    };

    return () => <PageLayout title={props.title} v-slots={slots} />;
  },
});
