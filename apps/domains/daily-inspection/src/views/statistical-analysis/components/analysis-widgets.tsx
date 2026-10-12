import { defineComponent, type PropType } from "vue";

import styles from "./analysis-widgets.module.css";

const COLORS = ["#5654F5", "#4CA8FF", "#F53F3F", "#FBA33F", "#F53F3F", "#FBA33F"];

export interface PlanTypeItem {
  planType?: string;
  planNum?: number;
}

export const BarList = defineComponent({
  name: "BarList",
  props: {
    data: { type: Array as PropType<PlanTypeItem[]>, default: () => [] },
  },
  setup(props) {
    return () => (
      <div class={styles.list}>
        {(props.data ?? []).map((item, index) => (
          <div class={styles.listBox} key={`${item.planType}-${index}`}>
            <div class={styles.listBoxLeft}>
              <div class={styles.roundDot} style={{ background: COLORS[index % COLORS.length] }} />
              <div class={styles.text}>{item.planType}</div>
            </div>
            <div class={styles.listBoxRight}>{item.planNum}</div>
          </div>
        ))}
      </div>
    );
  },
});

export const PieList = defineComponent({
  name: "PieList",
  props: {
    value: { type: Number, default: 0 },
    name: { type: String, default: "任务正常完成" },
    ratio: { type: String, default: "0" },
  },
  setup(props) {
    return () => {
      const ratioNum = Number(
        String(props.ratio ?? "0")
          .replace("%", "")
          .trim(),
      );
      const up = Number.isFinite(ratioNum) && ratioNum > 0;
      return (
        <div class={styles.pieList}>
          <div class={styles.pieValue}>{props.value}</div>
          <div class={styles.pieName}>{props.name}</div>
          <div class={styles.ringRatio}>
            <span>环比</span>
            <div class={[styles.downtriangle, up && styles.uptriangle]} />
            <div class={up ? styles.up : styles.down}>{props.ratio}</div>
          </div>
        </div>
      );
    };
  },
});

export interface PlateItem {
  value: number;
  name: string;
  ratio?: number;
}

const PLATE_COLORS = ["#000000", "#1890FF", "#FBA33F", "#FD683E"];

export const PlateList = defineComponent({
  name: "PlateList",
  props: {
    data: { type: Array as PropType<PlateItem[]>, default: () => [] },
  },
  setup(props) {
    return () => (
      <div class={styles.palte}>
        {(props.data ?? []).map((item, index) => {
          const up = typeof item.ratio === "number" && item.ratio > 0;
          return (
            <div class={[styles.palteBox, styles.flex]} key={`${item.name}-${index}`}>
              <div>{item.name}</div>
              <div class={styles.flex}>
                <div style={{ color: PLATE_COLORS[index % PLATE_COLORS.length], fontWeight: "bold", fontSize: "24px" }}>{item.value}</div>
                {item.ratio != null ? (
                  <div class={styles.ringRatio}>
                    <span>环比</span>
                    <div class={[styles.downtriangle, up && styles.uptriangle]} />
                    <div class={up ? styles.up : styles.down}>{`${item.ratio}%`}</div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
});

export interface DepartmentStatusData {
  maxTaskNumDep?: string;
  maxTaskNum?: string;
  maxTaskNumRatio?: string;
  maxTaskRatioDep?: string;
  maxTaskRatio?: string;
  maxTaskRatioRatio?: string;
  minTaskNumDep?: string;
  minTaskNum?: string;
  minTaskNumRatio?: string;
  minTaskRatioDep?: string;
  minTaskRatio?: string;
  minTaskRatioRatio?: string;
}

export const DepartmentStatus = defineComponent({
  name: "DepartmentStatus",
  props: {
    data: { type: Object as PropType<DepartmentStatusData | null | undefined>, default: undefined },
  },
  setup(props) {
    return () => {
      const data = props.data;
      return (
        <div class={styles.status}>
          <div class={styles.statusBox}>
            <div>
              <span>{data?.maxTaskNumDep}</span>完成的任务最多，共完成了
              <span class={[styles.blue1, styles.textNum]}>{data?.maxTaskNum}</span>个，环比下降
              <span class={styles.blue1}>{data?.maxTaskNumRatio}</span>
            </div>
            <div>
              <span>{data?.maxTaskRatioDep}</span> 任务完成率最高，完成率在
              <span class={[styles.blue1, styles.textNum]}>{data?.maxTaskRatio}</span>，环比上升
              <span class={styles.blue1}>{data?.maxTaskRatioRatio}</span>
            </div>
          </div>
          <div class={styles.statusBox}>
            <div>
              <span>{data?.minTaskNumDep}</span>完成的任务最少，共完成了
              <span class={[styles.blue1, styles.textNum]}>{data?.minTaskNum}</span>个，环比下降
              <span class={styles.blue1}>{data?.minTaskNumRatio}</span>
            </div>
            <div>
              <span>{data?.minTaskRatioDep}</span>任务完成率最低，完成率在
              <span class={[styles.blue1, styles.textNum]}>{data?.minTaskRatio}</span>，环比下降
              <span class={styles.blue1}>{data?.minTaskRatioRatio}</span>
            </div>
          </div>
        </div>
      );
    };
  },
});
