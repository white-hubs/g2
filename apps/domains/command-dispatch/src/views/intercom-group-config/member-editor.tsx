import type { DispatchDevice } from "@g2-contract/command-dispatch";
import type { ColumnType } from "@g2-platform/pc-ui/types";
import { type PropType, defineComponent, onMounted, reactive, ref } from "vue";

import { getCommandDispatchClient } from "../../domain-context";
import { Alert, Button, Form, FormItem, Input, message, Modal, Pagination, Popover, Table } from "../../pc-ui-runtime";
import { type PageState, createPageLoader, errorText } from "../radio-record/list-state";
import { ListError, formatTime } from "../radio-record/list-ui";
import { changeMemberSelection } from "./group-state";

import styles from "../radio-record/list.module.css";

export const MemberEditor = defineComponent({
  name: "CommandDispatchMemberEditor",
  props: {
    groupCode: { type: String, required: true },
    selectedCodes: { type: Array as PropType<string[]>, default: () => [] },
  },
  emits: ["close", "saved"],
  setup(props, { emit }) {
    const client = getCommandDispatchClient();
    const selected = ref([...new Set(props.selectedCodes)]);
    const query = reactive({ keyword: "", pageNumber: 1, pageSize: 10 });
    const state = reactive<PageState<DispatchDevice>>({ loading: false, error: "", records: [], total: 0 });
    const pending = ref(false);
    const saveError = ref("");
    const load = createPageLoader(state);
    const getList = (): Promise<void> => load(() => client.pageDevices({ ...query }));
    const search = (): void => {
      query.pageNumber = 1;
      void getList();
    };
    const save = async (): Promise<void> => {
      if (pending.value || state.loading || state.error) {
        return;
      }
      pending.value = true;
      saveError.value = "";
      try {
        await client.setGroupMembers(props.groupCode, [...selected.value]);
        void message.success("成员保存成功");
        emit("saved");
      } catch (cause) {
        saveError.value = errorText(cause, "成员保存失败，请重试");
      } finally {
        pending.value = false;
      }
    };
    const columns: ColumnType<DispatchDevice>[] = [
      { title: "账号名称", dataIndex: "name", key: "name", width: 160 },
      { title: "号码", dataIndex: "code", key: "code", width: 130 },
      { title: "账号等级", dataIndex: "deviceLevel", key: "deviceLevel", width: 110 },
      {
        title: "所属对讲组",
        key: "groups",
        ellipsis: true,
        width: 220,
        customRender: ({ record }) => {
          const value = record.groups?.map((group) => group.name).join("，") || "--";
          return <Popover content={value}>{value}</Popover>;
        },
      },
      { title: "创建时间", key: "createTime", width: 180, customRender: ({ record }) => formatTime(record.createTime) },
    ];
    onMounted(() => {
      void getList();
    });
    return () => (
      <Modal
        open
        title="添加成员"
        width={1000}
        maskClosable={false}
        keyboard={!pending.value}
        closable={!pending.value}
        confirmLoading={pending.value}
        okText="保存"
        okButtonProps={{ disabled: state.loading || Boolean(state.error) }}
        cancelButtonProps={{ disabled: pending.value }}
        onOk={save}
        onCancel={() => {
          if (!pending.value) {
            emit("close");
          }
        }}
      >
        <Form layout="inline" class={[styles.queryForm, styles.modalSearch]} onFinish={search}>
          <FormItem>
            <Input
              class={styles.queryInput}
              aria-label="成员账号名称/号码"
              placeholder="账号名称/号码"
              allowClear
              disabled={pending.value}
              v-model:value={query.keyword}
            />
          </FormItem>
          <FormItem>
            <div class={styles.buttons}>
              <Button type="primary" htmlType="submit" loading={state.loading} disabled={pending.value}>
                查询
              </Button>
              <Button
                disabled={state.loading || pending.value}
                onClick={() => {
                  query.keyword = "";
                  search();
                }}
              >
                重置
              </Button>
            </div>
          </FormItem>
        </Form>
        <ListError error={state.error} loading={state.loading} onRetry={getList} />
        {saveError.value ? <Alert class={styles.error} type="error" showIcon message={saveError.value} /> : null}
        <Table
          rowKey="code"
          columns={columns}
          dataSource={state.records}
          loading={state.loading}
          pagination={false}
          size="small"
          scroll={{ x: 850, y: 340 }}
          rowSelection={{
            selectedRowKeys: selected.value,
            preserveSelectedRowKeys: true,
            getCheckboxProps: () => ({ disabled: pending.value }),
            onSelect: (record: DispatchDevice, checked: boolean) => {
              selected.value = changeMemberSelection(selected.value, [record], checked);
            },
            onSelectAll: (checked: boolean, _rows: DispatchDevice[], changed: DispatchDevice[]) => {
              selected.value = changeMemberSelection(selected.value, changed, checked);
            },
          }}
        />
        <div class={styles.modalFooter}>
          <span class={styles.selectionCount}>已选择 {selected.value.length} 名成员</span>
          <Pagination
            current={query.pageNumber}
            pageSize={query.pageSize}
            total={state.total}
            showSizeChanger
            disabled={pending.value}
            showTotal={(total) => `共 ${total} 条`}
            onChange={(page, size) => {
              query.pageNumber = page;
              query.pageSize = size;
              void getList();
            }}
          />
        </div>
      </Modal>
    );
  },
});
