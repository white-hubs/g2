import type { FormFlowBusiness, FormFlowGroup, StreamEngineClient } from "@g2-client/stream-engine/client";
import {
  AppstoreOutlined,
  BellOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  EditOutlined,
  LinkOutlined,
  RocketOutlined,
  Button,
  Checkbox,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  PageLayout,
  PopConfirm,
  Radio,
  RadioGroup,
  RangePicker,
  Rate,
  Select,
  Spin,
  Switch,
  Table,
  Textarea,
  TimePicker,
  ToolOutlined,
  message,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, type PropType, type VNode } from "vue";

import type { StreamEnginePageProps } from "../contract";
import { addConditionBranch, findFlowNode, insertFlowNode, removeFlowNode, type FlowNode } from "../flow-tree";
import { CONTROL_GROUPS, availableFormControlGroups, createFormItem, type FormControlDefinition } from "../form-control-catalog";
import { UserPickerControl } from "../form-controls";
import { normalizeSelectOptions } from "../form-options";
import { asIdNameList, findFormItemById, flattenFormItems, parseSchema, validateDesignItems, type FormSchemaItem } from "../form-schema";
import ProcessAssignmentControl from "../process-assignment-control";
import ProcessConditionControl from "../process-condition-control";
import { processConditionFields, type ProcessConditionGroup } from "../process-conditions";
import {
  assignmentSummary,
  editableRequired,
  normalizeLimitTimeConfig,
  prepareProcessForPublish,
  validateProcessDesign,
  type ApprovalReminder,
  type LimitTimeConfig,
} from "../process-design";
import ProcessRolePicker from "../process-role-picker";
import WorkOrderBaseSettings from "../work-order-base-settings";
import {
  buildWorkOrderPayload,
  designNameIssue,
  initialWorkOrderSettings,
  restoreWorkOrderSettings,
  validateWorkOrderBase,
  workOrderCatalogApplication,
} from "../work-order-model";
import FormPropertyEditor from "./form-property-editor";

import styles from "./form-process-design.module.css";

function parseFlow(raw: unknown): FlowNode | null {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as FlowNode) : null;
  } catch {
    return null;
  }
}

type ConditionGroup = ProcessConditionGroup;

function renderControlPreview(item: FormSchemaItem, onSelectChild?: (id: string) => void, selectedId?: string): VNode {
  const name = item.name ?? "";
  const businessPlaceholders: Record<string, string> = {
    OutSourceCom: "请选择委外公司",
    OutSourceMode: "请选择委外类型",
    OutSourceHandleResult: "请选择处理结果",
    OutSourceResult: "请选择确认结果",
    ProjectName: "请选择工程名称",
  };
  const placeholder = String(
    item.props?.placeholder ?? businessPlaceholders[name] ?? (name.includes("Select") || name.includes("Picker") ? "请选择" : "请输入内容"),
  );
  if (name === "Description") return <p>{placeholder}</p>;
  if (name === "SwitchSelect") return <Switch disabled />;
  if (name === "TextareaInput") return <Textarea disabled rows={Number(item.props?.rows ?? 3)} placeholder={placeholder} />;
  if (name === "OutsiderConcat")
    return (
      <div class={styles.outsiderPreview}>
        <Input disabled addonBefore="姓名:" placeholder={placeholder} />
        <Input disabled addonBefore="电话:" placeholder={placeholder} />
      </div>
    );
  if (
    [
      "SelectInput",
      "MultipleSelect",
      "FaultTypeSelect",
      "FaultLevelSelect",
      "FaultComfirmSelect",
      "ProblemTypeSelect",
      "ProblemLevelSelect",
      "ProblemComfirmSelect",
      "SolutionResult",
      "WorKReportSelect",
      "UserPicker",
      "DeptPicker",
      "AreaList",
      "OutSourceCom",
      "OutSourceHandleResult",
      "OutSourceResult",
      "OutSourceMode",
      "ProjectName",
      "VacationType",
      "SupplementClass",
      "OvertimeType",
      "OvertimeCompensation",
      "DutyType",
      "ChangeClass",
      "ChangePerson",
      "PositionList",
      "PersonnelCategory",
      "AppointmentList",
      "RoleList",
      "OfficialSealList",
      "FocusWorkTypeList",
      "FocusWorkList",
      "FocusWorkStatusList",
      "WorkList",
      "AssetSource",
      "AssetTypeSelect",
      "ScrappingReason",
      "WareHouseSelect",
      "WorkPermitTypeSelect",
      "WorkPermitLevelSelect",
      "ParkingLevelSelect",
      "ViolatorCarNumber",
      "ParkingLotSelect",
      "CarPlateColorSelect",
      "RetrofitConfirmSelect",
    ].includes(name)
  ) {
    return (
      <Select
        disabled
        mode={name === "MultipleSelect" || (name === "RoleList" && item.props?.multiple) ? "multiple" : undefined}
        placeholder={placeholder}
        options={normalizeSelectOptions(item.props?.options)}
        style={{ width: "100%" }}
      />
    );
  }
  if (name === "VacationDate") return <RangePicker disabled showTime placeholder={["开始时间", "结束时间"]} style={{ width: "100%" }} />;
  if (name === "ServicePeriod")
    return (
      <RadioGroup disabled value="limited">
        <Radio value="limited">有期限</Radio>
        <Radio value="unlimited">无期限</Radio>
        <DatePicker disabled placeholder="请选择期限时间" />
      </RadioGroup>
    );
  if (name === "AssetIsExpired")
    return (
      <RadioGroup disabled>
        <Radio value={true}>是</Radio>
        <Radio value={false}>否</Radio>
      </RadioGroup>
    );
  if (["AccessPermission", "ParkingPermission"].includes(name))
    return (
      <div>
        <Switch disabled checked />
        <Table
          size="small"
          dataSource={[]}
          pagination={false}
          columns={[
            { title: name === "AccessPermission" ? "门禁设备" : "停车设备", dataIndex: "name" },
            { title: "权限", dataIndex: "permission" },
          ]}
        />
      </div>
    );
  if (
    [
      "VacationBalance",
      "VacationLength",
      "DisposeVacationLength",
      "OvertimeLength",
      "DepartureTimeLength",
      "BusinessTripTimeLength",
      "SickLeaveInput",
      "CompassionLeaveInput",
      "lateNumInput",
      "earlyNumInput",
      "skipWorkNumInput",
    ].includes(name)
  )
    return <Input disabled placeholder="自动填充" />;
  if (["FocusWork", "FocusWorkRequirement"].includes(name)) return <Textarea disabled rows={4} placeholder="自动填充" />;
  if (name === "FocusWorkCompleteTime") return <Input disabled placeholder="自动填充" />;
  if (name === "AssociationLeaveForm")
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        <Input disabled placeholder="请选择请假单" />
        <Button disabled>选择</Button>
      </div>
    );
  if (["WorkPermitRiskCheckItems", "WorkPermitAcceptanceItems"].includes(name))
    return (
      <Table
        size="small"
        dataSource={[]}
        pagination={false}
        columns={[
          { title: name === "WorkPermitRiskCheckItems" ? "检查项" : "验收项", dataIndex: "itemName" },
          { title: "确认结果", dataIndex: "confirmResult" },
        ]}
      />
    );
  if (["AddAssetTable", "ChooseAssetTable", "ConsumablesEnter"].includes(name))
    return (
      <div>
        <Button disabled type="primary" size="small">
          {name === "ConsumablesEnter" ? "选择耗材" : name === "AddAssetTable" ? "添加资产" : "选择资产"}
        </Button>
        <Table
          size="small"
          dataSource={[]}
          pagination={false}
          scroll={{ x: 650 }}
          columns={[
            { title: "编码", dataIndex: "serialNumber" },
            { title: "名称", dataIndex: "name" },
            { title: "数量", dataIndex: "number" },
          ]}
        />
      </div>
    );
  if (["DeviceStatus", "DeviceChangeStatus"].includes(name)) return <Input disabled placeholder="关联设备后自动带入" />;
  if (name === "DateTime") return <DatePicker disabled showTime placeholder={placeholder} style={{ width: "100%" }} />;
  if (name === "DateTimeRange") return <RangePicker disabled showTime placeholder={["开始时间", "结束时间"]} style={{ width: "100%" }} />;
  if (name === "TimePickerRange")
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <TimePicker disabled placeholder="开始时间" />
        <span>至</span>
        <TimePicker disabled placeholder="结束时间" />
      </div>
    );
  if (name === "RateInput") return <Rate disabled count={Number(item.props?.rateNum ?? 5)} />;
  if (name === "AlarmRecords")
    return (
      <Table
        size="small"
        dataSource={[]}
        pagination={false}
        scroll={{ x: 670 }}
        columns={[
          { title: "预警事件名称", dataIndex: "alarmEventName", width: 160 },
          { title: "时间", dataIndex: "alarmTime", width: 150 },
          { title: "设备名称", dataIndex: "alarmTargetName", width: 170 },
          { title: "处理状态", dataIndex: "alarmStatusName", width: 100 },
          { title: "操作", key: "operation", width: 90 },
        ]}
      />
    );
  if (name === "RelatedDeviceSelect")
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        <Select disabled placeholder="请选择设备" style={{ flex: 1 }} />
        <Button disabled type="primary">
          关联设备
        </Button>
      </div>
    );
  if (["TargetObjectSelect", "RectifyTargetSelect", "DeviceSelect"].includes(name))
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        <Select disabled placeholder="请选择对象" style={{ flex: 1 }} />
        <Button disabled type="primary">
          选择对象
        </Button>
      </div>
    );
  if (name === "FileUpload") return <Button disabled>上传附件</Button>;
  if (name === "AmountInput")
    return (
      <div>
        <Input disabled placeholder={placeholder === "请输入内容" ? "请输入金额" : placeholder} />
        {item.props?.showChinese !== false ? <div class={styles.amountUppercase}>大写：零元整</div> : null}
      </div>
    );
  if (name === "ConsumablesOut")
    return (
      <div class={styles.consumablePreview}>
        <div class={styles.consumablePreviewAction}>
          <Button disabled type="primary" size="small">
            选择耗材
          </Button>
        </div>
        <div class={styles.consumablePreviewScroll}>
          <table>
            <thead>
              <tr>
                {["图片", "耗材名称", "耗材编码", "规格型号", "品牌", "耗材分类", "单位", "库存量", "单价", "数量", "金额", "操作"].map(
                  (title) => (
                    <th key={title}>{title}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan={12}>暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  if (name === "GroupList") {
    const children = Array.isArray(item.props?.items) ? (item.props.items as FormSchemaItem[]) : [];
    return (
      <div class={styles.previewBox}>
        {children.length
          ? children.map((child) => (
              <div
                key={child.id}
                class={[styles.nestedCanvasField, selectedId === child.id ? styles.selectedField : ""]}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectChild?.(String(child.id));
                }}
              >
                <div>
                  {child.props?.required ? <em class={styles.requiredMark}>* </em> : null}
                  {child.title}
                </div>
                {renderControlPreview(child, onSelectChild, selectedId)}
              </div>
            ))
          : "请添加子控件"}
      </div>
    );
  }
  return <Input disabled type={["NumberInput", "AmountInput"].includes(name) ? "number" : "text"} placeholder={placeholder} />;
}

export default defineComponent({
  name: "FormProcessDesign",
  props: {
    title: { type: String, default: "表单流程设计" },
    formId: { type: String, default: "" },
    formType: { type: String, default: "FLOW_FORM" },
    workOrder: { type: Boolean, default: false },
    applicationCode: { type: String, default: undefined },
    applicationName: { type: String, default: undefined },
    isCopy: { type: Boolean, default: false },
    groupId: { type: [String, Number] as PropType<string | number | null>, default: null },
    getClient: { type: Function as PropType<StreamEnginePageProps["getClient"]>, required: true },
    getOuaaClient: { type: Function as PropType<StreamEnginePageProps["getOuaaClient"]>, default: undefined },
    onNavigate: { type: Function as PropType<StreamEnginePageProps["onNavigate"]> },
    onClose: { type: Function as PropType<StreamEnginePageProps["onClose"]> },
    onPublished: { type: Function as PropType<() => void> },
  },
  setup(props) {
    const loading = ref(true);
    const saving = ref(false);
    let client: StreamEngineClient | undefined;
    const original = ref<FormFlowBusiness>();
    const activeTab = ref<"basic" | "form" | "process">("basic");
    const selectedField = ref<string>();
    const mobilePreview = ref(false);
    const processScale = ref(100);
    const nodeConfigTab = ref<"properties" | "outer" | "inner" | "advanced" | "operations">("properties");
    const advancedOpen = ref(false);
    const webhookOpen = ref(false);
    const webhookIndex = ref<number>();
    const webhookForm = reactive({ url: "", token: "", triggerNode: ["FLOW_END"] as string[] });
    const expandedGroups = reactive<Record<string, boolean>>({});
    const selectedNode = ref<string>();
    const insertMenu = ref<string>();
    const applications = ref<Array<{ label: string; value: string }>>([]);
    const formGroups = ref<FormFlowGroup[]>([]);
    const workOrderSettings = reactive(initialWorkOrderSettings(props.groupId));
    const controlApplication = (): string | undefined =>
      props.workOrder ? workOrderCatalogApplication({ code: props.applicationCode, name: props.applicationName }) : draft.application;
    const postOptions = ref<Array<{ label: string; value: string }>>([]);
    const appointmentOptions = ref<Array<{ label: string; value: string }>>([]);
    const orgLoading = ref(false);
    let orgVersion = 0;
    const draft = reactive({
      name: props.workOrder ? "未命名表单" : "",
      application: undefined as string | undefined,
      remark: props.workOrder ? "备注说明" : "",
      autoRemoveDuplication: false,
      autoApprovalPrinting: false,
      publicForm: false,
      webhookConfigVOList: [] as Array<{ url: string; token: string; triggerNode: string }>,
    });
    const formItems = ref<FormSchemaItem[]>([]);
    const flowRoot = ref<FlowNode | null>(null);

    const loadOrgOptions = async (type: string): Promise<void> => {
      if (!client || !["POST", "APPOINTMENT"].includes(type)) return;
      const current = ++orgVersion;
      orgLoading.value = true;
      try {
        const raw = type === "POST" ? await client.listPositions() : (await client.pageAppointments()).records;
        const options = raw.flatMap((row) => {
          if (!row || typeof row !== "object") return [];
          const item = row as Record<string, unknown>;
          const id = item.id ?? item.code;
          return id == null ? [] : [{ label: String(item.name ?? item.label ?? id), value: String(id) }];
        });
        if (current !== orgVersion) return;
        if (type === "POST") postOptions.value = options;
        else appointmentOptions.value = options;
      } catch (error) {
        if (current === orgVersion) message.error(error instanceof Error ? error.message : "组织数据加载失败");
      } finally {
        if (current === orgVersion) orgLoading.value = false;
      }
    };

    const registerFieldPermissions = (item: FormSchemaItem): void => {
      const id = String(item.id);
      const visit = (node: FlowNode | null): void => {
        if (!node) return;
        if (["ROOT", "APPROVAL", "CC"].includes(node.type)) {
          node.props ??= {};
          for (const key of ["formPerms", "outerFormPerms"]) {
            const perms = Array.isArray(node.props[key]) ? (node.props[key] as unknown[]) : [];
            perms.push({ id, perm: node.type === "ROOT" ? "E" : "R", required: Boolean(item.props?.required), title: item.title });
            node.props[key] = perms;
          }
        }
        node.branchs?.forEach(visit);
        visit(node.children ?? null);
      };
      visit(flowRoot.value);
    };

    const addControl = (control: { id: string; title: string; name: string; valueType: string }, group: string): void => {
      if (!availableFormControlGroups(controlApplication()).some((entry) => entry.title === group)) return;
      const item = createFormItem(control, group);
      formItems.value = [...formItems.value, item];
      selectedField.value = String(item.id);
      registerFieldPermissions(item);
    };

    const addNestedControl = (parentId: string, control: FormControlDefinition, group: string): void => {
      const parent = findFormItemById(formItems.value, parentId);
      if (!parent || parent.name !== "GroupList" || control.id === "GroupList") return;
      const item = createFormItem(control, group);
      parent.props ??= {};
      parent.props.items = [...(Array.isArray(parent.props.items) ? (parent.props.items as FormSchemaItem[]) : []), item];
      selectedField.value = String(item.id);
      registerFieldPermissions(item);
    };

    const removeItem = (id: string): void => {
      const target = findFormItemById(formItems.value, id);
      const ids = new Set(target ? flattenFormItems([target]).map((item) => String(item.id)) : [id]);
      const prune = (items: FormSchemaItem[]): FormSchemaItem[] =>
        items
          .filter((item) => !ids.has(String(item.id)))
          .map((item) => {
            if (item.name === "GroupList" && Array.isArray(item.props?.items))
              item.props.items = prune(item.props.items as FormSchemaItem[]);
            return item;
          });
      formItems.value = prune(formItems.value);
      if (selectedField.value && ids.has(selectedField.value)) selectedField.value = undefined;
      const visit = (node: FlowNode | null): void => {
        if (!node) return;
        if (node.type === "CONDITION" && Array.isArray(node.props?.groups)) {
          for (const group of node.props.groups as ConditionGroup[]) {
            group.cids = group.cids.filter((cid) => !ids.has(cid));
            group.conditions = group.conditions.filter((condition) => !ids.has(condition.id));
          }
        }
        for (const key of ["formPerms", "outerFormPerms"]) {
          if (Array.isArray(node.props?.[key])) {
            node.props![key] = (node.props![key] as Array<{ id?: string }>).filter((entry) => !ids.has(String(entry.id)));
          }
        }
        node.branchs?.forEach(visit);
        visit(node.children ?? null);
      };
      visit(flowRoot.value);
    };

    const moveItem = (id: string, targetIndex: number): void => {
      const sourceIndex = formItems.value.findIndex((item) => item.id === id);
      if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= formItems.value.length || sourceIndex === targetIndex) return;
      const next = [...formItems.value];
      const [item] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, item!);
      formItems.value = next;
    };

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        client = await props.getClient();
        const [groups, detail] = await Promise.all([
          props.workOrder ? client.listFormFlowGroups({ application: props.applicationCode }) : client.listFormFlowApplications(),
          props.formId
            ? props.workOrder
              ? client.getCustomFormFlow(props.formId)
              : client.getFormFlow(props.formId)
            : Promise.resolve(undefined),
        ]);
        if (props.workOrder) formGroups.value = groups as FormFlowGroup[];
        else
          applications.value = groups
            .map((item) => {
              const record = item as Record<string, unknown>;
              return {
                label: String(record.name ?? record.label ?? record.code ?? ""),
                value: String(record.code ?? record.value ?? record.id ?? ""),
              };
            })
            .filter((item) => item.value);
        if (!detail) {
          flowRoot.value = {
            id: "root",
            parentId: null,
            type: "ROOT",
            name: "发起人",
            desc: "任何人",
            props: {
              assignedUser: [],
              formPerms: [],
              outerFormPerms: [],
              operateAlias: [
                { code: "ADD", name: "发起申请", alias: "", perm: "S" },
                { code: "REPEAT", name: "再次发起", alias: "", perm: "S" },
                { code: "UNDO", name: "撤销", alias: "", perm: "S" },
              ],
            },
            children: {} as FlowNode,
          };
          return;
        }
        original.value = detail;
        if (props.workOrder) Object.assign(workOrderSettings, restoreWorkOrderSettings(detail));
        draft.name = String(detail.name ?? "");
        draft.application = detail.application == null ? undefined : String(detail.application);
        draft.remark = String(detail.remark ?? "");
        draft.autoRemoveDuplication = Boolean(detail.autoRemoveDuplication);
        draft.autoApprovalPrinting = Boolean(detail.autoApprovalPrinting);
        draft.publicForm = Boolean(detail.publicForm);
        draft.webhookConfigVOList = Array.isArray(detail.webhookConfigVOList)
          ? detail.webhookConfigVOList.map((entry) => ({
              url: String(entry.url ?? ""),
              token: String(entry.token ?? ""),
              triggerNode: String(entry.triggerNode ?? ""),
            }))
          : [];
        formItems.value = parseSchema(String(detail.formJson ?? "[]"));
        if (props.workOrder)
          for (const item of flattenFormItems(formItems.value)) {
            if (item.name === "GroupList") {
              item.props ??= {};
              item.props.closeAddChild ??= true;
            }
          }
        flowRoot.value = parseFlow(detail.flowJson);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "表单加载失败");
      } finally {
        loading.value = false;
      }
    };

    const save = async (): Promise<void> => {
      if (!client || saving.value) {
        return;
      }
      const nameIssue = designNameIssue(draft.name);
      if (nameIssue) {
        message.warning(nameIssue);
        activeTab.value = "basic";
        return;
      }
      if (props.workOrder) {
        const errors = validateWorkOrderBase(draft.name, workOrderSettings);
        if (errors.length) {
          message.warning(errors[0]);
          activeTab.value = "basic";
          return;
        }
      } else if (!draft.application) {
        message.warning("请选择业务应用");
        activeTab.value = "basic";
        return;
      }
      if (props.formType !== "FLOW" && formItems.value.length === 0) {
        message.warning("请先配置审批表单");
        activeTab.value = "form";
        return;
      }
      if (draft.publicForm && !formItems.value.some((item) => item.name === "OutsiderConcat")) {
        message.warning("公开表单必须设置外部联系人组件");
        activeTab.value = "form";
        return;
      }
      if (props.formType !== "FLOW") {
        const errors = validateDesignItems(formItems.value);
        if (errors.length) {
          message.warning(errors[0]);
          activeTab.value = "form";
          return;
        }
      }
      if (props.formType !== "FORM" && !flowRoot.value?.id) {
        message.warning("审批流程配置缺失，无法发布");
        activeTab.value = "process";
        return;
      }
      const publishFlow = props.formType === "FORM" ? null : prepareProcessForPublish(flowRoot.value, formItems.value);
      if (props.formType !== "FORM") {
        const errors = validateProcessDesign(publishFlow);
        if (errors.length) {
          message.warning(errors[0]!.message);
          selectedNode.value = errors[0]!.nodeId;
          nodeConfigTab.value = "properties";
          activeTab.value = "process";
          return;
        }
      }
      saving.value = true;
      try {
        const payload = {
          id: props.formId || null,
          name: draft.name.trim(),
          type: original.value?.type ?? props.formType,
          application: draft.application,
          enable: original.value?.enable ?? true,
          remark: draft.remark,
          autoRemoveDuplication: draft.autoRemoveDuplication,
          autoApprovalPrinting: draft.autoApprovalPrinting,
          publicForm: draft.publicForm ? 1 : 0,
          webhookConfigVOList: draft.webhookConfigVOList,
          flowJson: props.formType === "FORM" ? null : JSON.stringify(publishFlow),
          formJson: props.formType === "FLOW" ? null : JSON.stringify(formItems.value),
          qrCodeUrl: original.value?.qrCodeUrl ?? `${location.origin}/streamengineH5/public-form/?processType=ADD`,
        };
        if (props.workOrder)
          await client.saveCustomFormFlow(
            buildWorkOrderPayload(payload, workOrderSettings, {
              formId: props.formId,
              isCopy: props.isCopy,
              formType: props.formType,
              applicationCode: props.applicationCode,
              origin: location.origin,
            }),
          );
        else await client.saveFormFlow(payload);
        message.success("发布成功");
        if (props.onPublished) props.onPublished();
        else props.onNavigate?.({ page: "FlowformList" });
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    onMounted(() => {
      void load();
    });

    const openWebhook = (index?: number): void => {
      webhookIndex.value = index;
      const saved = index === undefined ? undefined : draft.webhookConfigVOList[index];
      webhookForm.url = saved?.url ?? "";
      webhookForm.token = saved?.token ?? "";
      webhookForm.triggerNode = saved?.triggerNode ? saved.triggerNode.split(",").filter(Boolean) : ["FLOW_END"];
      webhookOpen.value = true;
    };

    const saveWebhook = (): void => {
      if (!webhookForm.url.trim()) {
        message.warning("请输入URL");
        return;
      }
      if (!webhookForm.triggerNode.length) {
        message.warning("请选择触发来源");
        return;
      }
      const next = { url: webhookForm.url.trim(), token: webhookForm.token.trim(), triggerNode: webhookForm.triggerNode.join(",") };
      if (webhookIndex.value === undefined) draft.webhookConfigVOList.push(next);
      else draft.webhookConfigVOList[webhookIndex.value] = next;
      webhookOpen.value = false;
    };

    const handleInsert = (parent: FlowNode, type: "APPROVAL" | "CC" | "CONDITIONS"): void => {
      const created = insertFlowNode(parent, type, formItems.value);
      selectedNode.value = created.id;
      nodeConfigTab.value = "properties";
      insertMenu.value = undefined;
    };

    const handleRemove = (node: FlowNode): void => {
      if (!removeFlowNode(flowRoot.value, node.id)) {
        message.warning("该分支至少保留两个条件，删除分支前请先删除其中的节点");
        return;
      }
      if (selectedNode.value === node.id) selectedNode.value = undefined;
    };

    const conditionFields = (): FormSchemaItem[] => processConditionFields(formItems.value);

    const groupsFor = (node: FlowNode): ConditionGroup[] =>
      Array.isArray(node.props?.groups) ? (node.props.groups as ConditionGroup[]) : [];

    const approvalNodeOptions = (): Array<{ label: string; value: string }> => {
      const result: Array<{ label: string; value: string }> = [];
      const visit = (current: FlowNode | null): void => {
        if (!current?.id) return;
        if (["ROOT", "APPROVAL"].includes(current.type)) result.push({ label: current.name, value: current.id });
        current.branchs?.forEach(visit);
        visit(current.children ?? null);
      };
      visit(flowRoot.value);
      return result;
    };

    const addConditionGroup = (node: FlowNode): void => {
      node.props ??= {};
      const groups = groupsFor(node);
      groups.push({ groupType: "AND", cids: [], conditions: [] });
      node.props.groups = groups;
    };

    const addCondition = (group: ConditionGroup, fieldId: string): void => {
      const item = conditionFields().find((field) => field.id === fieldId);
      if (!item || group.cids.includes(fieldId)) return;
      group.cids.push(fieldId);
      group.conditions.push({
        id: fieldId,
        title: item.title ?? fieldId,
        name: item.name,
        valueType: item.valueType,
        compare: "=",
        value: [],
      });
    };

    const permissionFields = (): FormSchemaItem[] => flattenFormItems(formItems.value).filter((item) => item.name !== "GroupList");
    const permissionValue = (node: FlowNode, scope: "inner" | "outer", item: FormSchemaItem): string => {
      const key = scope === "outer" ? "outerFormPerms" : "formPerms";
      const rows = Array.isArray(node.props?.[key]) ? (node.props[key] as Array<{ id: string; perm: string }>) : [];
      return rows.find((entry) => String(entry.id) === String(item.id))?.perm ?? (node.type === "ROOT" ? "E" : "R");
    };
    const setPermission = (node: FlowNode, scope: "inner" | "outer", item: FormSchemaItem, perm: string): void => {
      node.props ??= {};
      const key = scope === "outer" ? "outerFormPerms" : "formPerms";
      const rows = Array.isArray(node.props[key])
        ? (node.props[key] as Array<{ id: string; perm: string; title?: string; required?: boolean }>)
        : [];
      const existing = rows.find((entry) => String(entry.id) === String(item.id));
      if (existing) {
        existing.perm = perm;
        existing.title = item.title;
        existing.required = Boolean(item.props?.required);
      } else rows.push({ id: String(item.id), title: item.title, required: Boolean(item.props?.required), perm });
      node.props[key] = rows;
    };
    const renderPermissions = (node: FlowNode, scope: "inner" | "outer"): VNode => {
      const fields = permissionFields();
      const columns = [
        {
          title: "表单字段",
          dataIndex: "title",
          customRender: ({ record }: { record: FormSchemaItem }) => (
            <span>
              {record.props?.required ? <em class={styles.requiredMark}>* </em> : null}
              {record.title}
            </span>
          ),
        },
        ...["R", ...(node.type === "CC" ? [] : ["E"]), "H"].map((perm) => ({
          title: (
            <button
              type="button"
              class={styles.permissionHead}
              onClick={() => fields.forEach((item) => setPermission(node, scope, item, perm))}
            >
              {perm === "R" ? "只读" : perm === "E" ? "可编辑" : "隐藏"}
            </button>
          ),
          width: 84,
          customRender: ({ record }: { record: FormSchemaItem }) => (
            <Radio checked={permissionValue(node, scope, record) === perm} onChange={() => setPermission(node, scope, record, perm)} />
          ),
        })),
      ];
      return (
        <div class={styles.permissionTable}>
          <Table rowKey="id" size="small" bordered pagination={false} dataSource={fields} columns={columns} />
        </div>
      );
    };

    type OperateEntry = { code: string; name: string; alias?: string; perm?: string };
    const operateEntries = (node: FlowNode): OperateEntry[] =>
      Array.isArray(node.props?.operateAlias) ? (node.props.operateAlias as OperateEntry[]) : [];
    const renderOperations = (node: FlowNode): VNode => {
      const rows = operateEntries(node);
      const setAll = (perm: string): void => {
        rows.forEach((row) => {
          row.perm = perm;
        });
      };
      return (
        <div class={styles.permissionTable}>
          <Table
            rowKey="code"
            size="small"
            bordered
            pagination={false}
            dataSource={rows}
            columns={[
              { title: "操作名称", dataIndex: "name" },
              {
                title: "操作别名",
                customRender: ({ record }: { record: OperateEntry }) => (
                  <Input
                    value={record.alias ?? ""}
                    onUpdate:value={(value: string) => {
                      record.alias = value;
                    }}
                  />
                ),
              },
              {
                title: (
                  <button type="button" class={styles.permissionHead} onClick={() => setAll("S")}>
                    显示
                  </button>
                ),
                width: 72,
                customRender: ({ record }: { record: OperateEntry }) => (
                  <Radio
                    checked={(record.perm ?? "S") === "S"}
                    onChange={() => {
                      record.perm = "S";
                    }}
                  />
                ),
              },
              {
                title: (
                  <button type="button" class={styles.permissionHead} onClick={() => setAll("H")}>
                    隐藏
                  </button>
                ),
                width: 72,
                customRender: ({ record }: { record: OperateEntry }) => (
                  <Radio
                    checked={record.perm === "H"}
                    onChange={() => {
                      record.perm = "H";
                    }}
                  />
                ),
              },
            ]}
          />
        </div>
      );
    };

    type NamedUser = { id: string; name: string };
    type Reminder = ApprovalReminder;
    type LimitConfig = LimitTimeConfig;
    const newReminder = (): Reminder => ({
      value: null,
      unit: "DAY",
      notifyType: "currentApproval",
      notifyUsers: [],
      notifyRole: [],
      notifyPost: [],
      notifyAppointment: [],
      formUser: null,
    });
    const ensureLimitConfig = (node: FlowNode): void => {
      node.props ??= {};
      node.props.limitTimeApprovalConfig = normalizeLimitTimeConfig(node.props.limitTimeApprovalConfig);
    };
    const renderAdvanced = (node: FlowNode): VNode => {
      const config = node.props?.limitTimeApprovalConfig as LimitConfig | undefined;
      const update = (key: string, value: boolean): void => {
        node.props ??= {};
        node.props[key] = value;
        if (key === "limitTimeApproval" && value && !node.props.limitTimeApprovalConfig) ensureLimitConfig(node);
      };
      return (
        <Form layout="horizontal" class={styles.advancedNodeForm}>
          {(
            [
              ["countersign", "是否支持加签"],
              ["sign", "手写签名"],
              ["opinion", "审批意见"],
              ["designatedApprover", "指定审批人"],
              ["limitTimeApproval", "限时审批"],
            ] as const
          ).map(([key, label]) => (
            <FormItem label={label} key={key}>
              <Switch checked={Boolean(node.props?.[key])} onUpdate:checked={(value) => update(key, Boolean(value))} />
            </FormItem>
          ))}
          {node.props?.sign ? (
            <FormItem label="使用上次签名">
              <Checkbox
                checked={Boolean((node.props.signConfig as { useLastSign?: boolean } | undefined)?.useLastSign)}
                onUpdate:checked={(value) => {
                  node.props ??= {};
                  node.props.signConfig = { ...(node.props.signConfig as object | undefined), useLastSign: Boolean(value) };
                }}
              />
            </FormItem>
          ) : null}
          {node.props?.limitTimeApproval && config ? (
            <div class={styles.limitSettings}>
              <Checkbox
                checked={config.limitTimeNotify.checked}
                onUpdate:checked={(checked) => {
                  config.limitTimeNotify.checked = Boolean(checked);
                }}
              >
                限时提醒
              </Checkbox>
              {config.limitTimeNotify.checked ? (
                <div>
                  {config.limitTimeNotify.approvalReminder.map((reminder, index) => (
                    <div class={styles.reminderRow} key={index}>
                      <span>流程到达该审批节点超过</span>
                      <InputNumber
                        value={reminder.value ?? undefined}
                        min={reminder.unit === "MINUTE" ? 5 : 1}
                        onUpdate:value={(value) => {
                          reminder.value = value == null ? null : Number(value);
                        }}
                      />
                      <Select
                        value={reminder.unit}
                        options={[
                          { label: "分", value: "MINUTE" },
                          { label: "时", value: "HOUR" },
                          { label: "天", value: "DAY" },
                        ]}
                        onUpdate:value={(value) => {
                          reminder.unit = String(value);
                          if (reminder.unit === "MINUTE" && reminder.value && reminder.value < 5) reminder.value = 5;
                        }}
                      />
                      <span>未处理时提醒</span>
                      <Button
                        type="link"
                        onClick={() => {
                          config.limitTimeNotify.approvalReminder.push(newReminder());
                        }}
                      >
                        ＋
                      </Button>
                      {index ? (
                        <Button
                          type="link"
                          danger
                          onClick={() => {
                            config.limitTimeNotify.approvalReminder.splice(index, 1);
                          }}
                        >
                          删除
                        </Button>
                      ) : null}
                      <Select
                        value={reminder.notifyType}
                        style={{ width: "100%" }}
                        options={[
                          { label: "当前审批人", value: "currentApproval" },
                          { label: "指定人员", value: "DESIGNATED_PERSONNEL" },
                          { label: "角色", value: "ROLE" },
                          { label: "管理部门职位", value: "POST" },
                          { label: "所在部门岗位", value: "APPOINTMENT" },
                          { label: "表单内联系人", value: "FORM_USER" },
                        ]}
                        onUpdate:value={(value) => {
                          reminder.notifyType = String(value);
                          void loadOrgOptions(String(value));
                        }}
                      />
                      {reminder.notifyType === "DESIGNATED_PERSONNEL" ? (
                        <UserPickerControl
                          value={reminder.notifyUsers}
                          getOuaaClient={props.getOuaaClient}
                          multiple
                          onUpdate:value={(value: NamedUser[]) => {
                            reminder.notifyUsers = value;
                          }}
                        />
                      ) : null}
                      {reminder.notifyType === "ROLE" ? (
                        <ProcessRolePicker
                          value={reminder.notifyRole}
                          client={client}
                          onUpdate:value={(value: NamedUser[]) => {
                            reminder.notifyRole = value;
                          }}
                        />
                      ) : null}
                      {reminder.notifyType === "POST" ? (
                        <Select
                          mode="multiple"
                          value={reminder.notifyPost.map((item) => item.id)}
                          options={postOptions.value}
                          loading={orgLoading.value}
                          style={{ width: "100%" }}
                          onUpdate:value={(value) => {
                            reminder.notifyPost = (Array.isArray(value) ? value : []).map((id) => ({
                              id: String(id),
                              name: postOptions.value.find((option) => option.value === String(id))?.label ?? String(id),
                            }));
                          }}
                        />
                      ) : null}
                      {reminder.notifyType === "APPOINTMENT" ? (
                        <Select
                          mode="multiple"
                          value={(reminder.notifyAppointment ?? []).map((item) => item.id)}
                          options={appointmentOptions.value}
                          loading={orgLoading.value}
                          style={{ width: "100%" }}
                          onUpdate:value={(value) => {
                            reminder.notifyAppointment = (Array.isArray(value) ? value : []).map((id) => ({
                              id: String(id),
                              name: appointmentOptions.value.find((option) => option.value === String(id))?.label ?? String(id),
                            }));
                          }}
                        />
                      ) : null}
                      {reminder.notifyType === "FORM_USER" ? (
                        <Select
                          value={reminder.formUser ?? undefined}
                          options={permissionFields()
                            .filter((item) => ["UserPicker", "TelPhone"].includes(String(item.name)))
                            .map((item) => ({ label: String(item.title), value: String(item.id) }))}
                          placeholder="请选择表单人员项"
                          style={{ width: "100%" }}
                          onUpdate:value={(value) => {
                            reminder.formUser = value == null ? null : String(value);
                          }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div class={styles.limitApproval}>
                <Checkbox
                  checked={config.limitTimeApproval.checked}
                  onUpdate:checked={(checked) => {
                    config.limitTimeApproval.checked = Boolean(checked);
                  }}
                >
                  限时审批
                </Checkbox>
              </div>
              {config.limitTimeApproval.checked ? (
                <div class={styles.reminderRow}>
                  <span>流程到达该审批节点超过</span>
                  <InputNumber
                    value={config.limitTimeApproval.value ?? undefined}
                    min={config.limitTimeApproval.unit === "MINUTE" ? 5 : 1}
                    onUpdate:value={(value) => {
                      config.limitTimeApproval.value = value == null ? null : Number(value);
                    }}
                  />
                  <Select
                    value={config.limitTimeApproval.unit}
                    options={[
                      { label: "分", value: "MINUTE" },
                      { label: "时", value: "HOUR" },
                      { label: "天", value: "DAY" },
                    ]}
                    onUpdate:value={(value) => {
                      config.limitTimeApproval.unit = String(value);
                    }}
                  />
                  <span>未处理时</span>
                  <Select
                    value={config.limitTimeApproval.type}
                    options={[
                      { label: "自动通过", value: "PASS" },
                      { label: "自动转交", value: "TRANSFER" },
                    ]}
                    onUpdate:value={(value) => {
                      config.limitTimeApproval.type = String(value);
                    }}
                  />
                  {config.limitTimeApproval.type === "TRANSFER" ? (
                    <UserPickerControl
                      value={config.limitTimeApproval.targetUsers}
                      getOuaaClient={props.getOuaaClient}
                      multiple
                      onUpdate:value={(value: NamedUser[]) => {
                        config.limitTimeApproval.targetUsers = value;
                        config.limitTimeApproval.targetAccount = value.map((item) => item.id).join(",");
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </Form>
      );
    };

    const renderInsert = (node: FlowNode): VNode => (
      <div class={styles.insertArea}>
        <button
          class={styles.insertButton}
          type="button"
          aria-label={`在${node.name || "分支"}后添加节点`}
          onClick={() => {
            insertMenu.value = insertMenu.value === node.id ? undefined : node.id;
          }}
        >
          ＋
        </button>
        {insertMenu.value === node.id ? (
          <div class={styles.insertMenu}>
            <strong>添加流程节点</strong>
            <div class={styles.insertOptions}>
              <button type="button" onClick={() => handleInsert(node, "APPROVAL")}>
                <span class={styles.approvalIcon}>
                  <RocketOutlined />
                </span>
                审批人
              </button>
              <button type="button" onClick={() => handleInsert(node, "CC")}>
                <span class={styles.ccIcon}>
                  <BellOutlined />
                </span>
                抄送人
              </button>
              <button type="button" onClick={() => handleInsert(node, "CONDITIONS")}>
                <span class={styles.branchIcon}>
                  <AppstoreOutlined />
                </span>
                条件分支
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );

    const renderNode = (node: FlowNode | null): VNode | null => {
      if (!node?.id) return null;
      if (node.type === "EMPTY")
        return (
          <div class={styles.nodeColumn} key={node.id}>
            {renderInsert(node)}
            {renderNode(node.children ?? null)}
          </div>
        );
      if (node.type === "CONDITIONS")
        return (
          <div class={styles.nodeColumn} key={node.id}>
            <button
              class={styles.addBranch}
              type="button"
              onClick={() => {
                const branch = addConditionBranch(node);
                if (branch) selectedNode.value = branch.id;
              }}
            >
              ＋ 添加条件
            </button>
            <div class={styles.branches}>{node.branchs?.map((branch) => renderNode(branch))}</div>
            {renderNode(node.children ?? null)}
          </div>
        );
      const assigned = asIdNameList(node.props?.assignedUser);
      const summary =
        node.type === "ROOT"
          ? assigned.length
            ? assigned.map((item) => item.name).join("、")
            : "所有人"
          : node.type === "CONDITION"
            ? "请设置条件"
            : assignmentSummary(node, formItems.value);
      return (
        <div class={styles.nodeColumn} key={node.id}>
          <div class={[styles.nodeCard, selectedNode.value === node.id ? styles.nodeSelected : ""]}>
            <div
              class={[
                styles.nodeTitle,
                node.type === "ROOT"
                  ? styles.rootTitle
                  : node.type === "CONDITION"
                    ? styles.conditionTitle
                    : node.type === "CC"
                      ? styles.ccTitle
                      : "",
              ]}
            >
              <span>{node.name || node.type}</span>
              {node.type !== "ROOT" ? (
                <PopConfirm title={`确认删除${node.name || "节点"}？`} okText="确定" cancelText="取消" onConfirm={() => handleRemove(node)}>
                  <button type="button" aria-label={`删除${node.name}`}>
                    ×
                  </button>
                </PopConfirm>
              ) : null}
            </div>
            <button
              class={styles.nodeBody}
              type="button"
              onClick={() => {
                selectedNode.value = node.id;
                nodeConfigTab.value = node.type === "ROOT" ? "inner" : "properties";
                void loadOrgOptions(String(node.props?.assignedType ?? ""));
              }}
            >
              <span class={styles.nodeSummary}>
                {summary} <span>›</span>
              </span>
            </button>
          </div>
          {renderInsert(node)}
          {renderNode(node.children ?? null)}
        </div>
      );
    };

    return () => {
      if (loading.value) {
        return (
          <PageLayout
            showHeader={false}
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
      const selected = findFormItemById(formItems.value, selectedField.value);
      const node = findFlowNode(flowRoot.value, selectedNode.value);
      const conditionParent = node?.type === "CONDITION" ? findFlowNode(flowRoot.value, node.parentId ?? undefined) : undefined;
      const tabs = [
        { key: "basic", label: "基础信息" },
        { key: "form", label: "审批表单" },
        { key: "process", label: "审批流程" },
      ] as const;
      const header = (
        <div class={styles.header}>
          <Button
            shape="circle"
            aria-label="返回"
            onClick={() => {
              if (props.onClose) props.onClose();
              else props.onNavigate?.({ page: "FlowformList" });
            }}
          >
            ‹
          </Button>
          <span class={styles.formName}>{draft.name || "未命名表单"}</span>
          <div class={styles.tabs}>
            {tabs
              .filter(
                (tab) =>
                  ["FLOW_FORM", "CUSTOM_FORM"].includes(props.formType) ||
                  tab.key === "basic" ||
                  (props.formType === "FORM" ? tab.key === "form" : tab.key === "process"),
              )
              .map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  class={[styles.tab, activeTab.value === tab.key ? styles.activeTab : ""]}
                  onClick={() => {
                    activeTab.value = tab.key;
                  }}
                >
                  {tab.label}
                </button>
              ))}
          </div>
          <Button type="primary" loading={saving.value} onClick={() => void save()}>
            发布
          </Button>
        </div>
      );
      const slots = {
        "layout-content": () => (
          <div class={styles.designPage}>
            {header}
            <div class={styles.body}>
              {activeTab.value === "basic" ? (
                <div class={styles.basic}>
                  <Form layout="vertical" model={draft}>
                    <h3>基本信息</h3>
                    {props.workOrder ? (
                      <WorkOrderBaseSettings
                        name={draft.name}
                        settings={workOrderSettings}
                        groups={formGroups.value}
                        client={client}
                        getOuaaClient={props.getOuaaClient}
                        onUpdate:name={(value: string) => {
                          draft.name = value;
                        }}
                      />
                    ) : (
                      <>
                        <FormItem label="表单名称" required>
                          <Input
                            value={draft.name}
                            maxlength={20}
                            showCount
                            placeholder="请输入表单名称"
                            onUpdate:value={(value: string) => {
                              draft.name = value;
                            }}
                          />
                        </FormItem>
                        <FormItem label="业务应用" required>
                          <Select
                            value={draft.application}
                            options={applications.value}
                            placeholder="请选择业务应用"
                            style={{ width: "100%" }}
                            onUpdate:value={(value) => {
                              draft.application = value == null ? undefined : String(value);
                            }}
                          />
                        </FormItem>
                      </>
                    )}
                    <FormItem label="表单说明">
                      <Textarea
                        value={draft.remark}
                        maxlength={200}
                        showCount
                        rows={2}
                        placeholder="请输入表单说明"
                        onUpdate:value={(value: string) => {
                          draft.remark = value;
                        }}
                      />
                    </FormItem>
                    <h3>配置信息</h3>
                    <div class={styles.configCards}>
                      <div>
                        <span>
                          自动去重{" "}
                          <Switch
                            checked={draft.autoRemoveDuplication}
                            onUpdate:checked={(value) => {
                              draft.autoRemoveDuplication = Boolean(value);
                            }}
                          />
                        </span>
                        <small>审批人重复出现时只需审批一次</small>
                      </div>
                      <div>
                        <span>
                          自动通过打印展示{" "}
                          <Switch
                            checked={draft.autoApprovalPrinting}
                            onUpdate:checked={(value) => {
                              draft.autoApprovalPrinting = Boolean(value);
                            }}
                          />
                        </span>
                        <small>打印时展示自动通过的节点信息</small>
                      </div>
                      <div>
                        <span>
                          公开表单{" "}
                          <Switch
                            checked={draft.publicForm}
                            onUpdate:checked={(value) => {
                              draft.publicForm = Boolean(value);
                            }}
                          />
                        </span>
                        <small>允许外部人员发起工单</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      class={styles.advancedToggle}
                      aria-expanded={advancedOpen.value}
                      onClick={() => {
                        advancedOpen.value = !advancedOpen.value;
                      }}
                    >
                      <span>高级功能</span>
                      {advancedOpen.value ? <CaretDownOutlined /> : <CaretRightOutlined />}
                    </button>
                    {advancedOpen.value ? (
                      <div class={styles.webhookPanel}>
                        <div class={styles.webhookHeader}>
                          <span>WebHooks</span>
                          <Button type="link" onClick={() => openWebhook()}>
                            新增一项
                          </Button>
                        </div>
                        {draft.webhookConfigVOList.length ? (
                          draft.webhookConfigVOList.map((entry, index) => (
                            <div class={styles.webhookRow} key={`${entry.url}-${index}`}>
                              <span>{entry.url}</span>
                              <Button type="link" onClick={() => openWebhook(index)}>
                                编辑
                              </Button>
                              <PopConfirm
                                title="确认删除该 WebHook？"
                                okText="确定"
                                cancelText="取消"
                                onConfirm={() => {
                                  draft.webhookConfigVOList.splice(index, 1);
                                }}
                              >
                                <Button type="link" danger>
                                  删除
                                </Button>
                              </PopConfirm>
                            </div>
                          ))
                        ) : (
                          <div class={styles.webhookEmpty}>暂无 WebHooks 配置，请点击新增一项</div>
                        )}
                      </div>
                    ) : null}
                  </Form>
                </div>
              ) : null}
              {activeTab.value === "form" ? (
                <div class={styles.designer}>
                  <aside class={styles.catalog}>
                    <div class={styles.panelTitle}>组件库</div>
                    {availableFormControlGroups(controlApplication()).map((group) => (
                      <section key={group.title}>
                        <button
                          class={styles.catalogGroup}
                          type="button"
                          aria-expanded={Boolean(expandedGroups[group.title])}
                          onClick={() => {
                            expandedGroups[group.title] = !expandedGroups[group.title];
                          }}
                        >
                          <span>{group.title}</span>
                          {expandedGroups[group.title] ? <CaretDownOutlined /> : <CaretRightOutlined />}
                        </button>
                        {expandedGroups[group.title] ? (
                          <div class={styles.catalogGrid}>
                            {group.items.map((item, index) => (
                              <button
                                key={`${item.id}-${index}`}
                                type="button"
                                draggable
                                onDragstart={(event) => {
                                  event.dataTransfer?.setData("text/plain", `${group.title}:${index}`);
                                }}
                                onClick={() => addControl(item, group.title)}
                              >
                                <span class={styles.catalogIcon}>
                                  {item.id.includes("Date") || item.id.includes("Time") ? (
                                    <ClockCircleOutlined />
                                  ) : item.id.includes("File") ? (
                                    <CloudUploadOutlined />
                                  ) : item.id.includes("Alarm") ? (
                                    <BellOutlined />
                                  ) : item.id.includes("Related") ? (
                                    <LinkOutlined />
                                  ) : item.id.includes("Consumables") || item.id.includes("Target") ? (
                                    <ToolOutlined />
                                  ) : item.id.includes("Group") ? (
                                    <AppstoreOutlined />
                                  ) : (
                                    <EditOutlined />
                                  )}
                                </span>
                                <span>{item.title}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </section>
                    ))}
                  </aside>
                  <main
                    class={styles.canvas}
                    onDragover={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const token = event.dataTransfer?.getData("text/plain");
                      const [title, index] = token ? token.split(":") : [];
                      const group = CONTROL_GROUPS.find((entry) => entry.title === title);
                      const item = group?.items[Number(index)];
                      if (item && group) addControl(item, group.title);
                    }}
                  >
                    <div class={styles.canvasToolbar}>
                      表单画布{" "}
                      <span>
                        <button
                          type="button"
                          class={!mobilePreview.value ? styles.previewActive : ""}
                          onClick={() => {
                            mobilePreview.value = false;
                          }}
                        >
                          PC端
                        </button>
                        <button
                          type="button"
                          class={mobilePreview.value ? styles.previewActive : ""}
                          onClick={() => {
                            mobilePreview.value = true;
                          }}
                        >
                          移动端
                        </button>
                      </span>
                    </div>
                    <div class={styles.canvasScroll}>
                      <div class={[styles.canvasFields, mobilePreview.value ? styles.mobileCanvas : ""]}>
                        {formItems.value.length ? (
                          formItems.value.map((item, index) => (
                            <div
                              key={item.id}
                              class={[styles.canvasField, selectedField.value === item.id ? styles.selectedField : ""]}
                              style={{ width: mobilePreview.value ? "100%" : `${Math.min(100, Math.max(1, Number(item.width ?? 100)))}%` }}
                              draggable
                              onDragstart={(event) => {
                                event.dataTransfer?.setData("application/x-g2-form-field", String(item.id));
                              }}
                              onDragover={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                const sourceId = event.dataTransfer?.getData("application/x-g2-form-field");
                                if (sourceId) {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  moveItem(sourceId, index);
                                }
                              }}
                              onClick={() => {
                                selectedField.value = item.id;
                              }}
                            >
                              <div>
                                <span>
                                  {item.props?.required ? <em class={styles.requiredMark}>* </em> : null}
                                  {item.title}
                                </span>
                                <PopConfirm
                                  title="删除组件将连带移除流程中的条件和权限设置，确认删除？"
                                  okText="确定"
                                  cancelText="取消"
                                  onConfirm={() => removeItem(String(item.id))}
                                >
                                  <Button
                                    type="link"
                                    danger
                                    onClick={(event: MouseEvent) => {
                                      event.stopPropagation();
                                    }}
                                  >
                                    ×
                                  </Button>
                                </PopConfirm>
                              </div>
                              {renderControlPreview(
                                item,
                                (id) => {
                                  selectedField.value = id;
                                },
                                selectedField.value,
                              )}
                            </div>
                          ))
                        ) : (
                          <p class={styles.emptyCanvas}>请从左侧选择控件并拖至此处</p>
                        )}
                      </div>
                    </div>
                  </main>
                  <aside class={styles.properties}>
                    {selected ? (
                      <FormPropertyEditor
                        key={selected.id}
                        selected={selected}
                        formItems={formItems.value}
                        application={controlApplication()}
                        client={client}
                        onAddNested={addNestedControl}
                        onRemoveNested={removeItem}
                      />
                    ) : (
                      <p class={styles.emptyProperty}>😀 选中控件后在这里进行编辑</p>
                    )}
                  </aside>
                </div>
              ) : null}
              {activeTab.value === "process" ? (
                <div class={styles.processCanvas}>
                  <div class={styles.processZoom}>
                    <button
                      type="button"
                      aria-label="缩小流程"
                      disabled={processScale.value <= 40}
                      onClick={() => {
                        processScale.value = Math.max(40, processScale.value - 10);
                      }}
                    >
                      −
                    </button>
                    <span>{processScale.value}%</span>
                    <button
                      type="button"
                      aria-label="放大流程"
                      disabled={processScale.value >= 150}
                      onClick={() => {
                        processScale.value = Math.min(150, processScale.value + 10);
                      }}
                    >
                      ＋
                    </button>
                  </div>
                  <div class={styles.processTree} style={{ transform: `scale(${processScale.value / 100})` }}>
                    {renderNode(flowRoot.value)}
                    <div class={styles.endNode}>流程结束</div>
                  </div>
                  {node ? (
                    <aside class={styles.nodeProperties}>
                      <div class={styles.propertyHeader}>
                        <h3>{node.name || "节点设置"}</h3>
                        <button
                          type="button"
                          aria-label="关闭节点设置"
                          onClick={() => {
                            selectedNode.value = undefined;
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div class={styles.nodeTabs}>
                        {[
                          {
                            key: "properties",
                            label:
                              node.type === "ROOT"
                                ? "发起人"
                                : node.type === "CONDITION"
                                  ? "条件设置"
                                  : node.type === "CC"
                                    ? "设置抄送人"
                                    : "设置审批人",
                          },
                          { key: "outer", label: "表单权限设置(外部人员)" },
                          { key: "inner", label: "表单权限设置(系统内人员)" },
                          { key: "advanced", label: "高级设置" },
                          { key: "operations", label: "操作设置" },
                        ]
                          .filter((tab) => node.type !== "CONDITION" || tab.key === "properties")
                          .filter((tab) => node.type === "APPROVAL" || tab.key !== "advanced")
                          .map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              class={nodeConfigTab.value === tab.key ? styles.nodeTabActive : ""}
                              onClick={() => {
                                nodeConfigTab.value = tab.key as typeof nodeConfigTab.value;
                                if (tab.key === "advanced") ensureLimitConfig(node);
                              }}
                            >
                              {tab.label}
                            </button>
                          ))}
                      </div>
                      {nodeConfigTab.value === "properties" ? (
                        <Form layout="vertical">
                          <FormItem label="节点名称">
                            <Input
                              value={node.name}
                              onUpdate:value={(value: string) => {
                                node.name = value;
                              }}
                            />
                          </FormItem>
                          {node.type === "ROOT" ? (
                            <>
                              <p class={styles.conditionHint}>不选择则默认开放给所有人</p>
                              <FormItem label="可发起人员">
                                <UserPickerControl
                                  value={
                                    Array.isArray(node.props?.assignedUser)
                                      ? (node.props.assignedUser as Array<{ id: string; name: string }>)
                                      : []
                                  }
                                  getOuaaClient={props.getOuaaClient}
                                  multiple
                                  onUpdate:value={(value: Array<{ id: string; name: string }>) => {
                                    node.props ??= {};
                                    node.props.assignedUser = value;
                                  }}
                                />
                              </FormItem>
                            </>
                          ) : null}
                          {node.type === "CONDITION" ? (
                            <>
                              <FormItem label="调整优先级">
                                <InputNumber
                                  min={1}
                                  max={conditionParent?.branchs?.length ?? 1}
                                  value={(conditionParent?.branchs?.findIndex((branch) => branch.id === node.id) ?? 0) + 1}
                                  onUpdate:value={(value) => {
                                    const branches = conditionParent?.branchs;
                                    const source = branches?.findIndex((branch) => branch.id === node.id) ?? -1;
                                    const target = Number(value) - 1;
                                    if (!branches || source < 0 || target < 0 || target >= branches.length || source === target) return;
                                    const moved = branches.splice(source, 1)[0]!;
                                    branches.splice(target, 0, moved);
                                  }}
                                />
                              </FormItem>
                              <FormItem label="条件组关系">
                                <Select
                                  value={String(node.props?.groupsType ?? "OR")}
                                  style={{ width: "100%" }}
                                  options={[
                                    { label: "或", value: "OR" },
                                    { label: "且", value: "AND" },
                                  ]}
                                  onUpdate:value={(value) => {
                                    node.props ??= {};
                                    node.props.groupsType = value;
                                  }}
                                />
                              </FormItem>
                              {groupsFor(node).map((group, groupIndex) => (
                                <div class={styles.conditionGroup} key={groupIndex}>
                                  <div class={styles.conditionGroupHeader}>
                                    <strong>条件组 {groupIndex + 1}</strong>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        groupsFor(node).splice(groupIndex, 1);
                                      }}
                                    >
                                      删除组
                                    </button>
                                  </div>
                                  <FormItem label="组内关系">
                                    <Select
                                      value={group.groupType}
                                      options={[
                                        { label: "且", value: "AND" },
                                        { label: "或", value: "OR" },
                                      ]}
                                      style={{ width: "100%" }}
                                      onUpdate:value={(value) => {
                                        group.groupType = String(value);
                                      }}
                                    />
                                  </FormItem>
                                  {group.conditions.map((condition, conditionIndex) => (
                                    <div class={styles.conditionRow} key={condition.id}>
                                      <div class={styles.conditionGroupHeader}>
                                        <span>{condition.title}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            group.cids.splice(group.cids.indexOf(condition.id), 1);
                                            group.conditions.splice(conditionIndex, 1);
                                          }}
                                        >
                                          ×
                                        </button>
                                      </div>
                                      <ProcessConditionControl
                                        condition={condition}
                                        field={findFormItemById(formItems.value, condition.id)}
                                        client={client}
                                        publicForm={draft.publicForm}
                                        getOuaaClient={props.getOuaaClient}
                                      />
                                    </div>
                                  ))}
                                  <Select
                                    placeholder="添加审批条件"
                                    value={undefined}
                                    options={conditionFields()
                                      .filter((item) => !group.cids.includes(String(item.id)))
                                      .map((item) => ({ label: String(item.title), value: String(item.id) }))}
                                    style={{ width: "100%" }}
                                    onUpdate:value={(value) => {
                                      if (value != null) addCondition(group, String(value));
                                    }}
                                  />
                                </div>
                              ))}
                              <Button onClick={() => addConditionGroup(node)}>＋ 添加条件组</Button>
                            </>
                          ) : null}
                          {node.type === "APPROVAL" || node.type === "CC" ? (
                            <>
                              <ProcessAssignmentControl
                                node={node}
                                fields={formItems.value}
                                client={client}
                                getOuaaClient={props.getOuaaClient}
                              />
                              {node.type === "APPROVAL" ? (
                                <>
                                  <FormItem label="审批人为空时">
                                    <Select
                                      value={String((node.props?.nobody as Record<string, unknown> | undefined)?.handler ?? "TO_PASS")}
                                      style={{ width: "100%" }}
                                      options={[
                                        { label: "指定人员审批", value: "TO_USER" },
                                        { label: "自动通过", value: "TO_PASS", disabled: editableRequired(node) },
                                        { label: "跳转外链", value: "TO_ADMIN" },
                                      ]}
                                      onUpdate:value={(value) => {
                                        node.props ??= {};
                                        node.props.nobody = { ...(node.props.nobody as object | undefined), handler: value };
                                      }}
                                    />
                                  </FormItem>
                                  {(node.props?.nobody as { handler?: string } | undefined)?.handler === "TO_USER" ? (
                                    <FormItem label="指定候补人员">
                                      <UserPickerControl
                                        value={
                                          Array.isArray((node.props?.nobody as { assignedUser?: unknown } | undefined)?.assignedUser)
                                            ? ((node.props?.nobody as { assignedUser?: Array<{ id: string; name: string }> } | undefined)
                                                ?.assignedUser ?? [])
                                            : []
                                        }
                                        getOuaaClient={props.getOuaaClient}
                                        multiple={false}
                                        onUpdate:value={(value: Array<{ id: string; name: string }>) => {
                                          node.props ??= {};
                                          node.props.nobody = { ...(node.props.nobody as object | undefined), assignedUser: value };
                                        }}
                                      />
                                    </FormItem>
                                  ) : null}
                                  <FormItem label="驳回策略">
                                    <Select
                                      value={String(node.props?.rejectStrategy ?? "TO_REJECT")}
                                      style={{ width: "100%" }}
                                      options={[
                                        { label: "驳回到上一节点", value: "TO_PREV_NODE" },
                                        { label: "驳回到指定节点", value: "TO_SELECT_NODE" },
                                        { label: "终止流程", value: "TO_REJECT" },
                                      ]}
                                      onUpdate:value={(value) => {
                                        node.props ??= {};
                                        node.props.rejectStrategy = value;
                                      }}
                                    />
                                  </FormItem>
                                  {node.props?.rejectStrategy === "TO_SELECT_NODE" ? (
                                    <FormItem label="指定驳回节点">
                                      <Select
                                        value={
                                          Array.isArray(node.props.rejectStrategyNode)
                                            ? String((node.props.rejectStrategyNode as Array<{ id?: string }>)[0]?.id ?? "") || undefined
                                            : undefined
                                        }
                                        options={approvalNodeOptions().filter((option) => option.value !== node.id)}
                                        placeholder="请选择节点"
                                        style={{ width: "100%" }}
                                        onUpdate:value={(value) => {
                                          node.props ??= {};
                                          const matched = approvalNodeOptions().find((option) => option.value === value);
                                          node.props.rejectStrategyNode = matched ? [{ id: matched.value, name: matched.label }] : [];
                                        }}
                                      />
                                    </FormItem>
                                  ) : null}
                                  <FormItem label="多人审批方式">
                                    <Select
                                      value={String(node.props?.mode ?? "AND")}
                                      style={{ width: "100%" }}
                                      options={[
                                        { label: "依次会签", value: "NEXT" },
                                        { label: "同时会签", value: "AND" },
                                        { label: "或签", value: "OR" },
                                      ]}
                                      onUpdate:value={(value) => {
                                        node.props ??= {};
                                        node.props.mode = value;
                                      }}
                                    />
                                  </FormItem>
                                </>
                              ) : null}
                            </>
                          ) : null}
                        </Form>
                      ) : null}
                      {nodeConfigTab.value === "outer" ? renderPermissions(node, "outer") : null}
                      {nodeConfigTab.value === "inner" ? renderPermissions(node, "inner") : null}
                      {nodeConfigTab.value === "operations" ? renderOperations(node) : null}
                      {nodeConfigTab.value === "advanced" && node.type === "APPROVAL" ? renderAdvanced(node) : null}
                    </aside>
                  ) : null}
                </div>
              ) : null}
              <Modal
                open={webhookOpen.value}
                title={webhookIndex.value === undefined ? "新增 WebHook" : "修改 WebHook"}
                width={560}
                okText="确定"
                cancelText="取消"
                onCancel={() => {
                  webhookOpen.value = false;
                }}
                onOk={saveWebhook}
              >
                <Form layout="vertical">
                  <FormItem label="URL" required>
                    <Input
                      value={webhookForm.url}
                      placeholder="请输入URL"
                      onUpdate:value={(value: string) => {
                        webhookForm.url = value;
                      }}
                    />
                  </FormItem>
                  <FormItem label="TOKEN">
                    <Input
                      value={webhookForm.token}
                      placeholder="请输入TOKEN(非必填)"
                      onUpdate:value={(value: string) => {
                        webhookForm.token = value;
                      }}
                    />
                  </FormItem>
                  <FormItem label="触发来源" required>
                    <Checkbox
                      checked={webhookForm.triggerNode.includes("FLOW_END")}
                      onUpdate:checked={(checked) => {
                        webhookForm.triggerNode = checked ? ["FLOW_END"] : [];
                      }}
                    >
                      流程结束
                    </Checkbox>
                  </FormItem>
                </Form>
              </Modal>
            </div>
          </div>
        ),
      };
      return <PageLayout showHeader={false} showFooter={false} v-slots={slots} />;
    };
  },
});
