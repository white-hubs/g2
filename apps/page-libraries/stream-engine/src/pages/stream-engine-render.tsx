import type { FormFlowBusiness, ProcessTaskForm, StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import {
  Button,
  Empty,
  Form,
  FormItem,
  FullscreenExitOutlined,
  FullscreenOutlined,
  Image,
  Modal,
  PageLayout,
  PlusOutlined,
  Spin,
  Tabs,
  TabPane,
  Textarea,
  Tooltip,
  message,
} from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref, watch, watchEffect, type PropType } from "vue";

import type { StreamEnginePageProps } from "../contract";
import { legacyPreviewKind, openLegacyFilePreview } from "../file-preview";
import { fileSceneForBusiness } from "../file-scene";
import { backLogTitle, buildFlowVariables } from "../flow-variables";
import { renderFormControl, UserPickerControl } from "../form-controls";
import { formatCurrentDateTime } from "../form-date";
import { getFieldPermission, getFlowNode, resolveFormPerms, resolveNodeId, shouldShowField, type FormPermEntry } from "../form-perms";
import { fieldKey, parseFormData, parseSchema, resolveSchemaRaw, topLevelSchema, type FormSchemaItem } from "../form-schema";
import { matchesLegacyFormRelation, validateStreamForm } from "../form-validation";
import { normalizeWorkPermitFormValues } from "../permit-parking-model";
import { formatProcessTime, processOperationName } from "../process-progress";
import { submitInitialFlow } from "../submit-first";
import StreamEnginePrintSheet, { type StreamEnginePrintSheetHandle } from "./process-print";

import styles from "./stream-engine-render.module.css";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export default defineComponent({
  name: "StreamEngineRender",
  props: {
    title: { type: String, default: "流程表单" },
    type: { type: String, default: "add" },
    businessType: { type: String, default: "" },
    businessKey: { type: String, default: "" },
    processInstanceId: { type: String, default: "" },
    currentTaskId: { type: String, default: "" },
    status: { type: String, default: "" },
    notOperates: { type: [String, Boolean] as PropType<string | boolean>, default: false },
    applicationCode: { type: String, default: "" },
    getClient: { type: Function as PropType<StreamEnginePageProps["getClient"]>, required: true },
    getFileClient: { type: Function as PropType<StreamEnginePageProps["getFileClient"]>, default: undefined },
    getOuaaClient: { type: Function as PropType<StreamEnginePageProps["getOuaaClient"]>, default: undefined },
    onClose: { type: Function as PropType<StreamEnginePageProps["onClose"]> },
  },
  setup(props) {
    const loading = ref(true);
    const submitting = ref(false);
    const printing = ref(false);
    const printRef = ref<StreamEnginePrintSheetHandle>();
    const error = ref("");
    const flowForm = ref<FormFlowBusiness>();
    const taskDetail = ref<ProcessTaskForm>();
    const pathNodes = ref<unknown[]>([]);
    const progressUpdating = ref(false);
    const addApproverNode = ref("");
    const signaturePaths = reactive<Record<string, string>>({});
    const selectedApprovers = reactive<Record<string, Array<{ id: string; name: string }>>>({});
    const formValues = reactive<Record<string, unknown>>({});
    const approvalAction = ref<"PASS" | "REJECT" | "BACK" | "">("");
    const approvalSaving = ref(false);
    const checkingBack = ref(false);
    const approvalText = ref("");
    const lastSignId = ref("");
    const lastSignPath = ref("");
    const signLoading = ref(false);
    const signatureFullscreen = ref(false);
    const signatureCanvas = ref<HTMLCanvasElement>();
    const signatureArea = ref<HTMLDivElement>();
    const signatureDisplaySize = ref({ width: 392, height: 200 });
    let signing = false;
    let approvalVersion = 0;
    const operationModal = ref<"TRANSFER" | "COMMENT" | "">("");
    const operationText = ref("");
    const transferUsers = ref<Array<{ id: string; name: string }>>([]);
    const commentFiles = ref<unknown[]>([]);
    const schemaItems = ref<FormSchemaItem[]>([]);
    const formPerms = ref<FormPermEntry[]>([]);
    const nodeId = ref("root");
    const activeTab = ref("form");
    let client: StreamEngineClient | undefined;
    let progressRequestVersion = 0;

    // Keep the bitmap unchanged when the fullscreen display size changes.
    watch(signatureArea, (area, _previous, onCleanup) => {
      if (!area) return;
      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return;
        const scale = Math.min(entry.contentRect.width / 392, entry.contentRect.height / 200);
        if (scale > 0) signatureDisplaySize.value = { width: 392 * scale, height: 200 * scale };
      });
      observer.observe(area);
      onCleanup(() => observer.disconnect());
    });

    const hideOperates = () => props.notOperates === true || props.notOperates === "true";
    const isAdd = () => props.type === "add";
    const isDetail = () => props.type === "detail";
    const processType = computed(() => (isDetail() ? "detail" : "add") as "add" | "detail");
    const taskId = () => String(taskDetail.value?.id ?? taskDetail.value?.taskId ?? props.currentTaskId ?? "");
    const currentNodeConfig = computed(() => {
      const properties = parseFormData(taskDetail.value?.properties);
      const raw = properties.processJson;
      try {
        return asRecord(getFlowNode(typeof raw === "string" ? JSON.parse(raw) : raw, nodeId.value)?.props);
      } catch {
        return {};
      }
    });
    const approvalConfig = computed(() => ({
      opinion: currentNodeConfig.value.opinion !== false,
      sign: currentNodeConfig.value.sign !== false,
      useLastSign: asRecord(currentNodeConfig.value.signConfig).useLastSign === true,
    }));
    const operations = computed(() => {
      if (hideOperates()) return [];
      const running = asRecord(taskDetail.value?.processInstanceRunningInfo);
      const entries = Array.isArray(running.operateAlias) ? running.operateAlias : [];
      return entries
        .flatMap((entry) => {
          const item = asRecord(entry);
          const code = String(item.code ?? "");
          return code ? [{ code, label: String(item.alias || item.name || code) }] : [];
        })
        .toSorted((left, right) => {
          const rank = (code: string) => (code === "PASS" ? 2 : code === "REJECT" ? 1 : 0);
          return rank(left.code) - rank(right.code);
        });
    });
    const addAlias = computed(() => {
      try {
        const flow = flowForm.value?.flowJson;
        const parsed = typeof flow === "string" ? JSON.parse(flow) : flow;
        const aliases = asRecord(asRecord(parsed).props).operateAlias;
        return String(Array.isArray(aliases) ? asRecord(aliases[0]).alias || "发起" : "发起");
      } catch {
        return "发起";
      }
    });

    const fillValues = (data: Record<string, unknown>): void => {
      for (const key of Object.keys(formValues)) {
        delete formValues[key];
      }
      Object.assign(formValues, data);
    };

    const refreshProgress = async (): Promise<void> => {
      if (!client) return;
      const version = ++progressRequestVersion;
      const line = await client.getProcessLine({
        processInstanceId: props.processInstanceId || undefined,
        flowKey: String(taskDetail.value?.flowKey ?? flowForm.value?.flowKey ?? ""),
      });
      if (version !== progressRequestVersion) return;
      pathNodes.value = Array.isArray(line) ? line : [];
      if (!props.getFileClient) return;
      const signIds = pathNodes.value.flatMap((node) => {
        const taskOperations = asRecord(node).taskOperations;
        return Array.isArray(taskOperations)
          ? taskOperations.map((entry) => String(asRecord(asRecord(asRecord(entry).operation).approvalOpinion).sign ?? "")).filter(Boolean)
          : [];
      });
      let fileClient: FileClient;
      try {
        fileClient = await props.getFileClient();
      } catch {
        return;
      }
      void Promise.all(
        [...new Set(signIds)].map(async (id) => {
          try {
            const response = await fileClient.getFile(id);
            const file = asRecord(asRecord(response).data ?? response);
            if (file.path) signaturePaths[id] = String(file.path);
          } catch {
            // 历史签名文件不可用时保留其它进度信息。
          }
        }),
      );
    };

    const refreshPermissions = (): void => {
      const task = asRecord(taskDetail.value);
      const flow = asRecord(flowForm.value);
      const properties = parseFormData(task.properties);
      const running = asRecord(task.processInstanceRunningInfo);
      const taskKey = String(task.key ?? task.taskKey ?? task.taskDefinitionKey ?? "");
      nodeId.value = resolveNodeId(processType.value, taskKey);
      formPerms.value = resolveFormPerms({
        processType: processType.value,
        nodeId: nodeId.value,
        flowJson: flow.flowJson ?? properties.flowJson,
        processJson: properties.processJson ?? running.processJson,
        callType: String(flow.callType ?? properties.callType ?? ""),
        runningStatus: String(running.status ?? task.status ?? props.status ?? ""),
        runningFormPerms: running.formPerms,
      });
    };

    const load = async (): Promise<void> => {
      loading.value = true;
      error.value = "";
      try {
        if (isAdd() && !props.businessType) {
          error.value = "当前表单异常，请联系管理员";
          return;
        }
        if (isDetail() && !props.processInstanceId) {
          error.value = "当前表单异常，请联系管理员";
          return;
        }
        client = await props.getClient();
        const businessType = props.businessType || props.applicationCode;
        if (businessType) {
          flowForm.value = await client.getFormFlowBusiness({ businessType });
        }
        if (isDetail() && props.processInstanceId) {
          taskDetail.value = await client.getProcessTaskForm(props.processInstanceId);
          const taskProperties = parseFormData(taskDetail.value.properties);
          fillValues(parseFormData(taskDetail.value.data ?? taskDetail.value.formData ?? taskProperties.data));
        }
        if (isAdd() && new URLSearchParams(location.search).has("repeat")) {
          fillValues(parseFormData(sessionStorage.getItem("flow-repeat-data")));
        }
        try {
          await refreshProgress();
        } catch {
          pathNodes.value = [];
        }
        // 旧渲染端详情优先使用任务快照 properties.formJson，确保按发起时的版本展示。
        const schemaRaw = resolveSchemaRaw(isDetail(), taskDetail.value, flowForm.value);
        schemaItems.value = topLevelSchema(parseSchema(schemaRaw));
        const currentUser = isAdd() ? parseFormData(sessionStorage.getItem("GH-UserInfo")) : {};
        if (isAdd() && currentUser.id) formValues.sponsorId = String(currentUser.id);
        for (const item of schemaItems.value) {
          const key = fieldKey(item);
          if (key && !(key in formValues)) {
            const defaultValue = item.props?.defaultValue;
            const organization = Array.isArray(currentUser.organizations) ? asRecord(currentUser.organizations[0]) : {};
            formValues[key] =
              isAdd() && item.name === "DateTime" && item.props?.autoCurrentTime
                ? formatCurrentDateTime(String(item.props?.format ?? "yyyy-MM-dd HH:mm:ss"))
                : isAdd() && defaultValue === true && item.name === "UserPicker" && currentUser.id
                  ? [{ id: String(currentUser.id), name: String(currentUser.name ?? currentUser.userName ?? currentUser.id) }]
                  : isAdd() && defaultValue === true && item.name === "DeptPicker" && organization.id
                    ? [{ id: String(organization.id), name: String(organization.name ?? organization.id) }]
                    : isAdd() && defaultValue !== undefined && typeof defaultValue !== "boolean"
                      ? defaultValue
                      : null;
          }
        }
        refreshPermissions();
      } catch (loadError) {
        error.value = loadError instanceof Error ? loadError.message : "表单加载失败";
      } finally {
        loading.value = false;
      }
    };

    const buildSubmitPayload = () => {
      const submissionValues = normalizeWorkPermitFormValues(schemaItems.value, formValues);
      const source = taskDetail.value ?? flowForm.value ?? {};
      const application = String(source.application ?? props.applicationCode ?? props.businessType ?? "");
      const applicationName = String(source.applicationName ?? props.title ?? application);
      const businessType = String(source.businessType ?? props.businessType ?? "");
      let defaultBackLogTitle: string | undefined;
      try {
        const currentUser = parseFormData(sessionStorage.getItem("GH-UserInfo"));
        const userName = String(currentUser.name ?? "");
        defaultBackLogTitle = userName ? `${userName}发起的${String(source.businessTypeName ?? props.title)}` : undefined;
      } catch {
        defaultBackLogTitle = undefined;
      }
      return {
        application,
        applicationName,
        businessType,
        ...(props.businessKey ? { businessKey: props.businessKey } : {}),
        data: JSON.stringify(submissionValues),
        flowKey: String(source.flowKey ?? ""),
        formDefinitionId: String(source.formDefinitionId ?? ""),
        formDefinitionVersion: Number(source.formDefinitionVersion ?? 1),
        formKey: String(source.formKey ?? ""),
        type: String(source.type ?? "FLOW_FORM"),
        variables: {
          ...buildFlowVariables(flowForm.value?.flowJson, submissionValues),
          ...(businessType === "HIDDENDANGER" || businessType === "FAULT" ? { resource: "MANUAL_SUBMISSION" } : {}),
        },
        backLogTitle: backLogTitle(schemaItems.value, formValues) ?? defaultBackLogTitle,
        approveUsers: Object.fromEntries(
          Object.entries(selectedApprovers).map(([nodeKey, users]) => [nodeKey, users.map((user) => user.id).join(",")]),
        ),
      };
    };

    const validateEditableFields = (): boolean => {
      const issue = validateStreamForm({
        items: schemaItems.value,
        values: formValues,
        formPerms: formPerms.value,
        processType: processType.value,
        nodeId: nodeId.value,
      });
      if (!issue) return true;
      activeTab.value = "form";
      message.warning(issue.message);
      return false;
    };

    const submit = async (): Promise<void> => {
      if (!client || submitting.value || !validateEditableFields()) {
        return;
      }
      submitting.value = true;
      try {
        const submitted = await submitInitialFlow(client, buildSubmitPayload());
        if (!submitted) return;
        message.success("提交成功");
        props.onClose?.();
      } catch (submitError) {
        message.error(submitError instanceof Error ? submitError.message : "提交失败");
      } finally {
        submitting.value = false;
      }
    };

    const complete = async (approvalOpinion?: Record<string, unknown>): Promise<boolean> => {
      if (!client || submitting.value || !props.processInstanceId || !validateEditableFields()) {
        return false;
      }
      submitting.value = true;
      try {
        const submissionValues = normalizeWorkPermitFormValues(schemaItems.value, formValues);
        await client.completeTask({
          taskId: taskId(),
          account: null,
          data: JSON.stringify(submissionValues),
          result: "PASS",
          variables: buildFlowVariables(parseFormData(taskDetail.value?.properties).processJson, submissionValues),
          ...(approvalOpinion ? { approvalOpinion } : {}),
        });
        message.success("审批成功");
        props.onClose?.();
        return true;
      } catch (completeError) {
        message.error(completeError instanceof Error ? completeError.message : "审批失败");
        return false;
      } finally {
        submitting.value = false;
      }
    };

    const reject = async (approvalOpinion?: Record<string, unknown>): Promise<boolean> => {
      if (!client || submitting.value || !props.processInstanceId) {
        return false;
      }
      submitting.value = true;
      try {
        await client.rejectTask({
          taskId: taskId(),
          account: null,
          comment: null,
          data: JSON.stringify(normalizeWorkPermitFormValues(schemaItems.value, formValues)),
          ...(approvalOpinion ? { approvalOpinion } : {}),
        });
        message.success("已驳回");
        props.onClose?.();
        return true;
      } catch (rejectError) {
        message.error(rejectError instanceof Error ? rejectError.message : "驳回失败");
        return false;
      } finally {
        submitting.value = false;
      }
    };

    const otherOperation = async (code: string, approvalOpinion?: Record<string, unknown>): Promise<boolean> => {
      if (code === "TRANSFER" || code === "COMMENT") {
        operationText.value = "";
        transferUsers.value = [];
        commentFiles.value = [];
        operationModal.value = code;
        return true;
      }
      if (code === "REPEAT") {
        sessionStorage.setItem(
          "flow-repeat-data",
          JSON.stringify(Object.fromEntries(Object.entries(formValues).filter(([key]) => key.startsWith("field")))),
        );
        const target = new URL(location.href);
        target.searchParams.set("type", "add");
        target.searchParams.set("repeat", "1");
        target.searchParams.delete("processInstanceId");
        target.searchParams.delete("currentTaskId");
        target.searchParams.delete("status");
        location.assign(target.href);
        return true;
      }
      if (!client || submitting.value) return false;
      submitting.value = true;
      try {
        const taskPayload = { taskId: taskId(), account: null, comment: null, variables: null };
        if (code === "BACK") await client.backTask({ ...taskPayload, ...(approvalOpinion ? { approvalOpinion } : {}) });
        else if (code === "WITHDRAW") await client.withdrawTask(taskPayload);
        else if (code === "UNDO") await client.undoTask({ processInstanceId: props.processInstanceId, comment: null });
        else return false;
        message.success("操作成功");
        props.onClose?.();
        return true;
      } catch (operationError) {
        message.error(operationError instanceof Error ? operationError.message : "操作失败");
        return false;
      } finally {
        submitting.value = false;
      }
    };

    const startApproval = async (code: "PASS" | "REJECT" | "BACK"): Promise<void> => {
      activeTab.value = "form";
      if (submitting.value || approvalSaving.value || checkingBack.value || (code === "PASS" && !validateEditableFields())) return;
      if (code === "BACK" && client && props.processInstanceId) {
        checkingBack.value = true;
        try {
          if (await client.firstTaskActive(props.processInstanceId)) {
            message.error("第一个审批节点不支持回退");
            return;
          }
        } catch (checkError) {
          message.error(checkError instanceof Error ? checkError.message : "流程状态检查失败");
          return;
        } finally {
          checkingBack.value = false;
        }
      }
      if (!approvalConfig.value.opinion && !approvalConfig.value.sign) {
        if (code === "PASS") void complete();
        else if (code === "REJECT") void reject();
        else void otherOperation("BACK");
        return;
      }
      approvalText.value = "";
      signatureFullscreen.value = false;
      lastSignId.value = "";
      lastSignPath.value = "";
      approvalAction.value = code;
      const version = ++approvalVersion;
      if (approvalConfig.value.sign && approvalConfig.value.useLastSign && client) {
        signLoading.value = true;
        try {
          const last = await client.getLastWriteSign();
          if (approvalAction.value !== code || version !== approvalVersion) return;
          const sign = asRecord(asRecord(last).data ?? last);
          lastSignId.value = String(sign.id ?? "");
          lastSignPath.value = String(sign.path ?? "");
        } catch {
          // 没有上次签名时允许当前手写。
        } finally {
          if (version === approvalVersion) signLoading.value = false;
        }
      }
    };

    const drawSignature = (event: PointerEvent): void => {
      const canvas = signatureCanvas.value;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
      const y = ((event.clientY - rect.top) * canvas.height) / rect.height;
      if (event.type === "pointerdown") {
        signing = true;
        canvas.setPointerCapture(event.pointerId);
        context.beginPath();
        context.moveTo(x, y);
      } else if (event.type === "pointermove" && signing) {
        context.lineWidth = 2;
        context.lineCap = "round";
        context.lineTo(x, y);
        context.stroke();
      } else if (event.type === "pointerup" || event.type === "pointercancel") {
        signing = false;
      }
    };

    const clearSignature = (): void => {
      lastSignId.value = "";
      lastSignPath.value = "";
      signing = false;
      const canvas = signatureCanvas.value;
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    };

    const confirmApproval = async (): Promise<void> => {
      if (submitting.value || approvalSaving.value || signLoading.value || !approvalAction.value) return;
      approvalSaving.value = true;
      try {
        let signId = lastSignId.value;
        if (approvalConfig.value.sign && !signId) {
          const canvas = signatureCanvas.value;
          if (!canvas || !props.getFileClient) {
            message.warning("请手写签名");
            return;
          }
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (
            !blob ||
            !canvas
              .getContext("2d")
              ?.getImageData(0, 0, canvas.width, canvas.height)
              .data.some((value, index) => index % 4 === 3 && value > 0)
          ) {
            message.warning("请手写签名");
            return;
          }
          try {
            const fileClient = await props.getFileClient();
            const sceneCode = fileSceneForBusiness(props.businessType);
            // 旧文件服务按文件名后缀识别图片，签名必须以 PNG File 上传。
            const file = new File([blob], `sign-${Date.now()}.png`, { type: "image/png" });
            const uploaded = await fileClient.uploadSceneFile({ file, businessKey: "maintain", sceneCode });
            try {
              await fileClient.persistSceneFiles(sceneCode, [uploaded.id]);
            } catch (persistError) {
              message.warning(persistError instanceof Error ? persistError.message : "签名文件持久化失败");
            }
            signId = uploaded.id;
            lastSignId.value = signId;
          } catch (uploadError) {
            message.error(uploadError instanceof Error ? uploadError.message : "签名上传失败");
            return;
          }
        }
        const opinion: Record<string, unknown> = {};
        if (approvalConfig.value.opinion) opinion.text = approvalText.value;
        if (approvalConfig.value.sign) opinion.sign = signId;
        const code = approvalAction.value;
        const success =
          code === "PASS" ? await complete(opinion) : code === "REJECT" ? await reject(opinion) : await otherOperation("BACK", opinion);
        if (success) {
          approvalAction.value = "";
          approvalVersion++;
        }
      } finally {
        approvalSaving.value = false;
      }
    };

    const submitModalOperation = async (): Promise<void> => {
      if (!client || submitting.value) return;
      if (operationModal.value === "TRANSFER" && transferUsers.value.length === 0) {
        message.warning("请选择转交人员");
        return;
      }
      if (operationModal.value === "COMMENT" && !operationText.value.trim()) {
        message.warning("请输入评论内容");
        return;
      }
      submitting.value = true;
      try {
        if (operationModal.value === "TRANSFER") {
          await client.transferTask({
            taskId: taskId(),
            targetAccount: transferUsers.value.map((item) => item.id).join(","),
            account: null,
            approvalOpinion: { text: operationText.value },
          });
          message.success("转交成功");
          props.onClose?.();
        } else if (operationModal.value === "COMMENT") {
          await client.submitFeedback({
            processId: props.processInstanceId,
            taskNodeKey: taskDetail.value?.key,
            taskId: taskId(),
            feedbackInfo: operationText.value,
            fileIdList: commentFiles.value.flatMap((entry) => {
              const id = asRecord(entry).id;
              return id == null ? [] : [String(id)];
            }),
          });
          message.success("评论成功");
          try {
            const updatedLine = await client.getProcessLine({
              processInstanceId: props.processInstanceId,
              flowKey: String(taskDetail.value?.flowKey ?? flowForm.value?.flowKey ?? ""),
            });
            if (Array.isArray(updatedLine)) pathNodes.value = updatedLine;
          } catch {
            // The comment was saved; a timeline refresh failure must not report it as failed.
          }
        }
        operationModal.value = "";
      } catch (operationError) {
        message.error(operationError instanceof Error ? operationError.message : "操作失败");
      } finally {
        submitting.value = false;
      }
    };

    const changeApprovers = async (nodeKey: string, users: Array<{ id: string; name: string }>): Promise<void> => {
      if (!client || progressUpdating.value || !props.processInstanceId) return;
      const currentNode = pathNodes.value.find((node) => String(asRecord(node).nodeKey) === nodeKey);
      const current = Array.isArray(asRecord(currentNode).assigneeList)
        ? (asRecord(currentNode).assigneeList as Record<string, unknown>[])
        : [];
      const added = users.filter((user) => !current.some((entry) => String(entry.id) === user.id));
      if (!added.length) {
        addApproverNode.value = "";
        return;
      }
      progressUpdating.value = true;
      try {
        await client.appointApprover({
          processInstanceId: props.processInstanceId,
          taskKey: nodeKey,
          userIds: added.map((user) => user.id),
        });
        await refreshProgress();
        addApproverNode.value = "";
        message.success("指定成功");
      } catch (appointError) {
        message.error(appointError instanceof Error ? appointError.message : "指定审批人失败");
      } finally {
        progressUpdating.value = false;
      }
    };

    const removeApprover = async (nodeKey: string, userId: string): Promise<void> => {
      if (!client || progressUpdating.value || !props.processInstanceId) return;
      progressUpdating.value = true;
      try {
        await client.reduceAppointApprover({ processInstanceId: props.processInstanceId, taskKey: nodeKey, userIds: [userId] });
        await refreshProgress();
        message.success("预减签成功");
      } catch (reduceError) {
        message.error(reduceError instanceof Error ? reduceError.message : "减签失败");
      } finally {
        progressUpdating.value = false;
      }
    };

    onMounted(() => {
      void load();
    });

    watchEffect(() => {
      if (!isAdd()) return;
      for (const item of schemaItems.value) {
        if (item.name !== "NumberInput" || !item.props?.params) continue;
        const source = formValues[String(item.props.params)];
        const count = Array.isArray(source) ? source.length : 0;
        const key = fieldKey(item);
        if (formValues[key] !== count) formValues[key] = count;
      }
    });

    const renderField = (item: FormSchemaItem) => {
      if (!client) {
        return null;
      }
      const key = fieldKey(item);
      const permission = getFieldPermission(item, formPerms.value, processType.value, nodeId.value);
      if (!shouldShowField(item, permission, formValues[key]) || !matchesLegacyFormRelation(item, schemaItems.value, formValues)) {
        return null;
      }
      const width = Number(item.width ?? 100);
      const required = Boolean(item.props?.required);
      const comboShell = item.name === "GroupList" || Boolean(item.props?.hideLabel);
      return (
        <div
          key={key}
          class={styles.fieldCol}
          style={{
            width: `${Number.isFinite(width) ? width : 100}%`,
            paddingRight: width < 100 ? "12px" : undefined,
          }}
        >
          <FormItem
            label={comboShell ? undefined : item.title}
            required={comboShell ? false : required}
            name={key}
            colon={!comboShell}
            labelCol={{
              style: comboShell ? { width: 0, maxWidth: 0, padding: 0 } : { minWidth: item.labelWidth ?? "130px", fontWeight: 600 },
            }}
          >
            <Form.ItemRest>
              {renderFormControl(
                item,
                formValues[key],
                (next) => {
                  formValues[key] = next;
                },
                {
                  client,
                  getFileClient: props.getFileClient as (() => Promise<FileClient>) | undefined,
                  getOuaaClient: props.getOuaaClient as (() => Promise<OuaaClient>) | undefined,
                  businessType: props.businessType || props.applicationCode,
                  callType: String(flowForm.value?.callType ?? parseFormData(taskDetail.value?.properties).callType ?? ""),
                  formValues,
                  processInstanceId: props.processInstanceId,
                  setRelatedValue: (field, next) => {
                    formValues[field] = next;
                  },
                  schemaItems: schemaItems.value,
                  formPerms: formPerms.value,
                  detail: isDetail(),
                  readonly: permission.readonly,
                },
              )}
            </Form.ItemRest>
          </FormItem>
        </div>
      );
    };

    return () => {
      const pageTitle = `${props.title || "流程表单"}-${isAdd() ? "新增" : "详情"}`;
      if (error.value) {
        return (
          <PageLayout
            title={pageTitle}
            v-slots={{
              "layout-content": () => <Empty description={error.value} />,
              "footer-btn": () => <Button onClick={() => props.onClose?.()}>返回</Button>,
            }}
          />
        );
      }
      if (loading.value) {
        return (
          <PageLayout
            title={pageTitle}
            showFooter={false}
            v-slots={{
              "layout-content": () => (
                <div class={styles.loading}>
                  <Spin size="large" />
                </div>
              ),
            }}
          />
        );
      }
      if (!client) return <Empty description="表单加载失败" />;
      const visibleFields = schemaItems.value.filter((item) => {
        const key = fieldKey(item);
        const permission = getFieldPermission(item, formPerms.value, processType.value, nodeId.value);
        return (
          item.show !== false &&
          shouldShowField(item, permission, formValues[key]) &&
          matchesLegacyFormRelation(item, schemaItems.value, formValues)
        );
      });
      const slots = {
        "layout-header": () => (
          <Button
            type="primary"
            loading={printing.value}
            onClick={() => {
              if (printing.value) return;
              printing.value = true;
              void (async () => {
                try {
                  if (!printRef.value) throw new Error("打印内容尚未加载");
                  await printRef.value.prepare();
                  window.print();
                } catch (printError) {
                  message.error(printError instanceof Error ? printError.message : "打印内容加载失败");
                } finally {
                  printing.value = false;
                }
              })();
            }}
          >
            打印
          </Button>
        ),
        "layout-content": () => (
          <Tabs
            activeKey={activeTab.value}
            onUpdate:activeKey={(key) => {
              activeTab.value = String(key);
              if (activeTab.value === "process")
                void refreshProgress().catch(() => {
                  message.error("处理进度加载失败");
                });
            }}
          >
            <TabPane key="form" tab="表单信息">
              <Form class={styles.processForm} layout="horizontal" model={formValues} labelAlign="right" colon>
                {visibleFields.length ? visibleFields.map((item) => renderField(item)) : <Empty description="暂无表单字段" />}
              </Form>
            </TabPane>
            <TabPane key="process" tab="处理进度">
              {Array.isArray(pathNodes.value) && pathNodes.value.length ? (
                <ol class={styles.timeline}>
                  {pathNodes.value.map((node, index) => {
                    const record = (node ?? {}) as Record<string, unknown>;
                    const taskOperations = Array.isArray(record.taskOperations) ? (record.taskOperations as Record<string, unknown>[]) : [];
                    const assignees = Array.isArray(record.assigneeList) ? (record.assigneeList as Record<string, unknown>[]) : [];
                    const nodeKey = String(record.nodeKey ?? index);
                    const approvalCommentConfig = asRecord(record.approvalCommentConfig);
                    const range = asRecord(record.selectRange);
                    return (
                      <li key={String(record.nodeKey ?? index)} class={styles.timelineItem}>
                        <strong>{String(record.nodeName ?? record.name ?? record.taskName ?? `节点 ${index + 1}`)}</strong>
                        <div class={styles.timelineContent}>
                          {taskOperations.map((entry, entryIndex) => {
                            const operation = asRecord(entry.operation);
                            const operator = asRecord(operation.operator);
                            const opinion = asRecord(operation.approvalOpinion);
                            const residual = asRecord(entry.residualOperator);
                            const feedbackLogs = Array.isArray(entry.feedbackLogs) ? (entry.feedbackLogs as Record<string, unknown>[]) : [];
                            const type = String(operation.type ?? "");
                            const signId = String(opinion.sign ?? "");
                            return (
                              <div key={entryIndex} class={styles.operationGroup}>
                                {type ? (
                                  <div class={styles.operation}>
                                    <span class={styles.avatar}>{String(operator.name ?? "人").slice(-2)}</span>
                                    <div class={styles.operationInfo}>
                                      <b>{processOperationName(type)}</b>
                                      <div class={styles.operationMeta}>
                                        {!["COPY", "SUBMIT"].includes(type) ? (
                                          <span>
                                            {String(operator.name ?? "--")}
                                            {type === "PASS" ? (
                                              <span class={styles.accepted}>（已同意）</span>
                                            ) : type === "REJECT" ? (
                                              <span class={styles.rejected}>（已拒绝）</span>
                                            ) : null}
                                          </span>
                                        ) : null}
                                        <span>时间：{formatProcessTime(operation.createTime)}</span>
                                        {approvalCommentConfig.supportHandwrittenSignature && signId && signaturePaths[signId] ? (
                                          <div class={styles.operationSignature}>
                                            <span>电子签名：</span>
                                            <Image src={signaturePaths[signId]} width={140} height={72} />
                                          </div>
                                        ) : null}
                                      </div>
                                      {type === "TRANSFER" ? (
                                        <p>转交备注：{String(opinion.text || "--")}</p>
                                      ) : approvalCommentConfig.supportText ? (
                                        <p>审批意见：{String(opinion.text || "--")}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}
                                {residual.name ? (
                                  <div class={styles.operation}>
                                    <span class={styles.avatar}>{String(residual.name).slice(-2)}</span>
                                    <b>{String(residual.name)}　待处理</b>
                                  </div>
                                ) : null}
                                {feedbackLogs.map((feedback, feedbackIndex) => {
                                  const files = Array.isArray(feedback.fileVOList)
                                    ? (feedback.fileVOList as Record<string, unknown>[])
                                    : [];
                                  return (
                                    <div key={feedbackIndex} class={styles.feedback}>
                                      <b>{String(feedback.feedbackUser ?? "--")}</b>
                                      <span>{feedback.feedbackTime ? formatProcessTime(feedback.feedbackTime) : ""}</span>
                                      <p>{String(feedback.feedbackInfo ?? "")}</p>
                                      {files.length ? (
                                        <div class={styles.feedbackFiles}>
                                          {files.map((file, fileIndex) => {
                                            const name = String(file.name ?? `附件${fileIndex + 1}`);
                                            const fileType = String(file.type ?? "").toLowerCase();
                                            const path = String(file.path ?? "");
                                            const previewable =
                                              legacyPreviewKind(name) !== "other" ||
                                              ["doc", "docx", "excel", "xlsx", "xls", "pdf", "ppt", "txt", "mp4"].includes(fileType);
                                            return previewable ? (
                                              <button
                                                key={fileIndex}
                                                type="button"
                                                class={styles.feedbackFile}
                                                onClick={() => {
                                                  if (
                                                    !openLegacyFilePreview({
                                                      name: name.includes(".") ? name : `${name}.${fileType}`,
                                                      path,
                                                    })
                                                  )
                                                    message.error("文件预览不可用");
                                                }}
                                              >
                                                {name}
                                              </button>
                                            ) : (
                                              <Image key={fileIndex} src={path} width={100} height={100} />
                                            );
                                          })}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                          {assignees.length || record.preAddSign ? (
                            <div class={styles.assigneeList}>
                              {assignees.map((entry) => (
                                <span key={String(entry.id)} class={styles.assignee}>
                                  <span class={styles.avatar}>{String(entry.name ?? "人").slice(-2)}</span>
                                  {entry.preReduceSign && !hideOperates() ? (
                                    <button
                                      type="button"
                                      aria-label={`移除${String(entry.name)}预分配`}
                                      disabled={progressUpdating.value}
                                      onClick={() => void removeApprover(nodeKey, String(entry.id))}
                                    >
                                      ×
                                    </button>
                                  ) : null}
                                </span>
                              ))}
                              {record.preAddSign && !hideOperates() ? (
                                <Button
                                  aria-label="指定审批人"
                                  icon={<PlusOutlined />}
                                  disabled={progressUpdating.value}
                                  onClick={() => {
                                    addApproverNode.value = nodeKey;
                                  }}
                                />
                              ) : null}
                            </div>
                          ) : null}
                          {addApproverNode.value === nodeKey ? (
                            <UserPickerControl
                              value={assignees.map((entry) => ({ id: String(entry.id), name: String(entry.name) }))}
                              client={client}
                              getOuaaClient={props.getOuaaClient}
                              disabledIds={assignees.filter((entry) => !entry.preReduceSign).map((entry) => String(entry.id))}
                              multiple
                              autoOpen
                              onClose={() => {
                                addApproverNode.value = "";
                              }}
                              onUpdate:value={(users) => void changeApprovers(nodeKey, users)}
                            />
                          ) : null}
                          {record.selfSelect && assignees.length === 0 ? (
                            <div class={styles.selfSelect}>
                              <span>
                                发起人自选
                                {range.type
                                  ? `（自选范围：${({ ASSIGN_USER: "指定人员", ROLE: "角色", ALL: "所有" } as Record<string, string>)[String(range.type)] ?? String(range.type)}）`
                                  : ""}
                              </span>
                              <UserPickerControl
                                value={selectedApprovers[nodeKey] ?? []}
                                client={client}
                                getOuaaClient={props.getOuaaClient}
                                selectRange={
                                  range.type
                                    ? { type: String(range.type), ids: Array.isArray(range.ids) ? range.ids.map(String) : [] }
                                    : null
                                }
                                placeholder="选择审批人"
                                multiple
                                onUpdate:value={(users) => {
                                  selectedApprovers[nodeKey] = users;
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <Empty description="暂无处理进度" />
              )}
            </TabPane>
          </Tabs>
        ),
        "footer-btn": () => (
          <div style={{ display: "flex", gap: "8px" }}>
            <Button onClick={() => props.onClose?.()}>返回</Button>
            {isAdd() ? (
              <Button type="primary" loading={submitting.value} onClick={() => void submit()}>
                {addAlias.value}
              </Button>
            ) : null}
            {isDetail()
              ? operations.value.map((operation) => (
                  <Button
                    key={operation.code}
                    type={operation.code === "PASS" ? "primary" : "default"}
                    danger={operation.code === "REJECT"}
                    loading={submitting.value || (operation.code === "BACK" && checkingBack.value)}
                    onClick={() => {
                      if (operation.code === "PASS" || operation.code === "REJECT" || operation.code === "BACK")
                        void startApproval(operation.code);
                      else void otherOperation(operation.code);
                    }}
                  >
                    {operation.label}
                  </Button>
                ))
              : null}
          </div>
        ),
      };
      return (
        <>
          <PageLayout title={pageTitle} v-slots={slots} />
          <StreamEnginePrintSheet
            ref={printRef}
            client={client}
            processInstanceId={props.processInstanceId}
            schemaItems={schemaItems.value}
            formValues={formValues}
            formPerms={formPerms.value}
            processType={processType.value}
            nodeId={nodeId.value}
            flowForm={flowForm.value}
            taskDetail={taskDetail.value}
            getFileClient={props.getFileClient}
          />
          <Modal
            open={Boolean(operationModal.value)}
            title={operationModal.value === "TRANSFER" ? "转交" : "评论"}
            width={620}
            confirmLoading={submitting.value}
            okText="确定"
            onOk={() => void submitModalOperation()}
            onCancel={() => {
              operationModal.value = "";
            }}
          >
            {operationModal.value === "TRANSFER" ? (
              <FormItem label="选择人员" required>
                <UserPickerControl
                  value={transferUsers.value}
                  client={client}
                  getOuaaClient={props.getOuaaClient}
                  placeholder="请选择人员"
                  multiple
                  onUpdate:value={(value) => {
                    transferUsers.value = value;
                  }}
                />
              </FormItem>
            ) : null}
            <FormItem label={operationModal.value === "TRANSFER" ? "备注" : "评论"} required={operationModal.value === "COMMENT"}>
              <Textarea
                value={operationText.value}
                rows={4}
                onUpdate:value={(value: string) => {
                  operationText.value = value;
                }}
              />
            </FormItem>
            {operationModal.value === "COMMENT" && client ? (
              <FormItem label="附件">
                {renderFormControl(
                  { name: "FileUpload", title: "附件", id: "comment-files" },
                  commentFiles.value,
                  (value) => {
                    commentFiles.value = Array.isArray(value) ? value : [];
                  },
                  {
                    client,
                    getFileClient: props.getFileClient as (() => Promise<FileClient>) | undefined,
                    businessType: props.businessType || props.applicationCode,
                  },
                )}
              </FormItem>
            ) : null}
          </Modal>
          <Modal
            open={Boolean(approvalAction.value)}
            title={
              signatureFullscreen.value
                ? "手写签名"
                : (operations.value.find((item) => item.code === approvalAction.value)?.label ?? "审批")
            }
            width={signatureFullscreen.value ? "100vw" : 520}
            wrapClassName={signatureFullscreen.value ? styles.signatureFullscreenModal : undefined}
            style={signatureFullscreen.value ? { top: 0, maxWidth: "100vw", paddingBottom: 0 } : undefined}
            okText={signatureFullscreen.value ? "完成签名" : "保存"}
            cancelText={signatureFullscreen.value ? "返回" : "取消"}
            confirmLoading={approvalSaving.value || submitting.value || signLoading.value}
            onOk={() => {
              if (signatureFullscreen.value) {
                signatureFullscreen.value = false;
                return;
              }
              void confirmApproval();
            }}
            onCancel={() => {
              if (approvalSaving.value) return;
              if (signatureFullscreen.value) {
                signatureFullscreen.value = false;
                return;
              }
              approvalAction.value = "";
              approvalVersion++;
              signLoading.value = false;
            }}
          >
            <Form
              class={styles.approvalForm}
              layout="horizontal"
              labelAlign="right"
              labelCol={{ style: { width: "80px" } }}
              wrapperCol={{ style: { flex: 1, minWidth: 0 } }}
            >
              {approvalConfig.value.opinion ? (
                <FormItem label="审批意见" style={signatureFullscreen.value ? { display: "none" } : undefined}>
                  <Textarea
                    value={approvalText.value}
                    rows={5}
                    onUpdate:value={(value: string) => {
                      approvalText.value = value;
                    }}
                  />
                </FormItem>
              ) : null}
              {approvalConfig.value.sign ? (
                <FormItem class={styles.signatureField} label="手写签名" required>
                  <div class={styles.signatureEditor}>
                    <div ref={signatureArea} class={styles.signatureArea}>
                      {signLoading.value ? (
                        <Spin />
                      ) : lastSignId.value && lastSignPath.value ? (
                        <Image
                          src={lastSignPath.value}
                          width={signatureDisplaySize.value.width}
                          height={signatureDisplaySize.value.height}
                        />
                      ) : (
                        <canvas
                          ref={signatureCanvas}
                          width={392}
                          height={200}
                          style={{ width: `${signatureDisplaySize.value.width}px`, height: `${signatureDisplaySize.value.height}px` }}
                          class={styles.signaturePad}
                          onPointerdown={drawSignature}
                          onPointermove={drawSignature}
                          onPointerup={drawSignature}
                          onPointercancel={drawSignature}
                        />
                      )}
                    </div>
                    <div class={styles.signatureToolbar}>
                      <Button type="link" disabled={approvalSaving.value || submitting.value || signLoading.value} onClick={clearSignature}>
                        清除签名
                      </Button>
                      <Tooltip title={signatureFullscreen.value ? "退出全屏" : "全屏签名"}>
                        <Button
                          type="text"
                          aria-label={signatureFullscreen.value ? "退出全屏签名" : "全屏签名"}
                          icon={signatureFullscreen.value ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                          disabled={approvalSaving.value || submitting.value || signLoading.value}
                          onClick={() => {
                            signatureFullscreen.value = !signatureFullscreen.value;
                          }}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </FormItem>
              ) : null}
            </Form>
          </Modal>
        </>
      );
    };
  },
});
