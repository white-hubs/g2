import type { IntercomGroup } from "@g2-contract/command-dispatch";
import type { ColumnType } from "@g2-platform/pc-ui/types";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { PageFrame } from "../../components/page-frame";
import { getCommandDispatchClient } from "../../domain-context";
import {
  Button,
  Form,
  FormItem,
  getCommandDispatchPcUi,
  Input,
  message,
  Pagination,
  Popconfirm,
  Popover,
  Table,
} from "../../pc-ui-runtime";
import { type PageState, createPageLoader, errorText, parsePageValue } from "../radio-record/list-state";
import { ListError, formatTime } from "../radio-record/list-ui";
import { GroupEditor } from "./group-editor";
import { MemberEditor } from "./member-editor";

import styles from "../radio-record/list.module.css";

export const IntercomGroupConfig = defineComponent({
  name: "CommandDispatchIntercomGroupConfig",
  setup() {
    const client = getCommandDispatchClient();
    const query = getCommandDispatchPcUi().usePcQueryState({
      initialState: { keyword: "", pageNumber: 1, pageSize: 10 },
      storage: "url",
      cacheFields: ["keyword", "pageNumber", "pageSize"],
      resolveValue: parsePageValue,
    });
    const state = reactive<PageState<IntercomGroup>>({ loading: false, error: "", records: [], total: 0 });
    const editorVisible = ref(false);
    const editingGroup = ref<IntercomGroup>();
    const memberGroup = ref<IntercomGroup>();
    const deletingCode = ref<string>();
    const load = createPageLoader(state);
    const getList = (): Promise<void> => {
      query.update({});
      return load(() => client.pageGroups(query.getSnapshot()));
    };
    const search = (): void => {
      query.update({ pageNumber: 1 });
      void getList();
    };
    const remove = async (record: IntercomGroup): Promise<void> => {
      if (deletingCode.value) {
        return;
      }
      deletingCode.value = record.code;
      try {
        await client.deleteGroup(record.code);
        void message.success("删除成功");
        if (state.records.length === 1 && query.state.pageNumber > 1) {
          query.update({ pageNumber: query.state.pageNumber - 1 });
        }
        await getList();
      } catch (error) {
        void message.error(errorText(error, "删除失败，请重试"));
      } finally {
        deletingCode.value = undefined;
      }
    };
    const columns: ColumnType<IntercomGroup>[] = [
      { title: "对讲组名称", dataIndex: "name", key: "name", width: 180 },
      { title: "等级", dataIndex: "groupLevel", key: "groupLevel", width: 90 },
      {
        title: "组内成员",
        key: "devices",
        width: 260,
        ellipsis: true,
        customRender: ({ record }) => {
          const value = record.devices?.map((device) => device.name).join("，") || "--";
          return <Popover content={value}>{value}</Popover>;
        },
      },
      { title: "创建时间", key: "createTime", width: 190, customRender: ({ record }) => formatTime(record.createTime) },
      {
        title: "操作",
        key: "actions",
        width: 250,
        customRender: ({ record }) => (
          <div class={styles.rowActions}>
            <Button
              type="link"
              disabled={Boolean(deletingCode.value)}
              onClick={() => {
                editingGroup.value = record;
                editorVisible.value = true;
              }}
            >
              编辑
            </Button>
            <Button
              type="link"
              disabled={Boolean(deletingCode.value)}
              onClick={() => {
                memberGroup.value = record;
              }}
            >
              添加成员
            </Button>
            <Popconfirm
              title={`确定删除对讲组“${record.name}”？`}
              okText="确定"
              cancelText="取消"
              disabled={Boolean(deletingCode.value)}
              onConfirm={() => remove(record)}
            >
              <Button
                type="link"
                danger
                loading={deletingCode.value === record.code}
                disabled={Boolean(deletingCode.value) && deletingCode.value !== record.code}
              >
                删除
              </Button>
            </Popconfirm>
          </div>
        ),
      },
    ];
    onMounted(() => {
      void getList();
    });
    return () => (
      <>
        <PageFrame title="对讲组配置">
          {{
            actions: () => (
              <Button
                type="primary"
                onClick={() => {
                  editingGroup.value = undefined;
                  editorVisible.value = true;
                }}
              >
                新增
              </Button>
            ),
            search: () => (
              <Form layout="inline" class={styles.queryForm} onFinish={search}>
                <FormItem>
                  <Input
                    class={styles.queryInput}
                    aria-label="对讲组名称/编号"
                    placeholder="请输入名称/code"
                    allowClear
                    v-model:value={query.state.keyword}
                  />
                </FormItem>
                <FormItem>
                  <div class={styles.buttons}>
                    <Button type="primary" htmlType="submit" loading={state.loading}>
                      查询
                    </Button>
                    <Button
                      disabled={state.loading}
                      onClick={() => {
                        query.state.keyword = "";
                        search();
                      }}
                    >
                      重置
                    </Button>
                  </div>
                </FormItem>
              </Form>
            ),
            default: () => (
              <>
                <ListError error={state.error} loading={state.loading} onRetry={getList} />
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={state.records}
                  loading={state.loading}
                  pagination={false}
                  scroll={{ x: 970 }}
                />
              </>
            ),
            footer: () => (
              <Pagination
                current={query.state.pageNumber}
                pageSize={query.state.pageSize}
                total={state.total}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 条`}
                onChange={(page, size) => {
                  query.setPage(page, size);
                  void getList();
                }}
              />
            ),
          }}
        </PageFrame>
        {editorVisible.value ? (
          <GroupEditor
            group={editingGroup.value}
            onClose={() => {
              editorVisible.value = false;
            }}
            onSaved={() => {
              editorVisible.value = false;
              void getList();
            }}
          />
        ) : null}
        {memberGroup.value ? (
          <MemberEditor
            groupCode={memberGroup.value.code}
            selectedCodes={memberGroup.value.devices?.map((device) => device.code) ?? []}
            onClose={() => {
              memberGroup.value = undefined;
            }}
            onSaved={() => {
              memberGroup.value = undefined;
              void getList();
            }}
          />
        ) : null}
      </>
    );
  },
});
