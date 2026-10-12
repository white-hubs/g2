import type { DispatchDevice, FusionAccount } from "@g2-contract/command-dispatch";
import type { ColumnType } from "@g2-platform/pc-ui/types";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { PageFrame } from "../../components/page-frame";
import { getCommandDispatchClient } from "../../domain-context";
import { Button, Form, FormItem, getCommandDispatchPcUi, Input, message, Pagination, Popover, Table } from "../../pc-ui-runtime";
import { type PageState, createPageLoader, errorText, parsePageValue } from "../radio-record/list-state";
import { ListError, formatTime } from "../radio-record/list-ui";
import { AccountEditor } from "./account-editor";
import { accountStatus, findAccountDevice } from "./account-state";

import styles from "../radio-record/list.module.css";

export const AccountConfig = defineComponent({
  name: "CommandDispatchAccountConfig",
  setup() {
    const client = getCommandDispatchClient();
    const query = getCommandDispatchPcUi().usePcQueryState({
      initialState: { keyword: "", pageNumber: 1, pageSize: 10 },
      storage: "url",
      cacheFields: ["keyword", "pageNumber", "pageSize"],
      resolveValue: parsePageValue,
    });
    const state = reactive<PageState<FusionAccount>>({ loading: false, error: "", records: [], total: 0 });
    const editingDevice = ref<DispatchDevice>();
    const loadingDeviceCode = ref<string>();
    const load = createPageLoader(state);
    const getList = (): Promise<void> => {
      query.update({});
      return load(() => client.pageAccounts(query.getSnapshot()));
    };
    const search = (): void => {
      query.update({ pageNumber: 1 });
      void getList();
    };
    const edit = async (account: FusionAccount): Promise<void> => {
      if (loadingDeviceCode.value) {
        return;
      }
      loadingDeviceCode.value = account.code;
      try {
        const device = await findAccountDevice(account.code, (params) => client.pageDevices(params));
        if (device) {
          editingDevice.value = device;
        } else {
          void message.warning("该账号尚未关联同号码的调度设备，无法编辑设备配置");
        }
      } catch (error) {
        void message.error(errorText(error, "读取设备配置失败，请重试"));
      } finally {
        loadingDeviceCode.value = undefined;
      }
    };
    const columns: ColumnType<FusionAccount>[] = [
      {
        title: "账号名称",
        dataIndex: "name",
        key: "name",
        width: 180,
        ellipsis: true,
        customRender: ({ record }) => <Popover content={record.name || "--"}>{record.name || "--"}</Popover>,
      },
      {
        title: "号码",
        dataIndex: "code",
        key: "code",
        width: 170,
        ellipsis: true,
        customRender: ({ record }) => <Popover content={record.code || "--"}>{record.code || "--"}</Popover>,
      },
      { title: "账号等级", key: "level", width: 130, customRender: ({ record }) => record.level ?? "--" },
      {
        title: "状态",
        key: "usageState",
        width: 130,
        customRender: ({ record }) => {
          const status = accountStatus(record.usageState);
          return <span style={{ color: status.color }}>{status.title}</span>;
        },
      },
      { title: "创建时间", key: "createTime", width: 190, customRender: ({ record }) => formatTime(record.createTime) },
      {
        title: "操作",
        key: "actions",
        width: 100,
        customRender: ({ record }) => (
          <Button
            type="link"
            loading={loadingDeviceCode.value === record.code}
            disabled={Boolean(loadingDeviceCode.value) && loadingDeviceCode.value !== record.code}
            onClick={() => edit(record)}
          >
            编辑
          </Button>
        ),
      },
    ];
    onMounted(() => {
      void getList();
    });
    return () => (
      <>
        <PageFrame title="账号配置">
          {{
            search: () => (
              <Form layout="inline" class={styles.queryForm} onFinish={search}>
                <FormItem>
                  <Input
                    class={styles.queryInput}
                    aria-label="账号名称/号码"
                    placeholder="账号名称/号码"
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
                  scroll={{ x: 900 }}
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
        {editingDevice.value ? (
          <AccountEditor
            device={editingDevice.value}
            onClose={() => {
              editingDevice.value = undefined;
            }}
            onSaved={() => {
              editingDevice.value = undefined;
              void getList();
            }}
          />
        ) : null}
      </>
    );
  },
});
