import type { OfficialRow } from "@g2-contract/government-management";
import { Button, PageLayout, type PcTableColumn, TabPane, Tabs, message, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getGovernmentClient } from "../domain-context";
import { menuPath } from "../menu-data";
import { can, dateTime, display, errorText } from "./shared";

import styles from "./page.module.css";

const BASIC = [
  ["督办事项", "workDesc"],
  ["督办任务下发人", "applicantName"],
  ["工作要求", "requirement"],
  ["责任部门", "deptName"],
  ["第一责任人", "firstUserName"],
  ["第二责任人", "secondUserName"],
  ["完成时限", "completeTime"],
];
const PROGRESS = [
  ["完成进度", "percentage"],
  ["完成时间", "applyDoneTime"],
  ["下一步工作描述", "nextWorkDesc"],
  ["未完成原因", "undoneReason"],
  ["需要协调的问题", "assistProblem"],
];
const SHANGHAI_BASIC = BASIC.filter(([, key]) => key !== "requirement");
const SHANGHAI_PROGRESS = [
  ["完成进度", "percentage"],
  ["完成时间", "applyDoneTime"],
  ["落实情况", "practicableDetails"],
];

export function createFocusDetailPage(shanghai: boolean) {
  const slug = shanghai ? "eventHandleListSH" : "eventHandleList";
  return defineComponent({
    name: shanghai ? "GovernmentFocusDetailShanghai" : "GovernmentFocusDetail",
    setup() {
      const route = useRoute();
      const router = useRouter();
      const active = ref("1");
      const detail = ref<OfficialRow>();
      const replies = ref<OfficialRow[]>([]);
      const columns: PcTableColumn[] = [
        { title: "姓名", dataIndex: "applicantName" },
        { title: "部门", dataIndex: "applicantDeptName" },
        { title: "反馈时间", dataIndex: "applyTime", customRender: ({ text }) => dateTime(text) },
        {
          title: "完成进度",
          dataIndex: "percentage",
          customRender: ({ text }) => (text !== undefined && text !== null ? `${text}%` : "--"),
        },
        { title: "反馈审批时间", dataIndex: "applyDoneTime", customRender: ({ text }) => dateTime(text) },
        ...[
          ["下一步工作描述", "nextWorkDesc"],
          ["未完成原因", "undoneReason"],
          ["需要协调的问题", "assistProblem"],
        ].map(([title, dataIndex]) => ({
          title,
          dataIndex,
          width: 220,
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => display(text),
        })),
      ];
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: "EVENT_HANDLE_REPLY",
        rowKey: "_rowKey",
        autoFetch: false,
        pagination: false,
      });
      onMounted(async () => {
        const id = String(route.query.id ?? "");
        if (!id) {
          return;
        }
        try {
          detail.value = await getGovernmentClient().getFocusWorkDetail(id);
        } catch (error) {
          message.error(errorText(error, "事项详情加载失败"));
        }
      });
      const loadReplies = async () => {
        const id = String(route.query.id ?? "");
        if (!id) {
          return;
        }
        tableApi.loading.value = true;
        try {
          replies.value = await getGovernmentClient().getFocusWorkReplies(id);
          tableApi.setDataSource(replies.value.map((row, index) => ({ ...row, _rowKey: String(row.id ?? row.applyTime ?? index) })));
        } catch (error) {
          message.error(errorText(error, "反馈记录加载失败"));
          tableApi.setDataSource([]);
        } finally {
          tableApi.loading.value = false;
        }
      };
      const focused = () => (detail.value?.focusWork ?? {}) as Record<string, unknown>;
      const reply = () => (detail.value?.focusWorkReply ?? {}) as Record<string, unknown>;
      const failure = () => (detail.value?.focusWorkFail ?? {}) as Record<string, unknown>;
      const failureFiles = () =>
        Array.isArray(failure().fileList)
          ? (failure().fileList as { id?: string; name?: string; path?: string; endpointPath?: string }[])
          : [];
      const renderFields = (fields: string[][], values: Record<string, unknown>) => (
        <div class={styles.detail}>
          {fields.map(([label, key]) => (
            <div class={styles.detailItem} key={key}>
              <span class={styles.detailLabel}>{label}：</span>
              <span>
                {key === "completeTime" || key === "applyDoneTime"
                  ? dateTime(values[key])
                  : key === "percentage" && values[key] !== undefined
                    ? `${values[key]}%`
                    : display(values[key])}
              </span>
            </div>
          ))}
        </div>
      );
      const canFeedback = () => {
        const row = focused();
        let userId = "";
        try {
          userId = String((JSON.parse(sessionStorage.getItem("GH-UserInfo") ?? "null") as { id?: unknown } | null)?.id ?? "");
        } catch {
          return false;
        }
        return (
          Boolean(userId) &&
          [row.firstUserId, row.secondUserId].some((value) =>
            String(value ?? "")
              .split(",")
              .includes(userId),
          ) &&
          row.status === "PROCESSING" &&
          can("official:eventHandle:feedback")
        );
      };
      return () => (
        <PageLayout
          title="事项详情"
          v-slots={{
            "layout-header": () => <Button onClick={() => globalThis.print()}>打印</Button>,
            "layout-content": () => (
              <Tabs
                activeKey={active.value}
                type="card"
                onChange={(key) => {
                  active.value = String(key);
                  if (String(key) === "2") {
                    void loadReplies();
                  }
                }}
              >
                <TabPane key="1" tab="事项信息">
                  <h3>基本信息</h3>
                  {renderFields(shanghai ? SHANGHAI_BASIC : BASIC, focused())}
                  <h3>当前处理情况</h3>
                  {renderFields(shanghai ? SHANGHAI_PROGRESS : PROGRESS, reply())}
                  {Object.keys(failure()).length > 0 && (
                    <>
                      <h3>未完成回复</h3>
                      {renderFields([["原因", "failReason"]], failure())}
                      <div class={styles.detailItem}>
                        <span class={styles.detailLabel}>文件：</span>
                        {failureFiles().length > 0 ? (
                          failureFiles().map((file) =>
                            file.endpointPath || file.path ? (
                              <a key={file.id} href={file.endpointPath || file.path} target="_blank" rel="noopener noreferrer">
                                {file.name ?? file.id ?? "附件"}
                              </a>
                            ) : (
                              <span key={file.id}>{file.name ?? file.id ?? "附件"}</span>
                            ),
                          )
                        ) : (
                          <span>--</span>
                        )}
                      </div>
                    </>
                  )}
                </TabPane>
                <TabPane key="2" tab="反馈记录">
                  <PcTable />
                </TabPane>
              </Tabs>
            ),
            "footer-page": () => (
              <div class={styles.footer}>
                <Button
                  onClick={() => void router.push(typeof route.query.returnPath === "string" ? route.query.returnPath : menuPath(slug))}
                >
                  返回
                </Button>
                {canFeedback() && (
                  <Button
                    type="primary"
                    onClick={() =>
                      void router.push({
                        path: `${menuPath(slug)}/flow-render`,
                        query: {
                          type: "add",
                          businessType: "OFFICIAL_FOCUS_WORK_REPLY",
                          businessKey: route.query.id,
                          title: "事项反馈",
                          returnPath: route.fullPath,
                        },
                      })
                    }
                  >
                    反馈
                  </Button>
                )}
              </div>
            ),
          }}
        />
      );
    },
  });
}
