import {
  AuditOutlined,
  CarryOutOutlined,
  ExperimentOutlined,
  FireOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from "@ant-design/icons-vue";
import { defineComponent, h, onBeforeUnmount, onMounted, reactive, type Component } from "vue";

import PanelCard from "../../card/card";
import { cubeTodoTaskStatService } from "@/api/server";
import { navigateToApplication } from "@/utils/navigate";

import "./task-statistics.less";

interface DoneTaskItem {
  businessType: string;
  businessTypeName: string;
  total: string;
}

interface TaskStatisticsState {
  tasksNum: number;
  tasksList: DoneTaskItem[];
}

const TONE_CYCLE = ["blue", "green", "orange", "red"] as const;
const TONE_ICONS: Component[] = [
  CarryOutOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  FireOutlined,
  ToolOutlined,
  ExperimentOutlined,
];

function resolveTone(index: number): (typeof TONE_CYCLE)[number] {
  return TONE_CYCLE[index % TONE_CYCLE.length] ?? "blue";
}

export default defineComponent({
  name: "TaskStatistics",
  emits: ["close"],
  setup(_, { emit }) {
    const state = reactive<TaskStatisticsState>({
      tasksNum: 0,
      tasksList: [],
    });

    const getData = async (): Promise<void> => {
      const [count, tags] = await Promise.all([cubeTodoTaskStatService.getDoneTaskCount(), cubeTodoTaskStatService.getDoneTaskTags()]);
      state.tasksNum = count;
      state.tasksList = tags as typeof state.tasksList;
    };

    let timer: NodeJS.Timer | null = null;

    onMounted(() => {
      getData();
      timer = setInterval(getData, 30_000);
    });

    onBeforeUnmount(() => {
      if (timer) {
        clearInterval(timer as NodeJS.Timeout);
      }
    });

    const goTask = async (item?: DoneTaskItem): Promise<void> => {
      navigateToApplication({
        code: "AGENCY_CENTER",
        path: item ? `/portal/agencyCenter/doneList?todoTagCode=${item.businessType}` : "/portal/agencyCenter/doneList",
      });
    };

    return () => (
      <PanelCard title="任务处理统计" icon="icon-renwuchulitongji" onClose={() => emit("close")}>
        {{
          btn: () => <a onClick={() => goTask()}>查看全部 &gt;</a>,
          default: () => (
            <div class="task-statistics-container">
              <div class="task-statistics-summary" onClick={() => goTask()}>
                今日累计处理：<strong>{state.tasksNum}</strong> 单
              </div>
              <div class="task-statistics-item">
                {state.tasksList.map((item, index) => (
                  <button
                    key={item.businessType}
                    class={["task-statistics-item__card", `task-statistics-item__card--${resolveTone(index)}`]}
                    type="button"
                    onClick={() => goTask(item)}
                  >
                    {h(TONE_ICONS[index % TONE_ICONS.length] ?? CarryOutOutlined, { class: "task-statistics-item__icon" })}
                    <strong>{item.total}</strong>
                    <span>{item.businessTypeName}</span>
                  </button>
                ))}
              </div>
            </div>
          ),
        }}
      </PanelCard>
    );
  },
});
