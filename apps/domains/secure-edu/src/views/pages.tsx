import { createCrudListPage } from "../components/crud-list-page";
import { createRecordEditorPage } from "../components/record-editor-page";
import { getDayjs } from "../pc-ui-runtime";
import { createLinkConfigPage } from "./link-config";

const dayjs = getDayjs();

const trainingEndpoint = "/api/safety-education/headquarters/cultivate-task" as const;
const examEndpoint = "/api/safety-education/headquarters/exam-task" as const;
const themeRemote = {
  endpoint: "/api/safety-education/theme/page" as const,
  query: { pageNumber: 1, pageSize: 1000 },
};
const trainingTaskRemote = {
  endpoint: `${trainingEndpoint}/page` as const,
  query: { pageNumber: 1, pageSize: 1000 },
};
const examTaskRemote = {
  endpoint: `${examEndpoint}/page` as const,
  query: { pageNumber: 1, pageSize: 1000 },
};
const marketRemote = {
  endpoint: "/api/dataintegrate/market-config/list" as const,
  labelKey: "marketName",
  valueKey: "marketTenant",
};
const themeEditorRemote = {
  endpoint: "/api/safety-education/theme/page" as const,
  query: { pageNumber: 1, pageSize: 1000 },
};
const lastThirtyDays = (): [string, string] => [
  dayjs().subtract(30, "day").startOf("day").format("YYYY-MM-DD HH:mm:ss"),
  dayjs().endOf("day").format("YYYY-MM-DD HH:mm:ss"),
];

export const TrainingTask = createCrudListPage({
  title: "培训任务",
  endpoint: `${trainingEndpoint}/page`,
  keywordPlaceholder: "培训任务名称",
  filters: [
    {
      key: "cultivateTarget",
      label: "培训类型",
      type: "select",
      options: [
        { label: "员工培训", value: "STAFF" },
        { label: "商户培训", value: "MERCHANT" },
      ],
    },
    {
      key: "cultivateMode",
      label: "培训形式",
      type: "select",
      options: [
        { label: "线上培训", value: "ONLINE" },
        { label: "线下培训", value: "OFFLINE" },
      ],
    },
    { key: "themeId", label: "培训主题", type: "select", remote: themeRemote },
    {
      key: "cultivateTaskStatus",
      label: "状态",
      type: "select",
      options: [
        { label: "待发布", value: "WAIT_PUBLISH" },
        { label: "已发布", value: "PUBLISHED" },
        { label: "进行中", value: "TRAINING" },
        { label: "已完成", value: "OVER" },
        { label: "已撤销", value: "REVOKED" },
      ],
    },
    { key: "period", label: "培训日期", type: "date", width: 180 },
  ],
  editorPath: "/d/secure-edu-head/training-task-form",
  detailPath: "/d/secure-edu-head/training-task-form",
  deletePath: (id) => `${trainingEndpoint}/${encodeURIComponent(id)}`,
  statusAction: {
    field: "cultivateTaskStatus",
    publishedValue: "PUBLISHED",
    publishPath: (id) => `${trainingEndpoint}/${encodeURIComponent(id)}/update/PUBLISHED`,
    withdrawPath: (id) => `${trainingEndpoint}/${encodeURIComponent(id)}/update/REVOKED`,
  },
  columns: [
    { title: "任务名称", key: "name", width: 180 },
    { title: "培训主题", key: "themeName", width: 140 },
    { title: "培训类型", key: "cultivateTargetName", fallbackKeys: ["cultivateTarget"], width: 120 },
    { title: "培训形式", key: "cultivateModeName", fallbackKeys: ["cultivateMode"], width: 120 },
    { title: "负责人", key: "chargeUserName", width: 120 },
    { title: "主讲人", key: "speaker", width: 120 },
    { title: "培训截至时间", key: "cultivateEndTime", width: 180 },
    { title: "参加人数", key: "cultivateUserNumber", width: 110 },
    { title: "状态", key: "cultivateTaskStatusName", fallbackKeys: ["cultivateTaskStatus"], width: 120 },
  ],
});

export const TrainingTaskForm = createRecordEditorPage({
  title: "培训任务",
  endpoint: trainingEndpoint,
  fields: [
    { key: "name", label: "培训名称", required: true },
    { key: "themeId", label: "培训主题", type: "select", required: true, remote: themeEditorRemote },
    {
      key: "cultivateTarget",
      label: "培训对象",
      type: "select",
      required: true,
      options: [
        { label: "员工", value: "STAFF" },
        { label: "商户", value: "MERCHANT" },
      ],
    },
    {
      key: "cultivateMode",
      label: "培训形式",
      type: "select",
      required: true,
      options: [
        { label: "线上", value: "ONLINE" },
        { label: "线下", value: "OFFLINE" },
      ],
    },
    { key: "cultivateStartTime", label: "开始时间", type: "dateTime", required: true },
    { key: "cultivateEndTime", label: "结束时间", type: "dateTime", required: true },
    { key: "cultivateAddress", label: "培训地点" },
    { key: "cultivateContent", label: "培训内容", type: "textarea" },
    { key: "speaker", label: "主讲人" },
    { key: "chargeUserId", label: "负责人", placeholder: "请选择负责人" },
    { key: "cultivateUserNumber", label: "参加人数", type: "number" },
    { key: "lateStatus", label: "开启迟到", type: "boolean" },
  ],
});

export const TrainingRecords = createCrudListPage({
  title: "培训记录",
  endpoint: "/api/safety-education/headquarters/cultivate-user/records",
  exportPath: "/api/safety-education/headquarters/cultivate-user/records/export",
  keywordPlaceholder: "人员姓名",
  filters: [
    {
      key: "cultivateMode",
      label: "培训形式",
      type: "select",
      options: [
        { label: "线上培训", value: "ONLINE" },
        { label: "线下培训", value: "OFFLINE" },
      ],
    },
    { key: "themeId", label: "培训主题", type: "select", remote: themeRemote },
    { key: "cultivateTaskId", label: "培训任务", type: "select", remote: trainingTaskRemote },
    {
      key: "userSignStatus",
      label: "学习状态",
      type: "select",
      options: [
        { label: "正常", value: "SIGNED" },
        { label: "缺勤", value: "UNSIGNED" },
      ],
    },
    { key: "period", label: "培训日期", type: "dateRange", width: 240, defaultValue: lastThirtyDays() },
    { key: "marketTenant", label: "市场", type: "select", remote: marketRemote },
  ],
  columns: [
    { title: "人员姓名", key: "name", width: 130 },
    { title: "所属市场", key: "market.marketName", fallbackKeys: ["marketName", "market"], width: 150 },
    { title: "所在部门", key: "departmentName", width: 150 },
    { title: "岗位", key: "postName", width: 130 },
    { title: "学习状态", key: "userSignStatus", width: 120 },
    { title: "培训任务", key: "cultivateTask.name", fallbackKeys: ["cultivateTaskName", "cultivateTask"], width: 180 },
    { title: "培训主题", key: "cultivateTask.themeName", fallbackKeys: ["themeName"], width: 140 },
    { title: "培训形式", key: "cultivateTask.cultivateModeName", fallbackKeys: ["cultivateModeName", "cultivateMode"], width: 120 },
    { title: "任务结束时间", key: "cultivateTask.cultivateEndTime", fallbackKeys: ["cultivateEndTime"], width: 180 },
  ],
});

export const ExamTask = createCrudListPage({
  title: "考试任务",
  endpoint: `${examEndpoint}/page`,
  keywordPlaceholder: "任务名称、考试主题",
  filters: [
    {
      key: "examTaskType",
      label: "考试类型",
      type: "select",
      width: 180,
      options: [
        { label: "员工考核", value: "STAFF_EXAM" },
        { label: "商户考核", value: "MERCHANT_EXAM" },
      ],
    },
    { key: "themeId", label: "考试主题", type: "select", width: 180, remote: themeRemote },
    {
      key: "examTaskStatus",
      label: "考试状态",
      type: "select",
      width: 180,
      options: [
        { label: "待发布", value: "UNPUBLISHED" },
        { label: "待考试", value: "STAY_EXAM" },
        { label: "进行中", value: "IN_PROGRESS" },
        { label: "已结束", value: "ENDED" },
      ],
    },
    { key: "period", label: "考试开始日期", type: "date", width: 180 },
  ],
  editorPath: "/d/secure-edu-head/exam-task-form",
  detailPath: "/d/secure-edu-head/exam-task-form",
  deletePath: (id) => `${examEndpoint}/${encodeURIComponent(id)}`,
  statusAction: {
    field: "examTaskStatus",
    publishedValue: "STAY_EXAM",
    publishPath: (id) => `${examEndpoint}/published/${encodeURIComponent(id)}`,
    withdrawPath: (id) => `${examEndpoint}/withdraw/${encodeURIComponent(id)}`,
  },
  columns: [
    { title: "任务名称", key: "name", width: 180 },
    { title: "考试主题", key: "themeName", width: 140 },
    { title: "考试类型", key: "examTaskTypeName", fallbackKeys: ["examTaskType"], width: 120 },
    { title: "负责人", key: "chargeUserName", width: 120 },
    { title: "考试开始时间", key: "examStartTime", width: 180 },
    { title: "考试结束时间", key: "examEndTime", width: 180 },
    { title: "参加人数", key: "examUserNumber", width: 110 },
    { title: "状态", key: "examTaskStatusName", fallbackKeys: ["examTaskStatus"], width: 120 },
  ],
});

export const ExamTaskForm = createRecordEditorPage({
  title: "考试任务",
  endpoint: examEndpoint,
  fields: [
    { key: "name", label: "考试名称", required: true },
    { key: "themeId", label: "考试主题", type: "select", required: true, remote: themeEditorRemote },
    {
      key: "examTaskType",
      label: "考试类型",
      type: "select",
      required: true,
      options: [
        { label: "员工考核", value: "STAFF_EXAM" },
        { label: "商户考核", value: "MERCHANT_EXAM" },
      ],
    },
    { key: "examStartTime", label: "开始时间", type: "dateTime", required: true },
    { key: "examEndTime", label: "结束时间", type: "dateTime", required: true },
    { key: "chargeUserId", label: "负责人", placeholder: "请选择负责人" },
    { key: "examUserNumber", label: "参加人数", type: "number" },
    { key: "timed", label: "限时考试", type: "boolean" },
    { key: "examDuration", label: "考试时长" },
    { key: "retake", label: "允许复考", type: "boolean" },
    { key: "retakeNumber", label: "复考次数", type: "number" },
    { key: "remark", label: "考试说明", type: "textarea" },
  ],
});

export const ExamRecords = createCrudListPage({
  title: "考试记录",
  endpoint: "/api/safety-education/headquarters/exam-user/records",
  exportPath: "/api/safety-education/headquarters/exam-user/records/export",
  keywordPlaceholder: "人员姓名",
  filters: [
    { key: "themeId", label: "考试主题", type: "select", remote: themeRemote },
    { key: "examTaskId", label: "考试任务", type: "select", remote: examTaskRemote },
    {
      key: "examStatus",
      label: "出勤状态",
      type: "select",
      options: [
        { label: "正常", value: "EXAMINED" },
        { label: "缺考", value: "MISS_EXAM" },
      ],
    },
    {
      key: "passed",
      label: "考试状态",
      type: "select",
      options: [
        { label: "及格", value: "true" },
        { label: "不及格", value: "false" },
      ],
      serialize: (value) => value === "true",
    },
    { key: "period", label: "考试日期", type: "dateRange", width: 240, defaultValue: lastThirtyDays() },
    { key: "marketTenant", label: "市场", type: "select", remote: marketRemote },
  ],
  columns: [
    { title: "人员姓名", key: "name", width: 130 },
    { title: "所属市场", key: "market.marketName", fallbackKeys: ["marketName", "market"], width: 150 },
    { title: "所在部门", key: "departmentName", width: 150 },
    { title: "岗位", key: "postName", width: 130 },
    { title: "考试分数", key: "userExamPaper.score", fallbackKeys: ["score"], width: 110 },
    { title: "出勤状态", key: "userExamPaper.status", fallbackKeys: ["attendanceStatusName", "examStatus"], width: 120 },
    {
      title: "考试状态",
      key: "userExamPaper.passed",
      fallbackKeys: ["examStatusName", "passed"],
      valueMap: { true: "及格", false: "不及格" },
      width: 120,
    },
    { title: "考试任务", key: "examTask.name", fallbackKeys: ["examTaskName"], width: 180 },
    { title: "考试主题", key: "examTask.themeName", fallbackKeys: ["themeName"], width: 140 },
  ],
});

export const TestPaperManage = createCrudListPage({
  title: "试卷管理",
  endpoint: "/api/safety-education/exam-paper/page",
  keywordPlaceholder: "试卷名称",
  editorPath: "/d/secure-edu-head/test-paper-manage-form",
  detailPath: "/d/secure-edu-head/test-paper-manage-form",
  deletePath: (id) => `/api/safety-education/exam-paper/${encodeURIComponent(id)}`,
  columns: [
    { title: "试卷名称", key: "name", width: 180 },
    { title: "试卷总分", key: "score", width: 110 },
    { title: "及格分数", key: "passingGradeScore", width: 110 },
    { title: "试题数", key: "examPaperQuestionNumber", width: 100 },
    { title: "试卷说明", key: "remark", width: 280 },
  ],
});

export const TestPaperManageForm = createRecordEditorPage({
  title: "试卷管理",
  endpoint: "/api/safety-education/exam-paper",
  fields: [
    { key: "name", label: "试卷名称", required: true },
    { key: "score", label: "试卷总分", type: "number", required: true },
    { key: "passingGradeScore", label: "及格分数", type: "number", required: true },
    { key: "remark", label: "试卷说明", type: "textarea" },
  ],
});

export const Courseware = createCrudListPage({
  title: "课件库",
  endpoint: "/api/safety-education/courseware-library/page",
  keywordPlaceholder: "课件名称、课件主题",
  editorPath: "/d/secure-edu-head/courseware-form",
  detailPath: "/d/secure-edu-head/courseware-form",
  deletePath: (id) => `/api/safety-education/courseware-library/${encodeURIComponent(id)}`,
  columns: [
    { title: "课件名称", key: "name", width: 180 },
    { title: "课件主题", key: "themeName", width: 140 },
    { title: "附件", key: "file", width: 220 },
    { title: "附件大小", key: "fileSize", width: 110 },
    { title: "附件时长", key: "duration", width: 110 },
    { title: "课件描述", key: "remark", width: 260 },
  ],
});

export const CoursewareForm = createRecordEditorPage({
  title: "课件库",
  endpoint: "/api/safety-education/courseware-library",
  fields: [
    { key: "name", label: "课件名称", required: true },
    { key: "themeId", label: "课件主题", type: "select", required: true, remote: themeEditorRemote },
    { key: "remark", label: "课件描述", type: "textarea" },
    { key: "fileIds", label: "附件", placeholder: "请输入附件标识，多个请用逗号分隔" },
    { key: "fileName", label: "文件名称" },
    { key: "fileSize", label: "文件大小" },
    { key: "duration", label: "课件时长", type: "number" },
  ],
});

export const Question = createCrudListPage({
  title: "考题库",
  endpoint: "/api/safety-education/exam-question-bank/page",
  keywordPlaceholder: "题目名称、题目主题",
  templateDownloadPath: "/api/safety-education/exam-question-bank/template",
  importPath: "/api/safety-education/exam-question-bank/import",
  importErrorExportPath: "/api/safety-education/exam-question-bank/error/export",
  editorPath: "/d/secure-edu-head/question-form",
  detailPath: "/d/secure-edu-head/question-form",
  deletePath: (id) => `/api/safety-education/exam-question-bank/${encodeURIComponent(id)}`,
  columns: [
    { title: "题目", key: "name", width: 320 },
    { title: "题目主题", key: "themeName", width: 180 },
    { title: "题目类型", key: "questionTypeName", width: 140 },
  ],
});

export const QuestionForm = createRecordEditorPage({
  title: "考题库",
  endpoint: "/api/safety-education/exam-question-bank",
  fields: [
    { key: "themeId", label: "题目主题", type: "select", required: true, remote: themeEditorRemote },
    {
      key: "questionType",
      label: "题目类型",
      type: "select",
      required: true,
      options: [
        { label: "单选题", value: "SINGLE_CHOICE" },
        { label: "多选题", value: "MULTIPLE_CHOICE" },
        { label: "判断题", value: "JUDGE" },
      ],
    },
    { key: "name", label: "题目名称", type: "textarea", required: true },
    { key: "score", label: "分数", type: "number", required: true },
    { key: "questionContent", label: "题目内容", type: "textarea", required: true },
    { key: "answerAnalysis", label: "答案解析", type: "textarea" },
  ],
});

export const Theme = createCrudListPage({
  title: "主题管理",
  endpoint: "/api/safety-education/theme/page",
  keywordPlaceholder: "主题名称",
  editorPath: "/d/secure-edu-head/theme-form",
  detailPath: "/d/secure-edu-head/theme-form",
  deletePath: (id) => `/api/safety-education/theme/${encodeURIComponent(id)}`,
  columns: [
    { title: "主题名称", key: "name", width: 260 },
    { title: "备注说明", key: "remark", width: 400 },
  ],
});

export const ThemeForm = createRecordEditorPage({
  title: "主题管理",
  endpoint: "/api/safety-education/theme",
  fields: [
    { key: "name", label: "主题名称", required: true },
    { key: "remark", label: "备注说明", type: "textarea" },
  ],
});

export const PaperQuestionRule = createCrudListPage({
  title: "随机考题规则",
  endpoint: "/api/safety-education/exam-question-rule/list",
  keywordPlaceholder: "规则名称",
  editorPath: "/d/secure-edu-head/paper-question-rule-form",
  detailPath: "/d/secure-edu-head/paper-question-rule-form",
  deletePath: (id) => `/api/safety-education/exam-question-rule/remove/${encodeURIComponent(id)}`,
  columns: [
    { title: "规则名称", key: "ruleName", width: 220 },
    { title: "试卷总分", key: "totalScore", width: 110 },
    { title: "及格分数", key: "passScore", width: 110 },
    { title: "试题数", key: "questionNum", width: 100 },
    { title: "规则说明", key: "description", width: 280 },
  ],
});

export const PaperQuestionRuleForm = createRecordEditorPage({
  title: "随机考题规则",
  endpoint: "/api/safety-education/exam-question-rule/create",
  createPath: "/api/safety-education/exam-question-rule/create",
  updatePath: () => "/api/safety-education/exam-question-rule/change",
  detailPath: (id) => `/api/safety-education/exam-question-rule/detail/${encodeURIComponent(id)}`,
  fields: [
    { key: "ruleName", label: "规则名称", required: true },
    { key: "totalScore", label: "试卷总分", type: "number", required: true },
    { key: "passScore", label: "及格分数", type: "number", required: true },
    { key: "description", label: "规则说明", type: "textarea" },
  ],
});

export const TrainLink = createLinkConfigPage("CULTIVATE_TASK", "培训链接");
export const ExamLink = createLinkConfigPage("EXAM_TASK", "考试链接");
