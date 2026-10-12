import type { ColumnType } from "@g2-platform/pc-ui";
import { PopOver, usePcTable } from "@g2-platform/pc-ui";
import { type PropType, type VNode, computed, defineComponent, watchEffect } from "vue";
export interface ImportType {
  fail: number;
  errorMsg: string[];
  success: number;
}
export const ImportResult = defineComponent({
  props: {
    value: {
      type: Object as PropType<ImportType>,
      default: () => ({ fail: 0, success: 0, errorMsg: [] }),
    },
  },
  setup: (props) => {
    const successTotal = computed(() => (props.value ? props.value.success : 0));
    const failTotal = computed(() => (props.value ? props.value.fail : 0));
    const failTableData = computed(() => props.value.errorMsg?.map((item, index) => ({ id: index, details: item })) ?? []);
    const failColumns: ColumnType[] = [
      {
        title: "导入详情",
        dataIndex: "details",
        align: "center",
        ellipsis: true,
        width: 200,
        customRender: ({ text }: { text: string }): VNode => (
          <PopOver placement="bottomLeft" overlayStyle={{ width: "800px !important" }} content={text ?? "--"}>
            {text ?? "--"}
          </PopOver>
        ),
      },
      {
        title: "状态",
        dataIndex: "state",
        align: "center",
        width: 50,
        customRender: (): VNode => <PopOver content="失败">失败</PopOver>,
      },
    ];
    const [ResultTable, tableApi] = usePcTable({
      columns: failColumns,
      rowKey: "id",
      tableCode: "attendance-balance-import-result",
      autoFetch: false,
      autoScrollY: false,
      scrollY: 500,
    });
    watchEffect(() => tableApi.setDataSource(failTableData.value));
    return (): VNode => (
      <>
        <div style={{ marginBottom: "15px", textAlign: "center" }}>
          <span>导入结果如下：</span>
          <span>
            导入成功共计
            <span style={{ color: "#389e0d", margin: "0 3px", fontSize: "14px" }}>{successTotal.value ?? 0}</span>条，失败
            <span style={{ fontSize: "14px", color: "#cf1322", margin: "0 3px" }}>{failTotal.value ?? 0}</span>条
          </span>
        </div>
        {failTableData.value.length > 0 && <ResultTable />}
      </>
    );
  },
});
