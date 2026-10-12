import type { PatrolDepartment, PatrolOverview, PatrolRow } from "@g2-contract/electronic-patrol";
import * as VueApi from "vue";
import { useRouter } from "vue-router";

import * as PatrolContext from "../domain-context";
import * as PcUi from "../pc-ui-runtime";
import { downloadBlob, errorMessage, formatDateTime, patrolWayText, rangePeriod, text } from "../shared";

import styles from "../styles.module.less";

const { Button, Form, Page, PageLayout, Popconfirm, Space, TabPane, Tabs, Tag, TimePicker, message, usePcForm, usePcTable } = PcUi;
const { defineComponent, markRaw, reactive, ref } = VueApi;

const TimeRangeField = markRaw(
  defineComponent({
    name: "ElectronicPatrolTimeRangeField",
    inheritAttrs: false,
    props: {
      format: { type: String, default: "HH:mm" },
      placeholder: { type: Array, default: () => ["开始时间", "结束时间"] },
      value: { type: Array, default: () => [] },
      valueFormat: { type: String, default: "HH:mm" },
    },
    emits: ["update:value"],
    setup(props, { emit }) {
      const updateValue = (index: number, value: unknown): void => {
        const next = [props.value[0], props.value[1]];
        next[index] = value;
        emit("update:value", next.every((item) => item === undefined || item === null || item === "") ? undefined : next);
      };

      return () => (
        <Form.ItemRest>
          <Space size={4}>
            <TimePicker
              allowClear
              format={props.format}
              placeholder={String(props.placeholder[0] ?? "开始时间")}
              value={typeof props.value[0] === "string" ? props.value[0] : undefined}
              valueFormat={props.valueFormat}
              onUpdate:value={(value: unknown) => updateValue(0, value)}
            />
            <span>至</span>
            <TimePicker
              allowClear
              format={props.format}
              placeholder={String(props.placeholder[1] ?? "结束时间")}
              value={typeof props.value[1] === "string" ? props.value[1] : undefined}
              valueFormat={props.valueFormat}
              onUpdate:value={(value: unknown) => updateValue(1, value)}
            />
          </Space>
        </Form.ItemRest>
      );
    },
  }),
);

const planStates = [
  { key: "ENABLE", label: "执行中" },
  { key: "STOP", label: "已停用" },
  { key: "END", label: "已结束" },
  { key: "", label: "全部" },
];

const taskStates = [
  { key: "TO_BE_RECEIVED", label: "待接收" },
  { key: "IN_EXECUTION", label: "执行中" },
  { key: "FINISHED", label: "已结束" },
  { key: "", label: "全部" },
];

export const PatrolPlanPage = defineComponent({
  name: "ElectronicPatrolPlanPage",
  setup() {
    const router = useRouter();
    const query = reactive<{ keyword: string; executeData?: unknown[]; patrolCycle?: string }>({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const activeKey = ref("ENABLE");
    const counts = ref<Record<string, number>>({});

    const refresh = (): void => tableApi.query();
    const [PcTable, tableApi] = usePcTable({
      tableCode: "ELECTRONIC_PATROL_PLAN",
      rowKey: "id",
      columns: [
        { title: "计划名称", dataIndex: "planName", width: 180, fixed: "left", ellipsis: true },
        { title: "生效时间", dataIndex: "startData", width: 180, customRender: ({ text: value }) => formatDateTime(value) },
        { title: "失效时间", dataIndex: "endData", width: 180, customRender: ({ text: value }) => formatDateTime(value) },
        { title: "巡更路线", dataIndex: "routeName", width: 180, ellipsis: true },
        {
          title: "巡更周期",
          dataIndex: "patrolCycle",
          width: 110,
          customRender: ({ text: value }) => (value === "one" ? "单次" : value === "circulate" ? "循环" : text(value)),
        },
        { title: "巡更方式", dataIndex: "patrolWay", width: 210, ellipsis: true, customRender: ({ text: value }) => patrolWayText(value) },
        {
          title: "状态",
          dataIndex: "status",
          width: 100,
          customRender: ({ text: value }) => {
            const status = String(value ?? "");
            return (
              <Tag color={status === "ENABLE" ? "green" : status === "STOP" ? "orange" : "default"}>
                {status === "ENABLE" ? "执行中" : status === "STOP" ? "已停用" : "已结束"}
              </Tag>
            );
          },
        },
        {
          title: "操作",
          dataIndex: "action",
          fixed: "right",
          width: 285,
          customRender: ({ record }: { record: PatrolRow }) => (
            <div class={styles.actionSpace}>
              <Button
                type="link"
                onClick={() =>
                  void router.push({ path: "/d/electronic-patrol/plan/detiles", query: { type: "plan", id: record.id, handle: "detiles" } })
                }
              >
                详情
              </Button>
              <Button
                type="link"
                onClick={() =>
                  void router.push({ path: "/d/electronic-patrol/plan/detiles", query: { type: "plan", id: record.id, handle: "edit" } })
                }
              >
                编辑
              </Button>
              <Button
                type="link"
                onClick={() =>
                  void router.push({ path: "/d/electronic-patrol/plan/detiles", query: { type: "plan", id: record.id, handle: "copy" } })
                }
              >
                复制
              </Button>
              {String(record.status) !== "END" ? (
                <Popconfirm
                  title={`确定要${record.status === "ENABLE" ? "停止" : "启用"}该项？`}
                  onConfirm={async () => {
                    try {
                      await PatrolContext.getElectronicPatrolClient().changePlanStatus({
                        id: record.id,
                        status: record.status === "ENABLE" ? "STOP" : "ENABLE",
                      });
                      message.success("操作成功");
                      refresh();
                    } catch (error) {
                      message.error(errorMessage(error, "操作失败"));
                    }
                  }}
                >
                  <Button type="link">{record.status === "ENABLE" ? "停止" : "启用"}</Button>
                </Popconfirm>
              ) : null}
              <Popconfirm
                title="确定要删除该项？"
                onConfirm={async () => {
                  try {
                    await PatrolContext.getElectronicPatrolClient().deletePlan(record.id);
                    message.success("删除成功");
                    refresh();
                  } catch (error) {
                    message.error(errorMessage(error, "删除失败"));
                  }
                }}
              >
                <Button type="link" danger>
                  删除
                </Button>
              </Popconfirm>
            </div>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const [result, statusCounts] = await Promise.all([
            PatrolContext.getElectronicPatrolClient().pagePlans({
              pageNumber: page.pageNumber,
              pageSize: page.pageSize,
              keyword: query.keyword || undefined,
              executeData:
                Array.isArray(query.executeData) && query.executeData.length === 2 ? query.executeData.map(String).join("-") : undefined,
              patrolCycle: query.patrolCycle,
              status: activeKey.value || undefined,
            }),
            PatrolContext.getElectronicPatrolClient().listPlanStatus(),
          ]);
          counts.value = Object.fromEntries(statusCounts.map((item) => [item.name, item.value]));
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "巡更计划加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "计划",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入计划" },
        },
        {
          component: TimeRangeField,
          fieldName: "executeData",
          label: "时间段",
          componentProps: {
            allowClear: true,
            format: "HH:mm",
            onChange: () => undefined,
            placeholder: ["开始时间", "结束时间"],
            valueFormat: "HH:mm",
          },
        },
        {
          component: "Select",
          fieldName: "patrolCycle",
          label: "周期",
          componentProps: {
            allowClear: true,
            options: [
              { label: "单次", value: "one" },
              { label: "循环", value: "circulate" },
            ],
            placeholder: "请选择",
          },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        query.executeData = Array.isArray(values.executeData) && values.executeData.length === 2 ? values.executeData : undefined;
        query.patrolCycle = typeof values.patrolCycle === "string" ? values.patrolCycle : undefined;
        page.pageNumber = 1;
        refresh();
      },
      handleReset() {
        query.keyword = "";
        query.executeData = undefined;
        query.patrolCycle = undefined;
        page.pageNumber = 1;
        refresh();
      },
    });

    return () => (
      <PageLayout
        title="巡更计划"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => void router.push({ path: "/d/electronic-patrol/plan/detiles", query: { type: "plan" } })}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.tablePage}>
              <Tabs
                activeKey={activeKey.value}
                onChange={(value: string | number) => {
                  activeKey.value = String(value);
                  page.pageNumber = 1;
                  refresh();
                }}
              >
                {planStates.map((item) => (
                  <TabPane key={item.key} tab={`${item.label} (${counts.value[item.key || "ALL"] ?? 0})`} />
                ))}
              </Tabs>
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(number: number, size: number) => {
                page.pageNumber = number;
                page.pageSize = size;
                refresh();
              }}
            />
          ),
        }}
      />
    );
  },
});

export const PatrolTaskPage = defineComponent({
  name: "ElectronicPatrolTaskPage",
  setup() {
    const router = useRouter();
    const query = reactive({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const activeKey = ref("TO_BE_RECEIVED");
    const overview = ref<PatrolOverview>({ total: 0, toBeReceived: 0, inExecution: 0, finished: 0 });
    const refresh = (): void => tableApi.query();

    const [PcTable, tableApi] = usePcTable({
      tableCode: "ELECTRONIC_PATROL_TASK",
      rowKey: "id",
      columns: [
        { title: "任务名称", dataIndex: "taskName", width: 190, fixed: "left", ellipsis: true },
        { title: "发布人", dataIndex: "publisherName", width: 130, ellipsis: true },
        { title: "发布人部门", dataIndex: "publisherDepName", width: 160, ellipsis: true },
        {
          title: "发布时间",
          dataIndex: "publisherTime",
          width: 180,
          customRender: ({ text: value }) => formatDateTime(value),
        },
        { title: "时间段", dataIndex: "executeData", width: 140, ellipsis: true },
        { title: "巡更路线", dataIndex: "patrolRouteName", width: 170, ellipsis: true },
        { title: "巡更点数", dataIndex: "patrolLocationNum", width: 100 },
        { title: "巡更人员", dataIndex: "userName", width: 140, ellipsis: true },
        {
          title: "状态",
          dataIndex: "status",
          width: 110,
          customRender: ({ text: value }) => {
            const status = String(value ?? "");
            return (
              <Tag color={status === "IN_EXECUTION" ? "blue" : status === "TO_BE_RECEIVED" ? "orange" : "green"}>
                {status === "IN_EXECUTION" ? "执行中" : status === "TO_BE_RECEIVED" ? "待接收" : "已结束"}
              </Tag>
            );
          },
        },
        {
          title: "任务情况",
          dataIndex: "result",
          width: 110,
          customRender: ({ text: value }) =>
            value === "NORMAL" ? "正常" : value === "ABNORMAL" ? <span class={styles.danger}>异常</span> : "--",
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 130,
          fixed: "right",
          customRender: ({ record }: { record: PatrolRow }) => (
            <div class={styles.actionSpace}>
              <Button
                type="link"
                onClick={() =>
                  void router.push({
                    path: "/d/electronic-patrol/task/detiles",
                    query: { id: record.id, status: String(record.status ?? ""), type: "task" },
                  })
                }
              >
                详情
              </Button>
              <Popconfirm
                title="是否删除当前选中？"
                onConfirm={async () => {
                  try {
                    await PatrolContext.getElectronicPatrolClient().removeTasks([record.id]);
                    message.success("删除成功");
                    refresh();
                  } catch (error) {
                    message.error(errorMessage(error, "删除失败"));
                  }
                }}
              >
                <Button type="link" danger>
                  删除
                </Button>
              </Popconfirm>
            </div>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const [result, totals] = await Promise.all([
            PatrolContext.getElectronicPatrolClient().pageTasks({
              pageNumber: page.pageNumber,
              pageSize: page.pageSize,
              keyword: query.keyword || undefined,
              taskState: activeKey.value || undefined,
              admin: false,
            }),
            PatrolContext.getElectronicPatrolClient().getTaskOverview(),
          ]);
          page.total = result.total;
          overview.value = totals;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "巡更任务加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "任务名称",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入任务名称" },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        page.pageNumber = 1;
        refresh();
      },
      handleReset() {
        query.keyword = "";
        page.pageNumber = 1;
        refresh();
      },
    });
    const count = (key: string): number =>
      key === "TO_BE_RECEIVED"
        ? overview.value.toBeReceived
        : key === "IN_EXECUTION"
          ? overview.value.inExecution
          : key === "FINISHED"
            ? overview.value.finished
            : overview.value.total;

    return () => (
      <PageLayout
        title="巡更任务"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => void router.push({ path: "/d/electronic-patrol/plan/detiles", query: { type: "task" } })}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.tablePage}>
              <Tabs
                activeKey={activeKey.value}
                onChange={(value: string | number) => {
                  activeKey.value = String(value);
                  page.pageNumber = 1;
                  refresh();
                }}
              >
                {taskStates.map((item) => (
                  <TabPane key={item.key} tab={`${item.label} (${count(item.key)})`} />
                ))}
              </Tabs>
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(number: number, size: number) => {
                page.pageNumber = number;
                page.pageSize = size;
                refresh();
              }}
            />
          ),
        }}
      />
    );
  },
});

export const PatrolRecordPage = defineComponent({
  name: "ElectronicPatrolRecordPage",
  setup() {
    const router = useRouter();
    const query = reactive<{ period?: unknown[]; depId?: string; keyword: string }>({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const departmentOptions = ref<{ label: string; value: string }[]>([]);
    const exporting = ref(false);
    const refresh = (): void => tableApi.query();
    const makeQuery = () => ({
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
      period: rangePeriod(query.period),
      depId: query.depId,
      keyword: query.keyword || undefined,
    });

    const [PcTable, tableApi] = usePcTable({
      tableCode: "ELECTRONIC_PATROL_RECORD",
      rowKey: "id",
      columns: [
        { title: "任务名称", dataIndex: "taskName", width: 190, fixed: "left", ellipsis: true },
        { title: "巡更人员", dataIndex: "userName", width: 140, ellipsis: true },
        { title: "所属部门", dataIndex: "userDep", width: 170, ellipsis: true },
        { title: "任务完成时间", dataIndex: "completedDate", width: 180, customRender: ({ text: value }) => formatDateTime(value) },
        { title: "巡更路线", dataIndex: "routeName", width: 170, ellipsis: true },
        { title: "巡更点数", dataIndex: "patrolLocationNum", width: 105 },
        { title: "已巡", dataIndex: "completedNum", width: 90 },
        { title: "漏巡", dataIndex: "undoneNum", width: 90 },
        {
          title: "操作",
          dataIndex: "action",
          width: 130,
          fixed: "right",
          customRender: ({ record }: { record: PatrolRow }) => (
            <div class={styles.actionSpace}>
              <Button
                type="link"
                onClick={() => void router.push({ path: "/d/electronic-patrol/record/detiles", query: { id: record.id } })}
              >
                详情
              </Button>
              <Popconfirm
                title="确定要删除该项？"
                onConfirm={async () => {
                  try {
                    await PatrolContext.getElectronicPatrolClient().removeTasks([record.id]);
                    message.success("删除成功");
                    refresh();
                  } catch (error) {
                    message.error(errorMessage(error, "删除失败"));
                  }
                }}
              >
                <Button type="link" danger>
                  删除
                </Button>
              </Popconfirm>
            </div>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const result = await PatrolContext.getElectronicPatrolClient().pageRecords(makeQuery());
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "巡更记录加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        { component: "RangePicker", fieldName: "period", label: "任务开始时间", componentProps: { valueFormat: "YYYY-MM-DD" } },
        {
          component: "Select",
          fieldName: "depId",
          label: "部门",
          componentProps: { allowClear: true, showSearch: true, options: departmentOptions, placeholder: "请选择部门" },
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "关键字",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入任务名称/巡更人员名称" },
        },
      ],
      handleSubmit(values) {
        query.period = Array.isArray(values.period) ? values.period : undefined;
        query.depId = typeof values.depId === "string" ? values.depId : undefined;
        query.keyword = String(values.keyword ?? "").trim();
        page.pageNumber = 1;
        refresh();
      },
      handleReset() {
        query.period = undefined;
        query.depId = undefined;
        query.keyword = "";
        page.pageNumber = 1;
        refresh();
      },
    });

    const flattenDepartments = (items: PatrolDepartment[]): { label: string; value: string }[] =>
      items.flatMap((item) => [{ label: item.name, value: item.id }, ...flattenDepartments(item.children ?? [])]);
    void PatrolContext.getElectronicPatrolClient()
      .listDepartments()
      .then((items) => {
        departmentOptions.value = flattenDepartments(items);
      })
      .catch((error: unknown) => message.error(errorMessage(error, "部门加载失败")));

    const exportData = async (): Promise<void> => {
      exporting.value = true;
      try {
        downloadBlob(await PatrolContext.getElectronicPatrolClient().exportRecords(makeQuery()), "巡更记录.xlsx");
      } catch (error) {
        message.error(errorMessage(error, "导出失败"));
      } finally {
        exporting.value = false;
      }
    };

    return () => (
      <PageLayout
        title="巡更记录"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" loading={exporting.value} onClick={() => void exportData()}>
              导出
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.tablePage}>
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(number: number, size: number) => {
                page.pageNumber = number;
                page.pageSize = size;
                refresh();
              }}
            />
          ),
        }}
      />
    );
  },
});
