import type { MaintenancePlanRecord } from "@g2-client/maintenance/client";
import { Button, Page, PageLayout, type PcTableColumn, PopConfirm, PopOver, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getMaintenanceClient } from "@/domain-context";
import { PLAN_STATUS_OPTIONS, planStatusLabel, timeUnitLabel } from "@/utils/enum";
import { millennial, timeFormat } from "@/utils/format";

import styles from "./plan-list.module.css";

const OPERATE_PATH = "/d/maintenance/maintenance-plan-operate";

export const MaintenancePlanList = defineComponent({
  name: "MaintenancePlanList",
  setup() {
    const client = getMaintenanceClient();
    const router = useRouter();
    const query = reactive<{ status?: string; keyword: string }>({ status: undefined, keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const switching = ref(false);
    const deleting = ref(false);

    const goOperate = (type: string, record?: MaintenancePlanRecord): void => {
      void router.push({ path: OPERATE_PATH, query: record?.id === undefined ? { type } : { type, id: String(record.id) } });
    };

    const toggleStatus = async (record: MaintenancePlanRecord): Promise<void> => {
      if (switching.value || record.id === undefined) {
        return;
      }
      switching.value = true;
      try {
        await client.updatePlanStatus({ id: record.id, status: record.status === "ENABLED" ? "DEACTIVATED" : "ENABLED" });
        message.success("操作成功");
        tableApi.query();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "操作失败");
      } finally {
        switching.value = false;
      }
    };

    const remove = async (record: MaintenancePlanRecord): Promise<void> => {
      if (deleting.value || record.id === undefined) {
        return;
      }
      deleting.value = true;
      try {
        await client.deletePlan(record.id);
        message.success("操作成功");
        tableApi.query();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        deleting.value = false;
      }
    };

    const ellipsisCell = (text?: string | null): JSX.Element => (
      <PopOver placement="topLeft" content={text ?? ""}>
        {text || "--"}
      </PopOver>
    );

    const columns: PcTableColumn[] = [
      {
        title: "维保计划名称",
        dataIndex: "maintenancePlanName",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
      {
        title: "责任人",
        dataIndex: "responsibilityPersonName",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
      {
        title: "维保周期",
        dataIndex: "maintenanceCycle",
        ellipsis: true,
        customRender: ({ text, record }) => {
          const value = text as number | string | null | undefined;
          const unit = timeUnitLabel((record as MaintenancePlanRecord).timeUnit);
          return ellipsisCell(value || value === 0 ? `${millennial(value, false)}${unit}` : null);
        },
      },
      {
        title: "计划生效时间",
        dataIndex: "planStartTime",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(timeFormat(text as string | undefined, false)),
      },
      {
        title: "计划失效时间",
        dataIndex: "planEndTime",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(timeFormat(text as string | undefined, false)),
      },
      {
        title: "生成任务数",
        dataIndex: "taskNum",
        ellipsis: true,
        customRender: ({ text }) => {
          const value = text as number | undefined;
          return ellipsisCell(value || value === 0 ? millennial(value, false) : null);
        },
      },
      {
        title: "计划状态",
        dataIndex: "status",
        ellipsis: true,
        customRender: ({ text }) => {
          const status = text as string | undefined;
          return (
            <PopOver placement="topLeft" content={status ? planStatusLabel(status) : ""}>
              <span class={status === "ENABLED" ? styles.normal : styles.abnormal}>{planStatusLabel(status)}</span>
            </PopOver>
          );
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        fixed: "right",
        width: 240,
        customRender: ({ record }) => {
          const plan = record as MaintenancePlanRecord;
          return (
            <>
              <Button type="link" onClick={() => goOperate("detail", plan)}>
                详情
              </Button>
              {plan.status === "ENABLED" ? (
                <PopConfirm title="是否停用当前计划？" okText="确定" cancelText="取消" onConfirm={() => void toggleStatus(plan)}>
                  <Button type="link">停用</Button>
                </PopConfirm>
              ) : plan.status === "DEACTIVATED" ? (
                <PopConfirm title="是否启用当前计划？" okText="确定" cancelText="取消" onConfirm={() => void toggleStatus(plan)}>
                  <Button type="link">启用</Button>
                </PopConfirm>
              ) : (
                <Button type="link" disabled>
                  停用
                </Button>
              )}
              <Button type="link" onClick={() => goOperate("copy", plan)}>
                复制
              </Button>
              <PopConfirm title="是否删除当前选中？" okText="确定" cancelText="取消" onConfirm={() => void remove(plan)}>
                <Button type="link" danger disabled={deleting.value}>
                  删除
                </Button>
              </PopConfirm>
            </>
          );
        },
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "MAINTENANCE_PLAN_LIST",
      // 首次查询在 onMounted 触发，避免与 usePcForm 的 URL 回填重复请求。
      autoFetch: false,
      fetchApi: async () =>
        client.pagePlans({ pageNumber: page.pageNumber, pageSize: page.pageSize, status: query.status, keyword: query.keyword }),
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const search = (): void => {
      page.pageNumber = 1;
      tableApi.query();
    };

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Select",
          fieldName: "status",
          label: "计划状态",
          // 「全部」用 undefined，空字符串会被 Select 视为已选中而隐藏 placeholder。
          defaultValue: undefined,
          componentProps: { placeholder: "请选择计划状态", options: PLAN_STATUS_OPTIONS, allowClear: true, style: { width: "180px" } },
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "名称", allowClear: true },
        },
      ],
      handleSubmit: () => {
        search();
      },
      handleReset: () => {
        query.status = undefined;
        query.keyword = "";
        search();
      },
    });

    onMounted(() => {
      tableApi.query();
    });

    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={() => goOperate("add")}>
          新增
        </Button>
      ),
      "layout-content": () => (
        <>
          <PcForm />
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

    return () => <PageLayout title="维保计划" v-slots={slots} />;
  },
});
