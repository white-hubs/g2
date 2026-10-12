// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import type { BroadcastPlayRulePage } from "@g2-contract/broadcast-center";
import { defineComponent, reactive } from "vue";
import { useRouter } from "vue-router";

import { broadcastApi } from "@/api/server";
import { Button, Form, FormItem, Input, Page, PageLayout, PopConfirm, PopOver, Switch, message, usePcTable } from "@/pc-ui-runtime";
import { usePageName } from "@/utils";

const DETAILS_PATH = "/d/broadcast-center/broadcast-rule-details";

/** 广播规则列表 */
export const BroadcastCenterRuleList = defineComponent({
  name: "BroadcastCenterRuleList",
  setup: () => {
    const { pageTitle } = usePageName();
    const router = useRouter();
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const formState = reactive<{ keyword: string | undefined }>({ keyword: undefined });

    const goDetails = (type: string, id?: string): void => {
      router.push({
        path: DETAILS_PATH,
        query: id ? { type, id } : { type },
      });
    };

    const operationDelete = async (record: BroadcastPlayRulePage): Promise<void> => {
      await broadcastApi.deleteBroadcastPlayRule(record.id);
      tableApi.query();
      message.success("删除成功");
    };

    const handleChange = async (record: BroadcastPlayRulePage): Promise<void> => {
      await broadcastApi.broadcastPlayRuleEnabled(record.id, record.enabled);
      message.success("操作成功");
    };

    const columns = [
      {
        title: "序号",
        dataIndex: "",
        ellipsis: true,
        align: "center",
        width: 70,
        customRender: ({ index }: { index: number }): JSX.Element => <PopOver content={index + 1 || "--"}>{index + 1 || "--"}</PopOver>,
      },
      {
        title: "规则名称",
        dataIndex: "name",
        ellipsis: true,
        align: "center",
        width: 100,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "说明",
        dataIndex: "remark",
        align: "center",
        ellipsis: true,
        width: 600,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "开关",
        dataIndex: "enabled",
        align: "center",
        customRender: ({ record }: { record: BroadcastPlayRulePage }): JSX.Element => (
          <Switch
            checked={record.enabled}
            onUpdate:checked={(v: boolean) => {
              record.enabled = v;
              void handleChange(record);
            }}
          />
        ),
      },
      {
        title: "操作",
        dataIndex: "action",
        ellipsis: true,
        align: "center",
        width: 180,
        customRender: ({ record }: { record: BroadcastPlayRulePage }): JSX.Element => (
          <>
            <Button type="link" size="small" onClick={() => goDetails("info", record.id)}>
              详情
            </Button>
            <Button type="link" size="small" onClick={() => goDetails("edit", record.id)}>
              编辑
            </Button>
            {!record.defaulted && (
              <PopConfirm title="确认删除该项？" onConfirm={async () => operationDelete(record)}>
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </PopConfirm>
            )}
          </>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "BROADCAST_RULE_LIST",
      rowKey: "id",
      fetchApi: async () => {
        const result = await broadcastApi.broadcastPlayRulePage({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: formState.keyword || undefined,
        });
        return { total: result.total, pages: result.pages, records: result.records };
      },
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const queryForm = (): void => {
      page.pageNumber = 1;
      tableApi.query();
    };

    const reset = (): void => {
      page.pageNumber = 1;
      formState.keyword = undefined;
      tableApi.query();
    };

    const slots = {
      "layout-header": (): JSX.Element => (
        <div>
          <Button class="mr-16" type="primary" onClick={() => goDetails("add")}>
            新增
          </Button>
        </div>
      ),
      "layout-content": (): JSX.Element => (
        <>
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
          <PcTable />
        </>
      ),
      "footer-page": (): JSX.Element => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(pageNumber, pageSize) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            tableApi.query();
          }}
        />
      ),
    };

    return (): JSX.Element => <PageLayout title={pageTitle ?? "广播规则"} v-slots={slots} />;
  },
});
