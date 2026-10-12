import { Button, PopConfirm, PopOver, Table } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref, watch } from "vue";

import { ClassesSelectModal } from "../classes-select-modal/classes-select-modal";

interface Props {
  value: { id: string; name: string; content?: string[] }[];
  readonly: boolean;
}

/** 班次选择 考勤组设置使用 */
export const ClassesSelectTable = defineComponent({
  props: ["value", "readonly"],
  emits: ["update:value"],
  setup: (props: Props, { emit }) => {
    const selectValue = ref<{ id: string; name: string }[]>(props.value ?? []);
    const classesSelectModalRef = ref<{ openModal: () => void }>();

    const delRow = (index: number): void => {
      selectValue.value.splice(index, 1);
      emit("update:value", selectValue.value);
    };
    const columns = [
      {
        title: "班次名称",
        align: "center" as const,
        dataIndex: "name",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "班次简称",
        align: "center" as const,
        dataIndex: "nickName",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "建议应用范围",
        align: "center" as const,
        dataIndex: "deptNames",
        width: 350,
        customRender: ({ text }: { text: string }): VNode => (
          <PopOver content={text || "--"}>
            <p style="margin:0 auto;width:300px;white-space: nowrap;max-width: 100%;overflow: hidden;text-overflow: ellipsis;">
              {text || "--"}
            </p>
          </PopOver>
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
    /** 弹窗确认事件 */
    const classesSelectModalOnOk = (value: { id: string; name: string }[]): void => {
      selectValue.value = value;
      emit("update:value", selectValue.value);
    };

    watch(
      () => props.value,
      (next) => {
        selectValue.value = next ?? [];
      },
      { deep: true },
    );
    const openModal = (): void => {
      classesSelectModalRef.value?.openModal();
    };

    onMounted(() => {
      if (props.value?.length) {
        selectValue.value = props.value.map((e) => e);
      }
    });

    return (): VNode => {
      const header = (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
          {!props.readonly && (
            <Button type="primary" shape="round" onClick={openModal}>
              选择班次
            </Button>
          )}
        </div>
      );

      const body = (
        <Table columns={tableColumns.value} dataSource={selectValue.value} pagination={false} size="small" scroll={{ y: 440 }} />
      );

      return (
        <>
          {header}
          {body}
          {!props.readonly ? (
            <ClassesSelectModal ref={classesSelectModalRef} value={selectValue.value} onUpdate:value={classesSelectModalOnOk} />
          ) : (
            ""
          )}
        </>
      );
    };
  },
});
