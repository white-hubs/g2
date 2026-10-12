import { Image, Popover, Tag } from "@g2-platform/pc-ui";
import { computed, defineComponent, type PropType } from "vue";

import styles from "./device-monitor-card.module.css";

const DEVICE_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='4' fill='%23f7f8fb'/%3E%3Crect x='22' y='27' width='52' height='42' rx='4' fill='%23e7eaf0'/%3E%3Ccircle cx='39' cy='41' r='6' fill='%23f7f8fb'/%3E%3Cpath d='M28 62l14-14 10 10 7-7 11 11H28z' fill='%23f7f8fb'/%3E%3C/svg%3E";

export type PanelConfigItem = {
  businessKey?: string;
  panelConfig?: string;
};

export type DeviceMonitorRecord = {
  deviceId?: string;
  id?: string;
  deviceName?: string;
  areaName?: string;
  deviceStatus?: boolean | string | number;
  collection?: boolean;
  picture?: { path?: string } | null;
  deviceProdId?: string;
  devicePropWithTsDTOS?: Array<{
    key?: string;
    translatedValue?: string;
    unitName?: string;
  }>;
};

type PropConfig = { propCode: string; propName: string };

export default defineComponent({
  name: "GemDeviceMonitorCard",
  props: {
    item: { type: Object as PropType<DeviceMonitorRecord>, required: true },
    panelsConfig: { type: Array as PropType<PanelConfigItem[]>, default: () => [] },
    onMore: { type: Function as PropType<(item: DeviceMonitorRecord) => void>, required: true },
    onToggleCollection: { type: Function as PropType<(item: DeviceMonitorRecord) => void>, required: true },
  },
  setup(props) {
    const online = computed(() => {
      const s = props.item.deviceStatus;
      return s === true || s === 1 || s === "ONLINE" || s === "NORMAL";
    });

    const customPanelConfig = computed((): PropConfig[] => {
      const cfg = (props.panelsConfig || []).find((item) => item.businessKey === props.item.deviceProdId);
      if (!cfg?.panelConfig) return [];
      try {
        const parsed = JSON.parse(cfg.panelConfig) as PropConfig[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    });

    const propValues = computed(() => {
      const map: Record<string, string> = {};
      for (const item of props.item.devicePropWithTsDTOS || []) {
        const key = String(item.key || "");
        if (!key) continue;
        const value = item.translatedValue || " ";
        map[key] = value !== " " ? `${value}${item.unitName || ""}` : "";
      }
      return map;
    });

    const imgSrc = computed(() => {
      const path = props.item.picture?.path;
      return path || DEVICE_FALLBACK;
    });

    const renderProps = (list: PropConfig[]) =>
      list.map((item) => (
        <div class={styles.customItem} key={item.propCode}>
          <Popover content={item.propName}>
            <span class={styles.label}>{item.propName}</span>
          </Popover>
          <span class={styles.sep}>：</span>
          <Popover content={propValues.value[item.propCode] || "--"}>
            <span class={styles.value}>{propValues.value[item.propCode] || "--"}</span>
          </Popover>
        </div>
      ));

    return () => (
      <div class={styles.previewPanel}>
        <div class={styles.previewPanelTitle}>
          <div class={styles.deviceNameArea}>
            <div class={styles.deviceName}>
              <div class={styles.name}>{props.item.deviceName || "--"}</div>
              <Tag color={online.value ? "green" : "red"}>{online.value ? "在线" : "离线"}</Tag>
            </div>
            <div class={styles.deviceArea}>区域: {props.item.areaName || "--"}</div>
          </div>
          <div class={styles.deviceCollectMore}>
            <button
              type="button"
              class={styles.collectBtn}
              onClick={(e) => {
                e.stopPropagation();
                props.onToggleCollection(props.item);
              }}
            >
              <span
                class={[styles.collectIcon, props.item.collection ? styles.collected : ""]}
                aria-label={props.item.collection ? "取消收藏" : "收藏"}
              >
                {props.item.collection ? "★" : "☆"}
              </span>
            </button>
            <div
              class={styles.more}
              onClick={(e) => {
                e.stopPropagation();
                props.onMore(props.item);
              }}
            >
              更多&gt;
            </div>
          </div>
        </div>
        <div class={styles.previewPanelContent}>
          <Image class={styles.thumb} width={80} height={80} src={imgSrc.value} preview={false} fallback={DEVICE_FALLBACK} />
          <div class={styles.configContent}>
            <div class={styles.configRow}>{renderProps(customPanelConfig.value.slice(0, 2))}</div>
            <div class={styles.configRow}>{renderProps(customPanelConfig.value.slice(2, 4))}</div>
          </div>
        </div>
      </div>
    );
  },
});
