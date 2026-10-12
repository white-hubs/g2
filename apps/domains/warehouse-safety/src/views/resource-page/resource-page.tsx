import type { Pagination } from "@g2-contract/base";
import type {
  WarehouseSafetyForklift,
  WarehouseSafetyForkliftStatistics,
  WarehouseSafetyPageParams,
  WarehouseSafetyShelf,
  WarehouseSafetyShelfStatistics,
  WarehouseSafetyWarehouse,
  WarehouseSafetyWarehouseStatistics,
} from "@g2-contract/warehouse-safety";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { CubeLayout } from "@/compat/legacy-components";
import { Button, Form, FormItem, Input, Page, PopConfirm, Select, Space, Table, message } from "@/pc-ui-runtime";
import { warehouseSafetyApi } from "@/services/warehouse-safety-api";
import { emptyText, formatDateTime } from "@/utils/format";

import styles from "../shared/page-shell.module.less";

type ResourceType = "warehouse" | "shelf" | "forklift";
const BASE = "/d/warehouse-safety";
type ResourceRecord = WarehouseSafetyWarehouse | WarehouseSafetyShelf | WarehouseSafetyForklift;

interface FieldConfig {
  key: string;
  label: string;
  required?: boolean;
  type?: "date" | "forkliftType" | "number" | "select" | "textarea";
  hiddenInTable?: boolean;
  width?: number;
  placeholder?: string;
}

interface ResourceConfig {
  title: string;
  subtitle: string;
  rowKey: string;
  fields: FieldConfig[];
  pageApi: (params: WarehouseSafetyPageParams) => Promise<Pagination<ResourceRecord>>;
  deleteApi: (id: string) => Promise<void>;
  statisticsApi: () => Promise<ResourceStatistics>;
  statistics: StatConfig[];
}

type ResourceStatistics = WarehouseSafetyWarehouseStatistics | WarehouseSafetyShelfStatistics | WarehouseSafetyForkliftStatistics;

interface StatConfig {
  key: string;
  label: string;
  tone?: "blue" | "green" | "orange";
  suffix?: string;
}

const FORKLIFT_TYPE_OPTIONS = [
  { code: "ELECTRIC_FORKLIFT", name: "电动叉车" },
  { code: "MANUAL_FORKLIFT", name: "手动叉车" },
  { code: "STACKER", name: "堆高车" },
];

const FORKLIFT_TYPE_SEARCH_OPTIONS = [{ code: "", name: "全部" }, ...FORKLIFT_TYPE_OPTIONS];
const FORKLIFT_TYPE_TEXT: Record<string, string> = Object.fromEntries(FORKLIFT_TYPE_OPTIONS.map((item) => [item.code, item.name]));

const configs: Record<ResourceType, ResourceConfig> = {
  warehouse: {
    title: "仓库管理",
    subtitle: "仓库档案统一管理，为区域分区部署和叉车管理提供基础数据",
    rowKey: "id",
    pageApi: warehouseSafetyApi.pageWarehouses as ResourceConfig["pageApi"],
    deleteApi: warehouseSafetyApi.deleteWarehouse,
    statisticsApi: warehouseSafetyApi.getWarehouseStatistics,
    statistics: [
      { key: "warehouseTotal", label: "仓库总数", tone: "blue" },
      { key: "totalArea", label: "总面积（㎡）", tone: "blue" },
      { key: "maxWarehouseArea", label: "最大仓库", tone: "green", suffix: "㎡" },
      { key: "managerCount", label: "在管责任人", tone: "blue" },
    ],
    fields: [
      { key: "code", label: "仓库编号", required: true, width: 140 },
      { key: "name", label: "仓库名称", required: true, width: 180 },
      { key: "address", label: "地址", required: true, width: 220, placeholder: "如 C区105号" },
      { key: "capacity", label: "面积（㎡）", required: true, type: "number", width: 120 },
      { key: "capacityUnit", label: "单位", hiddenInTable: true },
      { key: "managerName", label: "责任人", required: true, width: 120 },
      { key: "builtTime", label: "建成时间", type: "date", width: 150 },
    ],
  },
  shelf: {
    title: "货架管理",
    subtitle: "管理仓储监控区域、区域尺寸和 AI 摄像头绑定",
    rowKey: "id",
    pageApi: warehouseSafetyApi.pageShelves as ResourceConfig["pageApi"],
    deleteApi: warehouseSafetyApi.deleteShelf,
    statisticsApi: warehouseSafetyApi.getShelfStatistics,
    statistics: [
      { key: "deployedAreaCount", label: "已部署区域", tone: "blue" },
      { key: "boundCameraCount", label: "已绑定摄像头", tone: "green" },
      { key: "unboundAreaCount", label: "未绑定区域", tone: "orange" },
    ],
    fields: [
      { key: "name", label: "区域名称", required: true, width: 180 },
      { key: "zoneType", label: "区域类型", width: 140 },
      { key: "warehouseName", label: "关联仓库", width: 160 },
      { key: "length", label: "长度（m）", type: "number", width: 110 },
      { key: "width", label: "宽度（m）", type: "number", width: 110 },
      { key: "shelfRows", label: "货架排数", type: "number", width: 110 },
      { key: "cameraDeviceNames", label: "绑定摄像头", width: 180 },
    ],
  },
  forklift: {
    title: "叉车管理",
    subtitle: "管理叉车档案、物联设备绑定和作业基础信息",
    rowKey: "id",
    pageApi: warehouseSafetyApi.pageForklifts as ResourceConfig["pageApi"],
    deleteApi: warehouseSafetyApi.deleteForklift,
    statisticsApi: warehouseSafetyApi.getForkliftStatistics,
    statistics: [
      { key: "forkliftTotal", label: "叉车总数", tone: "blue" },
      { key: "electricForkliftCount", label: "电动叉车", tone: "blue" },
      { key: "boundCameraCount", label: "已绑定摄像头", tone: "green" },
    ],
    fields: [
      { key: "code", label: "叉车编号", required: true, width: 140 },
      { key: "name", label: "叉车名称", required: true, width: 180 },
      { key: "forkliftType", label: "叉车类型", required: true, type: "forkliftType", width: 120 },
      { key: "areaName", label: "所属区域", required: true, width: 140 },
      { key: "deviceName", label: "物联设备", width: 180 },
      { key: "deviceCode", label: "设备编码", width: 140 },
      { key: "loadCapacity", label: "载重（T）", type: "number", width: 120 },
      { key: "loadCapacityUnit", label: "载重单位", hiddenInTable: true },
      { key: "batterySpec", label: "电池规格", width: 150, placeholder: "如 48V/600Ah" },
      { key: "cameraDeviceNames", label: "绑定摄像头", hiddenInTable: false, width: 180 },
    ],
  },
};

export const ResourcePage = defineComponent({
  props: {
    type: { type: String as () => ResourceType, required: true },
  },
  setup(props) {
    const config = configs[props.type];
    const router = useRouter();
    const loading = ref(false);
    const statisticsLoading = ref(false);
    const rows = ref<ResourceRecord[]>([]);
    const statistics = ref<ResourceStatistics>({});
    const total = ref(0);
    const pageNumber = ref(1);
    const pageSize = ref(20);
    const search = reactive({
      keyword: "",
      forkliftType: "",
    });
    const listPath = computed(
      () => `${BASE}/${props.type === "warehouse" ? "warehouses" : props.type === "shelf" ? "shelves" : "forklifts"}`,
    );

    const formatStatisticValue = (value: unknown, suffix?: string): string => {
      if (value === undefined || value === null || value === "") {
        return "--";
      }
      const numeric = Number(value);
      const text = Number.isFinite(numeric) ? numeric.toLocaleString("zh-CN") : String(value);
      return suffix ? `${text}${suffix}` : text;
    };

    const loadStatistics = async (): Promise<void> => {
      statisticsLoading.value = true;
      try {
        statistics.value = await config.statisticsApi();
      } catch {
        statistics.value = {};
      } finally {
        statisticsLoading.value = false;
      }
    };

    const loadList = async (): Promise<void> => {
      loading.value = true;
      try {
        const result = await config.pageApi({
          pageNumber: pageNumber.value,
          pageSize: pageSize.value,
          keyword: search.keyword.trim() || undefined,
          forkliftType: props.type === "forklift" ? search.forkliftType || undefined : undefined,
        });
        rows.value = result.records ?? [];
        total.value = result.total ?? 0;
      } finally {
        loading.value = false;
      }
    };

    const openCreate = (): void => {
      void router.push(`${listPath.value}/create`);
    };

    const openEdit = (record: ResourceRecord): void => {
      void router.push(`${listPath.value}/${record.id}/edit`);
    };

    const openDetail = (record: ResourceRecord): void => {
      void router.push(`${listPath.value}/${record.id}`);
    };

    const remove = async (record: ResourceRecord): Promise<void> => {
      await config.deleteApi(String(record.id));
      message.success("删除成功");
      await loadList();
    };

    const columns = [
      ...config.fields
        .filter((field) => !field.hiddenInTable)
        .map((field) => ({
          title: field.label,
          dataIndex: field.key,
          width: field.width,
          ellipsis: true,
          customRender: ({ record }: { record: ResourceRecord }): JSX.Element | string => {
            const value = (record as unknown as Record<string, unknown>)[field.key];
            if (field.key === "forkliftType") {
              return emptyText((record as WarehouseSafetyForklift).forkliftTypeName || FORKLIFT_TYPE_TEXT[String(value ?? "")] || value);
            }
            if (field.key === "cameraDeviceNames") {
              return emptyText(Array.isArray(value) ? value.join("、") : value);
            }
            if (field.key === "zoneType") {
              return emptyText((record as WarehouseSafetyShelf).zoneTypeName || value);
            }
            if (field.key.includes("Time")) {
              return formatDateTime(value);
            }
            return emptyText(value);
          },
        })),
      {
        title: "操作",
        dataIndex: "actions",
        width: 180,
        fixed: "right" as const,
        customRender: ({ record }: { record: ResourceRecord }) => (
          <Space>
            <Button type="link" onClick={() => openDetail(record)}>
              详情
            </Button>
            <Button type="link" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <PopConfirm title="确认删除该记录？" onConfirm={() => void remove(record)}>
              <Button type="link" danger>
                删除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];

    onMounted(() => {
      void loadStatistics();
      void loadList();
    });

    return (): JSX.Element => (
      <div class={styles.shell}>
        <CubeLayout
          title={config.title}
          subTitle={config.subtitle}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" onClick={openCreate}>
                新增
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.content}>
                <div class={[styles.statGrid, config.statistics.length === 4 ? styles.statGridFour : undefined]}>
                  {config.statistics.map((item) => (
                    <div class={styles.statCard} key={item.key}>
                      <div class={styles.statLabel}>{item.label}</div>
                      <div class={[styles.statValue, styles[item.tone ?? "blue"]]}>
                        {statisticsLoading.value
                          ? "--"
                          : formatStatisticValue((statistics.value as Record<string, unknown>)[item.key], item.suffix)}
                      </div>
                    </div>
                  ))}
                </div>
                <Form layout="inline" class={styles.searchForm}>
                  <FormItem>
                    <Input
                      v-model:value={search.keyword}
                      class={styles.searchInput}
                      placeholder="搜索编号、名称"
                      showCount={false}
                      onPressEnter={() => {
                        pageNumber.value = 1;
                        void loadList();
                      }}
                    />
                  </FormItem>
                  {props.type === "forklift" && (
                    <FormItem label="叉车类型">
                      <Select
                        v-model:value={search.forkliftType}
                        options={FORKLIFT_TYPE_SEARCH_OPTIONS}
                        fieldNames={{ label: "name", value: "code" }}
                        allowClear
                        placeholder="全部"
                        style={{ width: "140px" }}
                        onClear={() => {
                          search.forkliftType = "";
                          pageNumber.value = 1;
                          void loadList();
                        }}
                      />
                    </FormItem>
                  )}
                  <FormItem>
                    <Button
                      type="primary"
                      onClick={() => {
                        pageNumber.value = 1;
                        void loadList();
                      }}
                    >
                      查询
                    </Button>
                    <Button
                      style={{ marginLeft: "10px" }}
                      onClick={() => {
                        search.keyword = "";
                        search.forkliftType = "";
                        pageNumber.value = 1;
                        void loadList();
                      }}
                    >
                      重置
                    </Button>
                  </FormItem>
                </Form>
                <Table
                  rowKey={config.rowKey}
                  columns={columns}
                  dataSource={rows.value}
                  loading={loading.value}
                  locale={{ emptyText: "暂无数据" }}
                  pagination={false}
                  scroll={{ x: 1100 }}
                />
              </div>
            ),
            "footer-page": () => (
              <Page
                current={pageNumber.value}
                pageSize={pageSize.value}
                total={total.value}
                show-total={(value: number) => `共 ${value} 条`}
                onPageChange={(page: number, size: number) => {
                  pageNumber.value = page;
                  pageSize.value = size;
                  void loadList();
                }}
              />
            ),
          }}
        />
      </div>
    );
  },
});
