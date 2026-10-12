/** 维保作业运行时配置：applicationCode 来自 Composition，拼写沿用现网 `MAINTENACE`。 */
export interface MaintenanceRuntime {
  applicationCode: string;
  basePath: string;
}

export const MAINTENANCE_BASE_PATH = "/d/maintenance";

export function resolveMaintenanceRuntime(input: { applicationCode?: unknown; basePath?: string }): MaintenanceRuntime {
  const applicationCode =
    typeof input.applicationCode === "string" && input.applicationCode.trim() ? input.applicationCode.trim() : "MAINTENACE";
  return { applicationCode, basePath: input.basePath?.trim() || MAINTENANCE_BASE_PATH };
}
