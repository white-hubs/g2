const APPROVAL_MODE_STORAGE_PREFIX = "fumigation-detail-mode:";

export const readQueryValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return "";
};

export const readRouteMode = (value: unknown): "view" | "approve" | "" => {
  const raw = readQueryValue(value);
  return raw === "approve" || raw === "view" ? raw : "";
};

export const persistApprovalDetailMode = (workId: string, mode: "view" | "approve"): void => {
  if (workId === "") {
    return;
  }
  sessionStorage.setItem(`${APPROVAL_MODE_STORAGE_PREFIX}${workId}`, mode);
};

const readPersistedDetailMode = (workId: string): "view" | "approve" | "" => {
  if (workId === "") {
    return "";
  }
  const stored = sessionStorage.getItem(`${APPROVAL_MODE_STORAGE_PREFIX}${workId}`);
  return stored === "approve" || stored === "view" ? stored : "";
};

export const resolveApprovalDetailMode = (workId: string, queryMode: unknown): "view" | "approve" => {
  const fromQuery = readRouteMode(queryMode);
  if (fromQuery !== "") {
    return fromQuery;
  }
  const fromStorage = readPersistedDetailMode(workId);
  if (fromStorage !== "") {
    return fromStorage;
  }
  return "approve";
};
