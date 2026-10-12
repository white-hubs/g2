import type { MaintenancePlanObject, MaintenanceProjectItem, MaintenanceRuleCondition } from "@g2-client/maintenance/client";
import {
  Button,
  Col,
  DatePicker,
  Form,
  type FormExpose,
  FormItem,
  Input,
  Modal,
  PageLayout,
  type PcTableColumn,
  PlusOutlined,
  PopConfirm,
  PopOver,
  Radio,
  RadioGroup,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Textarea,
  message,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { DeviceSelectModal, type MaintenanceDeviceRecord } from "@/components/device-select-modal";
import { DeptMultiSelect, UserMultiSelect } from "@/components/ouaa-select";
import { RuleTrigger, createRuleCondition } from "@/components/rule-trigger";
import { getMaintenanceClient } from "@/domain-context";
import { TIME_UNIT_OPTIONS, planStatusLabel, timeUnitLabel } from "@/utils/enum";
import { toText, toTextArray } from "@/utils/form-value";
import { millennial, timeFormat } from "@/utils/format";

import styles from "./plan-operate.module.css";

const DATE_FORMAT = "YYYY-MM-DD";

/** 维保设备表格行：既可能来自设备弹框（设备台账结构），也可能来自计划详情（维保对象结构）。 */
interface PlanDeviceRow {
  id: string;
  projectIds: string[];
  itemNum: number;
  /** 设备台账字段 */
  name?: string;
  productInfo?: MaintenanceDeviceRecord["productInfo"];
  deviceArea?: { pathName?: string; pathId?: string };
  /** 维保对象字段 */
  keyId?: string | number;
  objectName?: string;
  categoryName?: string;
  categoryCode?: string;
  areaName?: string;
  areaId?: string;
  objectProjects?: MaintenanceProjectItem[];
}

/** 设备台账行转表格行：`area` 在两套结构里语义不同，这里拆成 `deviceArea` / `areaId`。 */
function toPlanDeviceRow(device: MaintenanceDeviceRecord, projectIds: string[], itemNum: number): PlanDeviceRow {
  return {
    id: String(device.id),
    projectIds,
    itemNum,
    name: device.name,
    productInfo: device.productInfo,
    deviceArea: device.area,
  };
}

interface PlanFormModel {
  maintenancePlanName: string;
  planStartTime: string;
  planEndTime: string;
  maintenanceTimePoint: string;
  maintenanceCycle: string;
  timeUnit: string;
  responsibilityType: string;
  way: string;
  receiveIds: string[];
  receiveDeptIds: string[];
  receivePostIds: string[];
  status: boolean;
  remark: string;
  responsibilityPersonName: string;
  statusText: string;
  cronExpression: string;
}

function createModel(): PlanFormModel {
  return {
    maintenancePlanName: "",
    planStartTime: "",
    planEndTime: "",
    maintenanceTimePoint: "",
    maintenanceCycle: "",
    timeUnit: "p-day",
    responsibilityType: "per",
    way: "",
    receiveIds: [],
    receiveDeptIds: [],
    receivePostIds: [],
    status: true,
    remark: "",
    responsibilityPersonName: "",
    statusText: "",
    cronExpression: "",
  };
}

/** 维保对象的品类编码可能是 `a-b-c` 路径，维保项接口只认末级编码。 */
function lastCode(code?: string): string {
  if (!code) {
    return "";
  }
  return code.includes("-") ? (code.split("-").pop() ?? "") : code;
}

export const MaintenancePlanOperate = defineComponent({
  name: "MaintenancePlanOperate",
  setup() {
    const client = getMaintenanceClient();
    const route = useRoute();
    const router = useRouter();
    const type = typeof route.query.type === "string" ? route.query.type : "add";
    const id = typeof route.query.id === "string" ? route.query.id : "";
    const readonly = type === "detail";

    const formRef = ref<FormExpose>();
    const model = reactive<PlanFormModel>(createModel());
    const rules = ref<MaintenanceRuleCondition[]>([]);
    const tableData = ref<PlanDeviceRow[]>([]);
    const appointmentOptions = ref<{ label: string; value: string }[]>([]);
    const loading = ref(false);
    const submitting = ref(false);

    const deviceModalOpen = ref(false);
    const deviceModalValue = ref<MaintenanceDeviceRecord[]>([]);

    const itemModalOpen = ref(false);
    const itemModalRowId = ref("");
    const itemModalLoading = ref(false);
    const itemOptions = ref<MaintenanceProjectItem[]>([]);
    const itemSelectedKeys = ref<string[]>([]);

    const title = type === "edit" ? "编辑维保计划" : readonly ? "维保计划详情" : "新增维保计划";

    const goBack = (): void => {
      void router.back();
    };

    const revalidate = (field: string): void => {
      if (!readonly) {
        void formRef.value?.validateFields(field).catch(() => undefined);
      }
    };

    const formRules = {
      maintenancePlanName: [
        { required: true, message: "请输入计划名称" },
        { pattern: /^.{1,20}$/u, message: "名称不超过20个字" },
      ],
      planStartTime: [{ required: true, message: "请选择计划生效时间" }],
      planEndTime: [{ required: true, message: "请选择计划失效时间" }],
      status: [{ required: true, message: "请选择计划状态" }],
      way: [{ required: true, message: "请选择任务生成方式" }],
      maintenanceTimePoint: [
        { required: true, message: "请选择维保任务生成时间" },
        { pattern: /^[0-9]$|^[0][0-9]$|^[1][0-9]$|^[0-2][0-3]$/u, message: "请输入正整数(小于24)" },
      ],
      maintenanceCycle: [
        { required: true, message: "请输入维保任务生成周期" },
        { pattern: /^[1-9]$|^[1-9][0-9]$|^[1][0][0]$/u, message: "请输入大于0且小于等于100的正整数" },
        {
          validator: (): Promise<void> => {
            if (model.maintenanceCycle && model.timeUnit) {
              return Promise.resolve();
            }
            if (!model.maintenanceCycle) {
              return Promise.reject(new Error("请输入维保任务生成周期"));
            }
            return Promise.reject(new Error("请选择周期单位"));
          },
        },
      ],
      responsibilityType: [
        { required: true, message: "请选择维保责任人" },
        {
          validator: (): Promise<void> => {
            if (model.responsibilityType === "per") {
              return model.receiveIds.length > 0 ? Promise.resolve() : Promise.reject(new Error("请选择维保责任人"));
            }
            if (model.receiveDeptIds.length > 0 && model.receivePostIds.length > 0) {
              return Promise.resolve();
            }
            if (model.receiveDeptIds.length === 0 && model.receivePostIds.length === 0) {
              return Promise.reject(new Error("请选择维保责任人"));
            }
            return Promise.reject(new Error(model.receiveDeptIds.length === 0 ? "请选择部门" : "请选择岗位"));
          },
        },
      ],
    };

    const loadAppointments = async (): Promise<void> => {
      try {
        const list = await client.listAppointments({ enabled: true });
        appointmentOptions.value = list.map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "岗位列表加载失败");
      }
    };

    const loadPlan = async (planId: string): Promise<void> => {
      loading.value = true;
      try {
        const data = await client.getPlan(planId);
        model.maintenancePlanName = data.maintenancePlanName ?? "";
        model.planStartTime = timeFormat(data.planStartTime, false) ?? "";
        model.planEndTime = timeFormat(data.planEndTime, false) ?? "";
        model.maintenanceTimePoint = data.maintenanceTimePoint === undefined ? "" : String(data.maintenanceTimePoint);
        model.maintenanceCycle = data.maintenanceCycle === undefined || data.maintenanceCycle === null ? "" : String(data.maintenanceCycle);
        model.cronExpression = data.cronExpression ?? "";
        model.responsibilityType = data.responsibilityType ?? "per";
        model.responsibilityPersonName = data.responsibilityPersonName ?? "";
        model.receiveIds = (data.receiveIds ?? []).map((value) => String(value));
        model.receiveDeptIds = (data.receiveDeptIds ?? []).map((value) => String(value));
        model.receivePostIds = (data.receivePostIds ?? []).map((value) => String(value));
        model.timeUnit = data.timeUnit ?? "p-day";
        model.way = data.way ?? "";
        model.remark = data.remark ?? "";
        // 表单里计划状态是开关（布尔），提交时再映射回 ENABLED / DEACTIVATED。
        model.statusText = planStatusLabel(data.status);
        model.status = data.status === "ENABLED";
        tableData.value = (data.maintenaceObjectsList ?? []).map((item) => ({
          id: String(item.id ?? item.keyId ?? ""),
          keyId: item.keyId,
          objectName: item.objectName,
          categoryName: item.categoryName,
          categoryCode: item.categoryCode,
          areaName: item.areaName,
          areaId: item.area,
          objectProjects: item.objectProjects,
          projectIds: (item.objectProjects ?? []).map((project) => String(project.id ?? "")),
          itemNum: (item.objectProjects ?? []).length,
        }));
        rules.value = data.ruleDetails ?? [];
        if (type === "copy") {
          model.maintenancePlanName = `${model.maintenancePlanName}-副本-${timeFormat(new Date())}`;
          model.status = true;
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "计划详情加载失败");
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void loadAppointments();
      if (id) {
        void loadPlan(id);
      }
    });

    watch(
      () => model.responsibilityType,
      (value) => {
        if (value === "per") {
          model.receiveDeptIds = [];
          model.receivePostIds = [];
        } else {
          model.receiveIds = [];
        }
      },
    );

    watch(
      () => model.timeUnit,
      () => {
        revalidate("maintenanceCycle");
      },
    );

    const openDeviceModal = (): void => {
      deviceModalValue.value = tableData.value.map((row) => ({
        id: String(row.keyId ?? row.id),
        name: row.name ?? row.objectName,
      }));
      deviceModalOpen.value = true;
    };

    /** 合并弹框选择结果：已有设备保留维保项配置，新增设备维保项清零。 */
    const applyDevices = (devices: MaintenanceDeviceRecord[]): void => {
      const existing = new Map(tableData.value.map((row) => [String(row.keyId ?? row.id), row]));
      tableData.value = devices.map((device) => {
        const matched = existing.get(String(device.id));
        return toPlanDeviceRow(device, matched?.projectIds ?? [], matched?.itemNum ?? 0);
      });
    };

    const removeDevice = (row: PlanDeviceRow): void => {
      tableData.value = tableData.value.filter((item) => item.id !== row.id);
    };

    const openItemModal = async (row: PlanDeviceRow): Promise<void> => {
      const categoryCode = lastCode(row.categoryCode ?? row.productInfo?.productCategory?.code);
      itemModalRowId.value = row.id;
      itemSelectedKeys.value = [...row.projectIds];
      itemModalOpen.value = true;
      itemModalLoading.value = true;
      try {
        // itemOptions / itemSelectedKeys 由下方 watch 同步到 PcTable。
        itemOptions.value = await client.listMaintenanceProjectItems({ categoryCode });
      } catch (error) {
        message.error(error instanceof Error ? error.message : "维保项加载失败");
      } finally {
        itemModalLoading.value = false;
      }
    };

    const confirmItems = (): void => {
      if (readonly) {
        itemModalOpen.value = false;
        return;
      }
      tableData.value = tableData.value.map((row) =>
        row.id === itemModalRowId.value ? { ...row, projectIds: [...itemSelectedKeys.value], itemNum: itemSelectedKeys.value.length } : row,
      );
      itemModalOpen.value = false;
    };

    const submit = async (): Promise<void> => {
      if (submitting.value) {
        return;
      }
      try {
        await formRef.value?.validate();
      } catch {
        if (tableData.value.length === 0) {
          message.warning("请配置维保对象");
        }
        return;
      }
      if (model.way === "RULE" && rules.value.length === 0) {
        message.warning("请至少配置一项任务生成触发条件");
        return;
      }
      if (tableData.value.length === 0) {
        message.warning("请配置维保对象");
        return;
      }
      if (!tableData.value.every((row) => row.itemNum !== 0)) {
        message.warning("请为每一个维保设备添加维保项");
        return;
      }
      submitting.value = true;
      try {
        // 规则的 id 是前端生成的行标识，提交前剔除。
        const ruleDetails = rules.value.map((rule) => {
          const { id: _ruleId, ...rest } = rule;
          return {
            ...rest,
            emergencyRuleConditionExps: (rule.emergencyRuleConditionExps ?? []).map((exp) => {
              const { id: _expId, ...expRest } = exp;
              return expRest;
            }),
          };
        });
        const maintenanceObjectCommands: MaintenancePlanObject[] = tableData.value.map((row) => ({
          id: row.id,
          keyId: row.keyId ?? row.id,
          objectName: row.name ?? row.objectName,
          areaName: row.deviceArea?.pathName ?? row.areaName,
          area: row.deviceArea?.pathId ?? row.areaId,
          categoryName: row.productInfo?.productCategory?.name ?? row.categoryName,
          categoryCode: row.productInfo?.productCategory?.pathCode ?? row.categoryCode,
          objectProjects: row.objectProjects,
          projectIds: row.projectIds,
          itemNum: row.itemNum,
        }));
        await client.savePlan({
          maintenancePlanName: model.maintenancePlanName,
          planStartTime: model.planStartTime,
          planEndTime: model.planEndTime,
          maintenanceTimePoint: model.maintenanceTimePoint,
          maintenanceCycle: model.maintenanceCycle,
          timeUnit: model.timeUnit,
          responsibilityType: model.responsibilityType,
          receiveIds: model.receiveIds,
          receiveDeptIds: model.receiveDeptIds,
          receivePostIds: model.receivePostIds,
          remark: model.remark,
          way: model.way,
          ruleDetails,
          maintenanceObjectCommands,
          status: model.status ? "ENABLED" : "DEACTIVATED",
        });
        message.success("操作成功");
        goBack();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        submitting.value = false;
      }
    };

    const ellipsisCell = (text?: string | null): JSX.Element => (
      <PopOver placement="topLeft" content={text ?? ""}>
        {text || "--"}
      </PopOver>
    );

    const editColumns: PcTableColumn[] = [
      {
        dataIndex: "name",
        title: "维保对象",
        ellipsis: true,
        customRender: ({ record }) => ellipsisCell((record as PlanDeviceRow).name ?? (record as PlanDeviceRow).objectName),
      },
      {
        dataIndex: "productCategoryName",
        title: "产品品类",
        ellipsis: true,
        customRender: ({ record }) =>
          ellipsisCell((record as PlanDeviceRow).productInfo?.productCategory?.name ?? (record as PlanDeviceRow).categoryName),
      },
      {
        dataIndex: "area",
        title: "所属区域",
        ellipsis: true,
        customRender: ({ record }) => ellipsisCell((record as PlanDeviceRow).deviceArea?.pathName ?? (record as PlanDeviceRow).areaName),
      },
      {
        dataIndex: "itemNum",
        title: "维保项",
        ellipsis: true,
        customRender: ({ record }) => ellipsisCell(String((record as PlanDeviceRow).itemNum)),
      },
      {
        dataIndex: "action",
        title: "操作",
        fixed: "right",
        width: 240,
        customRender: ({ record }) => {
          const row = record as PlanDeviceRow;
          return (
            <Space size={16}>
              <Button type="link" onClick={() => void openItemModal(row)}>
                编辑维保项
              </Button>
              <PopConfirm title="删除当前维保对象？" okText="确定" cancelText="取消" onConfirm={() => removeDevice(row)}>
                <Button type="link" danger>
                  删除
                </Button>
              </PopConfirm>
            </Space>
          );
        },
      },
    ];

    const detailColumns: PcTableColumn[] = [
      {
        dataIndex: "objectName",
        title: "维保对象",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
      {
        dataIndex: "categoryName",
        title: "产品品类",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
      {
        dataIndex: "areaName",
        title: "所属区域",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
      {
        dataIndex: "objectProjects",
        title: "维保项",
        ellipsis: true,
        customRender: ({ text }) =>
          ellipsisCell(((text as MaintenanceProjectItem[] | undefined) ?? []).map((item) => item.maintenanceContent).join(",")),
      },
      {
        dataIndex: "action",
        title: "操作",
        fixed: "right",
        width: 240,
        customRender: ({ record }) => (
          <Space size={16}>
            <Button type="link" onClick={() => void openItemModal(record as PlanDeviceRow)}>
              维保项
            </Button>
            <Button type="link" danger disabled>
              删除
            </Button>
          </Space>
        ),
      },
    ];

    const itemColumns: PcTableColumn[] = [
      {
        dataIndex: "code",
        title: "编号",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
      {
        dataIndex: "maintenanceContent",
        title: "维保内容",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
    ];

    // 嵌入表单页的设备表：用 PcTable，关闭自动纵滚避免双滚动条。
    const [DeviceTable, deviceTableApi] = usePcTable({
      columns: readonly ? detailColumns : editColumns,
      rowKey: "id",
      tableCode: readonly ? "MAINTENANCE_PLAN_DETAIL_DEVICES" : "MAINTENANCE_PLAN_EDIT_DEVICES",
      autoFetch: false,
      autoScrollY: false,
    });

    const [ItemTable, itemTableApi] = usePcTable({
      columns: itemColumns,
      rowKey: "id",
      tableCode: "MAINTENANCE_PLAN_ITEM_PICK",
      autoFetch: false,
      autoScrollY: false,
      rowSelection: readonly ? undefined : "checkbox",
      rowSelectionChange: (keys) => {
        itemSelectedKeys.value = keys.map((key) => String(key));
      },
    });

    watch(
      tableData,
      (rows) => {
        deviceTableApi.setDataSource(rows);
      },
      { immediate: true, deep: true },
    );

    watch(
      itemOptions,
      (rows) => {
        itemTableApi.setDataSource(rows);
      },
      { immediate: true },
    );

    watch(itemSelectedKeys, (keys) => {
      itemTableApi.setSelectedRowKeys(keys);
    });

    const formItemCol = (span: number, children: JSX.Element): JSX.Element => (
      <Col span={span} class={styles.formCol}>
        {children}
      </Col>
    );

    const renderBaseEdit = (): JSX.Element => (
      <Row gutter={[16, 0]} class={styles.formRow}>
        {formItemCol(
          6,
          <FormItem label="计划名称" name="maintenancePlanName">
            <Input
              value={model.maintenancePlanName}
              placeholder="请输入维保计划名称"
              maxlength={20}
              onUpdate:value={(value: string) => {
                model.maintenancePlanName = value.trim();
              }}
            />
          </FormItem>,
        )}
        {formItemCol(
          6,
          <FormItem label="计划生效时间" name="planStartTime">
            <DatePicker
              style={{ width: "100%" }}
              value={model.planStartTime}
              format={DATE_FORMAT}
              valueFormat={DATE_FORMAT}
              onUpdate:value={(raw: unknown) => {
                model.planStartTime = toText(raw);
                if (model.planEndTime) {
                  revalidate("planEndTime");
                }
              }}
            />
          </FormItem>,
        )}
        {formItemCol(
          6,
          <FormItem label="计划失效时间" name="planEndTime">
            <DatePicker
              style={{ width: "100%" }}
              value={model.planEndTime}
              format={DATE_FORMAT}
              valueFormat={DATE_FORMAT}
              onUpdate:value={(raw: unknown) => {
                model.planEndTime = toText(raw);
                if (model.planStartTime) {
                  revalidate("planStartTime");
                }
              }}
            />
          </FormItem>,
        )}
        {formItemCol(
          6,
          <FormItem label="计划状态" name="status">
            <Switch
              checked={model.status}
              checkedChildren="启用"
              unCheckedChildren="禁用"
              onUpdate:checked={(raw: unknown) => {
                model.status = raw === true;
              }}
            />
          </FormItem>,
        )}
        {formItemCol(
          24,
          <FormItem label="维保责任人" name="responsibilityType">
            <div class={styles.responsibilityGroup}>
              <div class={styles.responsibilityToggle}>
                <Button
                  type={model.responsibilityType === "dep" ? "primary" : "default"}
                  onClick={() => {
                    model.responsibilityType = "dep";
                  }}
                >
                  部门
                </Button>
                <Button
                  type={model.responsibilityType === "per" ? "primary" : "default"}
                  onClick={() => {
                    model.responsibilityType = "per";
                  }}
                >
                  人员
                </Button>
              </div>
              {model.responsibilityType === "per" ? (
                <div class={styles.responsibilityControl}>
                  <UserMultiSelect
                    value={model.receiveIds}
                    onUpdate:value={(raw: unknown) => {
                      model.receiveIds = toTextArray(raw);
                      revalidate("responsibilityType");
                    }}
                  />
                </div>
              ) : (
                <div class={styles.responsibilityControl}>
                  <DeptMultiSelect
                    value={model.receiveDeptIds}
                    onUpdate:value={(raw: unknown) => {
                      model.receiveDeptIds = toTextArray(raw);
                      // 部门变更后岗位需重新选择，与旧页一致。
                      model.receivePostIds = [];
                      revalidate("responsibilityType");
                    }}
                  />
                  <Select
                    mode="multiple"
                    value={model.receivePostIds}
                    options={appointmentOptions.value}
                    placeholder="岗位"
                    allowClear
                    onUpdate:value={(raw: unknown) => {
                      model.receivePostIds = toTextArray(raw);
                      revalidate("responsibilityType");
                    }}
                  />
                </div>
              )}
            </div>
          </FormItem>,
        )}
        {formItemCol(
          24,
          <FormItem label="描述" name="remark">
            <Textarea
              value={model.remark}
              placeholder="请输入描述"
              maxlength={200}
              autoSize={{ minRows: 2, maxRows: 8 }}
              onUpdate:value={(value: string) => {
                model.remark = value;
              }}
            />
          </FormItem>,
        )}
      </Row>
    );

    const renderBaseDetail = (): JSX.Element => (
      <Row gutter={[16, 0]} class={styles.formRow}>
        {formItemCol(
          8,
          <FormItem label="计划名称">
            <span>{model.maintenancePlanName || "--"}</span>
          </FormItem>,
        )}
        {formItemCol(
          8,
          <FormItem label="计划生效时间">
            <span>{model.planStartTime || "--"}</span>
          </FormItem>,
        )}
        {formItemCol(
          8,
          <FormItem label="计划失效时间">
            <span>{model.planEndTime || "--"}</span>
          </FormItem>,
        )}
        {formItemCol(
          8,
          <FormItem label="任务生成周期">
            <span>
              {model.maintenanceCycle ? millennial(model.maintenanceCycle, false) : "--"}
              {timeUnitLabel(model.timeUnit)}
            </span>
          </FormItem>,
        )}
        {formItemCol(
          8,
          <FormItem label="任务生成时间">
            <span>{model.maintenanceTimePoint ? `${model.maintenanceTimePoint}时` : "--"}</span>
          </FormItem>,
        )}
        {formItemCol(
          8,
          <FormItem label="维保责任人">
            <span>{model.responsibilityPersonName || "--"}</span>
          </FormItem>,
        )}
        {formItemCol(
          8,
          <FormItem label="计划状态">
            <span class={model.statusText === "已启用" ? styles.normal : styles.abnormal}>{model.statusText || "--"}</span>
          </FormItem>,
        )}
        {formItemCol(
          16,
          <FormItem label="描述">
            <span>{model.remark || "--"}</span>
          </FormItem>,
        )}
      </Row>
    );

    const renderJobFields = (): JSX.Element =>
      readonly ? (
        <Row gutter={[16, 0]} class={styles.formRow}>
          {formItemCol(
            8,
            <FormItem label="任务生成周期">
              <span>{model.maintenanceCycle || "--"}</span>
            </FormItem>,
          )}
          {formItemCol(
            8,
            <FormItem label="任务生成时间">
              <span>{model.maintenanceTimePoint ? `${model.maintenanceTimePoint}时` : "--"}</span>
            </FormItem>,
          )}
        </Row>
      ) : (
        <Row gutter={[16, 0]} class={styles.formRow}>
          {formItemCol(
            8,
            <FormItem label="任务生成周期" name="maintenanceCycle">
              <div class={styles.cycleGroup}>
                <Input
                  value={model.maintenanceCycle}
                  placeholder="维保任务生成周期"
                  maxlength={3}
                  onUpdate:value={(value: string) => {
                    model.maintenanceCycle = value;
                    revalidate("maintenanceCycle");
                  }}
                />
                <Select
                  value={model.timeUnit}
                  placeholder="单位"
                  options={TIME_UNIT_OPTIONS}
                  onUpdate:value={(raw: unknown) => {
                    model.timeUnit = toText(raw);
                  }}
                />
              </div>
            </FormItem>,
          )}
          {formItemCol(
            8,
            <FormItem label="任务生成时间" name="maintenanceTimePoint">
              <Input
                value={model.maintenanceTimePoint}
                addonAfter="时"
                placeholder="维保任务生成时间"
                maxlength={2}
                onUpdate:value={(value: string) => {
                  model.maintenanceTimePoint = value.trim();
                }}
              />
            </FormItem>,
          )}
        </Row>
      );

    const renderRuleFields = (): JSX.Element => (
      <>
        <div class={styles.ruleHeader}>
          <span>触发条件</span>
          {readonly ? null : (
            <Button
              type="primary"
              onClick={() => {
                rules.value = [...rules.value, createRuleCondition()];
              }}
              v-slots={{ icon: () => <PlusOutlined /> }}
            >
              添加
            </Button>
          )}
        </div>
        <div class={styles.ruleList}>
          {rules.value.map((rule, index) => (
            <RuleTrigger
              key={rule.id}
              ruleData={rule}
              attrIndex={index}
              readonly={readonly}
              onDeleteAttr={() => {
                rules.value = rules.value.filter((item) => item.id !== rule.id);
              }}
            />
          ))}
        </div>
      </>
    );

    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div class={styles.detailForm}>
            <Form
              ref={formRef}
              model={model}
              rules={readonly ? undefined : formRules}
              layout="horizontal"
              labelCol={{ style: { width: "110px" } }}
              labelAlign="right"
            >
              <div class={styles.itemTitle}>基础信息</div>
              {readonly ? renderBaseDetail() : renderBaseEdit()}
              <div class={styles.itemTitle}>任务生成</div>
              <Row gutter={[16, 0]} class={styles.formRow}>
                {formItemCol(
                  24,
                  <FormItem label="" name="way" colon={false}>
                    <RadioGroup
                      value={model.way}
                      disabled={readonly}
                      onUpdate:value={(value: string) => {
                        model.way = value;
                      }}
                    >
                      <Radio value="JOB">定时生成</Radio>
                      <Radio value="RULE">规则触发</Radio>
                    </RadioGroup>
                  </FormItem>,
                )}
              </Row>
              <div class={styles.fullBlock}>
                {model.way === "JOB" ? renderJobFields() : model.way === "RULE" ? renderRuleFields() : null}
              </div>
              <div class={[styles.itemTitle, styles.flexBetween]}>
                <span>维保设备</span>
                {readonly ? null : (
                  <Button type="primary" onClick={openDeviceModal}>
                    添加维保对象
                  </Button>
                )}
              </div>
              <div class={styles.deviceTable}>
                <DeviceTable />
              </div>
            </Form>
          </div>
        </Spin>
      ),
      "footer-page": () => (
        <>
          <Button onClick={goBack}>返回</Button>
          {readonly ? null : (
            <Button type="primary" loading={submitting.value} onClick={() => void submit()}>
              保存
            </Button>
          )}
        </>
      ),
    };

    return () => (
      <PageLayout
        title={title}
        v-slots={{
          ...slots,
          // 弹窗挂到 default slot，继承 PageLayout 内 ZhConfigProvider 中文 locale。
          default: () => (
            <>
              <DeviceSelectModal
                open={deviceModalOpen.value}
                value={deviceModalValue.value}
                onUpdate:open={(value: boolean) => {
                  deviceModalOpen.value = value;
                }}
                onOk={(devices: MaintenanceDeviceRecord[]) => {
                  applyDevices(devices);
                }}
              />
              <Modal
                open={itemModalOpen.value}
                centered
                title={readonly ? "维保项" : "编辑维保项"}
                okText="确定"
                cancelText="取消"
                okButtonProps={{ disabled: readonly }}
                confirmLoading={itemModalLoading.value}
                onOk={confirmItems}
                onCancel={() => {
                  itemModalOpen.value = false;
                }}
              >
                <Spin spinning={itemModalLoading.value}>
                  <ItemTable />
                </Spin>
              </Modal>
            </>
          ),
        }}
      />
    );
  },
});
