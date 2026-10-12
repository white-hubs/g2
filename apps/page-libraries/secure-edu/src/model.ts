import type { EduResource, QuestionOption, SecureEduRecord } from "@g2-contract/secure-edu";
export type Row = SecureEduRecord;
export const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
export const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? value.filter((item): item is Row => Boolean(item && typeof item === "object")) : [];
export const text = (value: unknown): string => (value === undefined || value === null || value === "" ? "" : String(value));
export const errorText = (error: unknown) => (error instanceof Error ? error.message : "操作失败，请稍后重试");
export const number = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** 任务课件的文件地址来自 files[0]，课件库选择则使用 file，两种回填都保留真实附件。 */
export function courseware(row: Row, index = 0): Row {
  const file = object(row.file);
  const stored = rows(row.files)[0];
  const fileId = text(row.fileIds || file.id);
  const fileName = text(row.fileName || file.name || row.name);
  const fileSize = row.fileSize ?? file.size;
  return {
    id: text(row.id || fileId || index),
    name: text(row.fileName || row.name || file.name),
    fileIds: fileId,
    fileName,
    fileSize,
    duration: number(row.duration),
    file: { id: fileId, name: fileName, size: fileSize, path: text(file.path || stored?.path) },
  };
}

/** 按旧新增/修改契约白名单提交，避免详情 VOs 和其他表单默认字段混入请求。 */
export function saveCommand(resource: EduResource, values: Record<string, unknown>): Record<string, unknown> {
  const fields: Partial<Record<EduResource, readonly string[]>> = {
    "training-task": [
      "name",
      "themeId",
      "chargeUserId",
      "chargeUserName",
      "cultivateAddress",
      "cultivateContent",
      "cultivateCoursewares",
      "cultivateStartTime",
      "cultivateEndTime",
      "cultivateMode",
      "cultivateTarget",
      "cultivateTaskStatus",
      "cultivateUserNumber",
      "cultivateUsers",
      "examTaskId",
      "speaker",
      "lateStatus",
    ],
    "exam-task": [
      "name",
      "themeId",
      "chargeUserId",
      "examDuration",
      "examDurationUnit",
      "examStartTime",
      "examEndTime",
      "examPaperIds",
      "examPaperMode",
      "examTaskType",
      "examUserNumber",
      "examUsers",
      "remark",
      "retake",
      "retakeNumber",
      "timed",
    ],
    "test-paper-manage": ["name", "passingGradeScore", "questionCategories", "remark", "score"],
    courseware: ["fileId", "name", "remark", "duration", "themeId"],
    question: ["name", "themeId", "questionType", "questionContent", "score", "answerAnalysis"],
    theme: ["name", "remark"],
    "paper-question-rule": ["ruleName", "passScore", "description", "items"],
  };
  const keys = fields[resource];
  if (!keys) {
    throw new Error("该页面不支持保存");
  }
  return Object.fromEntries(keys.filter((key) => values[key] !== undefined).map((key) => [key, values[key]]));
}
/** 毫秒时间戳不能转成字符串传给 dayjs，否则会被误读为公元年份。 */
export const dateValue = (value: unknown): string | number =>
  typeof value === "number" ? value : /^\d{11,13}$/u.test(text(value)) ? Number(value) : text(value);
export const options = (list: Row[], field = "name") => list.map((item) => ({ label: text(item[field] ?? item.name), value: item.id }));
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
export const TYPES = [
  { label: "员工培训", value: "STAFF" },
  { label: "商户培训", value: "MERCHANT" },
];
export const MODES = [
  { label: "线上培训", value: "ONLINE" },
  { label: "线下培训", value: "OFFLINE" },
];
export const EXAM_TYPES = [
  { label: "员工考核", value: "STAFF_EXAM" },
  { label: "商户考核", value: "MERCHANT_EXAM" },
];
export const QUESTION_TYPES = [
  { label: "单选题", value: "SINGLE_CHOICE" },
  { label: "多选题", value: "MULTIPLE_CHOICE" },
  { label: "判断题", value: "JUDGE" },
];
export const LABELS: Record<string, string> = Object.fromEntries(
  [
    ...TYPES,
    ...MODES,
    ...EXAM_TYPES,
    ...QUESTION_TYPES,
    { label: "集团下发", value: "HEADQUARTERS" },
    { label: "自建任务", value: "LOCAL_CREATE" },
    { label: "待发布", value: "WAIT_PUBLISH" },
    { label: "已发布", value: "PUBLISHED" },
    { label: "进行中", value: "TRAINING" },
    { label: "已完成", value: "OVER" },
    { label: "已撤销", value: "REVOKED" },
    { label: "待发布", value: "UNPUBLISHED" },
    { label: "待考试", value: "STAY_EXAM" },
    { label: "进行中", value: "IN_PROGRESS" },
    { label: "已结束", value: "ENDED" },
  ].map((item) => [item.value, item.label]),
);
export function allowedAction(row: Row, action: "edit" | "delete" | "publish" | "withdraw", training: boolean): boolean {
  const status = text(row[training ? "cultivateTaskStatus" : "examTaskStatus"]);
  if (action === "publish") {
    return status === (training ? "WAIT_PUBLISH" : "UNPUBLISHED");
  }
  if (action === "withdraw") {
    return training ? ["PUBLISHED", "REVOKED"].includes(status) : status === "STAY_EXAM";
  }
  if (action === "delete" && row.sourceCode === "HEADQUARTERS") {
    return false;
  }
  return !(
    training
      ? action === "edit"
        ? ["PUBLISHED", "TRAINING", "OVER"]
        : ["PUBLISHED", "TRAINING"]
      : action === "edit"
        ? ["STAY_EXAM", "IN_PROGRESS", "ENDED"]
        : ["STAY_EXAM", "IN_PROGRESS"]
  ).includes(status);
}
export function defaultOptions(type: string): QuestionOption[] {
  return Array.from({ length: type === "JUDGE" ? 2 : 4 }, (_, i) => ({
    sort: i + 1,
    optionID: String.fromCodePoint(65 + i),
    optionTitle: type === "JUDGE" ? (i === 0 ? "正确" : "错误") : "",
    isRight: false,
    isCheck: false,
  }));
}
export function parseQuestion(value: unknown, type: string): QuestionOption[] {
  if (!value) {
    return defaultOptions(type);
  }
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) {
    throw new TypeError("试题选项格式不正确");
  }
  return parsed.map((entry, i) => {
    const item = object(entry);
    return {
      sort: i + 1,
      optionID: String.fromCodePoint(65 + i),
      optionTitle: text(item.optionTitle),
      isRight: item.isRight === true,
      isCheck: false,
    };
  });
}
export function validateQuestion(question: Record<string, unknown>, choices: QuestionOption[]) {
  if (!text(question.name).trim() || !question.themeId || number(question.score) <= 0) {
    throw new Error("请填写题目、主题和分数");
  }
  const titles = choices.map((item) => item.optionTitle.trim());
  if (choices.length < 2 || titles.some((title) => !title) || new Set(titles).size !== titles.length) {
    throw new Error("至少保留两个选项，内容不能为空或重复");
  }
  const right = choices.filter((item) => item.isRight).length;
  if (!right || (question.questionType !== "MULTIPLE_CHOICE" && right !== 1)) {
    throw new Error("请选择正确答案，单选和判断题只能有一个正确答案");
  }
}
export function person(row: Row): Row {
  const org = rows(row.organizations)[0] ?? object(row.department);
  const post = rows(row.positions)[0] ?? {};
  return {
    ...row,
    id: text(row.userId ?? row.id),
    name: text(row.userName ?? row.name),
    phone: text(row.userPhone ?? row.phone ?? row.mobile),
    departmentId: text(row.userDepartmentId ?? row.departmentId ?? org.id),
    departmentName: text(row.userDepartmentName ?? row.departmentName ?? org.name),
    postId: text(row.userPostId ?? row.postId ?? post.id),
    postName: text(row.userPostName ?? row.postName ?? post.name),
  };
}
export function taskPeople(value: unknown, training: boolean) {
  return rows(value)
    .map((entry) => person(entry))
    .map((user) =>
      training
        ? {
            userId: user.id,
            userName: user.name,
            userPhone: user.phone,
            userDepartmentId: user.departmentId,
            userDepartmentName: user.departmentName,
            userPostId: user.postId,
            userPostName: user.postName,
          }
        : {
            id: user.id,
            name: user.name,
            phone: user.phone,
            departmentId: user.departmentId,
            departmentName: user.departmentName,
            postId: user.postId,
            postName: user.postName,
          },
    );
}
