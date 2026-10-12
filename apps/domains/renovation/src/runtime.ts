/** 更新改造 Domain 的基础路径与 OUAA 应用码。 */
export const RENOVATION_BASE_PATH = "/d/renovation";

export interface RenovationRuntime {
  applicationCode: string;
  basePath: string;
}

export function resolveRenovationRuntime(options?: { applicationCode?: unknown; basePath?: string }): RenovationRuntime {
  const applicationCode =
    typeof options?.applicationCode === "string" && options.applicationCode.trim() ? options.applicationCode.trim() : "RETROFIT";
  return { applicationCode, basePath: options?.basePath ?? RENOVATION_BASE_PATH };
}
