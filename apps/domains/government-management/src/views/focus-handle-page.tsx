import type { FileClient, SceneFile } from "@g2-contract/file";
import type { OfficialRow, OptionItem } from "@g2-contract/government-management";
import {
  Button,
  Modal,
  Page,
  PageLayout,
  type PcFormSchemaProp,
  type PcTableColumn,
  Textarea,
  Upload,
  type UploadRequestOption,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getGovernmentClient, getGovernmentContext } from "../domain-context";
import { menuPath } from "../menu-data";
import { can, dateTime, display, download, errorText } from "./shared";

import styles from "./page.module.css";

const STATUS: Record<string, string> = { UNDONE: "未完成", STOP: "已终止", PROCESSING: "处理中", FINISH: "已完成" };

function currentUserId(): string {
  try {
    const value = JSON.parse(sessionStorage.getItem("GH-UserInfo") ?? "null") as { id?: unknown } | null;
    return String(value?.id ?? "");
  } catch {
    return "";
  }
}

function responsible(row: OfficialRow): boolean {
  const id = currentUserId();
  if (!id) {
    return false;
  }
  return [row.firstUserId, row.secondUserId].some((users) =>
    String(users ?? "")
      .split(",")
      .includes(id),
  );
}

export function createFocusHandlePage(shanghai: boolean) {
  const slug = shanghai ? "eventHandleListSH" : "eventHandleList";
  const title = shanghai ? "事项处理(上海)" : "事项处理";
  return defineComponent({
    name: shanghai ? "GovernmentFocusHandleShanghai" : "GovernmentFocusHandle",
    setup() {
      const route = useRoute();
      const router = useRouter();
      const filter = reactive<{ status?: string; deptId?: string; firstUserId?: string; period: string[]; keyword?: string }>({
        status: undefined,
        deptId: undefined,
        firstUserId: undefined,
        period: [],
        keyword: undefined,
      });
      const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const departments = ref<OptionItem[]>([]);
      const users = ref<OptionItem[]>([]);
      const exporting = ref(false);
      const replyOpen = ref(false);
      const replying = ref(false);
      const uploading = ref(false);
      const selected = ref<OfficialRow>();
      const failReason = ref("");
      const files = ref<SceneFile[]>([]);
      let version = 0;
      const fields = shanghai
        ? [
            { title: "类别", dataIndex: "workDesc" },
            { title: "完成内容", dataIndex: "requirement" },
            { title: "牵头领导", dataIndex: "leadLeaderUserName" },
            { title: "负责部门", dataIndex: "deptName" },
            { title: "落实情况", dataIndex: "practicableDetails" },
            { title: "完成时间", dataIndex: "completeTime" },
          ]
        : [
            { title: "督办事项", dataIndex: "workDesc" },
            { title: "督办任务下发人", dataIndex: "focusWorkStarter" },
            { title: "工作要求", dataIndex: "requirement" },
            { title: "责任部门", dataIndex: "deptName" },
            { title: "第一责任人", dataIndex: "firstUserName" },
            { title: "第二责任人", dataIndex: "secondUserName" },
            { title: "完成时限", dataIndex: "completeTimeStr" },
            { title: "变更后时限", dataIndex: "updateCompleteTimeStr" },
            { title: "事项状态", dataIndex: "status" },
            { title: "距超期", dataIndex: "timeLimitDesc" },
            { title: "完成进度情况", dataIndex: "percentage" },
          ];
      const columns: PcTableColumn[] = [
        ...(shanghai ? [{ title: "序号", dataIndex: "index", width: 70, customRender: ({ index }: { index: number }) => index + 1 }] : []),
        ...fields.map((field) => ({
          ...field,
          ellipsis: true,
          width: field.dataIndex === "workDesc" || field.dataIndex === "requirement" ? 200 : undefined,
          customRender: ({ text }: { text: unknown }) =>
            field.dataIndex === "status"
              ? (STATUS[String(text)] ?? display(text))
              : field.dataIndex === "percentage" && text !== undefined && text !== null
                ? `${text}%`
                : field.dataIndex === "completeTime"
                  ? dateTime(text)
                  : display(text),
        })),
        {
          title: "操作",
          dataIndex: "action",
          width: 190,
          fixed: "right",
          customRender: ({ record }) => {
            const row = record as OfficialRow;
            return (
              <>
                {can("official:eventHandle:details") && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      void router.push({ path: `${menuPath(slug)}/detail`, query: { id: row.id, returnPath: route.fullPath } })
                    }
                  >
                    详情
                  </Button>
                )}
                {can("official:eventHandle:feedback") && responsible(row) && row.status === "PROCESSING" && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      void router.push({
                        path: `${menuPath(slug)}/flow-render`,
                        query: {
                          type: "add",
                          businessType: "OFFICIAL_FOCUS_WORK_REPLY",
                          businessKey: row.id,
                          title: "事项反馈",
                          returnPath: route.fullPath,
                        },
                      })
                    }
                  >
                    反馈
                  </Button>
                )}
                {can("official:eventHandle:feedback") && responsible(row) && row.status === "UNDONE" && (
                  <Button type="link" size="small" onClick={() => void openReply(row)}>
                    回复
                  </Button>
                )}
              </>
            );
          },
        },
      ];
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: shanghai ? "EVENT_HANDLE_SH" : "EVENT_HANDLE",
        rowKey: "id",
        autoFetch: false,
        pagination: false,
      });
      const query = () => ({
        pageNumber: pager.pageNumber,
        pageSize: pager.pageSize,
        period: filter.period.join(","),
        status: filter.status ?? null,
        deptId: filter.deptId ?? null,
        firstUserId: filter.firstUserId ?? null,
        keyword: filter.keyword ?? null,
      });
      const load = async () => {
        const current = ++version;
        tableApi.loading.value = true;
        try {
          const result = await getGovernmentClient().pageFocusWork(query());
          if (current !== version) {
            return;
          }
          tableApi.setDataSource(result.records);
          pager.total = result.total;
        } catch (error) {
          if (current !== version) {
            return;
          }
          message.error(errorText(error, "事项处理加载失败"));
          tableApi.setDataSource([]);
          pager.total = 0;
        } finally {
          if (current === version) {
            tableApi.loading.value = false;
          }
        }
      };
      const schema = (): PcFormSchemaProp[] => [
        {
          component: "Select",
          fieldName: "status",
          label: "事项状态",
          componentProps: {
            placeholder: "请选择",
            allowClear: true,
            options: Object.entries(STATUS).map(([value, label]) => ({ value, label })),
          },
        },
        {
          component: "Select",
          fieldName: "deptId",
          label: "责任部门",
          componentProps: {
            placeholder: "请选择",
            allowClear: true,
            options: departments.value.map((row) => ({ value: row.id, label: row.name })),
          },
        },
        {
          component: "Select",
          fieldName: "firstUserId",
          label: "第一责任人",
          componentProps: {
            placeholder: "请选择",
            allowClear: true,
            options: users.value.map((row) => ({ value: row.id, label: row.name })),
          },
        },
        {
          component: "RangePicker",
          fieldName: "period",
          label: "完成时间",
          defaultValue: [],
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
        },
        { component: "Input", fieldName: "keyword", label: "", componentProps: { placeholder: "请输入事项名称", allowClear: true } },
      ];
      const [PcForm, formApi] = usePcForm({
        layout: "horizontal",
        schema: schema(),
        syncStateRef: filter,
        cache: true,
        showCollapseButton: false,
        handleSubmit(values) {
          filter.status = typeof values.status === "string" ? values.status : undefined;
          filter.deptId = typeof values.deptId === "string" ? values.deptId : undefined;
          filter.firstUserId = typeof values.firstUserId === "string" ? values.firstUserId : undefined;
          filter.keyword = typeof values.keyword === "string" ? values.keyword : undefined;
          filter.period = Array.isArray(values.period) ? values.period.map(String) : [];
          pager.pageNumber = 1;
          void load();
        },
        handleReset() {
          Object.assign(filter, { status: undefined, deptId: undefined, firstUserId: undefined, keyword: undefined, period: [] });
          pager.pageNumber = 1;
          void load();
        },
      });
      const openReply = async (row: OfficialRow) => {
        selected.value = row;
        failReason.value = "";
        files.value = [];
        replyOpen.value = true;
        try {
          const result = await getGovernmentClient().getFocusWorkFailure(row.id);
          failReason.value = String(result.failReason ?? "");
          files.value = Array.isArray(result.fileList) ? (result.fileList as SceneFile[]) : [];
        } catch {
          /* 没有既有回复时保持空表单。 */
        }
      };
      const upload = async (option: UploadRequestOption) => {
        uploading.value = true;
        try {
          const file = option.file as File;
          const client = await getGovernmentContext().ensureClient<FileClient>("fileClient");
          const result = await client.uploadSceneFile({
            file,
            businessKey: String(selected.value?.id ?? "government-management"),
            sceneCode: "FOCUS_WORK_FAIL",
            useTemporary: true,
          });
          files.value = [...files.value, result];
          option.onSuccess?.(result, option.file as unknown as XMLHttpRequest);
        } catch (error) {
          message.error(errorText(error, "附件上传失败"));
          option.onError?.(error instanceof Error ? error : new Error("附件上传失败"));
        } finally {
          uploading.value = false;
        }
      };
      const saveReply = async () => {
        if (!selected.value || !failReason.value.trim()) {
          message.warning("请输入未完成原因");
          return;
        }
        replying.value = true;
        try {
          if (files.value.length > 0) {
            await (
              await getGovernmentContext().ensureClient<FileClient>("fileClient")
            ).persistSceneFiles(
              "FOCUS_WORK_FAIL",
              files.value.map((file) => file.id),
            );
          }
          await getGovernmentClient().replyFocusWork({
            focusWorkId: selected.value.id,
            failReason: failReason.value.trim(),
            fileIds: files.value.map((file) => file.id).join(","),
          });
          message.success("回复成功");
          replyOpen.value = false;
          void load();
        } catch (error) {
          message.error(errorText(error, "回复失败"));
        } finally {
          replying.value = false;
        }
      };
      const exportFile = async () => {
        exporting.value = true;
        try {
          download(await getGovernmentClient().exportFocusWork(query()), `${title}.xlsx`);
        } catch (error) {
          message.error(errorText(error, "导出失败"));
        } finally {
          exporting.value = false;
        }
      };
      onMounted(async () => {
        void load();
        try {
          departments.value = await getGovernmentClient().listOrganizations();
          users.value = await getGovernmentClient().listFirstUsers();
          formApi.updateSchema(schema());
        } catch (error) {
          message.error(errorText(error, "筛选选项加载失败"));
        }
      });
      return () => (
        <>
          <PageLayout
            title={title}
            v-slots={{
              "layout-header": () =>
                shanghai ? (
                  <Button type="primary" loading={exporting.value} onClick={() => void exportFile()}>
                    导出
                  </Button>
                ) : null,
              "layout-content": () => (
                <div class={styles.content}>
                  <div class={styles.filterRow}>
                    <PcForm />
                  </div>
                  <PcTable />
                </div>
              ),
              "footer-page": () =>
                pager.total > 0 ? (
                  <Page
                    current={pager.pageNumber}
                    pageSize={pager.pageSize}
                    total={pager.total}
                    cachePageQuery={true}
                    onPageChange={(number: number, size: number) => {
                      pager.pageNumber = number;
                      pager.pageSize = size;
                      void load();
                    }}
                  />
                ) : null,
            }}
          />
          <Modal
            open={replyOpen.value}
            title="回复"
            width={600}
            confirmLoading={replying.value}
            onOk={() => void saveReply()}
            onCancel={() => {
              replyOpen.value = false;
            }}
          >
            <p>督办事项：{display(selected.value?.workDesc)}</p>
            <p>完成进度情况：{selected.value?.percentage ? `${selected.value.percentage}%` : "--"}</p>
            <p>状态：{STATUS[String(selected.value?.status)] ?? "--"}</p>
            <div style="margin:16px 0">
              <span>附件：</span>
              <Upload multiple showUploadList={false} customRequest={(option: UploadRequestOption) => void upload(option)}>
                <Button loading={uploading.value}>上传附件</Button>
              </Upload>
              {files.value.map((file) => (
                <div key={file.id}>
                  {file.name ?? file.id}{" "}
                  <Button
                    type="link"
                    danger
                    onClick={() => {
                      files.value = files.value.filter((item) => item.id !== file.id);
                    }}
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
            <label>
              未完成原因{" "}
              <Textarea
                value={failReason.value}
                maxlength={200}
                rows={5}
                placeholder="请输入事项描述"
                onUpdate:value={(value: string) => {
                  failReason.value = value.replace(/\s+/gu, "");
                }}
              />
            </label>
          </Modal>
        </>
      );
    },
  });
}
