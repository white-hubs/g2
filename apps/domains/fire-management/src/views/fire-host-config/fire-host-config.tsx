import type { FireHostRecord } from "@g2-contract/fire-management";
import { defineComponent, markRaw, onActivated, onMounted, reactive, shallowRef } from "vue";
import { useRouter } from "vue-router";

import { ControlPasswordModal } from "./components/control-password-modal";
import { HostFormModal } from "./components/host-form-modal";
import { HostStatisticsCards } from "./components/host-statistics-cards";
import type { ControlPasswordModalExpose, FireHostStatistics, HostFormModalExpose, HostSearchParams } from "./fire-host-config.model";
import { deleteFireHost, getFireManageStats, listFireHosts } from "@/api/server";
import { ProductBrandNameSelect } from "@/components/product-brand-name-select";
import { useTeleportThemeVars } from "@/hooks/use-teleport-theme-vars";
import { PageLayout, usePcForm, usePcQueryState, usePcTable } from "@/pc-ui-runtime";
import { Button, Page, PopConfirm, Space, message, PlusOutlined } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

import styles from "./fire-host-config.module.css";

const getHostName = (record: FireHostRecord): string => record.deviceName ?? record.name ?? "--";
const getHostCode = (record: FireHostRecord): string => record.code ?? record.deviceCode ?? "--";
const getBrandName = (record: FireHostRecord): string => record.brandName ?? "--";

export const FireHostConfig = defineComponent({
  name: "FireHostConfig",
  setup: () => {
    const router = useRouter();
    const { pageTitle } = usePageName();
    useTeleportThemeVars();

    const hostFormModalRef = shallowRef<HostFormModalExpose | null>(null);
    const controlPasswordModalRef = shallowRef<ControlPasswordModalExpose | null>(null);
    const statistics = reactive<FireHostStatistics>({
      hostCount: 0,
      pointCount: 0,
      todayAlarmCount: 0,
      todayFaultCount: 0,
    });

    const queryState = usePcQueryState<HostSearchParams>({
      storage: "url",
      cacheFields: ["keyword", "brandName", "pageNumber", "pageSize"],
      initialState: {
        pageNumber: 1,
        pageSize: 10,
        total: 0,
        keyword: "",
        brandName: "",
      },
      resolveValue: (field, raw) => (field === "pageNumber" || field === "pageSize" ? Number(raw) : raw),
    });
    const searchParams = queryState.state;

    const openPointManagement = (record: FireHostRecord): void => {
      void router.push({
        path: "/d/fire-management/fire-point-management",
        query: {
          hostId: record.id,
          deviceName: getHostName(record),
          tab: "point",
        },
      });
    };

    const openHostControl = (record: FireHostRecord): void => {
      void router.push({
        path: "/d/fire-management/fire-host-control",
        query: { hostId: record.id },
      });
    };

    const removeHost = async (record: FireHostRecord): Promise<void> => {
      try {
        await deleteFireHost(record.id);
        message.success("主机纳管关系已删除");
        tableApi.query();
        void loadStatistics();
      } catch (error) {
        message.error((error as Error).message || "删除主机失败");
      }
    };

    const columns = [
      {
        title: "主机名称",
        dataIndex: "deviceName",
        ellipsis: true,
        align: "center",
        width: 300,
        customRender: ({ record }: { record: FireHostRecord }) => (
          <Button type="link" size="small" onClick={() => openHostControl(record)}>
            {getHostName(record)}
          </Button>
        ),
      },
      {
        title: "主机编号",
        dataIndex: "code",
        ellipsis: true,
        align: "center",
        width: 250,
        customRender: ({ record }: { record: FireHostRecord }): string => getHostCode(record),
      },
      {
        title: "产品名称",
        dataIndex: "deviceProdName",
        ellipsis: true,
        align: "center",
        width: 200,
        customRender: ({ record }: { record: FireHostRecord }): string => record.deviceProdName ?? "--",
      },
      {
        title: "产品品牌",
        dataIndex: "brandName",
        align: "center",
        width: 200,
        customRender: ({ record }: { record: FireHostRecord }): string => getBrandName(record),
      },
      {
        title: "点位数量",
        dataIndex: "pointCount",
        align: "center",
        width: 150,
        customRender: ({ record }: { record: FireHostRecord }) => (
          <Button type="link" size="small" onClick={() => openPointManagement(record)}>
            {record.pointCount ?? 0}
          </Button>
        ),
      },
      {
        title: "操作",
        dataIndex: "action",
        align: "center",
        width: 280,
        customRender: ({ record }: { record: FireHostRecord }) => (
          <Space>
            <Button type="link" size="small" onClick={() => controlPasswordModalRef.value?.openModal(record)}>
              控制密码
            </Button>
            <Button type="link" size="small" onClick={() => openPointManagement(record)}>
              配置管理
            </Button>
            <PopConfirm title={`确认删除“${getHostName(record)}”的纳管关系？`} onConfirm={() => removeHost(record)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      autoFetch: false,
      columns,
      rowKey: "id",
      tableCode: "FIRE_HOST_CONFIG",
      fetchApi: async () => {
        return listFireHosts({
          pageNumber: searchParams.pageNumber,
          pageSize: searchParams.pageSize,
          deviceName: searchParams.keyword,
          brandName: searchParams.brandName,
        });
      },
      fetchLoaded: (data) => {
        searchParams.total = data.total;
      },
    });

    const brandNameField = () => ({
      component: markRaw(ProductBrandNameSelect),
      fieldName: "brandName",
      label: "产品品牌",
      defaultValue: "",
      componentProps: {
        placeholder: "全部产品品牌",
        allowClear: true,
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      queryState: searchParams,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "主机名称",
          componentProps: { placeholder: "搜索主机名称", allowClear: true },
        },
        brandNameField(),
      ],
      handleSubmit: () => tableApi.query(),
      handleReset: () => tableApi.query(),
      onHydratedQuery: () => tableApi.query(),
    });

    const loadStatistics = async (): Promise<void> => {
      try {
        const data = await getFireManageStats();
        statistics.hostCount = data.hostCount ?? 0;
        statistics.pointCount = data.pointCount ?? 0;
        statistics.todayAlarmCount = data.todayAlarmCount ?? 0;
        statistics.todayFaultCount = data.todayFaultCount ?? 0;
      } catch (error) {
        console.error("Failed to load fire host statistics:", error);
      }
    };

    const refreshPage = (): void => {
      tableApi.query();
      void loadStatistics();
    };

    onMounted(() => {
      void loadStatistics();
    });

    onActivated(() => {
      void loadStatistics();
    });

    const slots = {
      "layout-header": () => (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => hostFormModalRef.value?.openModal()}>
          新增主机
        </Button>
      ),
      "layout-content": () => (
        <div class={styles.page}>
          <HostStatisticsCards statistics={statistics} />
          <PcForm />
          <PcTable />
          <HostFormModal ref={hostFormModalRef} onSaved={refreshPage} />
          <ControlPasswordModal ref={controlPasswordModalRef} />
        </div>
      ),
      "footer-page": () => (
        <Page
          current={searchParams.pageNumber}
          pageSize={searchParams.pageSize}
          total={searchParams.total}
          onPageChange={(pageNumber: number, pageSize: number) => {
            queryState.setPage(pageNumber, pageSize);
            tableApi.query();
          }}
        />
      ),
    };

    return () => <PageLayout title={pageTitle || "主机配置"} v-slots={slots} />;
  },
});

export default FireHostConfig;
