import type { OutsourceProcessEvent } from "@g2-client/outsource-repair/client";
import { Button, Empty, Step, Steps } from "@g2-platform/pc-ui";
import { defineComponent, type PropType } from "vue";

import styles from "./detail-form.module.css";

/** 旧页 `a-steps` + `progressDot` 的流程事件线：节点标题、时间与「处理详情」入口。 */
export const ProcessSteps = defineComponent({
  name: "OutsourceRepairProcessSteps",
  props: {
    events: { type: Array as PropType<OutsourceProcessEvent[]>, default: () => [] },
    titleOf: { type: Function as PropType<(event: OutsourceProcessEvent) => string>, required: true },
    /** 旧页只在节点有 `taskId` 时展示「处理详情」；工单详情页则全部展示。 */
    detailVisible: { type: Function as PropType<(event: OutsourceProcessEvent) => boolean>, default: () => true },
    emptyText: { type: String, default: "暂无流程" },
  },
  emits: ["detail"],
  setup(props, { emit }) {
    return () => {
      if (props.events.length === 0) {
        return <Empty description={props.emptyText} style={{ margin: "8px 0" }} />;
      }
      return (
        <Steps progressDot class={styles.steps}>
          {props.events.map((event, index) => (
            <Step
              key={event.id ?? index}
              title={props.titleOf(event)}
              status="finish"
              v-slots={{
                description: () => (
                  <div class={styles.stepNode}>
                    <span class={styles.stepTime}>{event.createTime ?? "--"}</span>
                    {props.detailVisible(event) && event.id ? (
                      <Button type="link" class={styles.modalLink} onClick={() => emit("detail", String(event.id))}>
                        处理详情
                      </Button>
                    ) : null}
                  </div>
                ),
              }}
            />
          ))}
        </Steps>
      );
    };
  },
});
