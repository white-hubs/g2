import { expect, test } from "bun:test";

import { allowedAction, courseware, dateValue, defaultOptions, parseQuestion, taskPeople, validateQuestion } from "./model";
test("日期归一化保留数字时间戳，字符串日期不误转换", () => {
  expect(dateValue(1788169560000)).toBe(1788169560000);
  expect(dateValue("1788169560000")).toBe(1788169560000);
  expect(dateValue("2026-08-31 17:46:00")).toBe("2026-08-31 17:46:00");
});
test("培训任务课件 files 地址与库选择 file 地址均正常回填", () => {
  const attachment = courseware({
    id: "c-1",
    fileIds: "file-1",
    fileName: "课件.pdf",
    fileSize: "1024",
    files: [{ id: "file-1", path: "/minio/file.pdf" }],
  });
  expect(attachment.file).toEqual({ id: "file-1", name: "课件.pdf", size: "1024", path: "/minio/file.pdf" });
  const selected = courseware({
    id: "c-2",
    name: "课件库标题",
    duration: 60,
    file: { id: "file-2", name: "视频.mp4", size: 2048, path: "/minio/file.mp4" },
  });
  expect(selected.fileIds).toBe("file-2");
  expect(selected.duration).toBe(60);
  expect(selected.file).toEqual({ id: "file-2", name: "视频.mp4", size: 2048, path: "/minio/file.mp4" });
});
test("试题采用原始 JSON 选项结构并校验答案、空值和重复选项", () => {
  const choices = defaultOptions("SINGLE_CHOICE");
  const question = { name: "问题", themeId: "1", score: 5, questionType: "SINGLE_CHOICE" };
  expect(() => validateQuestion(question, choices)).toThrow();
  choices.forEach((item, i) => {
    item.optionTitle = `选项${i}`;
  });
  choices[0]!.isRight = true;
  expect(() => validateQuestion(question, choices)).not.toThrow();
  expect(parseQuestion(JSON.stringify(choices), "SINGLE_CHOICE")).toEqual(choices);
  choices[1]!.isRight = true;
  expect(() => validateQuestion(question, choices)).toThrow();
  expect(() => validateQuestion({ ...question, questionType: "MULTIPLE_CHOICE" }, choices)).not.toThrow();
});
test("人员新选和原数据回填保持培训、考试 DTO 差异", () => {
  const user = {
    id: "1",
    name: "张三",
    mobile: "123",
    organizations: [{ id: "d1", name: "部门" }],
    positions: [{ id: "p1", name: "岗位" }],
  };
  expect(taskPeople([user], true)[0]).toEqual({
    userId: "1",
    userName: "张三",
    userPhone: "123",
    userDepartmentId: "d1",
    userDepartmentName: "部门",
    userPostId: "p1",
    userPostName: "岗位",
  });
  expect(taskPeople(taskPeople([user], true), false)[0]).toEqual({
    id: "1",
    name: "张三",
    phone: "123",
    departmentId: "d1",
    departmentName: "部门",
    postId: "p1",
    postName: "岗位",
  });
});
test("发布、撤回、编辑、删除遵守原任务状态", () => {
  expect(allowedAction({ id: "1", cultivateTaskStatus: "WAIT_PUBLISH" }, "publish", true)).toBe(true);
  expect(allowedAction({ id: "1", cultivateTaskStatus: "TRAINING" }, "delete", true)).toBe(false);
  expect(allowedAction({ id: "1", examTaskStatus: "STAY_EXAM" }, "withdraw", false)).toBe(true);
  expect(allowedAction({ id: "1", examTaskStatus: "ENDED" }, "edit", false)).toBe(false);
  expect(allowedAction({ id: "1", sourceCode: "HEADQUARTERS" }, "delete", false)).toBe(false);
});
