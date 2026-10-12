import type { EduResource } from "@g2-contract/secure-edu";

import { EXAM_TYPES, MODES, TYPES } from "./model";
export interface Filter {
  field: string;
  label: string;
  kind?: "Input" | "Select" | "DatePicker";
  options?: { label: string; value: string }[];
  remote?: "themes" | "departments";
}
export interface Column {
  field: string;
  label: string;
  width: number;
  link?: string;
}
export interface ListConfig {
  resource: EduResource;
  title: string;
  filters: Filter[];
  columns: Column[];
  editable?: boolean;
  export?: boolean;
}
const c = (field: string, label: string, width = 140, link?: string): Column => ({ field, label, width, link });
const source: Filter = {
  field: "sourceCode",
  label: "任务来源",
  kind: "Select",
  options: [
    { label: "集团下发", value: "HEADQUARTERS" },
    { label: "自建任务", value: "LOCAL_CREATE" },
  ],
};
const theme: Filter = { field: "themeId", label: "主题", kind: "Select", remote: "themes" };
const date: Filter = { field: "period", label: "日期", kind: "DatePicker" };
const keyword = (label: string): Filter => ({ field: "keyword", label: "", kind: "Input", options: [{ label, value: "" }] });
export const CONFIG: Record<string, ListConfig> = {
  "training-task": {
    resource: "training-task",
    title: "培训任务",
    editable: true,
    filters: [
      { field: "cultivateTarget", label: "培训类型", kind: "Select", options: TYPES },
      { field: "cultivateMode", label: "培训形式", kind: "Select", options: MODES },
      { ...theme, label: "培训主题" },
      {
        field: "cultivateTaskStatus",
        label: "状态",
        kind: "Select",
        options: [
          { label: "待发布", value: "WAIT_PUBLISH" },
          { label: "已发布", value: "PUBLISHED" },
          { label: "进行中", value: "TRAINING" },
          { label: "已完成", value: "OVER" },
          { label: "已撤销", value: "REVOKED" },
        ],
      },
      source,
      { ...date, label: "培训日期" },
      keyword("任务名称"),
    ],
    columns: [
      c("name", "任务名称", 180),
      c("themeName", "培训主题"),
      c("sourceCode", "任务来源", 100),
      c("cultivateTarget", "培训类型", 100),
      c("cultivateMode", "培训形式", 100),
      c("chargeUserName", "负责人", 110),
      c("speaker", "主讲人", 110),
      c("cultivateEndTime", "培训截至时间", 180),
      c("cultivateAddress", "培训地点", 220),
      c("cultivateContent", "培训内容", 250),
      c("cultivateUserNumber", "参加人数", 100),
      c("cultivateTaskStatus", "状态", 100),
    ],
  },
  "exam-task": {
    resource: "exam-task",
    title: "考试任务",
    editable: true,
    filters: [
      { field: "examTaskType", label: "考试类型", kind: "Select", options: EXAM_TYPES },
      { ...theme, label: "考试主题" },
      {
        field: "examTaskStatus",
        label: "状态",
        kind: "Select",
        options: [
          { label: "待发布", value: "UNPUBLISHED" },
          { label: "待考试", value: "STAY_EXAM" },
          { label: "进行中", value: "IN_PROGRESS" },
          { label: "已结束", value: "ENDED" },
        ],
      },
      source,
      { ...date, label: "考试开始日期" },
      keyword("任务名称、考试主题"),
    ],
    columns: [
      c("name", "任务名称", 180),
      c("themeName", "考试主题"),
      c("sourceCode", "任务来源", 100),
      c("examTaskType", "考试类型", 100),
      c("chargeUserName", "负责人", 110),
      c("examStartTime", "考试开始时间", 180),
      c("examEndTime", "考试结束时间", 180),
      c("examPapers", "考试试卷", 200),
      c("remark", "考试说明", 250),
      c("examUserNumber", "参加人数", 100),
      c("examTaskStatus", "状态", 100),
    ],
  },
  "training-count": {
    resource: "training-count",
    title: "培训统计",
    export: true,
    filters: [
      { field: "cultivateTarget", label: "培训类型", kind: "Select", options: TYPES },
      { field: "cultivateMode", label: "培训形式", kind: "Select", options: MODES },
      { ...date, label: "培训日期" },
    ],
    columns: [
      c("name", "培训名称", 180),
      c("themeName", "培训主题"),
      c("cultivateTarget", "培训类型", 100),
      c("cultivateMode", "培训形式", 100),
      c("speaker", "主讲人", 100),
      c("chargeUserName", "负责人", 100),
      c("cultivateEndTime", "培训截至时间", 180),
      c("cultivateAddress", "培训地点", 250),
      c("cultivateContent", "培训内容", 250),
      c("trainNum", "预计参加人数", 120),
      c("signedNum", "实际参加人数", 120, "实际参加人数"),
      c("unsignedNum", "缺勤", 100, "缺勤"),
      c("belatedNum", "迟到", 100, "迟到"),
      c("hasExam", "是否有考试", 110),
      c("realityExamUserNumber", "完成考试人数", 120, "完成考试人数"),
      c("missExamUserNumber", "缺考", 100, "缺考"),
      c("noPassedUserNumber", "不及格", 100, "不及格"),
      c("examPaperScore", "考试总分", 110),
      c("averageScore", "平均分", 100),
      c("passingRate", "及格率", 100),
    ],
  },
  "exam-count": {
    resource: "exam-count",
    title: "考试统计",
    export: true,
    filters: [
      { field: "examTaskType", label: "考试类型", kind: "Select", options: EXAM_TYPES },
      { ...theme, label: "考试主题" },
      { field: "organizationId", label: "部门", kind: "Select", remote: "departments" },
      { ...date, label: "考试日期" },
    ],
    columns: [
      c("name", "考试名称", 250),
      c("themeName", "考试主题", 250),
      c("examTaskType", "考试类型", 150),
      c("chargeUserName", "负责人", 180),
      c("examStartTime", "考试开始时间", 250),
      c("examPaperName", "考试试卷", 250),
      c("examPaperScore", "考试总分", 100),
      c("examUserNumber", "预计参加人数", 120),
      c("realityExamUserNumber", "实际参加人数", 120, "实际参加人数"),
      c("missExamUserNumber", "缺考", 120, "缺考"),
      c("noPassedUserNumber", "不及格", 120, "不及格"),
      c("averageScore", "平均分", 120),
      c("passingRate", "及格率", 120),
    ],
  },
  "test-paper-manage": {
    resource: "test-paper-manage",
    title: "试卷管理",
    editable: true,
    filters: [keyword("试卷名称")],
    columns: [
      c("name", "试卷名称", 250),
      c("score", "试卷总分", 120),
      c("passingGradeScore", "及格分数", 120),
      c("examPaperQuestionNumber", "试题数", 100),
      c("remark", "试卷说明", 350),
    ],
  },
  courseware: {
    resource: "courseware",
    title: "课件库",
    editable: true,
    filters: [keyword("课件名称、课件主题")],
    columns: [
      c("name", "课件名称", 250),
      c("themeName", "课件主题", 180),
      c("file", "附件", 250),
      c("fileSize", "附件大小", 130),
      c("duration", "附件时长", 130),
      c("remark", "课件描述", 300),
    ],
  },
  question: {
    resource: "question",
    title: "考题库",
    editable: true,
    filters: [keyword("题目名称、题目主题")],
    columns: [c("name", "题目", 500), c("themeName", "主题", 200), c("questionType", "题型", 150)],
  },
  theme: {
    resource: "theme",
    title: "主题管理",
    editable: true,
    filters: [keyword("主题名称")],
    columns: [c("name", "主题名称", 250), c("remark", "主题描述", 600)],
  },
  "paper-question-rule": {
    resource: "paper-question-rule",
    title: "试卷考题规则",
    editable: true,
    filters: [keyword("规则名称")],
    columns: [
      c("ruleName", "随机出题规则名称", 240),
      c("totalScore", "试卷总分", 110),
      c("passScore", "及格分", 110),
      c("questionNum", "试题数", 100),
      c("description", "规则说明", 320),
      c("updateTime", "编辑时间", 190),
    ],
  },
  "training-details": {
    resource: "training-details",
    title: "培训人员明细",
    export: true,
    filters: [],
    columns: [
      c("userName", "员工", 150),
      c("userPhone", "电话", 150),
      c("userDepartmentName", "部门", 250),
      c("userPostName", "职位", 250),
      c("userSignStatus", "状态", 150),
    ],
  },
  "exam-details": {
    resource: "exam-details",
    title: "考试人员明细",
    export: true,
    filters: [],
    columns: [
      c("userName", "员工", 150),
      c("userPhone", "电话", 150),
      c("userDepartmentName", "部门", 250),
      c("userPostName", "职位", 250),
      c("score", "考试分数", 250),
    ],
  },
};
