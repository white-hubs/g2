import { defineComponent, type PropType } from "vue";

import type { FireHostOption } from "../models";
import { Button, HistoryOutlined, WarningOutlined } from "@/pc-ui-runtime";

import styles from "../fire-host-control.module.css";

export const HostStatusBar = defineComponent({
  name: "HostStatusBar",
  props: { host: { type: Object as PropType<FireHostOption>, required: true } },
  emits: { openEvents: () => true, openLogs: () => true },
  setup(props, { emit }) {
    return () => (
      <div class={styles.hostBar}>
        <span class={[styles.liveDot, !props.host.online && styles.offlineDot]} />
        <div class={styles.hostIdentity}>
          <strong>{props.host.deviceName}</strong>
          <span>
            {props.host.online ? "设备在线" : "设备离线"} · {props.host.deviceCode}
          </span>
        </div>
        <div class={styles.hostMeta}>
          <span>
            所属区域 <b>{props.host.areaName}</b>
          </span>
          <i />
          <span>
            产品品牌 <b>{props.host.brandName}</b>
          </span>
        </div>
        <div class={styles.recordActions}>
          <Button icon={<WarningOutlined />} onClick={() => emit("openEvents")}>
            事件记录
          </Button>
          <Button icon={<HistoryOutlined />} onClick={() => emit("openLogs")}>
            操作记录
          </Button>
        </div>
      </div>
    );
  },
});
