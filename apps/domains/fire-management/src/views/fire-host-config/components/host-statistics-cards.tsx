import { defineComponent, type PropType } from "vue";

import type { FireHostStatistics } from "../fire-host-config.model";

import styles from "../fire-host-config.module.css";

interface StatisticsCardItem {
  key: keyof FireHostStatistics;
  label: string;
  icon: string;
  unit: string;
  tone: "primary" | "info" | "danger" | "warning";
}

const CARD_ITEMS: StatisticsCardItem[] = [
  { key: "hostCount", label: "已配置主机", icon: "主", unit: "台", tone: "primary" },
  { key: "pointCount", label: "消防点位总数", icon: "点", unit: "个", tone: "info" },
  { key: "todayAlarmCount", label: "今日报警", icon: "警", unit: "条", tone: "danger" },
  { key: "todayFaultCount", label: "今日故障", icon: "障", unit: "条", tone: "warning" },
];

export const HostStatisticsCards = defineComponent({
  name: "HostStatisticsCards",
  props: {
    statistics: {
      type: Object as PropType<FireHostStatistics>,
      required: true,
    },
  },
  setup: (props) => {
    return () => (
      <section class={styles["statistics-grid"]} aria-label="主机配置统计">
        {CARD_ITEMS.map((item) => {
          return (
            <article class={[styles["statistics-card"], styles[`statistics-card-${item.tone}`]]} key={item.key}>
              <span class={styles["statistics-icon"]}>{item.icon}</span>
              <div class={styles["statistics-content"]}>
                <div class={styles["statistics-label"]}>{item.label}</div>
                <div class={styles["statistics-main"]}>
                  <strong class={styles["statistics-value"]}>{props.statistics[item.key]}</strong>
                  <span class={styles["statistics-unit"]}>{item.unit}</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    );
  },
});
