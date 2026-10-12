import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncRuntimeCommonComponent } from "@g2-runtime/common-loader/vue";
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from "vue";

import { getSecurityDeviceClient, getSecurityMonitorClient } from "../domain-context";
import { type SecurityRecord, normalizePage, normalizeRecord, recordId, text, unwrapData } from "./data";
import { defineAsyncSecurityPcUiComponent, defineAsyncSecurityPcUiComponentMember, showSecurityPcUiMessage } from "./pc-ui-runtime";

import styles from "./security-monitor.module.css";

type CubePlayerComponent = (typeof import("@g2-platform/pc-player"))["CubePlayer"];
const CubePlayer = defineAsyncRuntimeCommonComponent<CubePlayerComponent>(loadRuntimeCommon, "pcPlayer", "index", "CubePlayer");

type CameraSlot = SecurityRecord | null;
type MonitorTreeNode = SecurityRecord & {
  key: string;
  name: string;
  children?: MonitorTreeNode[];
  isArea: boolean;
};

const SESSION_KEY = "SECURITY_MONITORING_SEARCH";
const GRID_OPTIONS = ["1X1", "2X2", "3X3", "4X4"];
const WEEKDAY_LABELS = ["天", "一", "二", "三", "四", "五", "六"];
const Button = defineAsyncSecurityPcUiComponent("Button");
const Empty = defineAsyncSecurityPcUiComponent("Empty");
const Input = defineAsyncSecurityPcUiComponent("Input");
const Modal = defineAsyncSecurityPcUiComponent("Modal");
const PageLayout = defineAsyncSecurityPcUiComponent("PageLayout");
const PopConfirm = defineAsyncSecurityPcUiComponent("PopConfirm");
const RadioGroup = defineAsyncSecurityPcUiComponent("RadioGroup");
const RadioButton = defineAsyncSecurityPcUiComponentMember("Radio", "Button");
const Space = defineAsyncSecurityPcUiComponent("Space");
const Spin = defineAsyncSecurityPcUiComponent("Spin");
const Switch = defineAsyncSecurityPcUiComponent("Switch");
const TabPane = defineAsyncSecurityPcUiComponent("TabPane");
const Tabs = defineAsyncSecurityPcUiComponent("Tabs");
const Tree = defineAsyncSecurityPcUiComponent("Tree");

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function monitorTime(value: Date): string {
  const date = `${value.getFullYear()}-${twoDigits(value.getMonth() + 1)}-${twoDigits(value.getDate())}`;
  const time = `${twoDigits(value.getHours())}:${twoDigits(value.getMinutes())}:${twoDigits(value.getSeconds())}`;
  return `星期${WEEKDAY_LABELS[value.getDay()]}  ${date} ${time}`;
}

function asList(raw: unknown): SecurityRecord[] {
  const value = unwrapData(raw);
  if (Array.isArray(value)) {
    return value as SecurityRecord[];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  const root = value as SecurityRecord;
  const list = [root.records, root.list, root.children].find((item) => Array.isArray(item));
  return (list as SecurityRecord[] | undefined) ?? [];
}

function cameraId(camera: SecurityRecord): string {
  return String(camera.deviceId ?? camera.id ?? camera.key ?? "");
}

function cameraName(camera: SecurityRecord): string {
  return text(camera, "deviceName", "name", "code");
}

function isOnline(node: SecurityRecord): boolean {
  const value = node.status ?? node.deviceStatus ?? (node.onlineState as unknown);
  return value === true || value === 1 || ["ONLINE", "ON_LINE", "NORMAL", "1"].includes(String(value).toUpperCase());
}

function hasAiTag(node: SecurityRecord): boolean {
  return (
    Array.isArray(node.tags) &&
    node.tags.some((tag) => String((tag as SecurityRecord).tagCode) === "builtin.usage::artificial_intelligence")
  );
}

function toAreaTree(nodes: SecurityRecord[], prefix = "area"): MonitorTreeNode[] {
  return nodes.map((node, index) => {
    const children = Array.isArray(node.children) ? toAreaTree(node.children as SecurityRecord[], `${prefix}-${index}`) : [];
    const type = String(node.type ?? "").toLowerCase();
    const isArea = type === "area" || (type === "" && children.length > 0);
    const key = String(node.id ?? node.deviceId ?? node.key ?? `${prefix}-${index}`);
    return {
      ...node,
      key,
      id: node.id ?? key,
      name: cameraName(node),
      isArea,
      children: children.length > 0 ? children : undefined,
    };
  });
}

function toGroupDevice(device: SecurityRecord, groupKey: string, index: number): MonitorTreeNode {
  return {
    ...device,
    key: String(device.id ?? device.deviceId ?? `${groupKey}-${index}`),
    id: device.id ?? device.deviceId,
    name: cameraName(device),
    isArea: false,
  };
}

function toGroupTree(groups: SecurityRecord[]): MonitorTreeNode[] {
  return groups.map((group, index) => {
    const groupKey = String(group.id ?? group.key ?? index);
    const children = (Array.isArray(group.devices) ? group.devices : []).map((device: SecurityRecord, deviceIndex: number) =>
      toGroupDevice(device, groupKey, deviceIndex),
    );
    return {
      ...group,
      key: `group-${groupKey}`,
      name: text(group, "name", "groupName"),
      isArea: true,
      children,
    };
  });
}

function filterTree(nodes: MonitorTreeNode[], keyword: string, hideEmptyAreas = false): MonitorTreeNode[] {
  const query = keyword.trim().toLowerCase();
  return nodes.flatMap((node) => {
    const children = node.children ? filterTree(node.children, keyword, hideEmptyAreas) : undefined;
    const ownMatch = node.name.toLowerCase().includes(query);
    if (node.isArea) {
      const deviceCount = Number(node.deviceCount ?? children?.length ?? 0);
      if (hideEmptyAreas && deviceCount === 0 && !children?.length) {
        return [];
      }
      if (query && !ownMatch && !children?.length) {
        return [];
      }
      return [{ ...node, children }];
    }
    return !query || ownMatch ? [{ ...node, children: undefined }] : [];
  });
}

export default defineComponent({
  name: "SecurityMonitorMultipleVideoPage",
  setup() {
    const notify = async (level: "error" | "info" | "success" | "warning", error: unknown, fallback: string): Promise<void> => {
      await showSecurityPcUiMessage(level, error instanceof Error ? error.message : fallback);
    };
    const loading = ref(false);
    const activeTab = ref("space");
    const areaTree = ref<MonitorTreeNode[]>([]);
    const groupTree = ref<MonitorTreeNode[]>([]);
    const collections = ref<SecurityRecord[]>([]);
    const areaKeyword = ref("");
    const groupKeyword = ref("");
    const hideEmptyAreas = ref(false);
    const selectedAreaKeys = ref<string[]>([]);
    const selectedGroupKeys = ref<string[]>([]);
    const selectedCollectionId = ref("");
    const grid = ref("4X4");
    const cameraSlots = ref<CameraSlot[]>(Array.from({ length: 16 }, () => null));
    const selectedSlot = ref<number | null>(null);
    const editorOpen = ref(false);
    const editingId = ref("");
    const collectionName = ref("");
    const nowTime = ref(monitorTime(new Date()));
    let clockTimer: ReturnType<typeof setInterval> | undefined;

    const gridSide = computed(() => Number(grid.value.split("X")[0]) || 2);
    const capacity = computed(() => gridSide.value * gridSide.value);
    const visibleAreaTree = computed(() => filterTree(areaTree.value, areaKeyword.value, hideEmptyAreas.value));
    const visibleGroupTree = computed(() => filterTree(groupTree.value, groupKeyword.value));

    const resizeSlots = (): void => {
      const devices = cameraSlots.value.filter(Boolean).slice(0, capacity.value);
      cameraSlots.value = [...devices, ...Array.from({ length: Math.max(capacity.value - devices.length, 0) }, () => null)];
      selectedSlot.value = null;
    };

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const [api, deviceApi] = await Promise.all([getSecurityMonitorClient(), getSecurityDeviceClient()]);
        const [treeRaw, collectionRaw, groupRaw] = await Promise.all([
          api.getVideoDeviceTree({ pageNumber: 1, pageSize: 1000 }),
          api.listVideoCollections({ pageNumber: 1, pageSize: 1000 }),
          deviceApi.getDeviceGroupDevicesAll("builtin.app::SECURITY_MONITORING").catch(() => []),
        ]);
        areaTree.value = toAreaTree(asList(treeRaw));
        collections.value = normalizePage(collectionRaw).records;
        groupTree.value = toGroupTree(asList(groupRaw));
      } catch (error) {
        await notify("error", error, "视频数据加载失败");
      } finally {
        loading.value = false;
      }
    };

    const putCameraIntoSlot = (camera: SecurityRecord): void => {
      if (!cameraId(camera)) {
        return;
      }
      const sameIndex = cameraSlots.value.findIndex((item) => item && cameraId(item) === cameraId(camera));
      if (sameIndex !== -1) {
        selectedSlot.value = sameIndex;
        return;
      }
      const target = selectedSlot.value ?? cameraSlots.value.findIndex((item) => !item);
      const index = target >= 0 && target < capacity.value ? target : 0;
      cameraSlots.value.splice(index, 1, camera);
      selectedSlot.value = null;
    };

    const selectTreeNode = (_selectedKeys: (string | number)[], info: { selectedNodes?: unknown[]; node?: unknown }): void => {
      const node = (info.selectedNodes?.[0] ?? info.node) as MonitorTreeNode | undefined;
      if (!node || node.isArea) {
        if (node) {
          void notify("warning", null, "请选择区域设备");
        }
        return;
      }
      putCameraIntoSlot(node);
    };

    const loadCollection = async (collection: SecurityRecord): Promise<void> => {
      const id = recordId(collection);
      const detail = normalizeRecord(await (await getSecurityMonitorClient()).getVideoCollection(id));
      const row = Number(detail.row ?? collection.row ?? 2);
      const col = Number(detail.col ?? collection.col ?? row);
      grid.value = row === col && row >= 1 && row <= 4 ? `${row}X${col}` : "2X2";
      cameraSlots.value = Array.from({ length: capacity.value }, () => null);
      const items = (Array.isArray(detail.cameraVOS) ? detail.cameraVOS : []).toSorted((a, b) => Number(a.sort ?? 0) - Number(b.sort ?? 0));
      items.forEach((camera: SecurityRecord, index: number) => {
        const slot = Math.min(Number(camera.sort ?? index), capacity.value - 1);
        cameraSlots.value[slot] = camera;
      });
      selectedCollectionId.value = id;
      selectedSlot.value = null;
      if (items.length === 0) {
        await notify("info", null, "该收藏暂无摄像机");
      }
    };

    const openEditor = async (collection?: SecurityRecord): Promise<void> => {
      if (!collection && !cameraSlots.value.some(Boolean)) {
        await notify("warning", null, "请选择收藏的设备!");
        return;
      }
      editingId.value = collection ? recordId(collection) : "";
      collectionName.value = collection ? text(collection, "name").replace(/^--$/u, "") : "";
      if (collection && selectedCollectionId.value !== editingId.value) {
        await loadCollection(collection);
      }
      editorOpen.value = true;
    };

    const saveCollection = async (): Promise<void> => {
      if (!collectionName.value.trim()) {
        await notify("warning", null, "请输入收藏名称");
        return;
      }
      const payload = {
        name: collectionName.value.trim(),
        row: gridSide.value,
        col: gridSide.value,
        cameraParams: cameraSlots.value.flatMap((camera, sort) => (camera ? [{ deviceId: cameraId(camera), sort }] : [])),
      };
      const api = await getSecurityMonitorClient();
      if (editingId.value) {
        await api.updateVideoCollection(editingId.value, payload);
      } else {
        await api.createVideoCollection(payload);
      }
      await notify("success", null, editingId.value ? "修改成功！" : "收藏成功！");
      editorOpen.value = false;
      collections.value = normalizePage(await api.listVideoCollections({ pageNumber: 1, pageSize: 1000 })).records;
    };

    const renderTreeTitle = (node: MonitorTreeNode) => (
      <div class={styles.monitorNodeTitle}>
        {hasAiTag(node) ? <span class={styles.aiTag}>Ai</span> : null}
        <span class={styles.monitorNodeName}>
          {node.name}
          {node.isArea ? ` (${Number(node.deviceCount ?? 0)})` : ""}
        </span>
        {!node.isArea ? <span class={[styles.statusDot, isOnline(node) ? styles.statusOnline : styles.statusOffline]} /> : null}
      </div>
    );

    const renderVideoSlot = (camera: CameraSlot, index: number) => (
      <div
        class={[styles.videoSlot, selectedSlot.value === index ? styles.videoSlotSelected : ""]}
        key={`${index}-${camera ? cameraId(camera) : "empty"}`}
        onClick={() => (selectedSlot.value = index)}
      >
        {camera ? (
          <>
            <div class={styles.videoSlotHeader}>
              <span>{cameraName(camera)}</span>
              <div class={styles.videoSlotControls}>
                <time class={styles.videoSlotTime}>{nowTime.value}</time>
                <button
                  type="button"
                  class={styles.videoClose}
                  aria-label="关闭视频"
                  onClick={(event) => {
                    event.stopPropagation();
                    cameraSlots.value.splice(index, 1, null);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div class={styles.videoPlayer}>
              <CubePlayer deviceId={cameraId(camera)} control />
            </div>
          </>
        ) : (
          <div class={styles.videoPlaceholder}>
            <strong>请点击左侧摄像机名称</strong>
            <span>查看实时视频</span>
          </div>
        )}
      </div>
    );

    const restoreSession = (): void => {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) {
          return;
        }
        const cached = JSON.parse(raw) as { grid?: string; cameraList?: CameraSlot[]; activeKey?: string; checkedCollectId?: string };
        if (cached.grid && GRID_OPTIONS.includes(cached.grid)) {
          grid.value = cached.grid;
        }
        if (Array.isArray(cached.cameraList)) {
          cameraSlots.value = cached.cameraList;
        }
        if (cached.activeKey) {
          activeTab.value = cached.activeKey === "selfSet" ? "space" : cached.activeKey;
        }
        selectedCollectionId.value = cached.checkedCollectId ?? "";
        resizeSlots();
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    };

    onMounted(async () => {
      restoreSession();
      clockTimer = setInterval(() => {
        nowTime.value = monitorTime(new Date());
      }, 1000);
      await load();
    });
    onBeforeUnmount(() => {
      if (clockTimer) {
        clearInterval(clockTimer);
      }
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          grid: grid.value,
          cameraList: cameraSlots.value,
          activeKey: activeTab.value,
          checkedCollectId: selectedCollectionId.value,
        }),
      );
    });

    const slots = {
      "layout-content": () => (
        <div class={styles.realtimeWorkspace}>
          <aside class={styles.realtimeSidebar}>
            <Tabs
              activeKey={activeTab.value}
              onChange={(value) => {
                activeTab.value = String(value);
                if (String(value) === "space") {
                  selectedCollectionId.value = "";
                }
              }}
            >
              <TabPane key="space" tab="空间">
                <div class={styles.sidebarSearch}>
                  <Input
                    value={areaKeyword.value}
                    allowClear
                    placeholder="摄像机名称/区域"
                    onUpdate:value={(value: string) => (areaKeyword.value = value)}
                  />
                  <Button type="primary">查询</Button>
                </div>
                <div class={styles.hideEmptySwitch}>
                  <span>隐藏无设备区域:</span>
                  <Switch checked={hideEmptyAreas.value} onChange={(checked) => (hideEmptyAreas.value = Boolean(checked))} />
                </div>
                <div class={styles.monitorTreeScroll}>
                  <Spin spinning={loading.value}>
                    {visibleAreaTree.value.length > 0 ? (
                      <Tree
                        treeData={visibleAreaTree.value}
                        fieldNames={{ title: "name", key: "key", children: "children" }}
                        selectedKeys={selectedAreaKeys.value}
                        defaultExpandAll
                        onUpdate:selectedKeys={(keys) => (selectedAreaKeys.value = keys.map(String))}
                        onSelect={selectTreeNode}
                        v-slots={{ title: renderTreeTitle }}
                      />
                    ) : (
                      <Empty description="暂无摄像机" />
                    )}
                  </Spin>
                </div>
              </TabPane>
              <TabPane key="grouping" tab="监控分组">
                <div class={styles.sidebarSearch}>
                  <Input
                    value={groupKeyword.value}
                    allowClear
                    placeholder="监控名称/分组"
                    onUpdate:value={(value: string) => (groupKeyword.value = value)}
                  />
                  <Button type="primary">查询</Button>
                </div>
                <div class={styles.monitorTreeScroll}>
                  {visibleGroupTree.value.length > 0 ? (
                    <Tree
                      treeData={visibleGroupTree.value}
                      fieldNames={{ title: "name", key: "key", children: "children" }}
                      selectedKeys={selectedGroupKeys.value}
                      defaultExpandAll={Boolean(groupKeyword.value.trim())}
                      onUpdate:selectedKeys={(keys) => (selectedGroupKeys.value = keys.map(String))}
                      onSelect={selectTreeNode}
                      v-slots={{ title: renderTreeTitle }}
                    />
                  ) : (
                    <Empty description="暂无监控分组" />
                  )}
                </div>
              </TabPane>
              <TabPane key="collect" tab="我的收藏">
                <div class={styles.monitorCollectionList}>
                  {collections.value.length > 0 ? (
                    collections.value.map((collection) => (
                      <div
                        class={[
                          styles.monitorCollectionItem,
                          selectedCollectionId.value === recordId(collection) ? styles.monitorCollectionActive : "",
                        ]}
                        key={recordId(collection)}
                        onClick={() => void loadCollection(collection)}
                      >
                        <span>{text(collection, "name")}</span>
                        <Space size={12}>
                          <button
                            type="button"
                            class={styles.collectionAction}
                            onClick={(event) => {
                              event.stopPropagation();
                              void openEditor(collection);
                            }}
                          >
                            编辑
                          </button>
                          <PopConfirm
                            title="是否确认删除该条收藏"
                            onConfirm={async () => {
                              await (await getSecurityMonitorClient()).deleteVideoCollection(recordId(collection));
                              await notify("success", null, "删除成功！");
                              await load();
                            }}
                          >
                            <button
                              type="button"
                              class={[styles.collectionAction, styles.collectionDelete]}
                              onClick={(event) => event.stopPropagation()}
                            >
                              删除
                            </button>
                          </PopConfirm>
                        </Space>
                      </div>
                    ))
                  ) : (
                    <Empty description="暂无收藏" />
                  )}
                </div>
              </TabPane>
            </Tabs>
          </aside>

          <section class={styles.realtimeMain}>
            <div class={styles.realtimeToolbar}>
              <RadioGroup
                class={styles.gridSelector}
                buttonStyle="solid"
                value={grid.value}
                onChange={(event) => {
                  grid.value = event.target.value;
                  resizeSlots();
                }}
              >
                {GRID_OPTIONS.map((value) => (
                  <RadioButton key={value} value={value}>
                    {value}
                  </RadioButton>
                ))}
              </RadioGroup>
              <Button onClick={() => void openEditor()}>添加收藏</Button>
            </div>
            <div
              class={styles.realtimeVideoGrid}
              style={{
                gridTemplateColumns: `repeat(${gridSide.value}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSide.value}, minmax(0, 1fr))`,
              }}
            >
              {cameraSlots.value.map(renderVideoSlot)}
            </div>
          </section>

          <Modal
            open={editorOpen.value}
            centered
            title={editingId.value ? "编辑收藏" : "添加收藏"}
            onCancel={() => (editorOpen.value = false)}
            onOk={() => void saveCollection()}
          >
            <div class={styles.collectionFormRow}>
              <label>收藏名称</label>
              <Input
                value={collectionName.value}
                maxlength={20}
                placeholder="请输入收藏名称"
                onUpdate:value={(value: string) => (collectionName.value = value)}
              />
            </div>
          </Modal>
        </div>
      ),
    };

    return () => <PageLayout title="实时监控" v-slots={slots} showFooter={false} />;
  },
});
