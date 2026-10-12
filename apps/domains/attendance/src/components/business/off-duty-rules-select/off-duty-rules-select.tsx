import { Button, Input, type PcTableColumn, PopConfirm, PopOver, usePcTable } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref, watchEffect } from "vue";

import { type OffDutyRules, offDutyRulesPage } from "@/api/staff-off-duty";
import { RulesPicker } from "@/components/business/rules-picker/rules-picker";

interface Props {
  value: { id: string; name: string; content?: string[] }[];
  readonly: boolean;
}

/** 离岗规则选择 */
export const OffDutyRulesSelect = defineComponent({
  props: ["value", "readonly"],
  emits: ["update:value"],
  setup: (props: Props, { emit }) => {
    const selectModelValue = ref<string[]>([]);
    const selectValue = ref<Props["value"]>([]);
    const modalVisible = ref(false);
    const search = ref([{ label: "", key: "name", component: Input, componentProps: { placeholder: "请输入规则名称" } }]);
    const delRow = (index: number): void => {
      selectValue.value.splice(index, 1);
      selectModelValue.value = selectValue.value.map((e) => e.id);
      emit("update:value", selectValue.value);
    };
    const columns: PcTableColumn[] = [
      {
        title: "规则名称",
        dataIndex: "name",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
      {
        title: "规则内容",
        dataIndex: "content",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ record }: { record: OffDutyRules }): VNode => (
          <div>
            <span>离岗限制：{record.beforeApply ? "离岗前发起审批" : "无限制"}</span>
            <br />
            <span>离岗核算：{record.calculationWay === "WORKING_DAY" ? "按工作日计算离岗时长" : "按自然日计算离岗时长"}</span>
          </div>
        ),
      },
    ];
    const tableColumns = computed(() => {
      const action = props.readonly
        ? []
        : [
            {
              title: "操作",
              dataIndex: "action",
              align: "center" as const,
              customRender: ({ index }: { index: number }): VNode => (
                <>
                  <PopConfirm
                    okText="确定"
                    cancelText="取消"
                    title="确认移除该项？"
                    onConfirm={() => {
                      delRow(index);
                    }}
                  >
                    <Button type="link" size="small" danger>
                      移除
                    </Button>
                  </PopConfirm>
                </>
              ),
            },
          ];
      return [...columns, ...action];
    });

    const ok = (values: Props["value"]): void => {
      selectValue.value = values;
      selectModelValue.value = values.map((e) => e.id);
      modalVisible.value = false;
      emit("update:value", selectValue.value);
    };

    const openModal = (): void => {
      modalVisible.value = true;
    };

    onMounted(() => {
      if (props.value?.length) {
        selectValue.value = props.value.map((e) => e);
        selectModelValue.value = selectValue.value.map((e) => e.id);
      }
    });

    const [SelectedRulesTable, selectedTableApi] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "attendance-selected-off-duty-rules",
      autoFetch: false,
      autoScrollY: false,
      scrollY: 440,
    });
    watchEffect(() => {
      selectedTableApi.setColumns(tableColumns.value);
      selectedTableApi.setDataSource(selectValue.value);
    });
    return (): VNode => {
      const header = (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
          {!props.readonly && (
            <Button type="primary" shape="round" onClick={openModal}>
              选择离岗规则
            </Button>
          )}
        </div>
      );

      const body = <SelectedRulesTable />;

      return (
        <>
          {header}
          {body}
          <RulesPicker
            v-model:show={modalVisible.value}
            columns={columns}
            title="选择离岗规则"
            search={search.value}
            apiFunction={offDutyRulesPage}
            onOk={ok}
            multiple={false}
            selectRowKeysValue={selectModelValue.value}
            selectRowValue={selectValue.value}
            searchParams={{ enabled: true }}
          />
        </>
      );
    };
  },
});
