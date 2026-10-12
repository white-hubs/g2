// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { type PropType, defineComponent, ref, watch } from "vue";

import { AssocType } from "../association-tabs";
import { cubeDeviceCenterService } from "@/api/server";
import { Table } from "@/pc-ui-runtime";

export const DevicePane = defineComponent({
  props: {
    disabled: { type: Boolean, default: false },
    selectValue: { type: Array as PropType<{ targetTypeId: string; type: string }[]>, default: () => [] },
  },
  emits: ["update:selectValue"],
  setup(props, { emit }) {
    const selectionDisabled = props.disabled;
    const dataSource = ref<{ categoryCode: string; categoryName: string; children?: { categoryCode: string; categoryName: string }[] }[]>(
      [],
    );
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

    cubeDeviceCenterService.getIotProductCategoryTree().then((res) => {
      dataSource.value = res || [];
    });

    const columns = [
      {
        title: "设备分类名称",
        dataIndex: "categoryName",
        ellipsis: true,
        align: "left",
      },
    ];

    return (): JSX.Element => (
      <Table
        columns={columns}
        dataSource={dataSource.value}
        rowKey="categoryCode"
        childrenColumnName="children"
        pagination={false}
        size="small"
        rowSelection={{
          type: "checkbox",
          checkStrictly: false,
          selectedRowKeys: selectedRowKeys.value,
          onChange: (keys: string[], selectedRows: { categoryCode: string; categoryName: string }[]) => {
            selectedRowKeys.value = keys;
            selectValue.value = selectedRows.map((e) => ({ targetTypeId: e.categoryCode, type: AssocType.DEVICE }));
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
