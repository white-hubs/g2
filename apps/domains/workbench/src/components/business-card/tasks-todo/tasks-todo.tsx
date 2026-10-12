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

import "./tasks-todo.less";

interface TaskItem {
  businessType: string;
  businessTypeName: string;
  total: number;
}

interface TasksState {
  tasksNum: number;
  tasksList: TaskItem[];
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
  name: "TasksTodo",
  emits: ["close"],
  setup(props, { emit }) {
    const state = reactive<TasksState>({
      tasksNum: 0,
      tasksList: [],
    });

    const getData = async (): Promise<void> => {
      const [count, tags] = await Promise.all([cubeTodoTaskStatService.getTodoTaskCount(), cubeTodoTaskStatService.getTodoTaskTags()]);
      state.tasksNum = count;
      state.tasksList = tags as TaskItem[];
    };

    let timer: NodeJS.Timer | null = null;

    onMounted(() => {
      getData();
      timer = setInterval(getData, 30000);
    });

    onBeforeUnmount(() => {
      if (timer) {
        clearInterval(timer as NodeJS.Timeout);
      }
    });

    const handleClose = (): void => {
      emit("close");
    };

    const goTask = async (item?: TaskItem): Promise<void> => {
      navigateToApplication({
        code: "AGENCY_CENTER",
        path: item ? "/portal/agencyCenter/waitingList?businessType=" + item.businessType : "/portal/agencyCenter/waitingList",
      });
    };

    return () => (
      <PanelCard title="我的待办总览" icon="icon-wodedaibanzonglan" onClose={handleClose}>
        {{
          btn: () => <a onClick={() => goTask()}>查看全部 &gt;</a>,
          default: () => (
            <div class="tasks-container">
              <div class="tasks-summary" onClick={() => goTask()}>
                待办总计：<strong>{state.tasksNum}</strong> 条
              </div>
              <div class="tasks-item">
                {state.tasksList.map((item, index) => (
                  <button
                    key={item.businessType}
                    class={["tasks-item__card", `tasks-item__card--${resolveTone(index)}`]}
                    type="button"
                    onClick={() => goTask(item)}
                  >
                    {h(TONE_ICONS[index % TONE_ICONS.length] ?? CarryOutOutlined, { class: "tasks-item__icon" })}
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
