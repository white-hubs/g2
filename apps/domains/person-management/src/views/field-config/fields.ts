export const ITEM_CODE = "FIELD_CONFIG";

export interface RosterField {
  fieldName: string;
  key: string;
  show: boolean;
  required: boolean;
  alias: string;
}

export interface RosterFieldVariable {
  fields: RosterField[];
  keywords: { key: string; fieldName: string; alias?: string }[];
}

export const ROSTER_CONFIG: { code: string; name: string; variable: RosterFieldVariable } = {
  code: "roster",
  name: "员工字段-关键字配置",
  variable: {
    fields: [
      { fieldName: "出生日期", key: "dateOfBirth", show: true, required: true, alias: "" },
      { fieldName: "年龄", key: "age", show: true, required: false, alias: "" },
      { fieldName: "职位", key: "postIds", show: true, required: true, alias: "" },
      { fieldName: "岗位", key: "appointmentIds", show: true, required: true, alias: "" },
      { fieldName: "员工类型", key: "type", show: true, required: true, alias: "" },
      { fieldName: "性别", key: "gender", show: true, required: true, alias: "" },
      { fieldName: "婚姻状况", key: "maritalStatus", show: true, required: false, alias: "" },
      { fieldName: "学历", key: "education", show: true, required: true, alias: "" },
      { fieldName: "专业", key: "speciality", show: true, required: false, alias: "" },
      { fieldName: "毕业院校", key: "university", show: true, required: false, alias: "" },
      { fieldName: "民族", key: "nation", show: true, required: false, alias: "" },
      { fieldName: "政治面貌", key: "politicalStatus", show: true, required: false, alias: "" },
      { fieldName: "地址", key: "address", show: true, required: false, alias: "" },
      { fieldName: "紧急联系人", key: "emergencyContact", show: true, required: true, alias: "" },
      { fieldName: "联系人电话", key: "emergencyContactMobile", show: true, required: true, alias: "" },
      { fieldName: "所在区域", key: "areaIdList", show: true, required: true, alias: "" },
      { fieldName: "工号", key: "jobNumber", show: true, required: false, alias: "" },
      { fieldName: "身份证号", key: "idCard", show: true, required: false, alias: "" },
      { fieldName: "短号", key: "cornet", show: true, required: false, alias: "" },
      { fieldName: "员工状态", key: "status", show: true, required: true, alias: "" },
      { fieldName: "入职日期", key: "inductionDate", show: true, required: true, alias: "" },
      { fieldName: "司龄", key: "companyYears", show: true, required: false, alias: "" },
      { fieldName: "试用期", key: "probationPeriod", show: true, required: true, alias: "" },
      { fieldName: "计划转正日期", key: "planRegularWorkerDate", show: true, required: false, alias: "" },
      { fieldName: "转正日期", key: "regularWorkerDate", show: true, required: false, alias: "" },
      { fieldName: "离职日期", key: "quitDate", show: true, required: false, alias: "" },
      { fieldName: "首次缴纳社保时间", key: "paySocialInsuranceFirstDate", show: true, required: true, alias: "" },
      { fieldName: "工龄", key: "workingYears", show: true, required: false, alias: "" },
    ],
    keywords: [],
  },
};

export function rosterFieldVariable(raw: string | undefined): RosterFieldVariable {
  if (!raw) {
    return structuredClone(ROSTER_CONFIG.variable);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("员工字段配置数据格式错误");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("员工字段配置数据格式错误");
  }
  const source = parsed as Record<string, unknown>;
  const persisted = Array.isArray(source.fields) ? source.fields : [];
  const byKey = new Map(ROSTER_CONFIG.variable.fields.map((item) => [item.key, item]));
  const seen = new Set<string>();
  const merged = persisted.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return [];
    }
    const item = candidate as Record<string, unknown>;
    const fallback = byKey.get(String(item.key ?? ""));
    if (!fallback || seen.has(fallback.key)) {
      return [];
    }
    seen.add(fallback.key);
    const { isEdit: _isEdit, ...savedField } = item;
    return [
      {
        ...fallback,
        ...savedField,
        key: fallback.key,
        fieldName: typeof item.fieldName === "string" ? item.fieldName : fallback.fieldName,
        show: typeof item.show === "boolean" ? item.show : fallback.show,
        required: typeof item.required === "boolean" ? item.required : fallback.required,
        alias: typeof item.alias === "string" ? item.alias : fallback.alias,
      },
    ];
  });
  const fields = [...merged, ...structuredClone(ROSTER_CONFIG.variable.fields.filter((item) => !seen.has(item.key)))];
  const keywords = Array.isArray(source.keywords)
    ? source.keywords.filter(
        (item): item is { key: string; fieldName: string; alias?: string } =>
          Boolean(item) && typeof item === "object" && typeof item.key === "string" && typeof item.fieldName === "string",
      )
    : [];
  return { fields, keywords };
}
