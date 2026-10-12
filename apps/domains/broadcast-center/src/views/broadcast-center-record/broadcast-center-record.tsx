// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { defineComponent, reactive } from "vue";

import { Button, Form, FormItem, Input, Page, PageLayout, PopOver, getDayjs, usePcTable } from "@/pc-ui-runtime";

const dayjs = getDayjs();

import { broadcastApi } from "@/api/server";
import { usePageName } from "@/utils";

/** 广播记录 */
export const BroadcastCenterRecord = defineComponent({
  name: "BroadcastCenterRecord",
  setup: () => {
    const { pageTitle } = usePageName();
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const formState = reactive<{ keyword: string | undefined }>({ keyword: undefined });

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
        title: "广播时间",
        dataIndex: "broadcastTime",
        ellipsis: true,
        align: "center",
        width: 100,
        customRender: ({ text }: { text: string }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "";
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
      {
        title: "模板名称",
        dataIndex: "broadcastTemplateName",
        align: "center",
        width: 100,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "广播内容",
        dataIndex: "broadcastPlayContent",
        ellipsis: true,
        align: "center",
        width: 200,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "广播次数",
        dataIndex: "broadcastPlayNum",
        ellipsis: true,
        align: "center",
        width: 100,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "广播终端",
        dataIndex: "broadcastPlayDevices",
        ellipsis: true,
        align: "center",
        width: 100,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "操作人",
        dataIndex: "operatorByName",
        ellipsis: true,
        align: "center",
        width: 100,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "操作人部门",
        dataIndex: "operatorByDeptName",
        ellipsis: true,
        align: "center",
        width: 100,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "BROADCAST_RECORD",
      rowKey: "id",
      fetchApi: async () => {
        const result = await broadcastApi.broadcastPlayRecordPage({
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

    return (): JSX.Element => <PageLayout title={pageTitle ?? "广播记录"} v-slots={slots} />;
  },
});
