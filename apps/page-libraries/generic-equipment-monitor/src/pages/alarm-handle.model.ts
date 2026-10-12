import { ALARM_HANDLER_SUBMIT_CONFIG_SUFFIX, ALARM_HANDLER_UPLOAD_PIC_CONFIG_CODE } from "./alarm-scene-codes";

export type ReasonOption = {
  label: string;
  value: string | number;
  isNew?: boolean;
};

export type AlarmUploadFile = {
  id: string;
  name?: string;
  path?: string;
  type?: string;
  suffix?: string;
  size?: number;
  businessKey?: string | null;
  [key: string]: unknown;
};

export type AlarmHandleFormState = {
  alarmHandlerResult: string;
  alarmHandlerResultRemark: string;
  alarmReasonValue?: string | number;
  fileVOS: AlarmUploadFile[];
};

export type HandleUploadConfig = {
  requirePic: boolean;
  watermarkParts: string[];
};

export function buildHandleDictionaryItemCode(applicationCode: string): string {
  return `${applicationCode.trim()}${ALARM_HANDLER_SUBMIT_CONFIG_SUFFIX}`;
}

export function buildHandleDictionaryQuery(applicationCode: string): Record<string, string> {
  return {
    itemCode: buildHandleDictionaryItemCode(applicationCode),
    code: ALARM_HANDLER_UPLOAD_PIC_CONFIG_CODE,
  };
}

export function parseHandleUploadConfig(raw: unknown): HandleUploadConfig {
  const list = Array.isArray(raw) ? raw : [];
  const first = (list[0] && typeof list[0] === "object" ? list[0] : null) as Record<string, unknown> | null;
  if (!first?.variable) {
    return { requirePic: false, watermarkParts: [] };
  }
  try {
    const variable = JSON.parse(String(first.variable)) as Record<string, unknown>;
    const watermark = Array.isArray(variable.watermark) ? variable.watermark.map(String) : [];
    return {
      requirePic: Boolean(variable.requirePic),
      watermarkParts: watermark,
    };
  } catch {
    return { requirePic: false, watermarkParts: [] };
  }
}

export function mapAlarmReasons(raw: unknown): ReasonOption[] {
  const list = Array.isArray(raw) ? raw : [];
  const options: ReasonOption[] = [];
  for (const item of list) {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const id = row.id;
    const reason = String(row.reason ?? "");
    if (id == null || !reason) {
      continue;
    }
    options.push({ label: reason, value: id as string | number, isNew: false });
  }
  return options;
}

export function buildAlarmHandlePayload(form: AlarmHandleFormState, reasonOptions: ReasonOption[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    alarmHandlerResult: form.alarmHandlerResult,
    alarmHandlerResultRemark: form.alarmHandlerResultRemark,
    fileVOS: form.fileVOS,
  };

  const reasonValue = form.alarmReasonValue;
  if (reasonValue == null || reasonValue === "") {
    return payload;
  }

  if (
    typeof reasonValue === "number" ||
    (typeof reasonValue === "string" && reasonOptions.some((item) => item.value === reasonValue && !item.isNew))
  ) {
    const matched = reasonOptions.find((item) => item.value === reasonValue);
    if (matched?.isNew) {
      payload.alarmReason = { reason: matched.label };
    } else {
      payload.alarmReason = { id: reasonValue };
    }
    return payload;
  }

  payload.alarmReasonName = String(reasonValue);
  payload.alarmReason = null;
  return payload;
}

export function buildBatchHandlePayload(form: Pick<AlarmHandleFormState, "alarmHandlerResult" | "alarmHandlerResultRemark">) {
  return {
    alarmHandlerResult: form.alarmHandlerResult,
    alarmHandlerResultRemark: form.alarmHandlerResultRemark,
  };
}
