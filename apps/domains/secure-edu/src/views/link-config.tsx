import type { ColumnType } from "@g2-platform/pc-ui";
import { defineComponent, nextTick, onMounted, reactive, ref } from "vue";

import { PageFrame } from "../components/page-frame";
import { displayValue, errorText, pageResult } from "../components/page-utils";
import { getSecureEduClient } from "../domain-context";
import { Button, Form, FormItem, Input, Page, Switch, Table, message, useTableXScroll } from "../pc-ui-runtime";

export function createLinkConfigPage(type: "CULTIVATE_TASK" | "EXAM_TASK", title: string) {
  return defineComponent({
    name: `${type}LinkConfig`,
    setup() {
      const client = getSecureEduClient();
      const { updateTableXScroll } = useTableXScroll();
      const query = reactive({ keyword: "", pageNumber: 1, pageSize: 10 });
      const state = reactive({ loading: false, error: "", records: [] as Record<string, unknown>[], total: 0 });
      const changingId = ref("");
      const load = async (): Promise<void> => {
        state.loading = true;
        state.error = "";
        try {
          const result = pageResult(await client.get("/api/safety-management/education/market-task-urls", { ...query, taskType: type }));
          state.records = result.records;
          state.total = result.total;
        } catch (error) {
          state.records = [];
          state.total = 0;
          state.error = errorText(error, "读取市场链接失败，请重试");
        } finally {
          state.loading = false;
          await nextTick();
          updateTableXScroll();
        }
      };
      const change = async (record: Record<string, unknown>, enabled: boolean): Promise<void> => {
        if (!record.id) {
          return;
        }
        changingId.value = String(record.id);
        try {
          await client.put(`/api/safety-management/education/market-task-url/${encodeURIComponent(changingId.value)}/${enabled}`);
          void message.success("状态已更新");
          await load();
        } catch (error) {
          void message.error(errorText(error, "状态更新失败，请重试"));
        } finally {
          changingId.value = "";
        }
      };
      const columns: ColumnType<Record<string, unknown>>[] = [
        { title: "序号", key: "index", width: 76, customRender: ({ index }) => (query.pageNumber - 1) * query.pageSize + index + 1 },
        {
          title: "市场名称",
          key: "marketName",
          dataIndex: "marketName",
          ellipsis: true,
          customRender: ({ record }) => displayValue(record.marketName),
        },
        { title: title, key: "url", dataIndex: "url", ellipsis: true, customRender: ({ record }) => displayValue(record.url) },
        {
          title: "是否启用",
          key: "enabled",
          width: 160,
          customRender: ({ record }) => (
            <Switch
              checked={Boolean(record.enabled)}
              loading={changingId.value === String(record.id)}
              onUpdate:checked={(value) => void change(record, value === true)}
            />
          ),
        },
      ];
      onMounted(() => void load());
      return () => (
        <PageFrame title={title}>
          {{
            search: () => (
              <Form
                layout="inline"
                onFinish={() => {
                  query.pageNumber = 1;
                  void load();
                }}
              >
                <FormItem>
                  <Input
                    value={query.keyword}
                    placeholder="市场名称"
                    allowClear
                    onUpdate:value={(value) => {
                      query.keyword = String(value ?? "");
                    }}
                  />
                </FormItem>
                <FormItem>
                  <Button type="primary" htmlType="submit" loading={state.loading}>
                    查询
                  </Button>
                </FormItem>
                <FormItem>
                  <Button
                    onClick={() => {
                      query.keyword = "";
                      query.pageNumber = 1;
                      void load();
                    }}
                  >
                    重置
                  </Button>
                </FormItem>
              </Form>
            ),
            default: () => (
              <>
                {state.error ? (
                  <div role="alert" style="margin-bottom:12px;color:#cf1322">
                    {state.error}
                  </div>
                ) : null}
                <Table
                  id="pc-table"
                  rowKey="id"
                  columns={columns}
                  dataSource={state.records}
                  loading={state.loading}
                  pagination={false}
                  size="small"
                />
              </>
            ),
            footer: () => (
              <Page
                current={query.pageNumber}
                pageSize={query.pageSize}
                total={state.total}
                onPageChange={(page: number, size: number) => {
                  query.pageNumber = page;
                  query.pageSize = size;
                  void load();
                }}
                onShowSizeChange={(page: number, size: number) => {
                  query.pageNumber = page;
                  query.pageSize = size;
                  void load();
                }}
              />
            ),
          }}
        </PageFrame>
      );
    },
  });
}
