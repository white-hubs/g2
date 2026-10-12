import type { FirePointRecord } from "@g2-contract/fire-management";
import { defineComponent, markRaw, onMounted, reactive, ref, shallowRef } from "vue";

import { useResponsiveTableRegion } from "../composables/use-responsive-table-region";
import type {
  BatchCoordinateModalExpose,
  ModalOpenExpose,
  MultiLinePanelStyle,
  MultiLineStyleModalExpose,
  PointCoordinateRecord,
  PointCoordinateUpdate,
  PointControlConfigModalExpose,
  PointEditModalExpose,
} from "../fire-config-management.model";
import { BatchCoordinateModal } from "./batch-coordinate-modal";
import { MultiLineStyleModal } from "./multi-line-style-modal";
import { PointControlConfigModal } from "./point-control-config-modal";
import { PointDeviceAssociationModal } from "./point-device-association-modal";
import { PointEditModal } from "./point-edit-modal";
import { PointImportModal } from "./point-import-modal";
import { PointLocationBindingModal } from "./point-location-binding-modal";
import {
  configFirePointDevices,
  deleteFirePoint,
  getFireHostIndicatorLightConfig,
  listFirePoints,
  saveFireHostIndicatorLightConfig,
  updateFirePoint,
} from "@/api/server";
import { ProductBrandNameSelect } from "@/components/product-brand-name-select";
import { usePcForm, usePcTable } from "@/pc-ui-runtime";
import {
  Button,
  PopConfirm,
  Space,
  Switch,
  Tag,
  message,
  AppstoreOutlined,
  EnvironmentOutlined,
  ImportOutlined,
  LinkOutlined,
  ToolOutlined,
} from "@/pc-ui-runtime";

import styles from "../fire-config-management.module.css";

const normalizeBusType = (value: unknown): 1 | 2 | undefined => {
  if (value === 1 || value === "1") return 1;
  if (value === 2 || value === "2") return 2;
  return undefined;
};

const getPointName = (point: FirePointRecord): string => point.pointName || point.name || "--";

export const FirePointConfigTab = defineComponent({
  name: "FirePointConfigTab",
  props: {
    hostId: { type: String, required: true },
    hostName: { type: String, required: true },
  },
  emits: ["totalChanged"],
  setup: (props, { emit }) => {
    const searchParams = reactive({
      brandName: "",
      keyword: "",
      circuit: "",
      address: "",
      pointCode: "",
      deviceCode: "",
      busType: "",
      location: "",
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });
    const currentPagePoints = ref<FirePointRecord[]>([]);
    const selectedRowKeys = shallowRef<string[]>([]);
    const hostControlSavingIds = shallowRef(new Set<string>());
    const associationModalRef = shallowRef<ModalOpenExpose | null>(null);
    const importModalRef = shallowRef<ModalOpenExpose | null>(null);
    const editModalRef = shallowRef<PointEditModalExpose | null>(null);
    const controlConfigModalRef = shallowRef<PointControlConfigModalExpose | null>(null);
    const locationModalRef = shallowRef<ModalOpenExpose | null>(null);
    const batchCoordinateModalRef = shallowRef<BatchCoordinateModalExpose | null>(null);
    const multiLineStyleModalRef = shallowRef<MultiLineStyleModalExpose | null>(null);
    const multiLineStyleLoading = shallowRef(false);
    const multiLineStyle = reactive<MultiLinePanelStyle>({
      mode: 3,
      lightButtons: [
        { code: "", name: "启动反馈" },
        { code: "", name: "故障" },
        { code: "", name: "运行" },
      ],
    });

    const refreshTable = (): void => {
      tableApi.query();
    };

    const removePoint = async (point: FirePointRecord): Promise<void> => {
      try {
        await deleteFirePoint(point.id);
        selectedRowKeys.value = selectedRowKeys.value.filter((key) => key !== String(point.id));
        tableApi.setSelectedRowKeys(selectedRowKeys.value);
        message.success("点位已移除");
        refreshTable();
      } catch (error) {
        message.error((error as Error).message || "移除点位失败");
      }
    };

    const updateHostControl = async (point: FirePointRecord, enabled: boolean): Promise<void> => {
      const pointId = String(point.id);
      if (hostControlSavingIds.value.has(pointId)) return;
      const previousEnabled = point.hostCtrl === true;
      const nextSavingIds = new Set(hostControlSavingIds.value);
      nextSavingIds.add(pointId);
      hostControlSavingIds.value = nextSavingIds;
      point.hostCtrl = enabled;
      try {
        const busType = normalizeBusType(point.busType);
        const location = point.location || point.locationName;
        await updateFirePoint({
          id: point.id,
          fireManageDeviceId: point.fireManageDeviceId ?? props.hostId,
          ...(point.deviceId !== undefined ? { deviceId: point.deviceId } : {}),
          ...(point.brandName ? { brandName: point.brandName } : {}),
          pointName: getPointName(point) === "--" ? "" : getPointName(point),
          circuit: String(point.circuit ?? ""),
          address: String(point.address ?? ""),
          ...(point.pointCode ? { pointCode: point.pointCode } : {}),
          ...(point.code ? { code: point.code } : {}),
          ...(busType ? { busType } : {}),
          ...(location ? { location } : {}),
          ...(point.coordinateX !== undefined || point.posX !== undefined ? { coordinateX: point.coordinateX ?? point.posX } : {}),
          ...(point.coordinateY !== undefined || point.posY !== undefined ? { coordinateY: point.coordinateY ?? point.posY } : {}),
          hostCtrl: enabled,
          ...(enabled ? { ctrlParam: point.ctrlParam ?? { start: "", stop: "" } } : {}),
        });
        if (enabled && !point.ctrlParam) {
          point.ctrlParam = { start: "", stop: "" };
        }
        message.success(enabled ? "已启用主机控制" : "已关闭主机控制");
      } catch (error) {
        point.hostCtrl = previousEnabled;
        message.error((error as Error).message || "更新主机控制状态失败");
      } finally {
        const remainingSavingIds = new Set(hostControlSavingIds.value);
        remainingSavingIds.delete(pointId);
        hostControlSavingIds.value = remainingSavingIds;
      }
    };

    const columns = [
      { title: "设备编码", dataIndex: "code", ellipsis: true },
      { title: "产品品牌", dataIndex: "brandName", ellipsis: true },
      {
        title: "点位名称",
        dataIndex: "pointName",
        ellipsis: true,
        customRender: ({ record }: { record: FirePointRecord }) => getPointName(record),
      },
      { title: "回路", dataIndex: "circuit", width: 90 },
      { title: "地址", dataIndex: "address", width: 90 },
      { title: "编号", dataIndex: "pointCode", width: 120 },
      {
        title: "总线/多线",
        dataIndex: "busType",
        width: 110,
        customRender: ({ record }: { record: FirePointRecord }) => {
          const busType = normalizeBusType(record.busType);
          return busType ? <Tag>{busType === 1 ? "总线" : "多线"}</Tag> : "--";
        },
      },
      {
        title: "所属位置",
        dataIndex: "location",
        ellipsis: true,
        customRender: ({ record }: { record: FirePointRecord }) => record.location || record.locationName || "--",
      },
      {
        title: "主机控制",
        dataIndex: "hostCtrl",
        width: 230,
        customRender: ({ record }: { record: FirePointRecord }) => {
          const enabled = record.hostCtrl === true;
          const controlLabel = multiLineStyle.mode === 3 ? "启动/停止/反馈" : "启动/停止";
          return (
            <div class={styles["host-control-cell"]}>
              <Switch
                checked={enabled}
                loading={hostControlSavingIds.value.has(String(record.id))}
                onChange={(checked: boolean) => void updateHostControl(record, checked)}
              />
              <span class={enabled ? styles["host-control-enabled"] : styles["host-control-disabled"]}>
                {enabled ? `已启用（${controlLabel}）` : "未启用"}
              </span>
            </div>
          );
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 200,
        fixed: "right",
        customRender: ({ record }: { record: FirePointRecord }) => (
          <Space size="small">
            <Button type="link" size="small" onClick={() => editModalRef.value?.openModal(record)}>
              编辑
            </Button>
            {record.hostCtrl === true && (
              <Button type="link" size="small" onClick={() => void controlConfigModalRef.value?.openModal(record)}>
                参数
              </Button>
            )}
            <PopConfirm title="确认移除该关联点位吗？" onConfirm={() => void removePoint(record)}>
              <Button type="link" size="small" danger>
                移除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];

    const pagination = {
      current: searchParams.pageNumber,
      pageSize: searchParams.pageSize,
      total: searchParams.total,
      showSizeChanger: true,
      showTotal: (total: number): string => `共 ${total} 条`,
      onChange: (current: number, pageSize: number): void => {
        searchParams.pageNumber = current;
        searchParams.pageSize = pageSize;
        tableApi.setState({
          pagination: {
            ...(tableApi.state.pagination as unknown as Record<string, unknown>),
            current,
            pageSize,
          },
        });
        refreshTable();
      },
    };

    const [PointTable, tableApi] = usePcTable({
      autoFetch: false,
      columns,
      rowKey: "id",
      rowSelection: "checkbox",
      pagination,
      fetchApi: async (params?: Record<string, unknown>) => {
        searchParams.pageNumber = Number(params?.current ?? searchParams.pageNumber);
        searchParams.pageSize = Number(params?.pageSize ?? searchParams.pageSize);
        const page = await listFirePoints({
          hostId: props.hostId,
          pageNumber: searchParams.pageNumber,
          pageSize: searchParams.pageSize,
          ...(searchParams.keyword ? { keyword: searchParams.keyword } : {}),
          ...(searchParams.brandName ? { brandName: searchParams.brandName } : {}),
          ...(searchParams.circuit ? { circuit: searchParams.circuit } : {}),
          ...(searchParams.address ? { address: searchParams.address } : {}),
          ...(searchParams.pointCode ? { pointCode: searchParams.pointCode } : {}),
          ...(searchParams.deviceCode ? { deviceCode: searchParams.deviceCode } : {}),
          ...(searchParams.busType ? { busType: Number(searchParams.busType) } : {}),
          ...(searchParams.location ? { location: searchParams.location } : {}),
        });
        currentPagePoints.value = page.records ?? [];
        searchParams.total = Number(page.total ?? 0);
        emit("totalChanged", searchParams.total);
        return page;
      },
      rowSelectionChange: (keys) => {
        selectedRowKeys.value = keys.map(String);
      },
    });
    const tableRegionRef = useResponsiveTableRegion((scrollY) => tableApi.setState({ scrollY }));

    const pointFilterSchema = () => [
      {
        component: markRaw(ProductBrandNameSelect),
        fieldName: "brandName",
        label: "产品品牌",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          placeholder: "全部产品品牌",
        },
      },
      { component: "Input", fieldName: "keyword", label: "点位名称", componentProps: { allowClear: true, placeholder: "点位名称" } },
      { component: "Input", fieldName: "circuit", label: "回路号", componentProps: { allowClear: true, placeholder: "回路号" } },
      { component: "Input", fieldName: "address", label: "地址码", componentProps: { allowClear: true, placeholder: "地址码" } },
      { component: "Input", fieldName: "pointCode", label: "编号", componentProps: { allowClear: true, placeholder: "编号" } },
      { component: "Input", fieldName: "deviceCode", label: "设备编码", componentProps: { allowClear: true, placeholder: "设备编码" } },
      {
        component: "Select",
        fieldName: "busType",
        label: "接线样式",
        componentProps: {
          allowClear: true,
          placeholder: "接线样式",
          options: [
            { label: "总线", value: "1" },
            { label: "多线", value: "2" },
          ],
        },
      },
      { component: "Input", fieldName: "location", label: "所属位置", componentProps: { allowClear: true, placeholder: "所属位置" } },
    ];

    const [SearchForm] = usePcForm({
      // 点位筛选仅服务于当前页面，不能从路由恢复其他页面遗留的筛选参数。
      cache: false,
      layout: "horizontal",
      schema: pointFilterSchema(),
      syncStateRef: searchParams,
      onHydratedQuery: () => refreshTable(),
      handleSubmit: (values) => {
        searchParams.brandName = String(values.brandName ?? "").trim();
        searchParams.keyword = String(values.keyword ?? "").trim();
        searchParams.circuit = String(values.circuit ?? "").trim();
        searchParams.address = String(values.address ?? "").trim();
        searchParams.pointCode = String(values.pointCode ?? "").trim();
        searchParams.deviceCode = String(values.deviceCode ?? "").trim();
        searchParams.busType = String(values.busType ?? "").trim();
        searchParams.location = String(values.location ?? "").trim();
        searchParams.pageNumber = 1;
        tableApi.setState({
          pagination: {
            ...(tableApi.state.pagination as unknown as Record<string, unknown>),
            current: 1,
          },
        });
        refreshTable();
      },
      handleReset: () => {
        searchParams.brandName = "";
        searchParams.keyword = "";
        searchParams.circuit = "";
        searchParams.address = "";
        searchParams.pointCode = "";
        searchParams.deviceCode = "";
        searchParams.busType = "";
        searchParams.location = "";
        searchParams.pageNumber = 1;
        refreshTable();
      },
      showCollapseButton: true,
    });

    const openBatchCoordinateModal = (): void => {
      if (selectedRowKeys.value.length === 0) {
        message.warning("请先勾选需要编辑坐标的点位");
        return;
      }
      const selectedKeySet = new Set(selectedRowKeys.value);
      const selectedPoints = currentPagePoints.value
        .filter((point) => selectedKeySet.has(String(point.id)))
        .map<PointCoordinateRecord>((point) => ({
          id: point.id,
          name: getPointName(point),
          x: Number(point.coordinateX ?? point.posX ?? 0),
          y: Number(point.coordinateY ?? point.posY ?? 0),
        }));
      batchCoordinateModalRef.value?.openModal(selectedPoints);
    };

    const applyBatchCoordinates = async (updates: PointCoordinateUpdate[]): Promise<void> => {
      try {
        await configFirePointDevices(updates.map((update) => ({ id: update.id, coordinateX: update.x, coordinateY: update.y })));
        selectedRowKeys.value = [];
        tableApi.setSelectedRowKeys([]);
        message.success(`已更新 ${updates.length} 个点位坐标`);
        refreshTable();
      } catch (error) {
        message.error((error as Error).message || "批量更新点位坐标失败");
      }
    };

    const loadMultiLineStyle = async (showError = true): Promise<boolean> => {
      if (multiLineStyleLoading.value) return false;
      multiLineStyleLoading.value = true;
      try {
        const config = await getFireHostIndicatorLightConfig(props.hostId);
        const mode: 2 | 3 = Number(config.indicatorCount) === 2 ? 2 : 3;
        multiLineStyle.mode = mode;
        const fallbackNames = ["启动反馈", "故障", "运行"];
        multiLineStyle.lightButtons = Array.from({ length: 3 }, (_, index) => ({
          code: config.indicatorButtons?.[index]?.code?.trim() || "",
          name: config.indicatorButtons?.[index]?.name?.trim() || fallbackNames[index],
        })) as MultiLinePanelStyle["lightButtons"];
        return true;
      } catch (error) {
        if (showError) message.error((error as Error).message || "加载多线盘样式配置失败");
        return false;
      } finally {
        multiLineStyleLoading.value = false;
      }
    };

    const openMultiLineStyleModal = async (): Promise<void> => {
      if (!(await loadMultiLineStyle())) return;
      multiLineStyleModalRef.value?.openModal(multiLineStyle);
    };

    const saveMultiLineStyle = async (config: MultiLinePanelStyle): Promise<boolean> => {
      try {
        await saveFireHostIndicatorLightConfig(props.hostId, {
          indicatorCount: config.mode,
          indicatorNames: config.lightButtons.slice(0, config.mode).map((button) => button.code),
        });
        multiLineStyle.mode = config.mode;
        multiLineStyle.lightButtons = config.lightButtons.map((button) => ({ ...button })) as MultiLinePanelStyle["lightButtons"];
        message.success("多线盘样式配置已保存");
        return true;
      } catch (error) {
        message.error((error as Error).message || "保存多线盘样式配置失败");
        return false;
      }
    };

    onMounted(() => {
      refreshTable();
      void loadMultiLineStyle(false);
    });

    return () => (
      <div class={styles["tab-content"]}>
        <SearchForm />
        <div class={styles.toolbar}>
          <div class={styles["toolbar-tips"]}>
            {selectedRowKeys.value.length > 0 && (
              <span class={styles["toolbar-summary"]}>
                已选 <strong>{selectedRowKeys.value.length}</strong> 条
              </span>
            )}
          </div>
          <div class={styles["toolbar-actions"]}>
            <Button type="primary" icon={<LinkOutlined />} onClick={() => associationModalRef.value?.openModal()}>
              关联设备
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => importModalRef.value?.openModal()}>
              导入补全
            </Button>
            <Button icon={<ToolOutlined />} onClick={openBatchCoordinateModal}>
              批量编辑坐标
            </Button>
            <Button icon={<EnvironmentOutlined />} onClick={() => locationModalRef.value?.openModal()}>
              位置绑定
            </Button>
            <Button loading={multiLineStyleLoading.value} icon={<AppstoreOutlined />} onClick={() => void openMultiLineStyleModal()}>
              多线盘样式配置
            </Button>
          </div>
        </div>
        <div ref={tableRegionRef} class={styles["page-table-region"]}>
          <PointTable />
        </div>
        <PointDeviceAssociationModal ref={associationModalRef} hostId={props.hostId} onSaved={refreshTable} />
        <PointImportModal ref={importModalRef} onImported={refreshTable} />
        <PointEditModal ref={editModalRef} hostId={props.hostId} onSaved={refreshTable} />
        <PointControlConfigModal
          ref={controlConfigModalRef}
          hostId={props.hostId}
          feedbackLabel={multiLineStyle.lightButtons[2].name}
          onSaved={refreshTable}
        />
        <PointLocationBindingModal ref={locationModalRef} hostId={props.hostId} hostName={props.hostName} onSaved={refreshTable} />
        <BatchCoordinateModal ref={batchCoordinateModalRef} onApplied={applyBatchCoordinates} />
        <MultiLineStyleModal ref={multiLineStyleModalRef} save={saveMultiLineStyle} />
      </div>
    );
  },
});
