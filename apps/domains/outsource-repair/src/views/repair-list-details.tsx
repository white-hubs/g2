import type {
  OutsourceCompany,
  OutsourceProcessEvent,
  OutsourceReceipt,
  OutsourceReceiptEventLine,
  OutsourceTicketAssessment,
} from "@g2-client/outsource-repair/client";
import {
  Button,
  Empty,
  Form,
  FormItem,
  Image,
  ImagePreviewGroup as RawImagePreviewGroup,
  Modal,
  PageLayout,
  Radio,
  RadioGroup,
  Rate,
  Select,
  Spin,
  Textarea,
  message,
} from "@g2-platform/pc-ui";
import { computed, defineComponent, reactive, ref, watch, type DefineComponent } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ImageUpload } from "./image-upload";
import { ProcessEventModal } from "./process-event-modal";
import { ProcessSteps } from "./process-steps";
import { ProcessTaskModal } from "./process-task-modal";
import { getOutsourceRepairClient } from "@/domain-context";
import { formatDateTime } from "@/utils/date";

import styles from "./detail-form.module.css";

/** pc-ui 以 `Component` 导出预览组，JSX 需要带构造签名的组件类型。 */
const ImagePreviewGroup = RawImagePreviewGroup as unknown as DefineComponent;

type ModalKind = "" | "confirm" | "acceptance" | "assessment" | "check";

const MODAL_TITLE: Record<Exclude<ModalKind, "">, string> = {
  confirm: "确认委外维修",
  acceptance: "验收委外维修",
  assessment: "委外维修评价",
  check: "审批委外维修",
};

interface ConfirmDraft {
  confirmResult: string;
  outsourceCompanyId: string | undefined;
  outsourceModelId: string | undefined;
  applicationCheckProcessKey: string | undefined;
  acceptanceProcessKey: string | undefined;
  description: string;
  imageIdList: string[];
}

const emptyConfirmDraft = (): ConfirmDraft => ({
  confirmResult: "",
  outsourceCompanyId: undefined,
  outsourceModelId: undefined,
  applicationCheckProcessKey: undefined,
  acceptanceProcessKey: undefined,
  description: "",
  imageIdList: [],
});

interface AssessDraft {
  score: number;
  description: string;
  imageIdList: string[];
}

const emptyAssessDraft = (): AssessDraft => ({ score: 0, description: "", imageIdList: [] });

/** 旧 `views/repair/repairList/details.vue`。 */
export const OutsourceRepairReceiptDetails = defineComponent({
  name: "OutsourceRepairReceiptDetails",
  props: {
    /** 宿主可直接传入维修单 ID；未传时回落到路由 query.id（与旧页一致）。 */
    id: { type: String, default: "" },
  },
  setup(props) {
    const client = getOutsourceRepairClient();
    const route = useRoute();
    const router = useRouter();
    const detail = ref<OutsourceReceipt>({});
    const eventLine = ref<OutsourceReceiptEventLine>({});
    const assessment = ref<OutsourceTicketAssessment>({});
    const loading = ref(false);
    const saving = ref(false);
    const modalKind = ref<ModalKind>("");
    const confirmDraft = reactive<ConfirmDraft>(emptyConfirmDraft());
    const assessDraft = reactive<AssessDraft>(emptyAssessDraft());
    const companies = ref<OutsourceCompany[]>([]);
    const processOptions = ref<{ label: string; value: string }[]>([]);
    const eventOpen = ref(false);
    const eventId = ref("");
    let version = 0;

    const receiptId = computed(() => props.id || (typeof route.query.id === "string" ? route.query.id : ""));
    /** 流程弹窗使用维修单自身的待办任务，没有时回落到确认信息里的任务（旧页同逻辑）。 */
    const taskId = computed(() => String(detail.value.taskId ?? detail.value.confirmInfo?.taskId ?? ""));

    const loadAssessment = async (ticketId: string): Promise<void> => {
      try {
        assessment.value = (await client.getTicketAssessment(ticketId)) ?? {};
      } catch (error) {
        message.error(error instanceof Error ? error.message : "维修评价加载失败");
      }
    };

    const load = async (): Promise<void> => {
      if (!receiptId.value) {
        return;
      }
      const current = ++version;
      loading.value = true;
      try {
        const [receipt, line] = await Promise.all([client.getReceipt(receiptId.value), client.getReceiptEventLine(receiptId.value)]);
        if (current !== version) {
          return;
        }
        detail.value = receipt ?? {};
        eventLine.value = line ?? {};
        const ticketId = String(receipt?.ticketId ?? "");
        if (receipt?.status === "FINISHED" && receipt.confirmInfo?.confirmResult !== "NO_PROCESS" && ticketId) {
          await loadAssessment(ticketId);
        }
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : "委外维修单详情加载失败");
        }
      } finally {
        if (current === version) {
          loading.value = false;
        }
      }
    };

    watch(receiptId, () => void load(), { immediate: true });

    const loadConfirmOptions = async (): Promise<void> => {
      try {
        const [companyRows, processRows] = await Promise.all([client.listCompanies(), client.listProcessDefinitions()]);
        companies.value = companyRows;
        // 旧 g-select `field: { name: "label", key: "value" }`：流程下拉提交 key。
        processOptions.value = processRows.map((item) => ({ label: String(item.name ?? ""), value: String(item.key ?? "") }));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "委外确认选项加载失败");
      }
    };

    const companyOptions = computed(() =>
      companies.value.map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") })),
    );

    /** 委外模式随所选公司变化，来源是公司详情里的 `outsourceModel`。 */
    const modeOptions = computed(() => {
      const company = companies.value.find((item) => String(item.id ?? "") === confirmDraft.outsourceCompanyId);
      return (company?.outsourceModel ?? []).map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }));
    });

    watch(
      () => confirmDraft.outsourceCompanyId,
      () => {
        confirmDraft.outsourceModelId = undefined;
      },
    );

    const openModal = (kind: Exclude<ModalKind, "">): void => {
      modalKind.value = kind;
      if (kind === "confirm") {
        Object.assign(confirmDraft, emptyConfirmDraft());
        void loadConfirmOptions();
        return;
      }
      if (kind === "assessment") {
        Object.assign(assessDraft, emptyAssessDraft());
      }
    };

    const closeModal = (): void => {
      modalKind.value = "";
    };

    const submitConfirm = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      if (!confirmDraft.confirmResult) {
        message.warning("请选择确认结果");
        return;
      }
      if (confirmDraft.confirmResult === "CONFIRM_REPAIR") {
        if (!confirmDraft.outsourceCompanyId) {
          message.warning("请选择委外公司");
          return;
        }
        if (!confirmDraft.outsourceModelId) {
          message.warning("请选择委外模式");
          return;
        }
        if (!confirmDraft.applicationCheckProcessKey) {
          message.warning("请选择申请流程");
          return;
        }
        if (!confirmDraft.acceptanceProcessKey) {
          message.warning("请选择验收流程");
          return;
        }
      }
      saving.value = true;
      try {
        await client.confirmReceipt({
          applicationReceiptId: receiptId.value,
          confirmResult: confirmDraft.confirmResult,
          ...(confirmDraft.confirmResult === "CONFIRM_REPAIR"
            ? {
                outsourceCompanyId: confirmDraft.outsourceCompanyId,
                outsourceModelId: confirmDraft.outsourceModelId,
                applicationCheckProcessKey: confirmDraft.applicationCheckProcessKey,
                acceptanceProcessKey: confirmDraft.acceptanceProcessKey,
              }
            : {}),
          description: confirmDraft.description,
          imageIdList: [...confirmDraft.imageIdList],
        });
        message.success("操作成功");
        closeModal();
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "维修确认失败");
      } finally {
        saving.value = false;
      }
    };

    const submitAssessment = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      if (!assessDraft.score) {
        message.warning("请填写服务评价");
        return;
      }
      saving.value = true;
      try {
        await client.submitTicketAssessment({
          outsourceRepairTicketId: String(detail.value.ticketId ?? ""),
          score: assessDraft.score,
          description: assessDraft.description,
          imageIdList: [...assessDraft.imageIdList],
        });
        message.success("操作成功");
        closeModal();
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "维修评价提交失败");
      } finally {
        saving.value = false;
      }
    };

    const openEvent = (id: string): void => {
      eventId.value = id;
      eventOpen.value = true;
    };

    const goBack = (): void => {
      void router.back();
    };

    const field = (label: string, value: unknown, full = false): JSX.Element => (
      <div class={[styles.item, full ? styles.itemFull : ""]}>
        <span class={styles.label}>{label}</span>
        <span class={styles.value}>{value}</span>
      </div>
    );

    const orDash = (value: unknown): string => (value === undefined || value === null || value === "" ? "--" : String(value));

    const renderImages = (files: { id?: string; path?: string }[]): JSX.Element | string => {
      if (files.length === 0) {
        return "--";
      }
      return (
        <ImagePreviewGroup>
          <div class={styles.images}>
            {files.map((file, index) => (
              <Image key={file.id ?? index} width={100} height={100} src={file.path ?? ""} />
            ))}
          </div>
        </ImagePreviewGroup>
      );
    };

    /** 旧页节点标题：有 taskId 时前置处理人，动作用方括号包裹。 */
    const stepTitle = (event: OutsourceProcessEvent): string =>
      `${event.taskId ? String(event.createBy ?? "") : ""}【${event.action ?? ""}】`;

    const hasTask = (event: OutsourceProcessEvent): boolean => Boolean(event.taskId);

    const renderConfirmSection = (receipt: OutsourceReceipt): JSX.Element => {
      const confirmInfo = receipt.confirmInfo;
      const waiting = receipt.status === "WAITING_FOR_CONFIRM";
      const confirmedPerson = waiting
        ? (receipt.waitConfirmUsers ?? [])
            .map((item) => String(item.name ?? ""))
            .filter(Boolean)
            .join(",")
        : confirmInfo?.confirmUsername;
      return (
        <>
          <div class={styles.sectionTitle}>委外确认</div>
          <div class={styles.gridTwo}>
            {field("确认人员", orDash(confirmedPerson))}
            {waiting ? null : (
              <>
                {field(
                  "确认结果",
                  confirmInfo?.confirmResult ? (confirmInfo.confirmResult === "CONFIRM_REPAIR" ? "确认维修" : "暂不处理") : "--",
                )}
                {field("确认时间", orDash(confirmInfo?.confirmTime))}
                {confirmInfo?.confirmResult === "NO_PROCESS" ? null : (
                  <>
                    {field("委外单位", orDash(confirmInfo?.outsourceCompanyName))}
                    {field("委外模式", orDash(confirmInfo?.outsourceModelName))}
                    {field("申请流程", orDash(confirmInfo?.applicationCheckProcessName))}
                    {field("验收流程", orDash(confirmInfo?.acceptanceProcessName))}
                  </>
                )}
                {/* 旧页此处误取了 `outsourceModelName`；描述信息应读确认时提交的 `description`。 */}
                {field("描述信息", orDash(confirmInfo?.description), true)}
              </>
            )}
          </div>
        </>
      );
    };

    const renderProcessSections = (receipt: OutsourceReceipt): JSX.Element | null => {
      if (receipt.status === "WAITING_FOR_CONFIRM" || receipt.confirmInfo?.confirmResult === "NO_PROCESS") {
        return null;
      }
      const showHandle = receipt.status !== "WAITING_FOR_CHECK";
      const showAcceptance = showHandle && receipt.status !== "WAITING_FOR_RECEIVE" && receipt.status !== "WAITING_FOR_HANDLE";
      return (
        <>
          <div class={styles.sectionTitle}>维修申请</div>
          <ProcessSteps
            events={eventLine.value.checkProcessEvent ?? []}
            titleOf={stepTitle}
            detailVisible={hasTask}
            emptyText="暂无维修申请流程"
            onDetail={openEvent}
          />
          {showHandle ? (
            <>
              <div class={styles.sectionTitle}>维修处理</div>
              <ProcessSteps
                events={eventLine.value.handleProcessEvent ?? []}
                titleOf={stepTitle}
                detailVisible={hasTask}
                emptyText="暂无维修处理流程"
                onDetail={openEvent}
              />
            </>
          ) : null}
          {showAcceptance ? (
            <>
              <div class={styles.sectionTitle}>维修验收</div>
              <ProcessSteps
                events={eventLine.value.acceptanceProcessEvent ?? []}
                titleOf={stepTitle}
                detailVisible={hasTask}
                emptyText="暂无维修验收流程"
                onDetail={openEvent}
              />
              {receipt.status === "FINISHED" ? (
                <>
                  <div class={styles.sectionTitle}>维修评价</div>
                  <div class={styles.gridTwo}>
                    {field("服务评价", <Rate value={Number(assessment.value.score ?? 0)} disabled />)}
                    {field("评价描述", orDash(assessment.value.description), true)}
                    {field("评价照片", renderImages(assessment.value.imageList ?? []), true)}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </>
      );
    };

    const footerAction = (): JSX.Element | null => {
      const receipt = detail.value;
      if (receipt.isCanConfirm) {
        return (
          <Button type="primary" loading={loading.value} onClick={() => openModal("confirm")}>
            维修确认
          </Button>
        );
      }
      if (receipt.isCanAcceptance) {
        return (
          <Button type="primary" loading={loading.value} onClick={() => openModal("acceptance")}>
            验收审批
          </Button>
        );
      }
      if (receipt.isCanAssessment) {
        return (
          <Button type="primary" loading={loading.value} onClick={() => openModal("assessment")}>
            维修评价
          </Button>
        );
      }
      if (receipt.isCanCheck) {
        return (
          <Button type="primary" loading={loading.value} onClick={() => openModal("check")}>
            申请审批
          </Button>
        );
      }
      return null;
    };

    const slots = {
      "layout-content": () => {
        const receipt = detail.value;
        return (
          <Spin spinning={loading.value}>
            <div class={styles.detailForm}>
              <div class={styles.sectionTitle}>基础信息</div>
              <div class={styles.gridTwo}>
                {field("维修单编号", orDash(receipt.code))}
                {field("维修单名称", orDash(receipt.name))}
                {field("维修对象", orDash(receipt.deviceObjectName))}
                {field("异常时间", formatDateTime(receipt.faultTime))}
                {field("提交人员", orDash(receipt.submitUserName))}
                {field("提交时间", formatDateTime(receipt.createTime))}
                {field("维修原因", orDash(receipt.repairReason), true)}
                {field("附件图片", renderImages(receipt.files ?? []), true)}
              </div>
              {renderConfirmSection(receipt)}
              {renderProcessSections(receipt)}
              {receipt.code === undefined && !loading.value ? <Empty description="暂无委外维修单数据" /> : null}
            </div>
          </Spin>
        );
      },
      "footer-page": () => (
        <>
          <Button onClick={goBack}>返回</Button>
          {footerAction()}
        </>
      ),
    };

    return () => (
      <>
        <PageLayout title="委外维修单详情" v-slots={slots} />
        <Modal
          open={modalKind.value === "confirm"}
          title={MODAL_TITLE.confirm}
          centered
          okText="确定"
          cancelText="取消"
          confirmLoading={saving.value}
          onOk={() => void submitConfirm()}
          onCancel={closeModal}
        >
          <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
            <FormItem label="确认结果" required>
              <RadioGroup
                value={confirmDraft.confirmResult}
                onUpdate:value={(value: unknown) => {
                  confirmDraft.confirmResult = String(value ?? "");
                }}
              >
                <Radio value="CONFIRM_REPAIR">确认维修</Radio>
                <Radio value="NO_PROCESS">暂不处理</Radio>
              </RadioGroup>
            </FormItem>
            {confirmDraft.confirmResult === "CONFIRM_REPAIR" ? (
              <>
                <FormItem label="委外公司" required>
                  <Select
                    value={confirmDraft.outsourceCompanyId}
                    options={companyOptions.value}
                    placeholder="委外公司"
                    allowClear
                    onUpdate:value={(value: unknown) => {
                      confirmDraft.outsourceCompanyId = value === undefined ? undefined : String(value);
                    }}
                  />
                </FormItem>
                <FormItem label="委外模式" required>
                  <Select
                    value={confirmDraft.outsourceModelId}
                    options={modeOptions.value}
                    placeholder="委外模式"
                    allowClear
                    onUpdate:value={(value: unknown) => {
                      confirmDraft.outsourceModelId = value === undefined ? undefined : String(value);
                    }}
                  />
                </FormItem>
                <FormItem label="申请流程" required>
                  <Select
                    value={confirmDraft.applicationCheckProcessKey}
                    options={processOptions.value}
                    placeholder="申请流程"
                    allowClear
                    onUpdate:value={(value: unknown) => {
                      confirmDraft.applicationCheckProcessKey = value === undefined ? undefined : String(value);
                    }}
                  />
                </FormItem>
                <FormItem label="验收流程" required>
                  <Select
                    value={confirmDraft.acceptanceProcessKey}
                    options={processOptions.value}
                    placeholder="验收流程"
                    allowClear
                    onUpdate:value={(value: unknown) => {
                      confirmDraft.acceptanceProcessKey = value === undefined ? undefined : String(value);
                    }}
                  />
                </FormItem>
              </>
            ) : null}
            <FormItem label="描述信息">
              <Textarea
                value={confirmDraft.description}
                maxlength={200}
                placeholder="描述信息"
                autoSize={{ minRows: 2, maxRows: 8 }}
                onUpdate:value={(value: unknown) => {
                  confirmDraft.description = String(value ?? "");
                }}
              />
            </FormItem>
            <FormItem label="现场图片">
              <ImageUpload
                value={confirmDraft.imageIdList}
                max={3}
                onUpdate:value={(ids: string[]) => {
                  confirmDraft.imageIdList = ids;
                }}
              />
            </FormItem>
          </Form>
        </Modal>
        <Modal
          open={modalKind.value === "assessment"}
          title={MODAL_TITLE.assessment}
          centered
          okText="确定"
          cancelText="取消"
          confirmLoading={saving.value}
          onOk={() => void submitAssessment()}
          onCancel={closeModal}
        >
          <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
            <FormItem label="服务评价" required>
              <Rate
                value={assessDraft.score}
                onUpdate:value={(value: unknown) => {
                  assessDraft.score = Number(value ?? 0);
                }}
              />
            </FormItem>
            <FormItem label="评价描述">
              <Textarea
                value={assessDraft.description}
                maxlength={200}
                placeholder="评价描述"
                autoSize={{ minRows: 2, maxRows: 8 }}
                onUpdate:value={(value: unknown) => {
                  assessDraft.description = String(value ?? "");
                }}
              />
            </FormItem>
            <FormItem label="评价照片">
              <ImageUpload
                value={assessDraft.imageIdList}
                max={3}
                onUpdate:value={(ids: string[]) => {
                  assessDraft.imageIdList = ids;
                }}
              />
            </FormItem>
          </Form>
        </Modal>
        <ProcessTaskModal
          open={modalKind.value === "acceptance" || modalKind.value === "check"}
          taskId={taskId.value}
          title={modalKind.value === "check" ? MODAL_TITLE.check : MODAL_TITLE.acceptance}
          submitMode="formData"
          onUpdate:open={(value: boolean) => {
            if (!value) {
              closeModal();
            }
          }}
          onDone={() => void load()}
        />
        <ProcessEventModal
          open={eventOpen.value}
          eventId={eventId.value}
          onUpdate:open={(value: boolean) => {
            eventOpen.value = value;
          }}
        />
      </>
    );
  },
});
