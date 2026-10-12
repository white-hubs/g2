import { Button, PopConfirm, PopOver, Table } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, ref, watch } from "vue";

import { type AttendanceUser, UserPickerModal } from "@/components/business/user-picker-table/user-picker-modal";

interface Props {
  title?: string;
  readonly: boolean;
  value: AttendanceUser[];
}

export const UserPickerTable = defineComponent({
  props: ["title", "readonly", "value"],
  emits: ["update:value"],
  setup(props: Props, { emit }) {
    const userPickerInputRef = ref<{ openModal: () => void }>();
    const openModal = (): void => {
      userPickerInputRef.value?.openModal();
    };
    const users = ref<AttendanceUser[]>(props.value ?? []);
    watch(
      () => props.value,
      (value) => {
        users.value = value ?? [];
      },
      { deep: true },
    );
    const onUpdateValue = (data: AttendanceUser[]): void => {
      users.value = data;
      emit("update:value", users.value);
    };

    const delRow = (index: number): void => {
      users.value.splice(index, 1);
      emit("update:value", users.value);
    };
    const columns = [
      {
        title: "序号",
        width: 70,
        align: "center" as const,
        customRender: ({ index }: { index: number }): VNode => <span>{index + 1}</span>,
      },
      {
        title: "名称",
        dataIndex: "name",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "联系电话",
        dataIndex: "mobile",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "部门",
        dataIndex: "organizations",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: { name: string }[] }): VNode => {
          const data = text?.map((item) => item.name);
          if (data?.length) {
            return <PopOver content={data.join("/") || "--"}>{data.join("/") || "--"}</PopOver>;
          }
          return <span>--</span>;
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

    return (): VNode => {
      const header = (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
          {!props.readonly && (
            <>
              <Button type="primary" shape="round" onClick={openModal}>
                添加人员
              </Button>
              <UserPickerModal ref={userPickerInputRef} value={users.value} onUpdate:value={onUpdateValue} multiple />
            </>
          )}
        </div>
      );

      const body = <Table columns={columns} dataSource={users.value} pagination={false} size="small" scroll={{ y: 440 }} />;

      return (
        <>
          {header}
          {body}
        </>
      );
    };
  },
});
