// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import type { BroadcastTemplatePage } from "@g2-contract/broadcast-center";
import { defineComponent, reactive, ref, watch, type PropType } from "vue";

import { broadcastApi } from "@/api/server";
import { Button, Form, FormItem, Input, Modal, Page, PopOver, Table, ZhConfigProvider, getDayjs } from "@/pc-ui-runtime";
import { formatBroadcastTemplateContent } from "@/utils";

const dayjs = getDayjs();

interface Props {
  visible: boolean;
  disabledKeys: string[];
  selectedKeys: string[];
}

/** 广播模板选择弹窗 */
export const BroadcastModal = defineComponent({
  name: "BroadcastModal",
  emits: ["cancel", "save"],
  props: {
    visible: { type: Boolean, default: false },
    disabledKeys: { type: Array as PropType<string[]>, default: () => [] },
    selectedKeys: { type: Array as PropType<string[]>, default: () => [] },
  },
  setup: (props: Props, { emit }) => {
    const open = ref(false);
    const dataSource = ref<BroadcastTemplatePage[]>([]);
    const disabledList = ref<string[]>([]);
    const loading = ref(false);
    const pagination = ref({ pageSize: 10, pageNumber: 1, total: 0 });
    const formState = reactive<{ keyword: string | undefined }>({ keyword: undefined });
    const selectedRowKeysData = ref<string[]>(props.selectedKeys || []);
    const selectedRowsData = ref<BroadcastTemplatePage[]>([]);

    const save = (): void => {
      emit("save", selectedRowKeysData.value, selectedRowsData.value);
    };
    const cancel = (): void => {
      open.value = false;
      emit("cancel", false);
    };

    const columns = [
      {
        title: "序号",
        dataIndex: "",
        ellipsis: true,
        align: "center",
        width: 60,
        customRender: ({ index }: { index: number }): JSX.Element => <PopOver content={index + 1 || "--"}>{index + 1 || "--"}</PopOver>,
      },
      {
        title: "模板名称",
        dataIndex: "name",
        align: "center",
        width: 120,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "广播内容",
        dataIndex: "content",
        ellipsis: true,
        align: "center",
        width: 200,
        customRender: ({ text, record }: { text: string; record: BroadcastTemplatePage }): JSX.Element => {
          if (record.contentType === "TEXT") {
            const display = formatBroadcastTemplateContent(text);
            return <PopOver content={display || ""}>{display || "--"}</PopOver>;
          }
          return <audio src={record.fileVOList?.[0] ? record.fileVOList[0].path : ""} style="max-width: 100%;max-height: 100%;" controls />;
        },
      },
      {
        title: "编辑人",
        dataIndex: "updateByName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "最近编辑时间",
        dataIndex: "updateTime",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "";
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
    ];

    const getBroadcastTemplatePage = async (): Promise<void> => {
      loading.value = true;
      try {
        const res = await broadcastApi.broadcastTemplatePage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          keyword: formState.keyword || undefined,
        });
        dataSource.value = res.records as BroadcastTemplatePage[];
        pagination.value.total = res.total;
      } finally {
        loading.value = false;
      }
    };

    const queryForm = (): void => {
      pagination.value.pageNumber = 1;
      void getBroadcastTemplatePage();
    };

    const reset = (): void => {
      pagination.value.pageNumber = 1;
      formState.keyword = undefined;
      void getBroadcastTemplatePage();
    };

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      void getBroadcastTemplatePage();
    };

    const rowSelection = ref({
      type: "radio",
      selectedRowKeys: selectedRowKeysData.value,
      onChange: (selectedRowKeys: string[], selectedRows: BroadcastTemplatePage[]) => {
        selectedRowKeysData.value = selectedRowKeys;
        selectedRowsData.value = selectedRows;
      },
      getCheckboxProps: (record: BroadcastTemplatePage) => ({
        disabled: disabledList.value?.length ? disabledList.value.includes(record.id) : false,
      }),
    });

    watch(
      () => props.visible,
      (val) => {
        open.value = val;
        if (val) void getBroadcastTemplatePage();
      },
      { immediate: true },
    );

    watch(
      () => props.disabledKeys,
      (val) => {
        disabledList.value = val || [];
      },
      { immediate: true },
    );

    return (): JSX.Element => (
      <ZhConfigProvider>
        <Modal open={open.value} title="选择广播模板" okText="确定" cancelText="取消" onOk={save} onCancel={cancel} width={800}>
          <Form layout="inline" style={{ margin: "10px 0 0 0" }}>
            <FormItem label="" style={{ paddingRight: 0, marginRight: "10px", marginBottom: "10px" }}>
              <Input
                style={{ width: "220px" }}
                placeholder="请输入名称搜索"
                value={formState.keyword}
                onUpdate:value={(v) => (formState.keyword = v)}
              />
            </FormItem>
            <FormItem style={{ paddingRight: 0, marginRight: "10px", marginBottom: "10px" }}>
              <Button type="primary" onClick={queryForm}>
                查询
              </Button>
              <Button style={{ marginLeft: "10px" }} onClick={reset}>
                重置
              </Button>
            </FormItem>
          </Form>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={dataSource.value}
            pagination={false}
            loading={loading.value}
            rowSelection={rowSelection.value}
            scroll={{ y: 300 }}
          />
          <Page
            style={{ textAlign: "right" }}
            current={pagination.value.pageNumber}
            pageSize={pagination.value.pageSize}
            total={pagination.value.total}
            onPageChange={pageChange}
          />
        </Modal>
      </ZhConfigProvider>
    );
  },
});
