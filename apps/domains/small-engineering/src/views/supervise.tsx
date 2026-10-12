import type { SmallEngineeringRecord } from "@g2-client/small-engineering/client";
import { Button, Page, PageLayout, type PcTableColumn, PopConfirm, PopOver, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { useScheduleAction } from "@/components/schedule-action";
import { canUseSmallEngineeringFeature, getSmallEngineeringClient } from "@/domain-context";
import { downloadTable } from "@/utils/export";

const BASE = "/d/small-engineering";
const statuses = [
  { label: "进行中", value: "UNDERWAY" },
  { label: "待验收", value: "WAIT_ACCEPT" },
  { label: "已完成", value: "COMPLETED" },
];
const display = (value: unknown): string =>
  value === null || value === undefined || value === "" || value === "null" ? "--" : String(value);
const cell = (value: unknown): JSX.Element => <PopOver content={display(value)}>{display(value)}</PopOver>;
const col = (title: string, dataIndex: string, width?: number, render?: (value: unknown) => unknown): PcTableColumn => ({
  title,
  dataIndex,
  align: "center",
  ellipsis: true,
  ...(width ? { width } : {}),
  customRender: ({ text }) => cell(render ? render(text) : text),
});
const date = (value: unknown) => {
  if (!value) {
    return "--";
  }
  const time = new Date(value as string | number);
  return Number.isNaN(time.getTime()) ? String(value) : time.toLocaleDateString("zh-CN");
};

export const Supervise = defineComponent({
  name: "SmallEngineeringSupervise",
  setup() {
    const client = getSmallEngineeringClient();
    const router = useRouter();
    const query = reactive({
      status: undefined as string | undefined,
      depId: undefined as string | undefined,
      typeId: undefined as string | undefined,
      period: undefined as string[] | undefined,
      keyword: "",
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const departments = ref<{ label: string; value: string }[]>([]);
    const types = ref<{ label: string; value: string }[]>([]);
    const exportLoading = ref(false);
    const deleting = ref(false);
    let requestVersion = 0;
    const { ActionModal, openModal } = useScheduleAction(async () => {
      await load();
    });
    const navigate = (path: string, row?: SmallEngineeringRecord): void => {
      void router.push({ path: `${BASE}/${path}`, query: row?.id ? { id: row.id } : {} });
    };
    const remove = async (id: string): Promise<void> => {
      if (deleting.value) {
        return;
      }
      deleting.value = true;
      try {
        await client.deleteSchedules([id]);
        message.success("操作成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        deleting.value = false;
      }
    };
    const columns: PcTableColumn[] = [
      col("工程编号", "projectNum", 150),
      col("小散工程名称", "projectName"),
      col("工程类型", "projectTypeName", 140),
      col("监管人", "superviseUserName", 140),
      col("监管部门", "depName", 140),
      col("工程时间", "completionTime", 150, date),
      col("施工方", "partyB"),
      col("施工地点", "constructionSite"),
      col("工程状态", "status", 110),
      col("完成进度情况", "schedule", 130),
      {
        title: "操作",
        dataIndex: "action",
        width: 310,
        fixed: "right",
        customRender: ({ record }) => {
          const row = record as SmallEngineeringRecord;
          const id = String(row.id ?? "");
          return (
            <>
              <Button type="link" onClick={() => navigate("supervise-detail", row)}>
                详情
              </Button>
              {row.status !== "已完成" && canUseSmallEngineeringFeature("projectSupervise", "update") && (
                <Button type="link" onClick={() => navigate("edit-supervise", row)}>
                  编辑
                </Button>
              )}
              {row.status === "进行中" && (
                <Button
                  type="link"
                  onClick={() => {
                    void openModal("feedback", row);
                  }}
                >
                  反馈
                </Button>
              )}
              {row.status === "待验收" && (
                <Button
                  type="link"
                  onClick={() => {
                    void openModal("accept", row);
                  }}
                >
                  验收
                </Button>
              )}
              {canUseSmallEngineeringFeature("projectSupervise", "createPatrol") && (
                <Button
                  type="link"
                  onClick={() => {
                    void router.push({ path: `${BASE}/engineering-patrol-plan-edit`, query: { type: "create", objectId: id } });
                  }}
                >
                  创建巡检
                </Button>
              )}
              {canUseSmallEngineeringFeature("projectSupervise", "deleted") && (
                <PopConfirm
                  title="确认删除该项？"
                  okText="确定"
                  cancelText="取消"
                  onConfirm={() => {
                    void remove(id);
                  }}
                >
                  <Button type="link" danger>
                    删除
                  </Button>
                </PopConfirm>
              )}
            </>
          );
        },
      },
    ];
    const [PcTable, tableApi] = usePcTable({ columns, tableCode: "SMALL_ENGINEERING_SUPERVISE", rowKey: "id", autoFetch: false });
    const params = (number: number, size: number) => ({
      pageNumber: number,
      pageSize: size,
      status: query.status,
      depId: query.depId,
      typeId: query.typeId,
      keyword: query.keyword || undefined,
      period: query.period?.length === 2 ? query.period.join(",") : undefined,
    });
    const load = async (): Promise<void> => {
      const current = ++requestVersion;
      tableApi.loading.value = true;
      try {
        const result = await client.listSchedules(params(page.pageNumber, page.pageSize));
        if (current !== requestVersion) {
          return;
        }
        tableApi.setDataSource(result.records);
        page.total = result.total;
      } catch (error) {
        if (current === requestVersion) {
          message.error(error instanceof Error ? error.message : "获取工程监管列表失败");
        }
      } finally {
        if (current === requestVersion) {
          tableApi.loading.value = false;
        }
      }
    };
    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      cache: true,
      cacheFields: ["status", "depId", "typeId", "period", "keyword"],
      syncStateRef: query,
      schema: [
        {
          component: "Select",
          label: "工程状态",
          fieldName: "status",
          defaultValue: undefined,
          componentProps: { options: statuses, allowClear: true, placeholder: "请选择工程状态", style: { width: "180px" } },
        },
        {
          component: "Select",
          label: "监管部门",
          fieldName: "depId",
          defaultValue: undefined,
          componentProps: { options: departments.value, allowClear: true, placeholder: "请选择监管部门", style: { width: "180px" } },
        },
        {
          component: "Select",
          label: "工程类型",
          fieldName: "typeId",
          defaultValue: undefined,
          componentProps: { options: types.value, allowClear: true, placeholder: "请选择工程类型", style: { width: "180px" } },
        },
        {
          component: "RangePicker",
          label: "完成时间",
          fieldName: "period",
          defaultValue: undefined,
          componentProps: { valueFormat: "YYYY-MM-DD", style: { width: "250px" } },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          defaultValue: "",
          componentProps: { placeholder: "工程名称、工程编号、监管人、施工方", style: { width: "280px" } },
        },
      ],
      handleSubmit(values) {
        query.status = values.status ? String(values.status) : undefined;
        query.depId = values.depId ? String(values.depId) : undefined;
        query.typeId = values.typeId ? String(values.typeId) : undefined;
        query.period = Array.isArray(values.period) ? values.period.map(String) : undefined;
        query.keyword = String(values.keyword ?? "");
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        Object.assign(query, { status: undefined, depId: undefined, typeId: undefined, period: undefined, keyword: "" });
        page.pageNumber = 1;
        void load();
      },
    });
    void Promise.all([client.listOrganizations(), client.listProjectTypes()])
      .then(([orgs, typeList]) => {
        departments.value = orgs.map((row) => ({ label: String(row.name ?? ""), value: String(row.id ?? "") }));
        types.value = typeList.map((row) => ({ label: String(row.name ?? ""), value: String(row.id ?? "") }));
        formApi.updateFieldSchema({
          component: "Select",
          label: "监管部门",
          fieldName: "depId",
          defaultValue: undefined,
          componentProps: { options: departments.value, allowClear: true, placeholder: "请选择监管部门" },
        });
        formApi.updateFieldSchema({
          component: "Select",
          label: "工程类型",
          fieldName: "typeId",
          defaultValue: undefined,
          componentProps: { options: types.value, allowClear: true, placeholder: "请选择工程类型" },
        });
      })
      .catch((error: unknown) => {
        message.error(error instanceof Error ? error.message : "查询选项加载失败");
      });
    const exportRows = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      exportLoading.value = true;
      try {
        const first = await client.listSchedules(params(1, 100));
        const rows = [...first.records];
        for (let number = 2; number <= first.pages; number++) {
          rows.push(...(await client.listSchedules(params(number, 100))).records);
        }
        if (rows.length === 0) {
          message.warning("当前检索条件下暂无数据");
          return;
        }
        const fields = columns.filter((column) => column.dataIndex !== "action");
        await downloadTable(
          "工程监管",
          fields,
          rows.map((row) => ({ ...row, completionTime: date(row.completionTime) })),
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : "导出失败");
      } finally {
        exportLoading.value = false;
      }
    };
    void load();
    const slots = {
      "layout-header": () => (
        <>
          {canUseSmallEngineeringFeature("projectSupervise", "createSupervise") && (
            <Button type="primary" onClick={() => navigate("edit-supervise")}>
              新增
            </Button>
          )}
          {canUseSmallEngineeringFeature("projectSupervise", "downloadSupervise") && (
            <Button
              type="primary"
              loading={exportLoading.value}
              onClick={() => {
                void exportRows();
              }}
            >
              导出
            </Button>
          )}
        </>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          cachePageQuery={true}
          onPageChange={(number: number, size: number) => {
            page.pageNumber = number;
            page.pageSize = size;
            void load();
          }}
        />
      ),
    };
    return () => (
      <>
        <PageLayout title="工程监管" v-slots={slots} />
        <ActionModal />
      </>
    );
  },
});
