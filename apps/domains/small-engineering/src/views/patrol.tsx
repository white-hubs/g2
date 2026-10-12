import type { SmallEngineeringPage, SmallEngineeringRecord } from "@g2-client/small-engineering/client";
import type { InspectionPage, InspectionRecord } from "@g2-contract/daily-inspection";
import {
  Button,
  Modal,
  Page,
  PageLayout,
  type PcTableColumn,
  PopConfirm,
  PopOver,
  RadioGroup,
  Switch,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, markRaw, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { canUseSmallEngineeringFeature, getPatrolClient, getSmallEngineeringClient } from "@/domain-context";

type Kind = "plan" | "task" | "record" | "temporary";
const BASE = "/d/small-engineering";
const BUSINESS_TYPE = "SMALL_ENGINEERING";
const TASK_STATUS: Record<string, string> = {
  ACCEPT: "待接收",
  EXECUTING: "进行中",
  OVER: "已完成",
  EXPIRE: "已过期",
  STOP: "已终止",
  CONFIRM: "待确认",
  OVERTIME: "超时完成",
};
const PLAN_STATUS: Record<string, string> = { EXECUTING: "执行中", OVER: "已结束", STOP: "已停用" };
const valueText = (value: unknown) => (value === undefined || value === null || value === "" ? "--" : String(value));
const cell = (value: unknown): JSX.Element => <PopOver content={valueText(value)}>{valueText(value)}</PopOver>;
const date = (value: unknown): string => {
  if (!value) {
    return "--";
  }
  const time = new Date(value as string | number);
  return Number.isNaN(time.getTime()) ? String(value) : time.toLocaleString("zh-CN", { hour12: false });
};
const col = (title: string, dataIndex: string, width?: number, render?: (value: unknown) => unknown): PcTableColumn => ({
  title,
  dataIndex,
  ...(width ? { width } : {}),
  ellipsis: true,
  customRender: ({ text }) => cell(render ? render(text) : text),
});

function createPatrolPage(kind: Kind) {
  const titles = { plan: "巡查计划", task: "巡查任务", record: "巡查记录", temporary: "临时巡查记录" };
  const codes = {
    plan: "SMALL_INSPECTION_PLAN",
    task: "SMALL_INSPECTION_TASK",
    record: "SMALL_INSPECTION_RECORD",
    temporary: "SMALL_TEMPORARY_PATROL_RECORD",
  };
  return defineComponent({
    name: `SmallEngineeringPatrol${kind}`,
    setup() {
      const patrol = getPatrolClient();
      const small = getSmallEngineeringClient();
      const router = useRouter();
      const query = reactive({
        status: undefined as string | undefined,
        typeId: undefined as string | undefined,
        result: undefined as string | undefined,
        keyword: "",
        period: undefined as string[] | undefined,
      });
      const types = ref<{ label: string; value: string }[]>([]);
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      let requestVersion = 0;
      const actionLoading = ref(false);
      const editPath = kind === "plan" ? "engineering-patrol-plan-edit" : "engineering-patrol-task-edit";
      const open = (type: "create" | "info" | "edit" | "copy", id?: string): void => {
        void router.push({ path: `${BASE}/${editPath}`, query: { type, ...(id ? { id } : {}) } });
      };
      const openRecord = (id: string): void => {
        void router.push({
          path: `${BASE}/${kind === "temporary" ? "engineering-temporary-patrol-details" : "engineering-patrol-record-info"}`,
          query: { id },
        });
      };
      const reloadAction = async (action: () => Promise<unknown>, successText = "操作成功"): Promise<void> => {
        if (actionLoading.value) {
          return;
        }
        actionLoading.value = true;
        try {
          await action();
          message.success(successText);
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "操作失败");
        } finally {
          actionLoading.value = false;
        }
      };
      const columns: PcTableColumn[] =
        kind === "plan"
          ? [
              col("名称", "name"),
              col("巡检类型", "typeName", 130),
              {
                title: "执行部门/人",
                dataIndex: "receiveType",
                width: 150,
                customRender: ({ record }) =>
                  cell(
                    String(record.receiveType) === "1"
                      ? record.receiveNames
                      : [record.receiveDeptNames, record.receivePostNames].filter(Boolean).join("/") || record.receiveRoleNames,
                  ),
              },
              col("巡检对象数", "targetNum", 120),
              col("失效时间", "validEndTime", 180, date),
              col("状态", "status", 110, (value) => PLAN_STATUS[String(value)]),
              col("创建人", "createByName", 120),
              col("创建时间", "createTime", 180, date),
              {
                title: "停用/启用",
                dataIndex: "enable",
                width: 130,
                customRender: ({ record }) => {
                  const row = record as InspectionRecord;
                  return (
                    <Switch
                      loading={actionLoading.value}
                      checked={Boolean(row.enable)}
                      checkedChildren="启用"
                      unCheckedChildren="停用"
                      onChange={(enabled) => {
                        Modal.confirm({
                          title: `是否确认${enabled ? "启用" : "停用"}计划？`,
                          okText: "确定",
                          cancelText: "取消",
                          onOk: () => reloadAction(() => patrol.setPlanEnabled(String(row.id ?? ""), enabled === true, BUSINESS_TYPE)),
                        });
                      }}
                    />
                  );
                },
              },
              {
                title: "操作",
                dataIndex: "action",
                width: 240,
                fixed: "right",
                customRender: ({ record }) => {
                  const id = String((record as InspectionRecord).id ?? "");
                  return (
                    <>
                      <Button type="link" onClick={() => open("info", id)}>
                        详情
                      </Button>
                      <Button type="link" onClick={() => open("edit", id)}>
                        编辑
                      </Button>
                      <Button type="link" onClick={() => open("copy", id)}>
                        复制
                      </Button>
                      <PopConfirm
                        title="确认删除该项？"
                        okText="确定"
                        cancelText="取消"
                        onConfirm={() => {
                          void reloadAction(() => patrol.deletePlan(id, BUSINESS_TYPE), "删除成功");
                        }}
                      >
                        <Button type="link" danger>
                          删除
                        </Button>
                      </PopConfirm>
                    </>
                  );
                },
              },
            ]
          : kind === "task"
            ? [
                col("任务名称", "name"),
                col("巡检类型", "typeName", 130),
                col("任务类型", "isCheck", 120, (value) => (value ? "稽查" : "普通")),
                col("执行人", "receiveNames"),
                col("发布人", "publisherName", 120),
                col("发布时间", "createTime", 180, date),
                col("截止时间", "validEndTime", 180, date),
                col("巡检对象数", "targetNum", 120),
                col("进度", "recordCompletionRate", 110, (value) => (value == null ? "--" : `${value}%`)),
                col("状态", "status", 110, (value) => TASK_STATUS[String(value)]),
                {
                  title: "操作",
                  dataIndex: "action",
                  width: 140,
                  fixed: "right",
                  customRender: ({ record }) => {
                    const row = record as InspectionRecord;
                    const id = String(row.id ?? "");
                    return (
                      <>
                        <Button type="link" onClick={() => open("info", id)}>
                          详情
                        </Button>
                        <PopConfirm
                          title="确认停止该任务？"
                          okText="确定"
                          cancelText="取消"
                          onConfirm={() => {
                            void reloadAction(() => patrol.stopTask(id, BUSINESS_TYPE));
                          }}
                        >
                          <Button type="link" disabled={row.status !== "EXECUTING"}>
                            停止
                          </Button>
                        </PopConfirm>
                      </>
                    );
                  },
                },
              ]
            : kind === "record"
              ? [
                  col("对象名称", "targetName"),
                  col("巡检方式", "inspectMethod", 130),
                  col("任务名称", "taskName"),
                  col("巡检人员", "nickname", 120),
                  col("巡检时间", "time", 180, date),
                  col("结果", "result", 110, (value) => (value === "NORMAL" ? "正常" : value === "ABNORMAL" ? "异常" : "--")),
                  col("异常明细", "errNames"),
                  {
                    title: "操作",
                    dataIndex: "action",
                    width: 100,
                    fixed: "right",
                    customRender: ({ record }) => (
                      <Button type="link" onClick={() => openRecord(String((record as InspectionRecord).id ?? ""))}>
                        详情
                      </Button>
                    ),
                  },
                ]
              : [
                  col("对象名称", "projectName"),
                  col("巡检方式", "inspectMethod", 130, () => "临时巡检"),
                  col("任务名称", "name"),
                  col("巡检人员", "userName", 120),
                  col("巡检时间", "completeTime", 180, date),
                  col("结果", "result", 110, (value) => (value === "NORMAL" ? "正常" : value === "ABNORMAL" ? "异常" : "--")),
                  {
                    title: "操作",
                    dataIndex: "action",
                    width: 100,
                    fixed: "right",
                    customRender: ({ record }) => (
                      <Button type="link" onClick={() => openRecord(String((record as SmallEngineeringRecord).id ?? ""))}>
                        详情
                      </Button>
                    ),
                  },
                ];
      const [PcTable, tableApi] = usePcTable({ columns, tableCode: codes[kind], rowKey: "id", autoFetch: false });
      const period = () => (query.period?.length === 2 ? query.period.join(",") : undefined);
      const load = async (): Promise<void> => {
        const current = ++requestVersion;
        tableApi.loading.value = true;
        try {
          const common = { pageNumber: page.pageNumber, pageSize: page.pageSize, businessType: BUSINESS_TYPE };
          let result: InspectionPage | SmallEngineeringPage;
          if (kind === "plan") {
            result = await patrol.listPlans({
              ...common,
              status: query.status,
              typeId: query.typeId,
              keywords: query.keyword || undefined,
            });
          } else if (kind === "task") {
            result = await patrol.listTasks({
              ...common,
              status: query.status,
              typeId: query.typeId,
              keyword: query.keyword || undefined,
              period: period(),
            });
          } else if (kind === "record") {
            result = await patrol.listRecords({ ...common, result: query.result, keyword: query.keyword || undefined, period: period() });
          } else {
            result = await small.listTemporaryPatrols({
              ...common,
              keyword: query.keyword || undefined,
              period: query.period?.length === 2 ? `${query.period[0]} 00:00:00,${query.period[1]} 23:59:59` : undefined,
            });
          }
          if (current !== requestVersion) {
            return;
          }
          tableApi.setDataSource(result.records);
          page.total = result.total;
        } catch (error) {
          if (current === requestVersion) {
            message.error(error instanceof Error ? error.message : `${titles[kind]}加载失败`);
          }
        } finally {
          if (current === requestVersion) {
            tableApi.loading.value = false;
          }
        }
      };
      const schema = [
        ...(kind === "plan"
          ? [
              {
                component: markRaw(RadioGroup),
                label: "",
                fieldName: "status",
                defaultValue: undefined,
                componentProps: {
                  options: [{ label: "全部", value: "" }, ...Object.entries(PLAN_STATUS).map(([value, label]) => ({ value, label }))],
                  buttonStyle: "solid",
                  optionType: "button",
                },
              },
            ]
          : kind === "task"
            ? [
                {
                  component: "Select",
                  label: "状态",
                  fieldName: "status",
                  defaultValue: undefined,
                  componentProps: {
                    options: Object.entries(TASK_STATUS).map(([value, label]) => ({ value, label })),
                    allowClear: true,
                    placeholder: "请选择状态",
                  },
                },
              ]
            : kind === "record"
              ? [
                  {
                    component: "Select",
                    label: "巡查结果",
                    fieldName: "result",
                    defaultValue: undefined,
                    componentProps: {
                      options: [
                        { label: "正常", value: "NORMAL" },
                        { label: "异常", value: "ABNORMAL" },
                      ],
                      allowClear: true,
                      placeholder: "请选择巡查结果",
                    },
                  },
                ]
              : []),
        ...(kind === "plan" || kind === "task"
          ? [
              {
                component: "Select",
                label: "巡检类型",
                fieldName: "typeId",
                defaultValue: undefined,
                componentProps: { options: types.value, allowClear: true, placeholder: "请选择巡检类型" },
              },
            ]
          : []),
        ...(kind === "plan"
          ? []
          : [
              {
                component: "RangePicker",
                label: kind === "task" ? "发布时间" : "巡检时间",
                fieldName: "period",
                defaultValue: undefined,
                componentProps: { valueFormat: "YYYY-MM-DD", style: { width: "240px" } },
              },
            ]),
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          defaultValue: "",
          componentProps: { placeholder: "名称", style: { width: "220px" } },
        },
      ];
      const [PcForm, formApi] = usePcForm({
        layout: "horizontal",
        cache: true,
        cacheFields: ["status", "typeId", "result", "period", "keyword"],
        syncStateRef: query,
        schema,
        handleValuesChange(_values, _changed, meta) {
          if (meta?.fieldName === "status" || meta?.fieldName === "typeId" || meta?.fieldName === "result") {
            query.status = formApi.formValues.status ? String(formApi.formValues.status) : undefined;
            query.typeId = formApi.formValues.typeId ? String(formApi.formValues.typeId) : undefined;
            query.result = formApi.formValues.result ? String(formApi.formValues.result) : undefined;
            page.pageNumber = 1;
            void load();
          }
        },
        handleSubmit(values) {
          query.status = values.status ? String(values.status) : undefined;
          query.typeId = values.typeId ? String(values.typeId) : undefined;
          query.result = values.result ? String(values.result) : undefined;
          query.period = Array.isArray(values.period) ? values.period.map(String) : undefined;
          query.keyword = String(values.keyword ?? "");
          page.pageNumber = 1;
          void load();
        },
        handleReset() {
          Object.assign(query, { status: undefined, typeId: undefined, result: undefined, period: undefined, keyword: "" });
          page.pageNumber = 1;
          void load();
        },
      });
      if (kind === "plan" || kind === "task") {
        void patrol
          .listTypes({ businessType: BUSINESS_TYPE })
          .then((items) => {
            types.value = items.map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }));
            formApi.updateFieldSchema({
              component: "Select",
              label: "巡检类型",
              fieldName: "typeId",
              defaultValue: undefined,
              componentProps: { options: types.value, allowClear: true, placeholder: "请选择巡检类型" },
            });
          })
          .catch((error: unknown) => {
            message.error(error instanceof Error ? error.message : "巡检类型加载失败");
          });
      }
      void load();
      const slots = {
        "layout-header": () =>
          (kind === "plan" || kind === "task") &&
          canUseSmallEngineeringFeature("projectPatrol", kind === "plan" ? "createPlan" : "createTask") ? (
            <Button type="primary" onClick={() => open("create")}>
              新增
            </Button>
          ) : null,
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
      return () => <PageLayout title={titles[kind]} v-slots={slots} />;
    },
  });
}

export const PatrolPlan = createPatrolPage("plan");
export const PatrolTask = createPatrolPage("task");
export const PatrolRecords = createPatrolPage("record");
export const TemporaryPatrolRecords = createPatrolPage("temporary");
