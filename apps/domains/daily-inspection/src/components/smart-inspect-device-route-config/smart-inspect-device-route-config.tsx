// @ts-nocheck -- 从 cube daily-inspection smart-inspect-device-route-config 迁入。
import { Button, PopOver, Select, Space, TabPane, Tabs, message } from "@g2-platform/pc-ui";
import { computed, defineComponent, nextTick, reactive, ref, watch, type PropType } from "vue";

import { InspectItemTable, InspectStandardTable, useCubeModal, useCubeTable } from "@/compat/app-design";
import { InspectBusinessType } from "@/compat/constants";
import { getDailyInspectionClient } from "@/domain-context";
import { SiteDeviceSelectModal, type SiteDeviceOption } from "@/views/inspect-config/site-configuration/device-select-modal";
import {
  createSmartInspectPointFromDronePlanContent,
  type SmartInspectDeviceRouteConfigValue,
  type SmartInspectPoint,
  type SmartInspectSpecialTargetCategory,
  type SmartInspectStandard,
  type SmartInspectStandardItem,
} from "@/views/smart-inspect-common/types";

import styles from "./smart-inspect-device-route-config.module.css";

const cloneStandards = (standards: SmartInspectStandard[] = []): SmartInspectStandard[] => {
  return standards.map((item) => ({
    ...item,
    standardItems: (item.standardItems || []).map((standardItem) => ({ ...standardItem })),
  }));
};

const clonePoints = (points: SmartInspectPoint[] = []): SmartInspectPoint[] => {
  return points.map((item) => ({
    ...item,
    standardDTOList: cloneStandards(item.standardDTOList),
  }));
};

const normalizeStandardRows = (rows: SmartInspectStandard[]): SmartInspectStandard[] => {
  const standardRows: SmartInspectStandard[] = [];
  rows.forEach((row) => {
    if (row?.id && !standardRows.some((item) => item.id === row.id)) {
      standardRows.push({
        ...row,
        standardItems: (row.standardItems || []).map((item) => ({
          ...item,
          isRawItem: 1,
        })),
      });
    }
  });
  return standardRows;
};

const getPointContentText = (point: SmartInspectPoint): string => {
  const names = point.standardDTOList
    .map((item) => item.name)
    .filter(Boolean)
    .join(",");
  return names || "--";
};

interface RouteOption {
  id: string;
  name: string;
  deviceId?: string;
  deviceName?: string;
  waypointCount?: number;
}

function asRecords(value: unknown): Array<Record<string, unknown>> {
  let current = value;
  for (let i = 0; i < 4 && current && typeof current === "object" && !Array.isArray(current) && "data" in current; i += 1) {
    current = (current as { data: unknown }).data;
  }
  if (Array.isArray(current)) return current as Array<Record<string, unknown>>;
  if (current && typeof current === "object") {
    const root = current as Record<string, unknown>;
    const nested = root.records ?? root.list ?? root.data;
    if (Array.isArray(nested)) return nested as Array<Record<string, unknown>>;
  }
  return [];
}

function normalizeRoute(row: Record<string, unknown>): RouteOption {
  const waypointCount = Number(row.waypointCount || 0);
  return {
    id: String(row.id ?? ""),
    name: String(row.routeName || row.name || row.routeCode || row.id || ""),
    deviceId: row.deviceId === 0 || row.deviceId === "0" ? "" : String(row.deviceId ?? ""),
    deviceName: String(row.deviceName || ""),
    waypointCount: Number.isFinite(waypointCount) ? waypointCount : undefined,
  };
}

function pointsFromRouteDetail(detail: Record<string, unknown>): SmartInspectPoint[] {
  const waypoints = Array.isArray(detail.waypoints)
    ? detail.waypoints
    : Array.isArray(detail.waypointContents)
      ? detail.waypointContents
      : [];
  return (waypoints as Array<Record<string, unknown>>).map((item, index) =>
    createSmartInspectPointFromDronePlanContent({
      waypointId: item.waypointId ?? item.id,
      waypointName: String(item.waypointName || item.name || `航点${index + 1}`),
      seqNo: Number(item.seqNo ?? item.order ?? index + 1),
      actualLng: item.actualLng ?? item.commandLng ?? item.lng,
      actualLat: item.actualLat ?? item.commandLat ?? item.lat,
      actualHeight: item.actualHeight ?? item.commandHeight ?? item.height,
      photoEnabled: Boolean(item.photoEnabled),
      recordEnabled: Boolean(item.recordEnabled),
      standardDTOList: (item.standardDTOList || item.standardVOS || []) as SmartInspectStandard[],
    }),
  );
}

/** 无人机/机器狗路线配置：设备弹窗 + 航线拉取 + 航点巡检内容，对齐旧仓操作逻辑。 */
export const SmartInspectDeviceRouteConfig = defineComponent({
  name: "SmartInspectDeviceRouteConfig",
  props: {
    method: {
      type: String as PropType<SmartInspectSpecialTargetCategory>,
      default: "DRONE",
    },
    value: {
      type: Object as PropType<SmartInspectDeviceRouteConfigValue | undefined>,
      default: undefined,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    showExecutionColumns: {
      type: Boolean,
      default: true,
    },
  },
  setup: (props, { expose }) => {
    const client = getDailyInspectionClient();
    const state = reactive<{
      deviceId: string;
      deviceName: string;
      routeId: string;
      routeName: string;
      points: SmartInspectPoint[];
      routeLoading: boolean;
    }>({
      deviceId: "",
      deviceName: "",
      routeId: "",
      routeName: "",
      points: [],
      routeLoading: false,
    });
    const routeOptions = ref<RouteOption[]>([]);
    const deviceModalOpen = ref(false);
    const selectedPointIds = ref<string[]>([]);
    const editingPointIds = ref<string[]>([]);
    const standardTableRef = ref<{
      getStandardSelectedRows: () => SmartInspectStandard[];
      setStandardSelectedRows: (rows: SmartInspectStandard[]) => void;
    }>();
    const inspectItemTableRef = ref<{
      getInspectItemSelectedRows: () => SmartInspectStandardItem[];
      setInspectItemSelectedRows: (rows: SmartInspectStandardItem[]) => void;
    }>();

    const deviceLabel = computed(() => (props.method === "DRONE" ? "无人机设备" : "机器狗设备"));
    const routeLabel = computed(() => (props.method === "DRONE" ? "航线" : "路线"));
    const routeBase = computed(() => (props.method === "DRONE" ? "/inspect/drone" : "/inspect/robot-dog"));
    const deviceAppCode = computed(() => (props.method === "DRONE" ? "DRONE" : "ROBOT_DOG"));

    const hasPointStandard = (point: SmartInspectPoint): boolean => {
      return point.standardDTOList.some((standard) => standard.id && (standard.standardItems || []).length);
    };

    const getConfig = (): SmartInspectDeviceRouteConfigValue | undefined => {
      if (props.method !== "DRONE" && props.method !== "ROBOT_DOG") return undefined;
      return {
        method: props.method,
        deviceId: state.deviceId,
        deviceName: state.deviceName || state.deviceId,
        routeId: state.routeId,
        routeName: state.routeName || state.routeId,
        points: clonePoints(state.points),
      };
    };

    const validate = async (): Promise<SmartInspectDeviceRouteConfigValue | undefined> => {
      if (props.method !== "DRONE" && props.method !== "ROBOT_DOG") return undefined;
      if (!state.deviceId) {
        message.error(props.method === "DRONE" ? "请选择无人机设备" : "请选择机器狗设备");
        return Promise.reject(new Error("device required"));
      }
      if (!state.routeId) {
        message.error(props.method === "DRONE" ? "请选择无人机航线" : "请选择机器狗路线");
        return Promise.reject(new Error("route required"));
      }
      if (!state.points.length) {
        message.error("路线点不能为空");
        return Promise.reject(new Error("points required"));
      }
      if (state.points.some((point) => !hasPointStandard(point))) {
        message.error(props.method === "DRONE" ? "请配置航点巡检内容" : "请配置路线点巡检内容");
        return Promise.reject(new Error("point standards required"));
      }
      return getConfig();
    };

    const loadRouteOptions = async (): Promise<void> => {
      if (!state.deviceId) {
        routeOptions.value = [];
        return;
      }
      state.routeLoading = true;
      try {
        const res = await client.request("GET", `${routeBase.value}/routes/selection/page`, {
          pageNumber: 1,
          pageSize: 200,
          deviceId: state.deviceId,
        });
        routeOptions.value = asRecords(res)
          .map(normalizeRoute)
          .filter((item) => item.id);
      } catch (error) {
        routeOptions.value = [];
        message.error(error instanceof Error ? error.message : "航线列表加载失败");
      } finally {
        state.routeLoading = false;
      }
    };

    const loadRouteDetail = async (routeId: string): Promise<void> => {
      if (!routeId) {
        state.points = [];
        tableApi.setDataSource([]);
        return;
      }
      state.routeLoading = true;
      try {
        const detail = (await client.request("GET", `${routeBase.value}/routes/${encodeURIComponent(routeId)}`)) as Record<string, unknown>;
        const route = normalizeRoute(detail);
        if (!routeOptions.value.some((item) => item.id === route.id) && route.id) {
          routeOptions.value = [...routeOptions.value, route];
        }
        if (!state.deviceId && route.deviceId) {
          state.deviceId = route.deviceId;
          state.deviceName = route.deviceName || route.deviceId;
        }
        state.routeName = route.name || state.routeName;
        state.points = pointsFromRouteDetail(detail);
        selectedPointIds.value = [];
        tableApi.setDataSource(state.points);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "航线详情加载失败");
      } finally {
        state.routeLoading = false;
      }
    };

    const handleDeviceSelected = (values: SiteDeviceOption[]): void => {
      const selected = values[0];
      state.deviceId = selected?.id || "";
      state.deviceName = selected?.name || state.deviceId;
      state.routeId = "";
      state.routeName = "";
      state.points = [];
      selectedPointIds.value = [];
      tableApi.setDataSource([]);
      void loadRouteOptions();
    };

    const [InspectContentModal, inspectContentModalApi] = useCubeModal({
      title: "配置点位巡检内容",
      width: "800px",
      destroyOnClose: false,
      onConfirm() {
        const selectedStandardRows = (standardTableRef.value?.getStandardSelectedRows() || []).filter((row) => Boolean(row?.id));
        const standardRows = normalizeStandardRows(selectedStandardRows);
        if (!standardRows.length) {
          message.warning("请选择巡检标准");
          return;
        }
        const selectedStandardItems = (inspectItemTableRef.value?.getInspectItemSelectedRows() || []).map((item) => ({
          ...item,
          isRawItem: 0,
        }));
        standardRows[0].standardItems = [...(standardRows[0].standardItems || []), ...selectedStandardItems];
        state.points = state.points.map((item) => {
          if (editingPointIds.value.includes(item.id)) {
            return {
              ...item,
              standardDTOList: cloneStandards(standardRows),
            };
          }
          return item;
        });
        tableApi.setDataSource(state.points);
        inspectContentModalApi.close();
      },
    });

    const openConfigModal = (pointIds: string[]): void => {
      editingPointIds.value = pointIds;
      inspectContentModalApi.open();
      if (pointIds.length === 1) {
        const row = state.points.find((item) => item.id === pointIds[0]);
        nextTick(() => {
          standardTableRef.value?.setStandardSelectedRows(cloneStandards(row?.standardDTOList || []));
          const standard = row?.standardDTOList.find((item) => (item.standardItems || []).length);
          if (standard) {
            inspectItemTableRef.value?.setInspectItemSelectedRows(standard.standardItems || []);
          }
        });
      }
    };

    const columns = computed(() => {
      const base = [
        { title: "序号", dataIndex: "order", width: 80, align: "center" as const },
        {
          title: props.method === "DRONE" ? "航点名称" : "路线点名称",
          dataIndex: "name",
          ellipsis: true,
          customRender: ({ text }: { text: string }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
        },
        { title: "点位编码", dataIndex: "code", ellipsis: true },
        {
          title: "位置",
          dataIndex: "address",
          ellipsis: true,
          customRender: ({ text }: { text: string }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
        },
        {
          title: "巡检内容",
          dataIndex: "standardDTOList",
          ellipsis: true,
          customRender: ({ record }: { record: SmartInspectPoint }) => {
            const text = getPointContentText(record);
            return (
              <PopOver content={text}>
                <span class={styles["content-text"]}>{text}</span>
              </PopOver>
            );
          },
        },
      ];
      if (props.readonly) return base;
      return [
        ...base,
        {
          title: "操作",
          dataIndex: "action",
          width: 140,
          fixed: "right" as const,
          customRender: ({ record }: { record: SmartInspectPoint }) => (
            <Button type="link" size="small" onClick={() => openConfigModal([record.id])}>
              配置巡检内容
            </Button>
          ),
        },
      ];
    });

    const [CubeTable, tableApi] = useCubeTable({
      columns: columns.value,
      dataSource: [],
      rowKey: "id",
      autoFetch: false,
      autoScrollY: false,
      pagination: false,
      ...(props.readonly
        ? {}
        : {
            rowSelection: "checkbox" as const,
            rowSelectionChange: (keys: Array<string | number>) => {
              selectedPointIds.value = keys.map(String);
            },
          }),
    });

    watch(
      columns,
      () => {
        tableApi.setState({ columns: columns.value });
      },
      { immediate: true },
    );

    const syncFromValue = (): void => {
      if (!props.value) {
        state.deviceId = "";
        state.deviceName = "";
        state.routeId = "";
        state.routeName = "";
        state.points = [];
        tableApi.setDataSource([]);
        return;
      }
      state.deviceId = props.value.deviceId || "";
      state.deviceName = props.value.deviceName || "";
      state.routeId = props.value.routeId || "";
      state.routeName = props.value.routeName || "";
      state.points = clonePoints(props.value.points || []);
      tableApi.setDataSource(state.points);
      if (state.deviceId) void loadRouteOptions();
    };

    watch(
      () => props.value,
      () => {
        syncFromValue();
      },
      { immediate: true, deep: true },
    );

    const handleTabChange = (key: string): void => {
      if (editingPointIds.value.length > 1) return;
      const row = state.points.find((item) => editingPointIds.value.includes(item.id));
      if (!row) return;
      if (key === "1") {
        const selectRows = (standardTableRef.value?.getStandardSelectedRows() || []).filter((item) => item?.id);
        standardTableRef.value?.setStandardSelectedRows([...selectRows, ...row.standardDTOList]);
        return;
      }
      const standard = row.standardDTOList.find((item) => (item.standardItems || []).length);
      if (!standard) return;
      nextTick(() => {
        inspectItemTableRef.value?.setInspectItemSelectedRows(standard.standardItems || []);
      });
    };

    expose({ getConfig, validate });

    return (): JSX.Element | null => {
      if (props.method !== "DRONE" && props.method !== "ROBOT_DOG") return null;

      return (
        <div class={styles.container}>
          {props.readonly ? (
            <div class={styles["readonly-card"]}>
              <div class={styles["readonly-item"]}>
                <span>{deviceLabel.value}：</span>
                {state.deviceName || state.deviceId || "--"}
              </div>
              <div class={styles["readonly-item"]}>
                <span>{routeLabel.value}：</span>
                {state.routeName || state.routeId || "--"}
              </div>
              <div class={styles["readonly-item"]}>
                <span>点位数：</span>
                {state.points.length}
              </div>
            </div>
          ) : (
            <>
              <div class={styles["selector-row"]}>
                <div class={styles["selector-item"]}>
                  <span class={styles["selector-label"]}>{deviceLabel.value}：</span>
                  <div
                    class={styles["selector-value"]}
                    onClick={(event: MouseEvent) => {
                      const target = event.target as HTMLElement | null;
                      if (target?.closest?.(".ant-select-clear")) return;
                      if (!deviceModalOpen.value) deviceModalOpen.value = true;
                    }}
                  >
                    <Select
                      value={state.deviceId || undefined}
                      placeholder={`请选择${deviceLabel.value}`}
                      style={{ width: "100%", maxWidth: "320px" }}
                      options={state.deviceId ? [{ label: state.deviceName || state.deviceId, value: state.deviceId }] : []}
                      allowClear
                      open={false}
                      showSearch={false}
                      onClear={() => {
                        state.deviceId = "";
                        state.deviceName = "";
                        state.routeId = "";
                        state.routeName = "";
                        state.points = [];
                        routeOptions.value = [];
                        tableApi.setDataSource([]);
                      }}
                      onDropdownVisibleChange={() => undefined}
                    />
                  </div>
                </div>
                <div class={styles["selector-item"]}>
                  <span class={styles["selector-label"]}>{routeLabel.value}：</span>
                  <div class={styles["selector-value"]}>
                    <Space>
                      <Select
                        value={state.routeId || undefined}
                        placeholder={`请选择${routeLabel.value}`}
                        style={{ width: "220px" }}
                        loading={state.routeLoading}
                        options={routeOptions.value.map((item) => ({
                          label: item.waypointCount ? `${item.name}（${item.waypointCount}点）` : item.name,
                          value: item.id,
                        }))}
                        allowClear
                        onUpdate:value={(value: string | undefined) => {
                          state.routeId = value || "";
                          const matched = routeOptions.value.find((item) => item.id === state.routeId);
                          state.routeName = matched?.name || "";
                          void loadRouteDetail(state.routeId);
                        }}
                      />
                      <span>点位数：{state.points.length}</span>
                    </Space>
                  </div>
                </div>
              </div>
              <div class={styles.toolbar}>
                <Button disabled={!selectedPointIds.value.length} onClick={() => openConfigModal([...selectedPointIds.value])}>
                  批量配置
                </Button>
              </div>
              <SiteDeviceSelectModal
                open={deviceModalOpen.value}
                multiple={false}
                applicationCode={deviceAppCode.value}
                title={`选择${deviceLabel.value}`}
                value={state.deviceId ? [{ id: state.deviceId, name: state.deviceName || state.deviceId }] : []}
                onUpdate:open={(open: boolean) => {
                  deviceModalOpen.value = open;
                  if (!open) {
                    // 关弹窗后去掉焦点，避免 Select 回焦再次触发打开
                    requestAnimationFrame(() => {
                      (document.activeElement as HTMLElement | null)?.blur?.();
                    });
                  }
                }}
                onOk={handleDeviceSelected}
              />
            </>
          )}
          <CubeTable />
          {!props.readonly && (
            <InspectContentModal>
              {inspectContentModalApi.state.isOpen ? (
                <Tabs defaultActiveKey="1" onChange={handleTabChange} forceRender>
                  <TabPane tab="巡检标准" key="1">
                    <InspectStandardTable businessType={InspectBusinessType.DAILY_INSPECTION} ref={standardTableRef} />
                  </TabPane>
                  <TabPane tab="巡检项" key="2">
                    <InspectItemTable businessType={InspectBusinessType.DAILY_INSPECTION} ref={inspectItemTableRef} />
                  </TabPane>
                </Tabs>
              ) : null}
            </InspectContentModal>
          )}
        </div>
      );
    };
  },
});
