// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { StandardResultItemModel } from "@g2-client/daily-task/client";
import { type PropType, defineComponent } from "vue";

import { ResultItem } from "../result-item/result-item";
import { Empty } from "@/pc-ui-runtime";

import styles from "./standard-result-item.module.css";
export const StandardResultItem = defineComponent({
  props: {
    standardResult: {
      type: Array as PropType<StandardResultItemModel[]>,
      default: () => [],
    },
  },
  setup: (props) => (): JSX.Element => (
    <div class={styles.container}>
      {(!Array.isArray(props.standardResult) || props.standardResult.length === 0) && <Empty description="暂无执行结果" />}
      {Array.isArray(props.standardResult) &&
        props.standardResult.map((item) => (
          <div class={styles["item-container"]} key={item.standardId}>
            <div class={styles.title}>{item.standardName}</div>
            <ResultItem patrolResult={item.itemList ?? []} />
          </div>
        ))}
    </div>
  ),
});
