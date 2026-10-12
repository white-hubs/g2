/**
 * GET /api/ouaa/user-permissions 使用 code；菜单 functions 才使用 functionCode。
 * 对齐旧壳 home.vue 的 FUNCATION 筛选及 cube-permission-codes 对 code 的读取。
 */
export function extractUserFunctionCodes(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) {
    throw new Error("用户功能权限响应格式错误");
  }
  return permissions.flatMap((item: unknown) => {
    if (
      item !== null &&
      typeof item === "object" &&
      "type" in item &&
      item.type === "FUNCATION" &&
      "code" in item &&
      typeof item.code === "string" &&
      item.code.length > 0
    ) {
      return [item.code];
    }
    return [];
  });
}
