// @ts-nocheck
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { defineComponent, type PropType } from "vue";

import { Empty, Image, ImagePreviewGroup } from "@/pc-ui-runtime";

import styles from "./result-item.module.css";

export const ResultItem = defineComponent({
  name: "InspectRecordResultItem",
  props: {
    patrolResult: { type: Array as PropType<InspectionRecord[]>, default: () => [] },
  },
  setup(props) {
    return () => (
      <div>
        {!props.patrolResult?.length ? <Empty description="暂无巡检结果" /> : null}
        {(props.patrolResult ?? []).map((standard) => (
          <div class={styles["result-item-container"]} key={String(standard.standardId ?? standard.id)}>
            <div class={styles.title}>{String(standard.standardName ?? standard.name ?? "巡检标准")}</div>
            {(Array.isArray(standard.itemVOS) ? standard.itemVOS : Array.isArray(standard.standardItems) ? standard.standardItems : []).map(
              (ele: InspectionRecord, index: number) => (
                <div class={styles["result-item"]} key={String(ele.itemId ?? ele.id ?? index)}>
                  <div class={styles["first-index"]}>{index + 1}、</div>
                  <div class={styles["item-content"]}>
                    <div>
                      <label>{String(ele.itemName ?? ele.name ?? "巡检项")}:</label>
                      <span class={ele.errorValueFlag || ele.errorFlag ? styles["error-value"] : styles["normal-value"]}>
                        {String(ele.itemResultName ?? ele.resultName ?? ele.result ?? "--")}
                      </span>
                    </div>
                    <div>
                      <label>描述信息:</label> <span>{String(ele.errorDesc ?? ele.remark ?? "--")}</span>
                    </div>
                    {Array.isArray(ele.fileVOS) && ele.fileVOS.length ? (
                      <ImagePreviewGroup>
                        {ele.fileVOS.map((file: InspectionRecord) => (
                          <Image
                            key={String(file.id)}
                            src={String(file.path ?? file.url ?? "")}
                            style={{ width: "100px", height: "100px" }}
                            width={100}
                            height={100}
                          />
                        ))}
                      </ImagePreviewGroup>
                    ) : null}
                    {Array.isArray(ele.fileList) && ele.fileList.length ? (
                      <ImagePreviewGroup>
                        {ele.fileList.map((file: InspectionRecord) => (
                          <Image
                            key={String(file.id)}
                            src={String(file.path ?? file.url ?? "")}
                            style={{ width: "100px", height: "100px" }}
                            width={100}
                            height={100}
                          />
                        ))}
                      </ImagePreviewGroup>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    );
  },
});
