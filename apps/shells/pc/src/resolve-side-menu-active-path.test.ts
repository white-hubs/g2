import { describe, expect, test } from "bun:test";

import { resolveSideMenuActivePath } from "./resolve-side-menu-active-path";

const BASE = "/d/secure-edu";
const EXAM = `${BASE}/exam-task`;
const RULE = `${BASE}/paper-question-rule`;
const DETAIL = `${BASE}/exam-task-form?id=task&action=detail&returnPath=${EXAM}`;
const rulesMeta = { hideInMenu: true, activeMenuPath: RULE };
const routes = new Map([
  [EXAM, { path: EXAM, meta: {}, query: {} }],
  [RULE, { path: RULE, meta: {}, query: {} }],
  [DETAIL, { path: `${BASE}/exam-task-form`, meta: { hideInMenu: true, activeMenuPath: EXAM }, query: { returnPath: EXAM } }],
]);

function origin(returnPath: unknown) {
  return {
    query: { returnPath },
    resolveRoute: (location: string) => routes.get(location),
    isMenuPath: (path: string) => [EXAM, RULE].includes(path),
  };
}

describe("hidden-page menu origin", () => {
  test("nested exam rule details stay under the originating exam menu", () => {
    expect(resolveSideMenuActivePath(`${RULE}-form`, rulesMeta, origin(DETAIL))).toBe(EXAM);
  });

  test("direct rule details and edits stay under their own configuration menu", () => {
    expect(resolveSideMenuActivePath(`${RULE}-form`, rulesMeta)).toBe(RULE);
    expect(resolveSideMenuActivePath(`${RULE}-form`, rulesMeta, origin(RULE))).toBe(RULE);
  });

  test("visible list routes ignore returnPath", () => {
    expect(resolveSideMenuActivePath(RULE, {}, origin(EXAM))).toBe(RULE);
  });

  test("external, cross-domain, unknown and non-string return paths cannot change the active menu", () => {
    for (const returnPath of [
      "https://example.com",
      "//example.com",
      "/login",
      "/d/secure-edu-head/exam-task",
      `${BASE}/unknown`,
      [EXAM],
    ]) {
      expect(resolveSideMenuActivePath(`${RULE}-form`, rulesMeta, origin(returnPath))).toBe(RULE);
    }
  });

  test("unregistered menu paths from a catch-all route cannot change the active menu", () => {
    const context = origin(`${BASE}/unknown`);
    context.resolveRoute = (path) => ({ path, meta: {}, query: {} });
    expect(resolveSideMenuActivePath(`${RULE}-form`, rulesMeta, context)).toBe(RULE);
  });

  test("cyclic return paths terminate without clearing the menu", () => {
    const context = origin(DETAIL);
    context.resolveRoute = () => ({
      path: `${BASE}/exam-task-form`,
      meta: { hideInMenu: true, activeMenuPath: EXAM },
      query: { returnPath: DETAIL },
    });
    expect(resolveSideMenuActivePath(`${RULE}-form`, rulesMeta, context)).toBe(EXAM);
  });
});

describe("legacy portal menu origin", () => {
  const base = "/portal/secure-edu";
  const exam = `${base}/exam-task`;
  const paper = `${base}/test-paper-manage`;
  const context = (previousMenuPath?: string) => ({
    query: {},
    resolveRoute: () => undefined,
    isMenuPath: (path: string) => [exam, paper].includes(path),
    previousMenuPath,
  });

  test("平级新增、详情、编辑表单保留入口菜单，不要求旧路由提供 meta 或 returnPath", () => {
    expect(resolveSideMenuActivePath(`${base}/exam-task-form`, {}, context(exam))).toBe(exam);
    expect(resolveSideMenuActivePath(`${base}/test-paper-manage-form`, {}, context(exam))).toBe(exam);
    expect(resolveSideMenuActivePath(`${base}/unknown-detail`, {}, context(exam))).toBe(exam);
  });

  test("刷新/直接打开安全教育表单也恢复其所属菜单", () => {
    for (const edition of ["secure-edu", "secure-edu-head"]) {
      for (const [form, menu] of [
        ["exam-task-form", "exam-task"],
        ["training-task-form", "training-task"],
        ["test-paper-manage-form", "test-paper-manage"],
        ["courseware-form", "courseware"],
        ["question-form", "question"],
        ["paper-question-rule-form", "paper-question-rule"],
        ["training-detials", "training-count"],
        ["exam-details", "exam-count"],
        ["exam-paper-detail", "exam-task"],
      ]) {
        const owner = `/portal/${edition}/${menu}`;
        expect(
          resolveSideMenuActivePath(
            `/portal/${edition}/${form}`,
            {},
            {
              ...context(),
              isMenuPath: (path) => path === owner,
            },
          ),
        ).toBe(owner);
      }
    }
  });

  test("切换到其它可见菜单时更新归属", () => {
    expect(resolveSideMenuActivePath(paper, {}, context(exam))).toBe(paper);
  });

  test("不能继承其它应用、相似应用名或已无权限的菜单", () => {
    for (const previous of ["/portal/other/exam-task", "/portal/secure-edu-head/exam-task", `${base}/removed`]) {
      expect(resolveSideMenuActivePath(`${base}/unknown-detail`, {}, context(previous))).toBe(`${base}/unknown-detail`);
    }
    expect(resolveSideMenuActivePath(`${base}/exam-task-form`, {}, { ...context(exam), isMenuPath: () => false })).toBe(
      `${base}/exam-task-form`,
    );
    expect(resolveSideMenuActivePath(RULE, {}, context(exam))).toBe(RULE);
  });
});
