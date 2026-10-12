import type { Recording } from "@g2-contract/command-dispatch";
import type { ColumnType } from "@g2-platform/pc-ui/types";
import { defineComponent, h, onMounted, reactive } from "vue";

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
  RangePicker,
  Select,
  Table,
} from "../../pc-ui-runtime";
import { type PageState, createPageLoader, parsePageValue, recordingQuery, restorePeriod } from "./list-state";
import { ListError, formatTime } from "./list-ui";

import styles from "./list.module.css";

export const RadioRecord = defineComponent({
  name: "CommandDispatchRadioRecord",
  setup() {
    const client = getCommandDispatchClient();
    const query = getCommandDispatchPcUi().usePcQueryState({
      initialState: { code: "", fileType: "video", period: "", pageNumber: 1, pageSize: 10 },
      storage: "url",
      cacheFields: ["code", "fileType", "period", "pageNumber", "pageSize"],
      resolveValue: parsePageValue,
    });
    const state = reactive<PageState<Recording>>({ loading: false, error: "", records: [], total: 0 });
    const load = createPageLoader(state);
    const getList = (): Promise<void> => {
      query.update({});
      return load(() => client.pageRecordings(recordingQuery(query.getSnapshot())));
    };
    const search = (): void => {
      query.update({ pageNumber: 1 });
      void getList();
    };
    const reset = (): void => {
      query.update({ code: "", fileType: "video", period: "", pageNumber: 1 });
      void getList();
    };
    const play = (record: Recording): void => {
      if (!record.url) {
        void message.warning("音频合成中请稍后再试");
        return;
      }
      try {
        const url = new URL(record.url, globalThis.location.href);
        if (!/^https?:$/.test(url.protocol) || !/\.(mp3|mp4)$/i.test(url.pathname)) {
          void message.warning("音频合成中请稍后再试");
          return;
        }
        window.open(url.href, "_blank", "noopener,noreferrer");
      } catch {
        void message.warning("录音地址无效，请稍后重试");
      }
    };
    const columns: ColumnType<Recording>[] = [
      { title: "主叫", dataIndex: "caller", key: "caller", width: 170 },
      { title: "被叫", dataIndex: "callee", key: "callee", width: 170 },
      {
        title: "呼叫类型",
        key: "type",
        width: 130,
        customRender: ({ record }) => (record.type === "voice" ? "语音呼叫" : record.type === "video" ? "视频呼叫" : "--"),
      },
      { title: "开始时间", key: "fileCreateTime", width: 190, customRender: ({ record }) => formatTime(record.fileCreateTime) },
      { title: "结束时间", key: "fileEndTime", width: 190, customRender: ({ record }) => formatTime(record.fileEndTime) },
      {
        title: "操作",
        key: "actions",
        width: 100,
        customRender: ({ record }) => (
          <Button type="link" onClick={() => play(record)}>
            播放
          </Button>
        ),
      },
    ];
    onMounted(() => {
      void getList();
    });
    return () => (
      <PageFrame title="录音记录">
        {{
          search: () => (
            <Form layout="inline" class={styles.queryForm} onFinish={search}>
              <FormItem label="时间段">
                {h(RangePicker, {
                  value: restorePeriod(query.state.period),
                  valueFormat: "YYYY-MM-DD",
                  onChange: (_value: unknown, dates: [string, string]) => {
                    query.state.period = dates.every(Boolean) ? dates.join(",") : "";
                  },
                })}
              </FormItem>
              <FormItem label="呼叫类型">
                <Select
                  class={styles.callType}
                  allowClear
                  placeholder="全部类型"
                  value={query.state.fileType === "all" ? undefined : query.state.fileType}
                  options={[
                    { label: "语音呼叫", value: "voice" },
                    { label: "视频呼叫", value: "video" },
                  ]}
                  onChange={(value) => {
                    query.state.fileType = typeof value === "string" ? value : "all";
                  }}
                />
              </FormItem>
              <FormItem>
                <Input class={styles.queryInput} aria-label="号码搜索" placeholder="号码搜索" allowClear v-model:value={query.state.code} />
              </FormItem>
              <FormItem>
                <div class={styles.buttons}>
                  <Button type="primary" htmlType="submit" loading={state.loading}>
                    查询
                  </Button>
                  <Button onClick={reset} disabled={state.loading}>
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
                scroll={{ x: 950 }}
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
    );
  },
});
