import type { FireHostMonitorDeviceRecord } from "@g2-contract/fire-management";
import { defineComponent, markRaw, reactive, shallowRef } from "vue";

import { useResponsiveTableRegion } from "../composables/use-responsive-table-region";
import type { VideoDeviceRecord } from "../fire-config-management.model";
import {
  listFireHostMonitorDeviceCandidates,
  listFireHostMonitorDevices,
  removeFireHostMonitorDevice,
  saveFireHostMonitorDevices,
} from "@/api/server";
import { AreaTreeSelect, IotProductCategoryTreeSelect } from "@/components/device-select-filters";
import { ProductBrandNameSelect } from "@/components/product-brand-name-select";
import { usePcForm, usePcModal, usePcTable } from "@/pc-ui-runtime";
import { Button, Page, PopConfirm, Space, message, LinkOutlined } from "@/pc-ui-runtime";

import styles from "../fire-config-management.module.css";

interface MonitorDevicePage {
  records?: FireHostMonitorDeviceRecord[];
  total?: number;
  pages?: number;
}

const loadAllMonitorDevicePages = async (
  loadPage: (pageNumber: number, pageSize: number) => Promise<MonitorDevicePage>,
): Promise<FireHostMonitorDeviceRecord[]> => {
  const pageSize = 200;
  const firstPage = await loadPage(1, pageSize);
  const pageCount = Math.max(1, Number(firstPage.pages ?? Math.ceil(Number(firstPage.total ?? 0) / pageSize)));
  if (pageCount === 1) return firstPage.records ?? [];

  const remainingPages = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => loadPage(index + 2, pageSize)));
  return [firstPage, ...remainingPages].flatMap((page) => page.records ?? []);
};

const toVideoDeviceRecord = (record: FireHostMonitorDeviceRecord): VideoDeviceRecord => ({
  id: record.id,
  code: record.deviceCode || "--",
  name: record.deviceName || "--",
  categoryCode: record.productCategoryCode || "",
  category: record.productCategoryName || "--",
  productName: record.productName || "--",
  brand: record.brandName || "--",
  ...(record.areaId !== undefined ? { areaId: record.areaId } : {}),
  areaName: record.areaName || "--",
});

export const VideoDeviceConfigTab = defineComponent({
  name: "VideoDeviceConfigTab",
  props: {
    hostId: { type: String, required: true },
  },
  setup: (props) => {
    const associatedTotal = shallowRef(0);
    const pickerFilters = reactive({ keyword: "", categoryCode: "", brandName: "", areaId: "" });
    const selectedKeys = shallowRef<string[]>([]);
    const candidatePageNumber = shallowRef(1);
    const candidatePageSize = shallowRef(10);
    const candidateTotal = shallowRef(0);

    const removeDevice = async (record: VideoDeviceRecord): Promise<void> => {
      try {
        await removeFireHostMonitorDevice(props.hostId, record.id);
        message.success("视频设备已移除");
        tableApi.query();
      } catch (error) {
        message.error((error as Error).message || "移除视频设备失败");
      }
    };

    const columns = [
      { title: "设备编码", dataIndex: "code", width: 150 },
      { title: "设备名称", dataIndex: "name", ellipsis: true },
      { title: "产品品类", dataIndex: "category", width: 160 },
      { title: "产品名称", dataIndex: "productName", ellipsis: true },
      { title: "设备品牌", dataIndex: "brand", width: 130 },
      { title: "所属区域", dataIndex: "areaName", ellipsis: true },
      {
        title: "操作",
        dataIndex: "action",
        width: 90,
        customRender: ({ record }: { record: VideoDeviceRecord }) => (
          <PopConfirm title={`确认移除“${record.name}”吗？`} onConfirm={() => removeDevice(record)}>
            <Button type="link" size="small" danger>
              移除
            </Button>
          </PopConfirm>
        ),
      },
    ];
    const candidateColumns = [
      {
        title: "设备编码",
        dataIndex: "code",
        width: 200,
        customRender: ({ record }: { record: VideoDeviceRecord }) => (
          <span class={styles["device-code-two-line"]} title={record.code}>
            {record.code}
          </span>
        ),
      },
      ...columns.slice(1, 6),
    ];

    const associatedPagination = {
      current: 1,
      pageSize: 10,
      total: 0,
      showSizeChanger: true,
      showTotal: (total: number): string => `共 ${total} 条`,
      onChange: (current: number, pageSize: number): void => {
        tableApi.setState({
          pagination: {
            ...(tableApi.state.pagination as unknown as Record<string, unknown>),
            current,
            pageSize,
          },
        });
        tableApi.query();
      },
    };

    const [VideoTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      pagination: associatedPagination,
      fetchApi: async (params?: Record<string, unknown>) => {
        const page = await listFireHostMonitorDevices(props.hostId, {
          pageNumber: Number(params?.current ?? 1),
          pageSize: Number(params?.pageSize ?? 10),
        });
        associatedTotal.value = Number(page.total ?? 0);
        return {
          ...page,
          records: (page.records || []).map(toVideoDeviceRecord),
        };
      },
    });
    const tableRegionRef = useResponsiveTableRegion((scrollY) => tableApi.setState({ scrollY }));

    const [PickerForm] = usePcForm({
      cache: false,
      layout: "horizontal",
      isCollapsed: false,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "设备名称",
          componentProps: { placeholder: "设备名称或编码", allowClear: true },
        },
        {
          component: markRaw(IotProductCategoryTreeSelect),
          fieldName: "categoryCode",
          label: "产品品类",
          componentProps: { placeholder: "请选择产品品类", allowClear: true },
        },
        {
          component: markRaw(ProductBrandNameSelect),
          fieldName: "brandName",
          label: "设备品牌",
          defaultValue: "",
          componentProps: { placeholder: "请选择设备品牌", allowClear: true },
        },
        {
          component: markRaw(AreaTreeSelect),
          fieldName: "areaId",
          label: "所在区域",
          componentProps: { placeholder: "请选择所在区域", allowClear: true },
        },
      ],
      handleSubmit: (values) => {
        pickerFilters.keyword = String(values.keyword ?? "").trim();
        pickerFilters.categoryCode = String(values.categoryCode ?? "").trim();
        pickerFilters.brandName = String(values.brandName ?? "").trim();
        pickerFilters.areaId = String(values.areaId ?? "").trim();
        candidatePageNumber.value = 1;
        candidateTableApi.query();
      },
      handleReset: () => {
        pickerFilters.keyword = "";
        pickerFilters.categoryCode = "";
        pickerFilters.brandName = "";
        pickerFilters.areaId = "";
        candidatePageNumber.value = 1;
        candidateTableApi.query();
      },
    });

    const [CandidateTable, candidateTableApi] = usePcTable({
      autoFetch: false,
      columns: candidateColumns,
      rowKey: "id",
      rowSelection: "checkbox",
      pagination: false,
      fetchApi: async () => {
        const filters = {
          ...(pickerFilters.keyword ? { keyword: pickerFilters.keyword } : {}),
          ...(pickerFilters.categoryCode ? { categoryCode: pickerFilters.categoryCode } : {}),
          ...(pickerFilters.brandName ? { brandName: pickerFilters.brandName } : {}),
          ...(pickerFilters.areaId ? { areaId: pickerFilters.areaId } : {}),
        };
        const candidatePage = await listFireHostMonitorDeviceCandidates(props.hostId, {
          pageNumber: candidatePageNumber.value,
          pageSize: candidatePageSize.value,
          ...filters,
        });
        candidateTotal.value = Number(candidatePage.total ?? 0);
        return {
          ...candidatePage,
          records: (candidatePage.records ?? []).map(toVideoDeviceRecord),
        };
      },
      rowSelectionChange: (keys) => {
        selectedKeys.value = keys.map(String);
      },
    });
    const candidateTableRegionRef = useResponsiveTableRegion((scrollY) => candidateTableApi.setState({ scrollY }));

    const changeCandidatePage = (pageNumber: number, pageSize: number): void => {
      candidatePageNumber.value = pageNumber;
      candidatePageSize.value = pageSize;
      candidateTableApi.query();
    };

    const confirmAssociation = async (): Promise<void> => {
      const monitorDeviceIds = [...selectedKeys.value];
      pickerModalApi.setConfirmLoading(true);
      try {
        await saveFireHostMonitorDevices(props.hostId, {
          monitorDeviceIds,
        });
        pickerModalApi.close();
        tableApi.query();
        message.success(`已保存 ${monitorDeviceIds.length} 台视频设备关联`);
      } catch (error) {
        message.error((error as Error).message || "保存视频设备关联失败");
      } finally {
        pickerModalApi.setConfirmLoading(false);
      }
    };

    const [PickerModal, pickerModalApi] = usePcModal({
      title: "关联视频设备",
      width: "1280px",
      centered: true,
      wrapperClass: styles["association-modal"],
      onConfirm: confirmAssociation,
      onClosed: () => {
        selectedKeys.value = [];
        candidateTableApi.setSelectedRowKeys([]);
        pickerModalApi.setConfirmLoading(false);
      },
    });

    const openPicker = async (): Promise<void> => {
      selectedKeys.value = [];
      candidatePageNumber.value = 1;
      candidateTableApi.setSelectedRowKeys([]);
      pickerModalApi.setConfirmLoading(true);
      pickerModalApi.open();
      try {
        const associatedRecords = await loadAllMonitorDevicePages((pageNumber, pageSize) =>
          listFireHostMonitorDevices(props.hostId, { pageNumber, pageSize }),
        );
        const associatedIds = associatedRecords.map((record) => String(record.id));
        selectedKeys.value = associatedIds;
        candidateTableApi.setSelectedRowKeys(associatedIds);
        candidateTableApi.query();
      } finally {
        pickerModalApi.setConfirmLoading(false);
      }
    };

    return () => (
      <div class={styles["tab-content"]}>
        <div class={styles.toolbar}>
          <div class={styles["toolbar-tips"]}>
            {associatedTotal.value > 0 && (
              <span class={styles["toolbar-summary"]}>
                已关联 <strong>{associatedTotal.value}</strong> 台视频设备
              </span>
            )}
          </div>
          <div class={styles["toolbar-actions"]}>
            <Button type="primary" icon={<LinkOutlined />} onClick={() => void openPicker()}>
              关联设备
            </Button>
          </div>
        </div>
        <div ref={tableRegionRef} class={styles["page-table-region"]}>
          <VideoTable />
        </div>
        <PickerModal
          v-slots={{
            default: () => (
              <div class={styles["association-picker"]}>
                <div class={styles["association-picker-form"]}>
                  <PickerForm />
                </div>
                <div ref={candidateTableRegionRef} class={styles["association-picker-table"]}>
                  <CandidateTable />
                  <div class={styles["association-picker-pagination"]}>
                    <Page
                      current={candidatePageNumber.value}
                      pageSize={candidatePageSize.value}
                      total={candidateTotal.value}
                      syncToUrl={false}
                      showTotal={(total: number): string => `共 ${total} 条`}
                      onPageChange={changeCandidatePage}
                    />
                  </div>
                </div>
              </div>
            ),
            footer: () => (
              <div class={styles["association-modal-footer"]}>
                <div class={styles["video-association-footer-content"]}>
                  <div class={styles["picker-summary"]}>
                    已选择 <strong>{selectedKeys.value.length}</strong> 台视频设备
                  </div>
                  <Space>
                    <Button onClick={() => pickerModalApi.close()}>取消</Button>
                    <Button type="primary" loading={Boolean(pickerModalApi.state.confirmLoading)} onClick={() => pickerModalApi.confirm()}>
                      确定
                    </Button>
                  </Space>
                </div>
              </div>
            ),
          }}
        />
      </div>
    );
  },
});
