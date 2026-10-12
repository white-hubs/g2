// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { StandardResultItemModel, TargetResultModel } from "@g2-client/daily-task/client";
import { type PropType, defineComponent } from "vue";

import { StandardResultItem } from "../standard-result-item/standard-result-item";
import { Empty } from "@/pc-ui-runtime";

import styles from "./target-result-item.module.css";
export const TargetResultItem = defineComponent({
  props: {
    targetResult: {
      type: Array as PropType<TargetResultModel[]>,
      default: () => [],
    },
  },
  setup: (props) => (): JSX.Element => (
    <div class={styles.container}>
      {props.targetResult.length === 0 && <Empty description="暂无执行结果" />}
      {props.targetResult.map((item: TargetResultModel) => (
        <div class={styles["target-item-container"]} key={item.targetId}>
          <div class={styles.title}>{item.targetName}</div>
          {Array.isArray(item.standardResultList) &&
            item.standardResultList.length > 0 &&
            (Array.isArray((item.standardResultList[0] as { standardList?: unknown[] }).standardList) ? (
              item.standardResultList.map((standardItem) => (
                <StandardResultItem standardResult={(standardItem as { standardList: StandardResultItemModel[] }).standardList ?? []} />
              ))
            ) : (
              <StandardResultItem standardResult={item.standardResultList as unknown as StandardResultItemModel[]} />
            ))}
        </div>
      ))}
    </div>
  ),
});
