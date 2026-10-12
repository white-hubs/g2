// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { defineComponent } from "vue";

import type { EvacuationCommandState } from "../../composables/use-evacuation-command-state";

import styles from "./index.module.less";

export const EventHeader = defineComponent({
  name: "EventHeader",
  props: {
    state: { type: Object as () => EvacuationCommandState, required: true },
  },
  setup(props) {
    return (): JSX.Element => {
      const ev = props.state.activeEvent.value;
      if (!ev) {
        return <div class={styles.header} />;
      }
      return (
        <div class={styles.header}>
          <div class={styles.headerMain}>
            <span class={styles.icon}>{ev.icon}</span>
            <div>
              <div class={styles.title}>
                {ev.type}
                <span class={[styles.level, styles[`level--${ev.levelKey}`]].join(" ")}>{ev.level}</span>
              </div>
              <div class={styles.location}>📍 {ev.location}</div>
            </div>
          </div>
          <div class={styles.badges}>
            <span class={styles.urgent}>紧急</span>
            {ev.status === "processing" ? <span class={styles.processing}>疏散进行中</span> : null}
          </div>
        </div>
      );
    };
  },
});
