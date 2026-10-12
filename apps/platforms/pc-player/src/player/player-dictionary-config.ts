import { CubeDictionaryService } from "@ghcloud/cube-dictionary-service";

import { authStore } from "../api/auth-store";

const CS_PLAYER_DICT_ITEM_CODE = "XIANING_CUS_LOGIN";
const CS_PLAYER_DICT_CODE = "CS_PLAYER_CONTROL";

let csPlayerControlEnabled: boolean | null = null;
let csPlayerControlLoading: Promise<boolean> | null = null;

function parseDictionaryTruthy(variable?: string): boolean {
  if (!variable?.trim()) {
    return false;
  }
  const raw = variable.trim();
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === true) {
      return true;
    }
    if (parsed === false) {
      return false;
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const value = record.CS_PLAYER_CONTROL ?? record.value ?? record.enabled;
      return value === true || value === "true";
    }
  } catch {
    // variable 可能为普通字符串
  }
  return raw.toLowerCase() === "true";
}

/** 咸宁定制：字典 CS_PLAYER_CONTROL 为 true 时 PC 使用 Jessibuca，否则使用 H265 */
export async function isCsPlayerControlEnabled(): Promise<boolean> {
  if (csPlayerControlEnabled !== null) {
    return csPlayerControlEnabled;
  }
  if (csPlayerControlLoading) {
    return csPlayerControlLoading;
  }
  csPlayerControlLoading = (async () => {
    try {
      const cubeDictionaryService = new CubeDictionaryService(authStore);
      const configs = await cubeDictionaryService.getSysDictionaryByCodeAndItemCode({
        itemCode: CS_PLAYER_DICT_ITEM_CODE,
        code: CS_PLAYER_DICT_CODE,
      });
      csPlayerControlEnabled = parseDictionaryTruthy(configs?.variable);
    } catch {
      csPlayerControlEnabled = false;
    } finally {
      csPlayerControlLoading = null;
    }
    return csPlayerControlEnabled;
  })();
  return csPlayerControlLoading;
}
