// @ts-nocheck
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";
import { useRoute, useRouter } from "vue-router";

import { PersonLiableSelect, PersonLiableSelectCheck } from "@/compat/app-design";
import { LEVEL_OPTIONS, TASK_STATUS_MAP, formatDisplayTime, formatLimitTimeJson, toIdList } from "@/compat/constants";
import { getDailyInspectionClient } from "@/domain-context";
import { Form, FormItem, Input, InputNumber, Select, Switch, Textarea, type FormInstance } from "@/pc-ui-runtime";

import styles from "../inspect-task-edit.module.css";

const BASE = "/d/daily-inspection";

export const BasicInfo = defineComponent({
  name: "InspectTaskBasicInfo",
  props: {
    initFormState: { type: Object as PropType<InspectionRecord>, default: () => ({}) },
    readonly: { type: Boolean, default: false },
  },
  setup(props, { expose }) {
    const route = useRoute();
    const router = useRouter();
    const formRef = ref<FormInstance>();
    const typeOptions = ref<Array<{ label: string; value: string }>>([]);
    const formState = reactive<InspectionRecord>({
      name: "",
      typeId: undefined,
      level: "NORMAL",
      receiveType: "1",
      receiveIds: [],
      receiveDeptIds: null,
      receivePostIds: null,
      receiveRoleIds: null,
      receiveNames: "",
      isCheck: false,
      checkUserType: "1",
      checkUserIds: [],
      checkDeptIds: null,
      checkPostIds: null,
      checkRoleIds: null,
      method: "",
      limitDay: 0,
      limitHour: 0,
      limitMinute: 0,
      remark: "",
    });

    const syncFromProps = (): void => {
      const source = props.initFormState ?? {};
      if (!Object.keys(source).length) return;
      let day = 0;
      let hour = 0;
      let minute = 0;
      try {
        if (source.limitTimeJson) {
          const parsed = JSON.parse(String(source.limitTimeJson)) as { day?: number; hour?: number; minute?: number };
          day = Number(parsed.day ?? 0);
          hour = Number(parsed.hour ?? 0);
          minute = Number(parsed.minute ?? 0);
        }
      } catch {
        /* keep defaults */
      }
      Object.assign(formState, {
        ...source,
        name: String(source.name ?? source.taskName ?? ""),
        typeId: source.typeId ?? source.inspectTypeId,
        level: source.level ?? "NORMAL",
        receiveType: String(source.receiveType ?? "1"),
        receiveIds: toIdList(source.receiveIds),
        receiveDeptIds: source.receiveDeptIds ?? null,
        receivePostIds: source.receivePostIds ?? null,
        receiveRoleIds: source.receiveRoleIds ?? null,
        receiveNames: String(source.receiveNames ?? ""),
        isCheck: Boolean(source.isCheck),
        checkUserType: String(source.checkUserType ?? "1"),
        checkUserIds: toIdList(source.checkUserIds),
        checkDeptIds: source.checkDeptIds ?? null,
        checkPostIds: source.checkPostIds ?? null,
        checkRoleIds: source.checkRoleIds ?? null,
        method: source.method === "SCAN_CODE" || source.method === true ? "SCAN_CODE" : "",
        limitDay: day,
        limitHour: hour,
        limitMinute: minute,
        remark: String(source.remark ?? ""),
      });
    };

    watch(() => props.initFormState, syncFromProps, { immediate: true, deep: true });

    onMounted(async () => {
      try {
        const types = await getDailyInspectionClient().listTypes();
        typeOptions.value = types.map((item) => ({
          label: String(item.name ?? item.typeName ?? item.id ?? "--"),
          value: String(item.id ?? ""),
        }));
      } catch {
        typeOptions.value = [];
      }
    });

    const handleSubmit = async (): Promise<InspectionRecord> => {
      await formRef.value?.validate();
      return {
        ...formState,
        name: String(formState.name ?? "").trim(),
        receiveIds: toIdList(formState.receiveIds),
        checkUserIds: toIdList(formState.checkUserIds),
        method: formState.method || "",
        limitTimeJson: JSON.stringify({
          day: Number(formState.limitDay ?? 0),
          hour: Number(formState.limitHour ?? 0),
          minute: Number(formState.limitMinute ?? 0),
        }),
        beginTime: formState.beginTime,
        endTime: formState.endTime,
      };
    };

    const receiveRules = [
      { required: true, message: "请选择负责人" },
      {
        validator: async (_rule: unknown, value: unknown) => {
          if (value === "1" && !toIdList(formState.receiveIds).length) {
            return Promise.reject(new Error("请选择负责人"));
          }
          if (value === "2" && !formState.receiveDeptIds && !formState.receivePostIds && !formState.receiveRoleIds) {
            return Promise.reject(new Error("请选择负责人部门"));
          }
          return Promise.resolve();
        },
      },
    ];

    const checkUserRules = [
      { required: true, message: "请选择稽查人" },
      {
        validator: async (_rule: unknown, value: unknown) => {
          if (value === "1" && !toIdList(formState.checkUserIds).length) {
            return Promise.reject(new Error("请选择稽查人"));
          }
          if (value === "2" && !formState.checkDeptIds && !formState.checkPostIds && !formState.checkRoleIds) {
            return Promise.reject(new Error("请选择稽查人部门"));
          }
          return Promise.resolve();
        },
      },
    ];

    expose({ handleSubmit, getFormState: () => formState });

    const isInfo = props.readonly || String(route.query.type ?? "") === "info";

    if (isInfo) {
      const fields: Array<{ label: string; value: unknown; link?: () => void }> = [
        { label: "任务名称", value: formState.name },
        {
          label: "所属计划",
          value: formState.planName || "--",
          link: formState.planId
            ? () => void router.push({ path: `${BASE}/inspect-plan-edit`, query: { type: "info", id: String(formState.planId) } })
            : undefined,
        },
        { label: "发布人", value: formState.publisherName },
        { label: "巡查类型", value: formState.typeName },
        { label: "巡检级别", value: String(formState.level) === "GENERAL" ? "紧急" : "普通" },
        { label: "执行人", value: formState.receiveNames },
        { label: "发布时间", value: formatDisplayTime(formState.updateTime ?? formState.createTime) },
        { label: "截止时间", value: formatDisplayTime(formState.validEndTime) },
        { label: "任务有效期", value: formatLimitTimeJson(formState.limitTimeJson) },
        { label: "巡检对象数", value: formState.targetNum },
        { label: "任务状态", value: TASK_STATUS_MAP[String(formState.status ?? "")] ?? formState.status },
        { label: "协同人", value: formState.assistNames },
        { label: "备注", value: formState.remark },
      ];
      return () => (
        <dl class={styles["detail-grid"]}>
          {fields.map((field) => (
            <div class={styles["detail-item"]} key={field.label}>
              <dt>{field.label}</dt>
              <dd>
                {field.link && field.value && field.value !== "--" ? (
                  <a
                    onClick={(event: Event) => {
                      event.preventDefault();
                      field.link?.();
                    }}
                  >
                    {String(field.value)}
                  </a>
                ) : (
                  String(field.value ?? "--") || "--"
                )}
              </dd>
            </div>
          ))}
        </dl>
      );
    }

    return () => (
      <Form ref={formRef} model={formState} labelCol={{ style: { width: "110px" } }}>
        <div class={styles["form-grid"]}>
          <FormItem label="任务名称" name="name" rules={[{ required: true, message: "请输入任务名称" }]}>
            <Input v-model:value={formState.name} maxlength={32} placeholder="请输入任务名称" />
          </FormItem>
          <FormItem label="巡查类型" name="typeId" rules={[{ required: true, message: "请选择巡查类型" }]}>
            <Select
              v-model:value={formState.typeId}
              options={typeOptions.value}
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="请选择巡查类型"
            />
          </FormItem>
          <FormItem label="巡检级别" name="level" rules={[{ required: true, message: "请选择巡检级别" }]}>
            <Select v-model:value={formState.level} options={LEVEL_OPTIONS} placeholder="请选择巡检级别" />
          </FormItem>
          <FormItem label="负责人" name="receiveType" rules={receiveRules} class={styles["form-wide"]}>
            <PersonLiableSelect
              value={formState.receiveType}
              receiveIds={formState.receiveIds}
              receiveDeptIds={formState.receiveDeptIds}
              receivePostIds={formState.receivePostIds}
              receiveRoleIds={formState.receiveRoleIds}
              treeDefaultExpandAll
              onUpdate:value={(val: unknown) => {
                formState.receiveType = val;
                formState.receiveIds = [];
                formState.receiveDeptIds = null;
                formState.receivePostIds = [];
                formState.receiveRoleIds = [];
              }}
              onUpdate:receiveIds={(val: unknown) => {
                formState.receiveIds = val;
              }}
              onUpdate:receiveDeptIds={(val: unknown) => {
                formState.receiveDeptIds = val;
              }}
              onUpdate:receivePostIds={(val: unknown) => {
                formState.receivePostIds = val;
              }}
              onUpdate:receiveRoleIds={(val: unknown) => {
                formState.receiveRoleIds = val;
              }}
            />
          </FormItem>
          <FormItem label="是否需要稽查" name="isCheck">
            <Switch v-model:checked={formState.isCheck} checkedChildren="是" unCheckedChildren="否" />
          </FormItem>
          {formState.isCheck ? (
            <FormItem label="稽查人" name="checkUserType" rules={checkUserRules} class={styles["form-wide"]}>
              <PersonLiableSelectCheck
                value={formState.checkUserType}
                checkUserIds={formState.checkUserIds}
                checkDeptIds={formState.checkDeptIds}
                checkPostIds={formState.checkPostIds}
                checkRoleIds={formState.checkRoleIds}
                treeDefaultExpandAll
                onUpdate:value={(val: unknown) => {
                  formState.checkUserType = val;
                  formState.checkUserIds = [];
                  formState.checkDeptIds = null;
                  formState.checkPostIds = [];
                  formState.checkRoleIds = [];
                }}
                onUpdate:checkUserIds={(val: unknown) => {
                  formState.checkUserIds = val;
                }}
                onUpdate:checkDeptIds={(val: unknown) => {
                  formState.checkDeptIds = val;
                }}
                onUpdate:checkPostIds={(val: unknown) => {
                  formState.checkPostIds = val;
                }}
                onUpdate:checkRoleIds={(val: unknown) => {
                  formState.checkRoleIds = val;
                }}
              />
            </FormItem>
          ) : null}
          <FormItem label="扫码巡查" name="method">
            <Switch
              checked={formState.method === "SCAN_CODE"}
              checkedChildren="开启"
              unCheckedChildren="关闭"
              onChange={(checked: boolean) => {
                formState.method = checked ? "SCAN_CODE" : "";
              }}
            />
          </FormItem>
          <FormItem label="有效期(天)" name="limitDay">
            <InputNumber v-model:value={formState.limitDay} min={0} style={{ width: "100%" }} />
          </FormItem>
          <FormItem label="有效期(小时)" name="limitHour">
            <InputNumber v-model:value={formState.limitHour} min={0} max={23} style={{ width: "100%" }} />
          </FormItem>
          <FormItem label="有效期(分钟)" name="limitMinute">
            <InputNumber v-model:value={formState.limitMinute} min={0} max={59} style={{ width: "100%" }} />
          </FormItem>
          <FormItem label="备注" name="remark" class={styles["form-wide"]}>
            <Textarea v-model:value={formState.remark} rows={4} maxlength={500} showCount placeholder="请输入备注" />
          </FormItem>
        </div>
      </Form>
    );
  },
});
