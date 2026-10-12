import { defineComponent, type PropType } from "vue";

import { useControlledPcModal } from "../composables/use-controlled-pc-modal";
import type { AttendanceRecord } from "../models";
import { Tag, VideoCameraOutlined, WarningOutlined } from "@/pc-ui-runtime";

import styles from "../fire-host-control.module.css";

export const AttendanceDetailModal = defineComponent({
  name: "AttendanceDetailModal",
  props: { visible: { type: Boolean, required: true }, record: { type: Object as PropType<AttendanceRecord | null>, default: null } },
  emits: { close: () => true },
  setup(props, { emit }) {
    const [PcModal] = useControlledPcModal(() => props.visible, {
      title: "值守异常详情",
      width: "720px",
      onClosed: () => emit("close"),
    });
    return () => (
      <PcModal
        v-slots={{
          footer: () => null,
          default: () =>
            props.record ? (
              <div class={styles.attendanceDetail}>
                <div class={styles.detailHero}>
                  <span>
                    <WarningOutlined />
                  </span>
                  <div>
                    <strong>{props.record.type}异常</strong>
                    <small>
                      {props.record.time} · {props.record.location}
                    </small>
                  </div>
                  <Tag color={props.record.timeout === "超时" ? "red" : "green"}>{props.record.status}</Tag>
                </div>
                <div class={styles.detailGrid}>
                  {[
                    ["报警级别", props.record.level],
                    ["报警设备", props.record.deviceName],
                    ["报警规则", props.record.rule],
                    ["报警值", props.record.alarmValue],
                    ["处理时限", props.record.deadline],
                    ["处理人", props.record.handler],
                    ["通知人", props.record.notifier],
                    ["超时状态", props.record.timeout],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <b>{value}</b>
                    </div>
                  ))}
                </div>
                <div class={styles.snapshotPlaceholder}>
                  <VideoCameraOutlined />
                  <span>现场抓拍 / 录像回放占位区</span>
                  <small>接口接入后展示报警时间点前后的视频切片</small>
                </div>
              </div>
            ) : null,
        }}
      />
    );
  },
});
