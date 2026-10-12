import { describe, expect, test } from "bun:test";
import { createPinia, setActivePinia } from "pinia";
import { computed } from "vue";

import { useFunctionCodesStore } from "./stores/function-codes";
import { extractUserFunctionCodes } from "./user-function-codes";

describe("用户功能权限", () => {
  test("从用户已授权权限的 code 恢复班次及请假操作权限", () => {
    const codes = extractUserFunctionCodes([
      { type: "FUNCATION", code: "attendance:classes:update" },
      { type: "FUNCATION", code: "attendance:classes:delete" },
      { type: "FUNCATION", code: "attendance:leaveApproval:info" },
      { type: "DATA", code: "attendance:group:delete" },
    ]);
    expect(codes).toEqual(["attendance:classes:update", "attendance:classes:delete", "attendance:leaveApproval:info"]);
  });

  test("不将菜单字段、缺失字段或非功能权限当成用户授权", () => {
    expect(
      extractUserFunctionCodes([
        { type: "FUNCATION", functionCode: "attendance:classes:delete" },
        { code: "attendance:classes:delete" },
        { type: "DATA", code: "attendance:classes:delete" },
        { type: "FUNCATION", code: "" },
        { type: "FUNCATION", code: 123 },
        null,
      ]),
    ).toEqual([]);
    expect(extractUserFunctionCodes([])).toEqual([]);
    expect(() => extractUserFunctionCodes(null)).toThrow("用户功能权限响应格式错误");
  });

  test("领域权限快照随异步授权加载更新，未授予的操作仍不可用", () => {
    setActivePinia(createPinia());
    const store = useFunctionCodesStore();
    const canUpdate = computed(() => store.snapshot().has("attendance:classes:update"));
    expect(canUpdate.value).toBe(false);
    store.setCodes(extractUserFunctionCodes([{ type: "FUNCATION", code: "attendance:classes:update" }]));
    expect(canUpdate.value).toBe(true);
    expect(store.has("attendance:classes:delete")).toBe(false);
    store.setCodes([]);
    expect(canUpdate.value).toBe(false);
  });
});
