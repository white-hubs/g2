import {
  Button,
  DatePicker,
  Form,
  type FormInstance,
  FormItem,
  Input,
  InputNumber,
  PageLayout,
  Select,
  Space,
  Spin,
  TreeSelect,
  message,
} from "@g2-platform/pc-ui";

import { ITEM_CODE, rosterFieldVariable } from "../field-config/fields";

// 页面状态与路由钩子保持同一组。
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getPersonManagementClient } from "../../domain-context";

import styles from "./roster.module.css";

const BASE = "/d/person-management";

interface Option {
  label: string;
  value: string;
  children?: Option[];
}

interface Field {
  label: string;
  key: string;
  kind?: "input" | "number" | "select" | "tree" | "date" | "month";
  enumType?: string;
  multiple?: boolean;
  required?: boolean;
  show?: boolean;
  alias?: string;
}

const baseFields: Field[] = [
  { label: "员工姓名", key: "name", required: true },
  { label: "联系电话", key: "mobile", required: true },
  { label: "性别", key: "gender", kind: "select", enumType: "gender", required: true },
  { label: "婚姻状况", key: "maritalStatus", kind: "select", enumType: "maritalStatus" },
  { label: "出生日期", key: "dateOfBirth", kind: "date", required: true },
  { label: "年龄", key: "age", kind: "number" },
  { label: "学历", key: "education", kind: "select", enumType: "edu", required: true },
  { label: "专业", key: "speciality" },
  { label: "毕业院校", key: "university" },
  { label: "民族", key: "nation" },
  { label: "政治面貌", key: "politicalStatus", kind: "select", enumType: "political" },
  { label: "地址", key: "address" },
  { label: "紧急联系人", key: "emergencyContact", required: true },
  { label: "联系人电话", key: "emergencyContactMobile", required: true },
  { label: "所在区域", key: "areaIdList", kind: "tree", multiple: true, required: true },
  { label: "员工类型", key: "type", kind: "select", enumType: "staffType", required: true },
  { label: "工号", key: "jobNumber" },
  { label: "身份证号", key: "idCard" },
  { label: "短号", key: "cornet" },
  { label: "部门", key: "organizationId", kind: "tree", required: true },
  { label: "岗位", key: "appointmentIds", kind: "select", multiple: true, required: true },
  { label: "职位", key: "postIds", kind: "select", required: true },
  { label: "员工状态", key: "status", kind: "select", enumType: "staffStatus", required: true },
  { label: "入职日期", key: "inductionDate", kind: "date", required: true },
  { label: "司龄", key: "companyYears", kind: "number" },
  { label: "试用期", key: "probationPeriod", kind: "select", enumType: "probationPeriod", required: true },
  { label: "计划转正日期", key: "planRegularWorkerDate", kind: "date" },
  { label: "转正日期", key: "regularWorkerDate", kind: "date" },
  { label: "离职日期", key: "quitDate", kind: "date" },
  { label: "首次缴纳社保", key: "paySocialInsuranceFirstDate", kind: "month", required: true },
  { label: "工龄", key: "workingYears", kind: "number" },
];

const businessFields = new Set([
  "type",
  "jobNumber",
  "idCard",
  "cornet",
  "organizationId",
  "appointmentIds",
  "postIds",
  "status",
  "inductionDate",
  "companyYears",
  "probationPeriod",
  "planRegularWorkerDate",
  "regularWorkerDate",
  "quitDate",
  "paySocialInsuranceFirstDate",
  "workingYears",
]);

const detailValueFields: Record<string, string> = {
  gender: "genderName",
  maritalStatus: "maritalStatusName",
  education: "educationName",
  politicalStatus: "politicalStatusName",
  type: "typeName",
  organizationId: "organizationName",
  postIds: "postNames",
  status: "statusName",
  probationPeriod: "probationPeriodName",
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}

function toTree(items: { id: string; name: string; children?: unknown[]; nextList?: unknown[] }[]): Option[] {
  return items.map((item) => ({
    label: item.name,
    value: String(item.id),
    children:
      Array.isArray(item.children) && item.children.length > 0
        ? toTree(item.children as { id: string; name: string; children?: unknown[] }[])
        : Array.isArray(item.nextList) && item.nextList.length > 0
          ? toTree(item.nextList as { id: string; name: string; nextList?: unknown[] }[])
          : undefined,
  }));
}

function parsedDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }
  const raw = String(value).trim();
  const parsed =
    typeof value === "number" || /^\d{12,}$/u.test(raw)
      ? new Date(Number(value))
      : /^\d{10}$/u.test(raw)
        ? new Date(Number(value) * 1000)
        : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function dateOnly(value: unknown): string | undefined {
  return parsedDate(value)?.toLocaleDateString("sv-SE");
}

function yearsSince(value: unknown): number | undefined {
  const iso = dateOnly(value);
  if (!iso) {
    return undefined;
  }
  const start = new Date(`${iso}T00:00:00`);
  const now = new Date();
  if (Number.isNaN(start.getTime())) {
    return undefined;
  }
  if (start > now) {
    return 0;
  }
  const years = now.getFullYear() - start.getFullYear();
  const anniversary = new Date(start);
  anniversary.setFullYear(start.getFullYear() + years);
  const sameDay = anniversary.getMonth() === now.getMonth() && anniversary.getDate() === now.getDate();
  return Math.max(1, sameDay ? years : anniversary > now ? years : years + 1);
}

const idCardFactors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const idCardChecks = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
const validAreaCodes = new Set([
  "11",
  "12",
  "13",
  "14",
  "15",
  "21",
  "22",
  "23",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "50",
  "51",
  "52",
  "53",
  "54",
  "61",
  "62",
  "63",
  "64",
  "65",
  "71",
  "81",
  "82",
  "83",
  "91",
]);

function validIdCard(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  const card = String(value).trim();
  if (!/^[1-9]\d{16}[\dXx]$/u.test(card) || !validAreaCodes.has(card.slice(0, 2))) {
    return false;
  }
  const birth = `${card.slice(6, 10)}-${card.slice(10, 12)}-${card.slice(12, 14)}`;
  if (dateOnly(birth) !== birth) {
    return false;
  }
  const sum = idCardFactors.reduce((total, factor, index) => total + Number(card[index]) * factor, 0);
  return idCardChecks[sum % 11] === card[17]?.toUpperCase();
}

function derivedFields(draft: Record<string, unknown>): void {
  const card = String(draft.idCard ?? "").trim();
  if (validIdCard(card) && card) {
    const birth = `${card.slice(6, 10)}-${card.slice(10, 12)}-${card.slice(12, 14)}`;
    if (dateOnly(birth) === birth) {
      draft.dateOfBirth = birth;
      draft.gender = Number(card[16]) % 2 ? "MALE" : "FEMALE";
    }
  }
  const date = parsedDate(draft.dateOfBirth);
  if (date) {
    const now = new Date();
    let years = now.getFullYear() - date.getFullYear();
    if (new Date(now.getFullYear(), date.getMonth(), date.getDate()) > now) {
      years -= 1;
    }
    draft.age = Math.max(0, years);
  }
  draft.companyYears = yearsSince(draft.inductionDate);
  draft.workingYears = yearsSince(draft.paySocialInsuranceFirstDate);
}

export function getRosterDerivedDisplayValue(record: Record<string, unknown>, field: "age" | "companyYears" | "workingYears"): unknown {
  const derived = { ...record };
  derivedFields(derived);
  return derived[field] ?? record[field] ?? "--";
}

export const RosterOperatePage = defineComponent({
  name: "PersonnelRosterOperatePage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const formRef = ref<FormInstance>();
    const loading = ref(false);
    const saving = ref(false);
    const fields = reactive<Field[]>(baseFields.map((field) => ({ ...field })));
    const draft = reactive<Record<string, unknown>>({});
    const options = reactive<Record<string, Option[]>>({});
    const mode = String(route.query.type ?? "add");
    const readonly = mode === "detail";
    const title = readonly ? "员工详情" : mode === "edit" ? "员工编辑" : "员工新增";

    const back = (): void => {
      void router.push(`${BASE}/roster`);
    };
    const displayed = (field: Field): string => {
      const detailKey = detailValueFields[field.key];
      const detailValue = detailKey ? draft[detailKey] : undefined;
      if (typeof detailValue === "string" && detailValue.trim()) {
        return detailValue;
      }
      const value = draft[field.key];
      if (value === undefined || value === null || value === "") {
        return "--";
      }
      if (field.kind === "date" || field.kind === "month") {
        return dateOnly(value) ?? "--";
      }
      if (field.kind === "select" || field.kind === "tree") {
        const values = Array.isArray(value) ? value.map(String) : [String(value)];
        const flatten = (items: Option[]): Option[] => items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
        const labels = flatten(options[field.key] ?? [])
          .filter((item) => values.includes(item.value))
          .map((item) => item.label);
        return labels.join("、") || String(value);
      }
      return String(value);
    };

    const control = (field: Field) => {
      const value = draft[field.key];
      const update = (next: unknown): void => {
        draft[field.key] = next;
        if (["idCard", "dateOfBirth", "inductionDate", "paySocialInsuranceFirstDate"].includes(field.key)) {
          derivedFields(draft);
        }
      };
      if (field.kind === "number") {
        return (
          <InputNumber
            value={typeof value === "number" ? value : undefined}
            min={0}
            precision={0}
            style={{ width: "100%" }}
            placeholder={`请输入${field.alias || field.label}`}
            onUpdate:value={update}
          />
        );
      }
      if (field.kind === "select") {
        return (
          <Select
            value={Array.isArray(value) ? value : value === null ? undefined : (value as string | undefined)}
            options={options[field.key] ?? []}
            mode={field.multiple ? "multiple" : undefined}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={`请选择${field.alias || field.label}`}
            onUpdate:value={update}
          />
        );
      }
      if (field.kind === "tree") {
        return (
          <TreeSelect
            value={Array.isArray(value) ? value : value === null ? undefined : (value as string | undefined)}
            treeData={options[field.key] ?? []}
            multiple={field.multiple}
            allowClear
            showSearch
            treeDefaultExpandAll
            treeNodeFilterProp="label"
            placeholder={`请选择${field.alias || field.label}`}
            onUpdate:value={update}
          />
        );
      }
      if (field.kind === "date" || field.kind === "month") {
        return (
          <DatePicker
            value={typeof value === "string" ? value : undefined}
            valueFormat={field.kind === "month" ? "YYYY-MM-DD" : "YYYY-MM-DD"}
            format={field.kind === "month" ? "YYYY-MM" : "YYYY-MM-DD"}
            picker={field.kind === "month" ? "month" : "date"}
            style={{ width: "100%" }}
            placeholder={`请选择${field.alias || field.label}`}
            onUpdate:value={update}
          />
        );
      }
      return (
        <Input
          value={typeof value === "string" ? value : undefined}
          maxlength={field.key === "name" ? 20 : field.key === "idCard" ? 18 : 200}
          placeholder={`请输入${field.alias || field.label}`}
          onUpdate:value={update}
        />
      );
    };

    const section = (name: string, source: Field[]) => (
      <section class={styles.section}>
        <h3 class={styles.sectionTitle}>{name}</h3>
        <div class={styles.fieldGrid}>
          {source
            .filter((field) => field.show !== false)
            .map((field) =>
              readonly ? (
                <div class={styles.detailField} key={field.key}>
                  <span>{field.alias || field.label}：</span>
                  <strong>{displayed(field)}</strong>
                </div>
              ) : (
                <FormItem
                  key={field.key}
                  label={field.alias || field.label}
                  name={field.key}
                  rules={[
                    ...(field.required ? [{ required: true, message: `${field.alias || field.label}不能为空` }] : []),
                    ...(field.key === "idCard"
                      ? [
                          {
                            validator: (_rule: unknown, value: unknown) =>
                              validIdCard(value) ? Promise.resolve() : Promise.reject(new Error("身份证号格式不正确")),
                          },
                        ]
                      : []),
                  ]}
                >
                  {control(field)}
                </FormItem>
              ),
            )}
        </div>
      </section>
    );

    const save = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      try {
        await formRef.value?.validateFields();
        saving.value = true;
        const data: Record<string, unknown> = {};
        if (mode === "edit" && draft.id) {
          data.id = draft.id;
        }
        for (const field of baseFields) {
          const value = draft[field.key];
          if (value !== undefined) {
            data[field.key] = value;
          }
        }
        if (typeof data.postIds === "string") {
          data.postIds = data.postIds ? [data.postIds] : [];
        }
        await getPersonManagementClient().saveStaff(data);
        message.success("操作成功");
        back();
      } catch (error) {
        if (error instanceof Error) {
          message.error(errorMessage(error, "保存失败"));
        }
      } finally {
        saving.value = false;
      }
    };

    onMounted(async () => {
      loading.value = true;
      const client = getPersonManagementClient();
      const references = [
        ...["gender", "maritalStatus", "edu", "political", "staffType", "staffStatus", "probationPeriod"].map(async (type) => {
          const rows = await client.getStaffEnums(type);
          for (const field of fields.filter((item) => item.enumType === type)) {
            options[field.key] = rows.map((item) => ({ label: item.name, value: item.value }));
          }
        }),
        client.treeDepartments().then((rows) => {
          options.organizationId = toTree(rows);
        }),
        client.getAreaTree().then((rows) => {
          options.areaIdList = toTree(rows);
        }),
        client.listAppointments().then((rows) => {
          options.appointmentIds = rows.map((item) => ({ label: item.name, value: String(item.id) }));
        }),
        client.listPositions().then((rows) => {
          options.postIds = rows.map((item) => ({ label: item.name, value: String(item.id) }));
        }),
        client.getDictionaryByItem({ itemCode: ITEM_CODE }).then((rows) => {
          const record = rows.find((item) => item.code === "roster");
          const saved = new Map(rosterFieldVariable(record?.variable).fields.map((item) => [item.key, item]));
          for (const field of fields) {
            const override = saved.get(field.key);
            if (override) {
              Object.assign(field, { show: override.show, required: override.required, alias: override.alias });
            }
          }
        }),
      ];
      const detailId = typeof route.query.id === "string" ? route.query.id : undefined;
      if (detailId && mode !== "add") {
        references.push(
          client.getStaff(detailId, readonly).then((record) => {
            Object.assign(draft, record);
            for (const field of fields.filter((item) => item.kind === "date" || item.kind === "month")) {
              draft[field.key] = dateOnly(draft[field.key]);
            }
            derivedFields(draft);
          }),
        );
      }
      const results = await Promise.allSettled(references);
      for (const result of results) {
        if (result.status === "rejected") {
          message.error(errorMessage(result.reason, "员工资料加载失败"));
        }
      }
      loading.value = false;
    });

    return () => (
      <PageLayout
        title={title}
        v-slots={{
          "layout-content": () => (
            <Spin spinning={loading.value}>
              <Form ref={formRef} model={draft} labelCol={{ style: { width: "120px" } }}>
                {section(
                  "基本信息",
                  fields.filter((field) => !businessFields.has(field.key)),
                )}
                {section(
                  "公司信息",
                  fields.filter((field) => businessFields.has(field.key)),
                )}
              </Form>
            </Spin>
          ),
          "footer-page": () => (
            <div class={styles.footer}>
              <Space>
                <Button onClick={back}>返回</Button>
                {!readonly ? (
                  <Button type="primary" loading={saving.value} onClick={() => void save()}>
                    保存
                  </Button>
                ) : null}
              </Space>
            </div>
          ),
        }}
      />
    );
  },
});
