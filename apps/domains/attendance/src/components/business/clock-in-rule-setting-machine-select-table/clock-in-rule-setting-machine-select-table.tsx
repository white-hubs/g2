import { Button, PopConfirm, PopOver, Table } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, ref, watch } from "vue";

import { DeviceModalTable } from "./device-modal";

interface Props {
  readonly: boolean;
  value: { id: string; name: string }[];
}

export const ClockInRuleSettingMachineSelectTable = defineComponent({
  props: ["readonly", "value"],
  emits: ["update:value"],
  setup(props: Props, { emit }) {
    const deviceModalTableRef = ref<{ openModal: () => void }>();
    const openModal = (): void => {
      deviceModalTableRef.value?.openModal();
    };

    const columns = [
      {
        title: "设备名称",
        dataIndex: "name",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "产品品类",
        dataIndex: "productInfo",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ record }: { record: { productInfo: { productCategory: { name: string } } } }): VNode => {
          const res = record.productInfo ? record.productInfo.productCategory.name : "--";
          return <PopOver content={res || "--"}>{res || "--"}</PopOver>;
        },
      },
      {
        title: "维护部门",
        dataIndex: "department",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ record }: { record: { department: { name: string } } }): VNode => {
          const res = record.department ? record.department?.name || "--" : "--";
          return <PopOver content={res}>{res}</PopOver>;
        },
      },
      {
        title: "所在区域",
        dataIndex: "areaName",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ record }: { record: { area: { pathName: string } } }): VNode => {
          const res = record.area ? record.area.pathName : "--";
          return <PopOver content={res || "--"}>{res || "--"}</PopOver>;
        },
      },
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
    if (props.readonly) {
      columns.pop();
    }

    const selectModelValue = ref<string[]>([]);
    const selectValue = ref<{ id: string; name: string }[]>([]);

    const delRow = (index: number): void => {
      if (props.readonly) {
        return;
      }
      selectValue.value.splice(index, 1);
      selectModelValue.value = selectValue.value.map((e) => e.id);
      emit("update:value", selectValue.value);
    };
    const ok = (values: { id: string; name: string }[]): void => {
      if (props.readonly) {
        return;
      }
      selectValue.value = values;
      selectModelValue.value = values.map((e) => e.id);
      emit("update:value", selectValue.value);
    };
    watch(
      () => props.value,
      () => {
        if (props.value) {
          selectModelValue.value = props.value.map((e) => e.id);
          selectValue.value = props.value;
        }
      },
      { deep: true, immediate: true },
    );

    return (): VNode => {
      const header = (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
          {!props.readonly && (
            <>
              <Button type="primary" shape="round" onClick={openModal}>
                选择考勤机
              </Button>
            </>
          )}
        </div>
      );

      const body = <Table columns={columns} dataSource={selectValue.value} pagination={false} size="small" scroll={{ y: 440 }} />;

      return (
        <>
          {header}
          {body}
          <DeviceModalTable ref={deviceModalTableRef} onOk={ok} value={selectValue.value} />
        </>
      );
    };
  },
});
