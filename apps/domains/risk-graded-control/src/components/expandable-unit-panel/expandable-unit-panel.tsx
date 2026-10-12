import { defineComponent, type PropType } from "vue";

import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { Table, Tag } from "@/pc-ui-runtime";
import type { UnitInventoryRowVO } from "@/types/risk";

import styles from "./expandable-unit-panel.module.less";

export const ExpandableUnitPanel = defineComponent({
  props: {
    row: { type: Object as PropType<UnitInventoryRowVO>, required: true },
  },
  setup(props) {
    const measureColumns = [
      { dataIndex: "controlType", title: "管控类型", width: 120, customRender: ({ text }: { text?: string }) => text || "--" },
      { dataIndex: "content", title: "措施内容", width: 260, ellipsis: true, customRender: ({ text }: { text?: string }) => text || "--" },
      { dataIndex: "controlLevel", title: "管控层级", width: 100, customRender: ({ text }: { text?: string }) => text || "--" },
      { dataIndex: "executor", title: "责任人", width: 100, customRender: ({ text }: { text?: string }) => text || "--" },
      {
        dataIndex: "execStatus",
        title: "执行状态",
        width: 100,
        customRender: ({ text }: { text: string }) => (
          <Tag color={text === "DONE" ? "green" : text === "OVERDUE" ? "red" : "processing"}>
            {text === "DONE" ? "已执行" : text === "EXECUTING" ? "执行中" : text === "OVERDUE" ? "超期" : "待执行"}
          </Tag>
        ),
      },
    ];

    return (): JSX.Element => (
      <div class={styles.panel}>
        {props.row.objects.map((obj) => (
          <div key={obj.id} class={styles.objectBlock}>
            <div class={styles.objectHeader}>
              <div class={styles.objectInfo}>
                <div class={styles.objectName}>{obj.name}</div>
              </div>
              <div class={styles.objectLevels}>
                <span class={styles.levelItem}>
                  <span class={styles.levelLabel}>固有：</span>
                  <RiskLevelTag level={obj.innateLevel} />
                </span>
                <span class={styles.levelItem}>
                  <span class={styles.levelLabel}>现状：</span>
                  <RiskLevelTag level={obj.controlLevel} />
                </span>
              </div>
            </div>
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={props.row.measures.filter((m) => m.objectId === obj.id)}
              columns={measureColumns}
              tableLayout="fixed"
              class={styles.measureTable}
            />
          </div>
        ))}
        {props.row.hiddenDangers.length > 0 && (
          <>
            <div class={styles.hiddenTitle}>隐患处理记录（来源：隐患治理）</div>
            <Table
              size="small"
              pagination={false}
              rowKey="code"
              dataSource={props.row.hiddenDangers}
              columns={[
                { dataIndex: "code", title: "隐患编号", width: 120 },
                { dataIndex: "description", title: "隐患描述" },
                { dataIndex: "foundTime", title: "发现时间", width: 110 },
                {
                  dataIndex: "riskLevel",
                  title: "风险等级",
                  width: 100,
                  customRender: ({ text }: { text: import("@/types/risk").RiskLevel }) => <RiskLevelTag level={text} />,
                },
                { dataIndex: "status", title: "状态", width: 80 },
                { dataIndex: "closedTime", title: "闭环时间", width: 110 },
              ]}
            />
          </>
        )}
      </div>
    );
  },
});
