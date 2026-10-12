import type { TaskRecord, TodoTaskType } from "@g2-contract/todo-center";
import { computed, defineComponent, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { getTodoCenterClient } from "../domain-context";
import { Button, Empty, Input, PageLayout, Select, message, usePcTable } from "../pc-ui-runtime";

import styles from "../todo-center.module.less";

function createTaskList(done: boolean) {
  return defineComponent({
    name: done ? "TodoDoneTasks" : "TodoWaitingTasks",
    setup() {
      const route = useRoute();
      const router = useRouter();
      const types = ref<TodoTaskType[]>([]);
      const rows = ref<TaskRecord[]>([]);
      const loading = ref(false);
      const total = ref(0);
      const filters = reactive({
        keyword: String(route.query.keyword ?? ""),
        todoTagCode: String(route.query.todoTagCode ?? route.query.businessType ?? ""),
        period: String(route.query.period ?? ""),
      });
      const page = reactive({ pageNumber: Number(route.query.pageNumber ?? 1) || 1, pageSize: Number(route.query.pageSize ?? 10) || 10 });
      const title = done ? "已处理" : "待处理";
      const typeOptions = computed(() => [{ label: "全部", value: "" }, ...types.value.map((t) => ({ label: t.name, value: t.code }))]);
      const [PcTable, tableApi] = usePcTable({
        rowKey: "id",
        autoFetch: false,
        pagination: false,
        columns: [
          {
            title: "任务时间",
            dataIndex: "taskTime",
            width: 190,
            customRender: ({ text }: { text: number }) => (text ? new Date(text).toLocaleString("zh-CN", { hour12: false }) : "--"),
          },
          { title: "任务名称", dataIndex: "taskName", ellipsis: true },
          { title: done ? "业务来源" : "类型", dataIndex: "businessTypeName", width: 140 },
          {
            title: "任务状态",
            dataIndex: done ? "status" : "businessStatusName",
            width: 140,
            customRender: ({ record }: { record: TaskRecord }) => (done ? "已处理" : record.businessStatusName || "--"),
          },
          {
            title: "操作",
            width: 100,
            customRender: ({ record }: { record: TaskRecord }) => (
              <Button type="link" onClick={() => openTask(record)}>
                {done ||
                record.applicationCode === "SECURE_EDU" ||
                (record.applicationCode === "PROPERTY_MANAGEMENT" &&
                  ![
                    "PROPERTY_DEPOSITORY",
                    "PROPERTY_ALLOT_PERSONAL",
                    "PROPERTY_ALLOT_UNIT",
                    "PROPERTY_WEED_OUT",
                    "CONSUMABLE_ADD",
                    "CONSUMABLE_REDUCE",
                  ].includes(record.businessType))
                  ? "详情"
                  : "处理"}
              </Button>
            ),
          },
        ],
      });
      let timer: ReturnType<typeof setInterval> | undefined;
      async function load(): Promise<void> {
        if (loading.value) {return;}
        loading.value = true;
        try {
          const query = {
            ...page,
            keyword: filters.keyword.trim() || undefined,
            todoTagCode: filters.todoTagCode || undefined,
            period: filters.period || undefined,
          };
          const result = done ? await getTodoCenterClient().pageDoneTasks(query) : await getTodoCenterClient().pageTodoTasks(query);
          rows.value = result.records;
          tableApi.setDataSource(result.records);
          total.value = result.total;
        } catch (error) {
          message.error(error instanceof Error ? error.message : `${title}任务加载失败`);
        } finally {
          loading.value = false;
        }
      }
      async function submit(): Promise<void> {
        page.pageNumber = 1;
        await router.replace({
          query: {
            ...(filters.keyword ? { keyword: filters.keyword } : {}),
            ...(filters.todoTagCode ? { todoTagCode: filters.todoTagCode } : {}),
            ...(filters.period ? { period: filters.period } : {}),
          },
        });
        await load();
      }
      async function reset(): Promise<void> {
        filters.keyword = "";
        filters.todoTagCode = "";
        filters.period = "";
        page.pageNumber = 1;
        page.pageSize = 10;
        await router.replace({ query: {} });
        await load();
      }
      function setPeriodPart(part: 0 | 1, value: string): void {
        const values = filters.period.split(",");
        values[part] = value;
        filters.period = values.filter(Boolean).join(",");
      }
      function openTask(record: TaskRecord): void {
        if (done && record.taskDelState) {
          message.warning("该任务已删除");
          return;
        }
        const flowApplications = [
          "ATTENDANCE_MANAGEMENT",
          "PERSONNELMANAGEMENT",
          "OFFICIAL_MANAGEMENT",
          "WORK_REPORT",
          "SMALLENFINEERING",
          "HIDDENDANGER",
          "FAULT",
          "COMPLAINT",
          "OUTSOURCE_REPAIR",
          "RETROFIT",
          "VISITOR_MANAGEMENT",
          "MEETING_ROOM_MANAGEM",
          "APPROVAL_CENTER",
          "PARKINGMANAGE",
        ];
        const propertyFlowTypes = [
          "PROPERTY_DEPOSITORY",
          "PROPERTY_ALLOT_PERSONAL",
          "PROPERTY_ALLOT_UNIT",
          "PROPERTY_WEED_OUT",
          "CONSUMABLE_ADD",
          "CONSUMABLE_REDUCE",
        ];
        const params = new URLSearchParams();
        let target = "";
        if (flowApplications.includes(record.applicationCode) && record.businessType === "OFFICIAL_FOCUS_WORK_REPLY" && done) {
          params.set("id", record.businessKey.split("_")[0] ?? "");
          target = `/portal/governmentManagement/eventHandleDetail?${params}`;
        } else if (
          flowApplications.includes(record.applicationCode) &&
          record.businessType === "OFFICIAL_FOCUS_WORK_REPLY" &&
          !record.businessKey.includes("-")
        ) {
          params.set("businessType", record.businessType);
          params.set("appName", "agencyCenter");
          params.set("type", "add");
          params.set("title", "事项处理");
          params.set("businessKey", record.businessKey.split("_")[0] ?? "");
          target = `/portal/stream-engine-render/index?${params}`;
        } else if (flowApplications.includes(record.applicationCode)) {
          params.set("businessType", record.businessType);
          params.set("processInstanceId", record.businessKey);
          params.set("type", "detail");
          params.set("title", record.businessTypeName);
          params.set("appName", "agencyCenter");
          target = `/portal/stream-engine-render/index?${params}`;
        } else if (record.applicationCode === "PROPERTY_MANAGEMENT") {
          if (!propertyFlowTypes.includes(record.businessType)) {
            message.warning("请在APP端操作");
            return;
          }
          params.set("businessType", record.businessType);
          params.set("processInstanceId", record.businessKey);
          params.set("type", "detail");
          params.set("title", record.businessTypeName);
          params.set("appName", "agencyCenter");
          target = `/portal/stream-engine-render/index?${params}`;
        } else if (record.applicationCode === "SECURE_EDU" && ["EXAM_TASK", "CULTIVATE_TASK"].includes(record.businessType)) {
          params.set("action", "detail");
          params.set("id", record.businessKey);
          params.set("appName", "agencyCenter");
          target = `/portal/secure-edu/${record.businessType === "EXAM_TASK" ? "exam-task-form" : "training-task-form"}?${params}`;
        } else if (
          record.applicationCode === "XRXPROGECT" &&
          ["approve_report", "approve_node", "approve_report_stat"].includes(record.businessType)
        ) {
          params.set("action", record.businessType === "approve_node" ? "edit" : "approve");
          params.set("id", record.businessKey);
          target = `/portal/xrx-engineering-management/${record.businessType === "approve_report" ? "report-detail" : record.businessType === "approve_node" ? "plan-approve-detail" : "statistic-detail"}?${params}`;
        } else if (["GAS_MANAGEMENT", "LINE_LOSS_MANAGEMENT"].includes(record.businessType)) {
          params.set("businessKey", record.businessKey);
          params.set("alarmStatus", record.businessStatus);
          params.set("type", "detail");
          params.set("id", record.businessKey);
          target = `/portal/genericEquipmentMonitor/alarmDetail?${params}`;
        } else if (["DAILY_TASK", "DAILY_INSPECTION", "DAILY_SMALL_INSPECTION", "GRID_MANAGE"].includes(record.businessType)) {
          params.set("type", "detail");
          params.set("id", record.businessKey);
          target = `/portal/daily-task/task-edit?${params}`;
        } else if (record.url) {
          params.set("type", "detail");
          params.set("id", record.businessKey);
          target = `${record.url}?${params}`;
        }
        if (target) {
          history.pushState({ current: location.pathname + location.search }, "", target);
          globalThis.dispatchEvent(new PopStateEvent("popstate"));
          return;
        }
        message.warning("暂无可打开的任务详情");
      }
      onMounted(async () => {
        try {
          types.value = await getTodoCenterClient().getTodoTaskTypes(done);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "任务类型加载失败");
        }
        await load();
        if (!done) {timer = setInterval(() => void load(), 30_000);}
      });
      onBeforeUnmount(() => {
        if (timer) {clearInterval(timer);}
      });
      return () => (
        <PageLayout
          title={title}
          showFooter={false}
          v-slots={{
            "layout-content": () => (
              <div class={styles.pageBody}>
                <nav class={styles.tabs}>
                  <RouterLink to="/d/todo-center/waiting">待处理</RouterLink>
                  <RouterLink to="/d/todo-center/done">已处理</RouterLink>
                  <RouterLink to="/d/todo-center/overview">全部</RouterLink>
                </nav>
                <div class={styles.filters}>
                  <label>
                    {done ? "已办类型" : "待办类型"}
                    <Select
                      value={filters.todoTagCode}
                      options={typeOptions.value}
                      onChange={(v: unknown) => {
                        filters.todoTagCode = String(v ?? "");
                      }}
                    />
                  </label>
                  <label>
                    任务时间
                    <input
                      type="date"
                      value={filters.period.split(",")[0] ?? ""}
                      onInput={(e: Event) => setPeriodPart(0, (e.target as HTMLInputElement).value)}
                    />
                    <span>至</span>
                    <input
                      type="date"
                      value={filters.period.split(",")[1] ?? ""}
                      onInput={(e: Event) => setPeriodPart(1, (e.target as HTMLInputElement).value)}
                    />
                  </label>
                  <label>
                    任务名称
                    <Input
                      value={filters.keyword}
                      allowClear
                      placeholder="请输入任务名称"
                      onChange={(e: Event) => {
                        filters.keyword = (e.target as HTMLInputElement).value;
                      }}
                    />
                  </label>
                  <Button type="primary" onClick={() => void submit()}>
                    查询
                  </Button>
                  <Button onClick={() => void reset()}>重置</Button>
                </div>
                <div class={styles.tableWrap}>
                  <PcTable />
                  {rows.value.length === 0 && <div class={styles.empty}>{loading.value ? "加载中…" : <Empty description="暂无任务" />}</div>}
                </div>
                <div class={styles.pagination}>
                  <span>共 {total.value} 条</span>
                  <Button
                    disabled={page.pageNumber <= 1}
                    onClick={() => {
                      page.pageNumber--;
                      void router.replace({ query: { ...route.query, pageNumber: String(page.pageNumber) } });
                      void load();
                    }}
                  >
                    上一页
                  </Button>
                  <span>{page.pageNumber}</span>
                  <Button
                    disabled={page.pageNumber * page.pageSize >= total.value}
                    onClick={() => {
                      page.pageNumber++;
                      void router.replace({ query: { ...route.query, pageNumber: String(page.pageNumber) } });
                      void load();
                    }}
                  >
                    下一页
                  </Button>
                  <select
                    value={page.pageSize}
                    onChange={(e) => {
                      page.pageSize = Number((e.target as HTMLSelectElement).value);
                      page.pageNumber = 1;
                      void router.replace({ query: { ...route.query, pageSize: String(page.pageSize), pageNumber: undefined } });
                      void load();
                    }}
                  >
                    <option value="10">10 条/页</option>
                    <option value="20">20 条/页</option>
                    <option value="50">50 条/页</option>
                  </select>
                </div>
              </div>
            ),
          }}
        />
      );
    },
  });
}
export const WaitingTasks = createTaskList(false);
export const DoneTasks = createTaskList(true);
