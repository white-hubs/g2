import { Button, Spin, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";

import { record, records } from "./patrol-content";
import { getPatrolClient } from "@/domain-context";
export const taskStatus: Record<string, string> = {
  EXECUTING: "待巡检",
  OVER: "已完成",
  EXPIRE: "已过期",
  STOP: "已终止",
  CONFIRM: "待确认",
  SPLIT: "待拆解",
  ACCEPT: "待接收",
  OVERTIME: "超时完成",
};
export const TaskProgress = defineComponent({
  props: { id: { type: String, required: true } },
  setup(props) {
    const router = useRouter();
    const loading = ref(true);
    const error = ref("");
    const detail = ref<Record<string, unknown>>({});
    const [TaskTable, taskApi] = usePcTable({
      rowKey: "id",
      tableCode: "SMALL_ENGINEERING_TASK_PROGRESS",
      autoFetch: false,
      autoScrollY: false,
      columns: [
        { title: "任务名称", dataIndex: "taskName" },
        { title: "巡检对象", dataIndex: "targetAllNum" },
        { title: "执行人", dataIndex: "receiveNames" },
        { title: "进度", dataIndex: "rate", customRender: ({ text }) => `${text ?? 0}%` },
        { title: "状态", dataIndex: "status", customRender: ({ text }) => taskStatus[String(text)] ?? "--" },
      ],
    });
    const [RecordTable, recordApi] = usePcTable({
      rowKey: "id",
      tableCode: "SMALL_ENGINEERING_TASK_RESULTS",
      autoFetch: false,
      autoScrollY: false,
      columns: [
        { title: "巡检对象名称", dataIndex: "targetName" },
        { title: "巡检对象类", dataIndex: "targetCategory", customRender: () => "小散工程" },
        { title: "状态", dataIndex: "status", customRender: ({ text }) => taskStatus[String(text)] ?? "--" },
        { title: "巡检项", dataIndex: "itemName" },
        {
          title: "巡检结果",
          dataIndex: "result",
          customRender: ({ text }) => (text === "ABNORMAL" ? "异常" : text === "NORMAL" ? "正常" : "--"),
        },
        { title: "执行人", dataIndex: "nickname" },
        {
          title: "操作",
          dataIndex: "action",
          customRender: ({ record: raw }) => (
            <Button
              type="link"
              onClick={() => {
                void router.push({ path: "/d/small-engineering/engineering-patrol-record-info", query: { id: String(record(raw).id) } });
              }}
            >
              查看巡检记录
            </Button>
          ),
        },
      ],
    });
    const load = async () => {
      loading.value = true;
      error.value = "";
      try {
        detail.value = await getPatrolClient().getTaskProgress({ id: props.id, businessType: "SMALL_ENGINEERING" });
        taskApi.setDataSource(records(detail.value.taskRateResults));
        recordApi.setDataSource(records(detail.value.recordTaskResultList));
      } catch (failure) {
        error.value = failure instanceof Error ? failure.message : "执行进度加载失败";
      } finally {
        loading.value = false;
      }
    };
    void load();
    return () => (
      <Spin spinning={loading.value}>
        <h3>任务执行进度</h3>
        {error.value ? (
          <div>
            {error.value}
            <Button
              onClick={() => {
                void load();
              }}
            >
              重试
            </Button>
          </div>
        ) : (
          <>
            <TaskTable />
            <div style={{ display: "flex", gap: "24px", margin: "20px 0" }}>
              {[
                ["对象总数", "targetAllNum"],
                ["待巡检对象数", "waitTargetNum"],
                ["已巡检对象数", "completedTargetNum"],
                ["结果异常对象数", "errTargetNum"],
              ].map(([label, key]) => (
                <span>
                  {label}：{String(detail.value[key!] ?? 0)}
                </span>
              ))}
            </div>
            <RecordTable />
          </>
        )}
      </Spin>
    );
  },
});
