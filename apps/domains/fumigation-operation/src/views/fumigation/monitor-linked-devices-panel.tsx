import { Tag } from "@g2-platform/pc-ui";
import { defineComponent, type PropType } from "vue";

import { type LinkedDevice } from "./state";

/** 设备中心关联设备（基本信息，不含实时画面） */
export const MonitorLinkedDevicesPanel = defineComponent({
  name: "MonitorLinkedDevicesPanel",
  props: {
    devices: {
      type: Array as PropType<LinkedDevice[]>,
      default: () => [],
    },
  },
  setup(props) {
    return (): JSX.Element => (
      <div class="fumigation-linked-list">
        {props.devices.length === 0 ? (
          <div class="fumigation-empty">暂无关联设备</div>
        ) : (
          props.devices.map((item) => (
            <div class="fumigation-device-card" key={item.id}>
              <div class="fumigation-device-name">
                <span>{item.name}</span>
                <Tag color={item.status === "online" ? "green" : "red"}>{item.status === "online" ? "在线" : "离线"}</Tag>
              </div>
              {item.type !== "" ? <div class="fumigation-card-desc">{item.type}</div> : null}
            </div>
          ))
        )}
      </div>
    );
  },
});
