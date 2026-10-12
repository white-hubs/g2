import { defineComponent, type PropType } from "vue";

import type { FireEventViewModel } from "../models";
import { RecordsEmptyState } from "./records-empty-state";
import { Button, Tag } from "@/pc-ui-runtime";
import { FIRE_EVENT_ROW_BACKGROUND, FIRE_EVENT_TAG_COLOR } from "@/utils/fire-event";

import styles from "../fire-host-control.module.css";

export const RecentEventsPanel = defineComponent({
  name: "RecentEventsPanel",
  props: { events: { type: Array as PropType<FireEventViewModel[]>, required: true } },
  emits: {
    openAll: () => true,
    locate: (_event: FireEventViewModel) => true,
  },
  setup(props, { emit }) {
    return () => (
      <div class={styles.recentEvents}>
        <div class={styles.panelHeader}>
          <span class={styles.panelTitle}>最近事件</span>
          <Button type="link" size="small" onClick={() => emit("openAll")}>
            查看全部 →
          </Button>
        </div>
        <div class={styles.eventList}>
          {props.events.length ? (
            props.events.slice(0, 6).map((event) => (
              <div key={event.id} class={styles.eventRow} style={{ background: FIRE_EVENT_ROW_BACKGROUND[event.eventType] }}>
                <Tag color={FIRE_EVENT_TAG_COLOR[event.eventType]} style={{ margin: 0, fontSize: "10px" }}>
                  {event.eventName}
                </Tag>
                <span class={styles.eventTime}>{event.time}</span>
                <span class={styles.eventPoint}>{event.pointName}</span>
                <button class={styles.eventLocation} type="button" onClick={() => emit("locate", event)}>
                  <span>⌖</span>
                  {event.location}
                </button>
              </div>
            ))
          ) : (
            <RecordsEmptyState compact description="暂无最近事件" detail="当前主机暂无报警或事件记录" />
          )}
        </div>
      </div>
    );
  },
});
