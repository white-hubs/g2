import type { MaintenanceTaskRecord } from "@g2-client/maintenance/client";
import {
  Button,
  Page,
  PageLayout,
  type PcFormSchemaProp,
  type PcTableColumn,
  PopOver,
  RadioGroup,
  Space,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, markRaw, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getMaintenanceClient } from "@/domain-context";
import { taskStatusLabel } from "@/utils/enum";
import { timeFormat, toPeriod } from "@/utils/format";
import {
  PRODUCT_CATEGORY_FIELD_NAMES,
  lastCategoryCode,
  loadProductCategoryTree,
  type ProductCategoryNode,
} from "@/utils/product-category";

import styles from "./task-list.module.css";

const DETAILS_PATH = "/d/maintenance/maintenance-task-details";
const EXECUTE_PATH = "/d/maintenance/maintenance-execute";

/** 与故障报修 / 隐患排查一致：Radio button Tab 作为首个筛选项。 */
const STATUS_TAB_OPTIONS = [
  { label: "所有任务", value: "all" },
  { label: "待维保", value: "BE_MAINTAINED" },
  { label: "已完成", value: "COMPLETED" },
];

export const MaintenanceTaskList = defineComponent({
  name: "MaintenanceTaskList",
  setup() {
    const client = getMaintenanceClient();
    const router = useRouter();
    const route = useRoute();
    const query = reactive<{
      statusTab: string;
      categoryCode?: string[];
      objectName: string;
      date?: string[];
    }>({
      statusTab: typeof route.query.type === "string" && route.query.type ? route.query.type : "all",
      categoryCode: undefined,
      objectName: "",
      date: undefined,
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const categoryOptions = ref<ProductCategoryNode[]>([]);

    const ellipsisCell = (text?: string | null): JSX.Element => (
      <PopOver placement="topLeft" content={text ?? ""}>
        {text || "--"}
      </PopOver>
    );

    const columns: PcTableColumn[] = [
      {
        title: "发布时间",
        dataIndex: "maintenanceTime",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(timeFormat(text as string | undefined, true)),
      },
      {
        title: "维保计划名称",
        dataIndex: "maintenancePlanName",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
      { title: "设备名称", dataIndex: "objectName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text as string | undefined) },
      {
        title: "产品品类",
        dataIndex: "categoryName",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
      {
        title: "责任人",
        dataIndex: "responsibilityPersonName",
        ellipsis: true,
        // 旧页：责任类型为「人员」看 responsibilityPersonName，否则看岗位名称。
        customRender: ({ text, record }) => {
          const task = record as MaintenanceTaskRecord;
          return ellipsisCell(task.responsibilityType === "per" ? (text as string | undefined) : task.responsibilityPositionName);
        },
      },
      {
        title: "状态",
        dataIndex: "maintenanceTaskStatus",
        ellipsis: true,
        customRender: ({ text }) => {
          const status = text as string | undefined;
          if (status !== "BE_MAINTAINED" && status !== "COMPLETED") {
            return "--";
          }
          return (
            <span class={styles.statusDot}>
              <i class={status === "COMPLETED" ? styles.dotNormal : styles.dotAudit} />
              {taskStatusLabel(status)}
            </span>
          );
        },
      },
      {
        title: "维保完成时间",
        dataIndex: "maintenanceFinishTime",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(timeFormat(text as string | undefined, true)),
      },
      {
        title: "操作",
        dataIndex: "action",
        fixed: "right",
        width: 140,
        customRender: ({ record }) => {
          const task = record as MaintenanceTaskRecord;
          return (
            <Space>
              <Button
                type="link"
                size="small"
                onClick={() => void router.push({ path: DETAILS_PATH, query: { type: "detail", id: String(task.id ?? "") } })}
              >
                详情
              </Button>
              {task.maintenanceTaskStatus === "BE_MAINTAINED" ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => void router.push({ path: EXECUTE_PATH, query: { id: String(task.id ?? "") } })}
                >
                  维保
                </Button>
              ) : null}
            </Space>
          );
        },
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "MAINTENANCE_TASK",
      autoFetch: false,
      fetchApi: async () =>
        client.pageTasks({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          categoryCode: lastCategoryCode(query.categoryCode),
          objectName: query.objectName,
          maintenanceTaskStatus: query.statusTab === "all" ? undefined : query.statusTab,
          period: toPeriod(query.date),
        }),
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const search = (): void => {
      page.pageNumber = 1;
      tableApi.query();
    };

    const categorySchema = (options: ProductCategoryNode[]): PcFormSchemaProp => ({
      component: "Cascader",
      fieldName: "categoryCode",
      label: "产品品类",
      defaultValue: undefined,
      componentProps: {
        placeholder: "请选择产品品类",
        options,
        fieldNames: PRODUCT_CATEGORY_FIELD_NAMES,
        changeOnSelect: true,
        allowClear: true,
        style: { width: "220px" },
      },
    });

    const statusTabSchema: PcFormSchemaProp = {
      component: markRaw(RadioGroup),
      fieldName: "statusTab",
      label: "",
      defaultValue: query.statusTab,
      componentProps: {
        buttonStyle: "solid",
        optionType: "button",
        options: STATUS_TAB_OPTIONS,
      },
    };

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        statusTabSchema,
        categorySchema([]),
        {
          component: "RangePicker",
          fieldName: "date",
          label: "时间范围",
          defaultValue: undefined,
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
        },
        {
          component: "Input",
          fieldName: "objectName",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "设备名称", allowClear: true },
        },
      ],
      handleValuesChange(_values, _changed, meta) {
        if (meta?.fieldName !== "statusTab") {
          return;
        }
        query.statusTab = String(formApi.formValues.statusTab ?? "all");
        search();
      },
      handleSubmit: () => {
        search();
      },
      handleReset: () => {
        query.statusTab = "all";
        query.categoryCode = undefined;
        query.objectName = "";
        query.date = undefined;
        formApi.setFormValues({ statusTab: "all", categoryCode: undefined, objectName: "", date: undefined });
        search();
      },
    });

    onMounted(() => {
      // 维保统计跳转过来时带设备名与任务状态，需要回填后再发起首次查询。
      const deviceName = typeof route.query.deviceName === "string" ? route.query.deviceName : "";
      if (deviceName) {
        query.objectName = deviceName;
        formApi.setFormValues({ objectName: deviceName, statusTab: query.statusTab });
      }
      tableApi.query();
      loadProductCategoryTree()
        .then((tree) => {
          categoryOptions.value = tree;
          formApi.updateFieldSchema(categorySchema(tree));
        })
        .catch((error: unknown) => {
          message.error(error instanceof Error ? error.message : "产品品类加载失败");
        });
    });

    const slots = {
      "layout-content": () => (
        <>
          <div class={[styles.filterForm, styles.withTabs]}>
            <PcForm />
          </div>
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          cachePageQuery
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(pageNumber: number, pageSize: number) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            tableApi.query();
          }}
        />
      ),
    };

    return () => <PageLayout title="维保任务" showFooter v-slots={slots} />;
  },
});
