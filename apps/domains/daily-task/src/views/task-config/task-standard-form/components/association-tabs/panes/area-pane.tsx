// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { type PropType, defineComponent, ref, watch } from "vue";

import { AssocType } from "../association-tabs";
import { cubeMdataService } from "@/api/server";
import { Table } from "@/pc-ui-runtime";
import type { AreaTree } from "@/types/daily-task";

export const AreaPane = defineComponent({
  props: {
    disabled: { type: Boolean, default: false },
    selectValue: { type: Array as PropType<{ targetTypeId: string; type: string }[]>, default: () => [] },
  },
  emits: ["update:selectValue"],
  setup(props, { emit }) {
    const selectionDisabled = props.disabled;
    const dataSource = ref<AreaTree[]>([]);
    const selectValue = ref<{ targetTypeId: string; type: string }[]>(props.selectValue);
    const selectedRowKeys = ref<string[]>(selectValue.value.map((e) => e.targetTypeId));

    watch(
      () => props.selectValue,
      (newVal: { targetTypeId: string; type: string }[] | undefined): void => {
        selectValue.value = newVal ?? [];
        selectedRowKeys.value = selectValue.value.map((e) => e.targetTypeId);
      },
      { immediate: true },
    );

    cubeMdataService.getAreaTree().then((res) => {
      dataSource.value = res;
    });

    const columns = [
      {
        title: "区域名称",
        dataIndex: "name",
        ellipsis: true,
        align: "left",
      },
    ];

    return (): JSX.Element => (
      <Table
        columns={columns}
        dataSource={dataSource.value}
        rowKey="id"
        pagination={false}
        size="small"
        rowSelection={{
          type: "checkbox",
          checkStrictly: false,
          selectedRowKeys: selectedRowKeys.value,
          onChange: (keys: string[], selectedRows: AreaTree[]) => {
            selectedRowKeys.value = keys;
            selectValue.value = selectedRows.map((e) => ({ targetTypeId: e.id, type: AssocType.AREA }));
            emit("update:selectValue", selectValue.value);
          },
          getCheckboxProps: () => ({
            disabled: selectionDisabled,
          }),
        }}
      />
    );
  },
});
