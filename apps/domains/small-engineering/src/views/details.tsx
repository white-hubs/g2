import type { SmallEngineeringRecord } from "@g2-client/small-engineering/client";
import type { FileClient, SceneFile } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import {
  Button,
  DatePicker,
  Form,
  FormItem,
  Image,
  ImagePreviewGroup,
  Input,
  Modal,
  Page,
  PageLayout,
  RangePicker,
  Select,
  Spin,
  TabPane,
  Tabs,
  Textarea,
  Upload,
  message,
  usePcTable,
} from "@g2-platform/pc-ui";
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { records } from "@/components/patrol-content";
import { useScheduleAction } from "@/components/schedule-action";
import { taskStatus } from "@/components/task-progress";
import { getPatrolClient, getSmallEngineeringClient, getSmallEngineeringContext } from "@/domain-context";

const BASE = "/d/small-engineering";
const BUSINESS_TYPE = "SMALL_ENGINEERING";
const show = (value: unknown): string => (value === undefined || value === null || value === "" ? "--" : String(value));
const asObject = (value: unknown): SmallEngineeringRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as SmallEngineeringRecord) : {};
const dateText = (value: unknown): string => {
  if (!value) {
    return "--";
  }
  const time = new Date(value as string | number);
  return Number.isNaN(time.getTime()) ? String(value) : time.toLocaleString("zh-CN", { hour12: false });
};
const section = (title: string) => <h3 style={{ margin: "20px 0 12px", borderLeft: "3px solid #1677ff", paddingLeft: "8px" }}>{title}</h3>;
const field = (label: string, value: unknown) => (
  <div style={{ display: "flex", padding: "8px 0", minWidth: "260px" }}>
    <span style={{ color: "#888", minWidth: "110px" }}>{label}：</span>
    <span>{show(value)}</span>
  </div>
);

export const ManageDetail = defineComponent({
  name: "SmallEngineeringManageDetail",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const client = getSmallEngineeringClient();
    const loading = ref(false);
    const detail = ref<SmallEngineeringRecord>({});
    const tracks = ref<SmallEngineeringRecord[]>([]);
    const feedbackOpen = ref(false);
    const feedbackLoading = ref(false);
    const feedback = ref<SmallEngineeringRecord>({});
    const feedbackTitle = ref("反馈详情");
    let feedbackVersion = 0;
    const load = async () => {
      const id = String(route.query.id ?? "");
      if (!id) {
        message.error("缺少工程 ID");
        return;
      }
      loading.value = true;
      try {
        detail.value = await client.getProjectDetail(id);
        const scheduleId = String(detail.value.scheduleId ?? "");
        tracks.value = scheduleId ? await client.listScheduleTracks(scheduleId) : [];
      } catch (error) {
        message.error(error instanceof Error ? error.message : "获取工程详情失败");
      } finally {
        loading.value = false;
      }
    };
    const openFeedback = async (id: string, title: string) => {
      const current = ++feedbackVersion;
      feedbackOpen.value = true;
      feedbackTitle.value = `${title}详情`;
      feedback.value = {};
      feedbackLoading.value = true;
      try {
        const value = await client.getFeedbackDetail(id);
        if (current === feedbackVersion && feedbackOpen.value) {
          feedback.value = value;
        }
      } catch (error) {
        if (current === feedbackVersion) {
          message.error(error instanceof Error ? error.message : "获取反馈详情失败");
        }
      } finally {
        if (current === feedbackVersion) {
          feedbackLoading.value = false;
        }
      }
    };
    const openFlow = (item: SmallEngineeringRecord, businessType: string) => {
      const processInstanceId = String(item.processInsId ?? "");
      if (!processInstanceId) {
        return;
      }
      void router.push({
        path: `${BASE}/${businessType === "PROJECT_APPLY" ? "request-flow" : "approve-flow"}`,
        query: { processInstanceId, businessType, currentTaskId: "", status: "ACTIVE", type: "detail" },
      });
    };
    onMounted(() => {
      void load();
    });
    const trackColumns = (code: string, title: string) => [
      { title: `${title}时间`, dataIndex: "recordTime", customRender: ({ text }: { text: unknown }) => dateText(text) },
      { title: `${title}人`, dataIndex: "username" },
      ...(code === "FEEDBACK" ? [{ title: "反馈部门", dataIndex: "depName" }] : []),
      {
        title: code === "FEEDBACK" ? "工程进度" : "验收结果",
        dataIndex: code === "FEEDBACK" ? "feedbackContent" : "acceptanceResult",
        customRender: ({ text }: { text: unknown }) => (code === "FEEDBACK" ? `${text ?? 0}%` : text === "QUALIFIED" ? "合格" : "不合格"),
      },
      {
        title: "操作",
        dataIndex: "action",
        customRender: ({ record: row }: { record: SmallEngineeringRecord }) => (
          <Button
            type="link"
            onClick={() => {
              void openFeedback(String(row.id), title);
            }}
          >
            详情
          </Button>
        ),
      },
    ];
    const [TrackTable, trackApi] = usePcTable({
      columns: trackColumns("FEEDBACK", "反馈"),
      rowKey: "id",
      tableCode: "SMALL_ENGINEERING_MANAGE_FEEDBACK",
      autoFetch: false,
      autoScrollY: false,
    });
    const [CheckTable, checkApi] = usePcTable({
      columns: trackColumns("CHECK_ACCEPT", "验收"),
      rowKey: "id",
      tableCode: "SMALL_ENGINEERING_MANAGE_ACCEPTANCE",
      autoFetch: false,
      autoScrollY: false,
    });
    watch(tracks, (value) => {
      trackApi.setDataSource(value.filter((item) => item.operationCode === "FEEDBACK"));
      checkApi.setDataSource(value.filter((item) => item.operationCode === "CHECK_ACCEPT"));
    });
    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div style={{ minHeight: "360px", padding: "12px 0" }}>
            <h2>小散工程名称：{show(detail.value.projectName)}</h2>
            {section("工程请示")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {field("发起人", asObject(detail.value.apply).username)}
              {field("发起部门", asObject(detail.value.apply).depName)}
              {field("通过时间", dateText(asObject(detail.value.apply).passTime))}
              <Button type="link" onClick={() => openFlow(asObject(detail.value.apply), "PROJECT_APPLY")}>
                请示工单：{show(asObject(detail.value.apply).orderNumber)}
              </Button>
            </div>
            {section("工程签约")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {field("发起人", asObject(detail.value.signing).username)}
              {field("发起部门", asObject(detail.value.signing).depName)}
              {field("通过时间", dateText(asObject(detail.value.signing).passTime))}
              <Button type="link" onClick={() => openFlow(asObject(detail.value.signing), "PROJECT_SIGN_CONTRACT")}>
                签约工单：{show(asObject(detail.value.signing).orderNumber)}
              </Button>
            </div>
            {detail.value.scheduleId && (
              <>
                {section("工程施工")}
                <TrackTable />
                {section("工程验收")}
                <CheckTable />
              </>
            )}
          </div>
        </Spin>
      ),
      "footer-page": () => (
        <Button
          onClick={() => {
            void router.push(`${BASE}/manage`);
          }}
        >
          返回
        </Button>
      ),
    };
    return () => (
      <>
        <PageLayout title="工程详情" v-slots={slots} />
        <Modal
          open={feedbackOpen.value}
          title={feedbackTitle.value}
          footer={null}
          onCancel={() => {
            ++feedbackVersion;
            feedbackOpen.value = false;
          }}
        >
          <Spin spinning={feedbackLoading.value}>
            <div style={{ minHeight: "160px" }}>
              {field("当前工程进度", feedback.value.schedule != null ? `${feedback.value.schedule}%` : "--")}
              {field("描述", feedback.value.description)}
              {field("问题描述", feedback.value.problemDes)}
              {Array.isArray(feedback.value.problemFileList) &&
                (feedback.value.problemFileList as SmallEngineeringRecord[]).map((item) => (
                  <a href={String(item.path ?? "#")} target="_blank" rel="noreferrer">
                    {show(item.name)}
                  </a>
                ))}
            </div>
          </Spin>
        </Modal>
      </>
    );
  },
});

interface SuperviseForm {
  projectName: string;
  typeId?: string;
  completionTime?: string;
  duration?: string[];
  constructB: string;
  partyB: string;
  partyBMobile: string;
  constructionSite: string;
  stallCode: string;
  stallLiaison: string;
  stallMobile: string;
  superviseUsers: string[];
  safetyDockUserId: string[];
  superviseDep: string[];
  remarks: string;
  files: SceneFile[];
}
const emptySupervise = (): SuperviseForm => ({
  projectName: "",
  typeId: undefined,
  completionTime: undefined,
  duration: undefined,
  constructB: "",
  partyB: "",
  partyBMobile: "",
  constructionSite: "",
  stallCode: "",
  stallLiaison: "",
  stallMobile: "",
  superviseUsers: [],
  safetyDockUserId: [],
  superviseDep: [],
  remarks: "",
  files: [],
});
function createSuperviseDetail(readonly: boolean) {
  return defineComponent({
    name: readonly ? "SmallEngineeringSuperviseDetail" : "SmallEngineeringEditSupervise",
    setup() {
      const route = useRoute();
      const router = useRouter();
      const client = getSmallEngineeringClient();
      const context = getSmallEngineeringContext();
      const loading = ref(false);
      const saving = ref(false);
      const uploading = ref(false);
      const record = ref<SmallEngineeringRecord>({});
      const tracks = ref<SmallEngineeringRecord[]>([]);
      const form = reactive<SuperviseForm>(emptySupervise());
      const types = ref<{ label: string; value: string }[]>([]);
      const organizations = ref<{ label: string; value: string }[]>([]);
      const users = ref<{ label: string; value: string }[]>([]);
      const id = computed(() => String(route.query.id ?? ""));
      const edit = !readonly;
      const activeTab = ref("info");
      const historyPage = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const archive = ref<SmallEngineeringRecord>({});
      let historyVersion = 0;
      const { ActionModal, openModal } = useScheduleAction(async () => {
        await load();
      });
      const feedbackOpen = ref(false);
      const feedbackLoading = ref(false);
      const feedback = ref<SmallEngineeringRecord>({});
      let feedbackVersion = 0;
      const openFeedback = async (feedbackId: string) => {
        const current = ++feedbackVersion;
        feedbackOpen.value = true;
        feedback.value = {};
        feedbackLoading.value = true;
        try {
          const result = await client.getFeedbackDetail(feedbackId);
          if (current === feedbackVersion) {
            feedback.value = result;
          }
        } catch (error) {
          if (current === feedbackVersion) {
            message.error(error instanceof Error ? error.message : "反馈详情加载失败");
          }
        } finally {
          if (current === feedbackVersion) {
            feedbackLoading.value = false;
          }
        }
      };
      const [ProgressTable, progressApi] = usePcTable({
        rowKey: "id",
        tableCode: "SMALL_ENGINEERING_FEEDBACK",
        autoFetch: false,
        autoScrollY: false,
        columns: [
          { title: "反馈时间", dataIndex: "recordTime", customRender: ({ text }) => dateText(text) },
          { title: "反馈人", dataIndex: "username" },
          { title: "反馈部门", dataIndex: "depName" },
          { title: "当前进度", dataIndex: "feedbackContent" },
          {
            title: "操作",
            dataIndex: "action",
            customRender: ({ record: row }) => (
              <Button
                type="link"
                onClick={() => {
                  void openFeedback(String(row.id));
                }}
              >
                详情
              </Button>
            ),
          },
        ],
      });
      const [AcceptanceTable, acceptanceApi] = usePcTable({
        rowKey: "id",
        tableCode: "SMALL_ENGINEERING_ACCEPTANCE",
        autoFetch: false,
        autoScrollY: false,
        columns: [
          { title: "验收时间", dataIndex: "recordTime", customRender: ({ text }) => dateText(text) },
          { title: "验收人", dataIndex: "username" },
          { title: "验收部门", dataIndex: "depName" },
          { title: "验收结果", dataIndex: "checkAcceptContent" },
          {
            title: "操作",
            dataIndex: "action",
            customRender: ({ record: row }) => (
              <Button
                type="link"
                onClick={() => {
                  void openFeedback(String(row.id));
                }}
              >
                详情
              </Button>
            ),
          },
        ],
      });
      const [PatrolTable, patrolApi] = usePcTable({
        rowKey: "id",
        tableCode: "SMALL_ENGINEERING_ARCHIVE_RECORDS",
        autoFetch: false,
        columns: [
          { title: "巡查时间", dataIndex: "time", customRender: ({ text }) => dateText(text) },
          { title: "巡查人", dataIndex: "username" },
          { title: "巡查部门", dataIndex: "organizationName" },
          { title: "任务状态", dataIndex: "status", customRender: ({ text }) => taskStatus[String(text)] ?? "--" },
          {
            title: "巡查任务结果",
            dataIndex: "result",
            customRender: ({ text }) => (text === "NORMAL" ? "正常" : text === "ABNORMAL" ? "异常" : "--"),
          },
          { title: "所属任务", dataIndex: "taskName" },
          {
            title: "操作",
            dataIndex: "action",
            customRender: ({ record: row }) => (
              <Button
                type="link"
                onClick={() => {
                  void router.push({ path: `${BASE}/engineering-patrol-record-info`, query: { id: String(row.id) } });
                }}
              >
                详情
              </Button>
            ),
          },
        ],
      });
      const [ReformTable, reformApi] = usePcTable({
        rowKey: "processInstanceId",
        tableCode: "SMALL_ENGINEERING_REFORM_RECORDS",
        autoFetch: false,
        columns: [
          { title: "编号", dataIndex: "reformNum" },
          { title: "名称", dataIndex: "instanceName" },
          { title: "时间", dataIndex: "createTime", customRender: ({ text }) => dateText(text) },
          { title: "发起人", dataIndex: "startUserName" },
          {
            title: "状态",
            dataIndex: "status",
            customRender: ({ text }) =>
              ({
                SUBMIT: "提交",
                UNDO: "撤销",
                REPEAT: "重新提交",
                APPROVAL: "审批",
                BACK: "撤回",
                COPY: "抄送",
                REJECT: "驳回",
                FINISHED: "完成",
              })[String(text)] ?? "处理中",
          },
          {
            title: "操作",
            dataIndex: "action",
            customRender: ({ record: row }) => (
              <Button
                type="link"
                onClick={() => {
                  void router.push({
                    path: `${BASE}/correction-flow`,
                    query: {
                      businessType: "PROJECT_REFORM",
                      processInstanceId: String(row.processInstanceId),
                      currentTaskId: String(row.currentTaskId ?? ""),
                      status: String(row.status),
                      type: "detail",
                    },
                  });
                }}
              >
                详情
              </Button>
            ),
          },
        ],
      });
      const loadHistory = async () => {
        const current = ++historyVersion;
        const api = activeTab.value === "patrol" ? patrolApi : reformApi;
        api.loading.value = true;
        try {
          if (activeTab.value === "patrol") {
            const patrol = getPatrolClient();
            const [summary, rows] = await Promise.all([
              patrol.getArchive({ targetId: id.value, businessType: BUSINESS_TYPE }),
              patrol.listArchiveRecords({
                pageNumber: historyPage.pageNumber,
                pageSize: historyPage.pageSize,
                targetId: id.value,
                temporary: "0",
                businessType: BUSINESS_TYPE,
              }),
            ]);
            if (current !== historyVersion) {
              return;
            }
            archive.value = summary;
            api.setDataSource(rows.records);
            historyPage.total = rows.total;
          } else {
            const rows = await client.listReforms({
              pageNumber: historyPage.pageNumber,
              pageSize: historyPage.pageSize,
              projectScheduleId: id.value,
              businessType: "PROJECT_REFORM",
              processInstanceIds: "",
            });
            if (current !== historyVersion) {
              return;
            }
            api.setDataSource(rows.records);
            historyPage.total = rows.total;
          }
        } catch (error) {
          if (current === historyVersion) {
            message.error(error instanceof Error ? error.message : "记录加载失败");
          }
        } finally {
          api.loading.value = false;
        }
      };
      const load = async (): Promise<void> => {
        loading.value = true;
        try {
          const [typeList, orgList] = await Promise.all([client.listProjectTypes(), client.listOrganizations()]);
          types.value = typeList.map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }));
          organizations.value = orgList.map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }));
          const ouaa = await context.ensureClient<OuaaClient>("ouaaClient");
          const userPage = await ouaa.listUsers({ pageNumber: 1, pageSize: 1000 });
          users.value = userPage.records.map((item) => ({ label: item.name, value: item.id }));
          if (id.value) {
            const detail = await client.getScheduleDetail(id.value);
            record.value = detail;
            Object.assign(form, {
              projectName: String(detail.projectName ?? ""),
              typeId: String(detail.projectType ?? "") || undefined,
              completionTime: detail.completionTime
                ? new Date(detail.completionTime as string | number).toISOString().slice(0, 10)
                : undefined,
              duration: typeof detail.duration === "string" ? detail.duration.split(",") : undefined,
              constructB: String(detail.constructB ?? ""),
              partyB: String(detail.partyB ?? ""),
              partyBMobile: String(detail.partyBMobile ?? ""),
              constructionSite: String(detail.constructionSite ?? ""),
              stallCode: String(detail.stallCode ?? ""),
              stallLiaison: String(detail.stallLiaison ?? ""),
              stallMobile: String(detail.stallMobile ?? ""),
              superviseUsers: Array.isArray(detail.superviseUser)
                ? (detail.superviseUser as SmallEngineeringRecord[]).map((item) => String(item.id ?? ""))
                : [],
              safetyDockUserId: Array.isArray(detail.safetyDockUser)
                ? (detail.safetyDockUser as SmallEngineeringRecord[]).map((item) => String(item.id ?? ""))
                : [],
              superviseDep: Array.isArray(detail.superviseDepList)
                ? (detail.superviseDepList as SmallEngineeringRecord[]).map((item) => String(item.id ?? ""))
                : [],
              remarks: String(detail.remarks ?? ""),
              files: Array.isArray(detail.projectFiles) ? (detail.projectFiles as SceneFile[]) : [],
            });
            if (readonly) {
              tracks.value = await client.listScheduleTracks(id.value);
              progressApi.setDataSource(tracks.value.filter((item) => item.operationCode === "FEEDBACK"));
              acceptanceApi.setDataSource(tracks.value.filter((item) => item.operationCode !== "FEEDBACK"));
            }
          }
        } catch (error) {
          message.error(error instanceof Error ? error.message : "工程监管详情加载失败");
        } finally {
          loading.value = false;
        }
      };
      const uploadFile = async (options: {
        file: string | Blob;
        onSuccess?: (response: unknown) => void;
        onError?: (error: Error) => void;
      }): Promise<void> => {
        uploading.value = true;
        try {
          const fileClient = await context.ensureClient<FileClient>("fileClient");
          if (!(options.file instanceof Blob)) {
            throw new Error("请选择有效文件");
          }
          const file = options.file instanceof File ? options.file : new File([options.file], "附件");
          const uploaded = await fileClient.uploadSceneFile({ file, businessKey: "small-engineering", sceneCode: "SMALLENFINEERING" });
          form.files.push(uploaded);
          options.onSuccess?.(uploaded);
        } catch (error) {
          const failure = error instanceof Error ? error : new Error("上传失败");
          message.error(failure.message);
          options.onError?.(failure);
        } finally {
          uploading.value = false;
        }
      };
      const save = async (): Promise<void> => {
        if (saving.value || loading.value || uploading.value) {
          return;
        }
        if (
          !form.projectName.trim() ||
          !form.typeId ||
          !form.duration?.length ||
          !form.constructB.trim() ||
          !form.partyB.trim() ||
          !form.constructionSite.trim() ||
          form.superviseDep.length === 0
        ) {
          message.warning("请填写小散工程名称、类型、工期、建设方、施工方、施工地点和监管部门");
          return;
        }
        saving.value = true;
        try {
          const payload: SmallEngineeringRecord = {
            ...(id.value ? { id: id.value } : {}),
            projectName: form.projectName.trim(),
            typeId: form.typeId,
            completionTime: form.completionTime,
            duration: form.duration.join(","),
            constructB: form.constructB,
            partyB: form.partyB,
            partyBMobile: form.partyBMobile,
            constructionSite: form.constructionSite,
            stallCode: form.stallCode,
            stallLiaison: form.stallLiaison,
            stallMobile: form.stallMobile,
            superviseUsers: form.superviseUsers.join(","),
            safetyDockUserId: form.safetyDockUserId.join(","),
            superviseDep: form.superviseDep.join(","),
            remarks: form.remarks,
            projectFiles: form.files.map((item) => item.id).join(","),
          };
          if (id.value) {
            await client.updateSchedule(payload);
          } else {
            await client.saveSchedule(payload);
          }
          message.success("保存成功");
          void router.push(`${BASE}/supervise`);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
          saving.value = false;
        }
      };
      onMounted(() => {
        void load();
      });
      const item = (label: string, fieldName: keyof SuperviseForm, control: JSX.Element, required = false) => (
        <div style={{ width: "48%" }}>
          <FormItem label={label} name={fieldName} required={required}>
            {control}
          </FormItem>
        </div>
      );
      const input = (fieldName: keyof SuperviseForm, placeholder: string) => (
        <Input disabled={readonly} maxlength={50} v-model:value={form[fieldName]} placeholder={placeholder} />
      );
      const slots = {
        "layout-content": () => (
          <Spin spinning={loading.value}>
            <div style={{ minHeight: "480px" }}>
              {section("基本信息")}
              <Form model={form} labelCol={{ style: { width: "125px" } }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between" }}>
                  {item("小散工程名称", "projectName", input("projectName", "请输入小散工程名称"), true)}
                  {item(
                    "工程类型",
                    "typeId",
                    <Select disabled={readonly} v-model:value={form.typeId} options={types.value} placeholder="请选择工程类型" />,
                    true,
                  )}
                  {item(
                    "工程时间",
                    "completionTime",
                    <DatePicker disabled={readonly} v-model:value={form.completionTime} valueFormat="YYYY-MM-DD" />,
                  )}
                  {item(
                    "工期",
                    "duration",
                    <RangePicker disabled={readonly} v-model:value={form.duration} valueFormat="YYYY-MM-DD" />,
                    true,
                  )}
                  {item("建设方", "constructB", input("constructB", "请输入建设方"), true)}
                  {item("施工地点", "constructionSite", input("constructionSite", "请输入施工地点"), true)}
                  {item("施工方", "partyB", input("partyB", "请输入施工方"), true)}
                  {item("施工方联系方式", "partyBMobile", input("partyBMobile", "请输入施工方联系方式"))}
                  {item("档位号", "stallCode", input("stallCode", "请输入档位号"))}
                  {item("档位联系人", "stallLiaison", input("stallLiaison", "请输入档位联系人"))}
                  {item("档位联系方式", "stallMobile", input("stallMobile", "请输入档位联系方式"))}
                  {item(
                    "工程对接人",
                    "superviseUsers",
                    <Select
                      mode="multiple"
                      disabled={readonly}
                      v-model:value={form.superviseUsers}
                      options={users.value}
                      showSearch
                      placeholder="请选择工程对接人"
                    />,
                  )}
                  {item(
                    "安全对接人",
                    "safetyDockUserId",
                    <Select
                      mode="multiple"
                      disabled={readonly}
                      v-model:value={form.safetyDockUserId}
                      options={users.value}
                      showSearch
                      placeholder="请选择安全对接人"
                    />,
                  )}
                  {item(
                    "监管部门",
                    "superviseDep",
                    <Select
                      mode="multiple"
                      disabled={readonly}
                      v-model:value={form.superviseDep}
                      options={organizations.value}
                      showSearch
                      placeholder="请选择监管部门"
                    />,
                    true,
                  )}
                  {item(
                    "备注",
                    "remarks",
                    <Textarea disabled={readonly} maxlength={200} v-model:value={form.remarks} placeholder="请输入备注" />,
                  )}
                  <div style={{ width: "100%" }}>
                    <FormItem label="附件">
                      {!readonly && (
                        <Upload
                          multiple
                          showUploadList={false}
                          customRequest={uploadFile}
                          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx,.zip,.rar"
                        >
                          <Button loading={uploading.value}>上传附件</Button>
                        </Upload>
                      )}
                      <div>
                        {form.files.map((file) => (
                          <a
                            href={String(file.path ?? "#")}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: "inline-block", marginRight: "12px" }}
                          >
                            {show(file.name ?? file.id)}
                          </a>
                        ))}
                      </div>
                    </FormItem>
                  </div>
                </div>
              </Form>
              {readonly && (
                <>
                  {section("工程进度")}
                  <ProgressTable />
                  {section("工程结果")}
                  <AcceptanceTable />
                </>
              )}
            </div>
          </Spin>
        ),
        "footer-page": () => (
          <>
            <Button
              onClick={() => {
                void router.push(`${BASE}/supervise`);
              }}
            >
              返回
            </Button>
            {edit && (
              <Button
                type="primary"
                loading={saving.value}
                onClick={() => {
                  void save();
                }}
              >
                保存
              </Button>
            )}
          </>
        ),
      };
      const baseContent = slots["layout-content"];
      const baseFooter = slots["footer-page"];
      const finalSlots = {
        "layout-content": () => (
          <>
            {readonly && (
              <Tabs
                activeKey={activeTab.value}
                onChange={(key) => {
                  activeTab.value = String(key);
                  historyPage.pageNumber = 1;
                  historyPage.total = 0;
                  if (key !== "info") {
                    void loadHistory();
                  }
                }}
              >
                <TabPane key="info" tab="工程信息" />
                <TabPane key="patrol" tab="巡查记录" />
                <TabPane key="reform" tab="整改记录" />
              </Tabs>
            )}
            {activeTab.value === "info" ? (
              baseContent()
            ) : activeTab.value === "patrol" ? (
              <>
                <div style={{ display: "flex", gap: "24px", marginBottom: "16px" }}>
                  巡查次数：{show(archive.value.dailyNum)}次　巡检发现异常：{show(archive.value.dailyErrNum)}项
                </div>
                <PatrolTable />
              </>
            ) : (
              <ReformTable />
            )}
          </>
        ),
        "footer-page": () => (
          <>
            {activeTab.value !== "info" && (
              <Page
                current={historyPage.pageNumber}
                pageSize={historyPage.pageSize}
                total={historyPage.total}
                cachePageQuery={false}
                onPageChange={(page: number, size: number) => {
                  historyPage.pageNumber = page;
                  historyPage.pageSize = size;
                  void loadHistory();
                }}
              />
            )}
            {baseFooter()}
            {readonly && record.value.status === "进行中" && (
              <Button
                type="primary"
                onClick={() => {
                  void openModal("feedback", record.value);
                }}
              >
                反馈
              </Button>
            )}
            {readonly && record.value.status === "待验收" && (
              <Button
                type="primary"
                onClick={() => {
                  void openModal("accept", record.value);
                }}
              >
                验收
              </Button>
            )}
          </>
        ),
      };
      return () => (
        <>
          <PageLayout title={readonly ? "工程监管详情" : id.value ? "编辑工程监管" : "新增工程监管"} v-slots={finalSlots} />
          <ActionModal />
          <Modal
            open={feedbackOpen.value}
            title="反馈 / 验收详情"
            footer={null}
            onCancel={() => {
              ++feedbackVersion;
              feedbackOpen.value = false;
            }}
          >
            <Spin spinning={feedbackLoading.value}>
              {field("当前工程进度", feedback.value.schedule == null ? "--" : `${feedback.value.schedule}%`)}
              {field(
                "验收结果",
                feedback.value.acceptanceResult === "QUALIFIED"
                  ? "合格"
                  : feedback.value.acceptanceResult === "DISQUALIFICATION"
                    ? "不合格"
                    : "--",
              )}
              {field("描述", feedback.value.description)}
              {records(feedback.value.problemFileList).map((file) => (
                <div>
                  <a href={String(file.path)} target="_blank" rel="noreferrer">
                    {show(file.name)}
                  </a>
                </div>
              ))}
            </Spin>
          </Modal>
        </>
      );
    },
  });
}
export const SuperviseDetail = createSuperviseDetail(true);
export const EditSupervise = createSuperviseDetail(false);

export const PatrolRecordDetail = defineComponent({
  name: "SmallEngineeringPatrolRecordDetail",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const client = getPatrolClient();
    const loading = ref(false);
    const detail = ref<SmallEngineeringRecord>({});
    onMounted(() => {
      void (async () => {
        const id = String(route.query.id ?? "");
        if (!id) {
          return;
        }
        loading.value = true;
        try {
          detail.value = await client.getRecord(id, BUSINESS_TYPE);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "巡查记录详情加载失败");
        } finally {
          loading.value = false;
        }
      })();
    });
    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div style={{ minHeight: "360px" }}>
            {section("基本信息")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {field("发布时间", dateText(detail.value.createTime))}
              {field("巡检对象", detail.value.targetName)}
              <div>
                任务名称：
                <Button
                  type="link"
                  disabled={!detail.value.taskId}
                  onClick={() => {
                    void router.push({
                      path: `${BASE}/engineering-patrol-task-edit`,
                      query: { type: "info", id: String(detail.value.taskId) },
                    });
                  }}
                >
                  {show(detail.value.taskName)}
                </Button>
              </div>
              <div>
                巡检计划：
                <Button
                  type="link"
                  disabled={!detail.value.planId}
                  onClick={() => {
                    void router.push({
                      path: `${BASE}/engineering-patrol-plan-edit`,
                      query: { type: "info", id: String(detail.value.planId) },
                    });
                  }}
                >
                  {show(detail.value.planName)}
                </Button>
              </div>
              {field("巡检人员", detail.value.nickname)}
              {field("巡检时间", dateText(detail.value.time))}
              {field("状态", taskStatus[String(detail.value.status)] ?? "--")}
              {field("巡检结果", detail.value.result === "ABNORMAL" ? "异常" : detail.value.result === "NORMAL" ? "正常" : "--")}
            </div>
            {section("巡检结果")}
            {Array.isArray(detail.value.standardVOS) &&
              (detail.value.standardVOS as SmallEngineeringRecord[]).map((item) => (
                <div style={{ border: "1px solid #eee", padding: "12px", marginBottom: "8px" }}>
                  <strong>{show(item.standardName)}</strong>
                  {records(item.itemVOS).map((entry) => (
                    <div>
                      {field("巡检项", entry.itemName)}
                      <div style={{ color: entry.errorValueFlag ? "#ff4d4f" : "#00a870" }}>{field("结果", entry.itemResultName)}</div>
                      {field("描述信息", entry.errorDesc)}
                      {h(ImagePreviewGroup, null, {
                        default: () =>
                          records(entry.fileVOS).map((file) => (
                            <Image key={String(file.id)} width={100} height={100} src={String(file.path)} />
                          )),
                      })}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </Spin>
      ),
      "footer-page": () => (
        <Button
          onClick={() => {
            void router.push(`${BASE}/engineering-patrol-records`);
          }}
        >
          返回
        </Button>
      ),
    };
    return () => <PageLayout title="巡查记录详情" v-slots={slots} />;
  },
});

export const TemporaryPatrolDetail = defineComponent({
  name: "SmallEngineeringTemporaryPatrolDetail",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const client = getSmallEngineeringClient();
    const loading = ref(false);
    const detail = ref<SmallEngineeringRecord>({});
    onMounted(() => {
      void (async () => {
        const id = String(route.query.id ?? "");
        if (!id) {
          return;
        }
        loading.value = true;
        try {
          detail.value = await client.getTemporaryPatrol(id);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "临时巡查详情加载失败");
        } finally {
          loading.value = false;
        }
      })();
    });
    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div style={{ minHeight: "320px" }}>
            {section("基本信息")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {field("巡检对象", detail.value.projectName)}
              {field("巡检人员", detail.value.userName)}
              {field("巡检时间", dateText(detail.value.completeTime))}
              {field("巡检结果", detail.value.result === "NORMAL" ? "正常" : detail.value.result === "ABNORMAL" ? "异常" : "--")}
              {field("备注", detail.value.remarks)}
            </div>
            {Array.isArray(detail.value.imageFiles) &&
              (detail.value.imageFiles as SmallEngineeringRecord[]).map((item) => <Image width={80} src={String(item.path ?? "")} />)}
          </div>
        </Spin>
      ),
      "footer-page": () => (
        <Button
          onClick={() => {
            void router.push(`${BASE}/engineering-temporary-patrol-record`);
          }}
        >
          返回
        </Button>
      ),
    };
    return () => <PageLayout title="临时巡查详情" v-slots={slots} />;
  },
});
