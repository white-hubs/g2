export type MatchSnapshotItem = {
  propCode: string;
  propValue: string;
  propValueTs?: string;
  condition: string;
};

export type DevicePropVo = {
  propCode: string;
  propName?: string;
  dataType?: string;
  dataConstraint?: Array<string | { value: string; label?: string }>;
  unitName?: string;
};

export type AlarmSnapshotDetail = {
  propName?: string;
  propValue: string;
  propCode: string;
  configAlarmValue: string;
  minValue: number;
  maxValue: number;
  unit: string;
  time?: string;
};

const NUMBER_DATA_TYPES = ["int", "long", "float", "double"];

export function parseMatchSnapshot(alarmSnapshot: string | Record<string, unknown> | undefined): MatchSnapshotItem[] {
  if (!alarmSnapshot) {
    return [];
  }
  const parsed = typeof alarmSnapshot === "string" ? JSON.parse(alarmSnapshot) : alarmSnapshot;
  const matchSnapshot = parsed?.matchSnapshot;
  return Array.isArray(matchSnapshot) ? (matchSnapshot as MatchSnapshotItem[]) : [];
}

export function extractConfigAlarmValue(condition: string): string {
  const valueReg = /(?<=\[)(.+?)(?=\])/g;
  const matchValues = condition.match(valueReg);
  if (!matchValues?.length) {
    return "";
  }
  return matchValues.at(-1) ?? "";
}

function resolvePropValue(item: MatchSnapshotItem, deviceAttribute: DevicePropVo | undefined): string {
  if (deviceAttribute?.dataType === "enum") {
    const findValue = deviceAttribute.dataConstraint?.find(
      (keyValue) => (typeof keyValue === "string" ? keyValue : keyValue.value) === item.propValue,
    );
    return findValue && typeof findValue === "object" ? (findValue.label ?? item.propValue) : item.propValue;
  }
  return item.propValue;
}

function constraintNumbers(dataConstraint: DevicePropVo["dataConstraint"]): number[] {
  if (!Array.isArray(dataConstraint)) {
    return [];
  }
  return dataConstraint.map((item) => (typeof item === "object" ? Number(item.value) : Number(item)));
}

export function buildAlarmSnapshotDetails(matchSnapshot: MatchSnapshotItem[], productPropVoList: DevicePropVo[]): AlarmSnapshotDetail[] {
  return matchSnapshot.map((item) => {
    const deviceAttribute = productPropVoList.find((attr) => attr.propCode === item.propCode);
    const isNumeric = NUMBER_DATA_TYPES.includes(deviceAttribute?.dataType ?? "");
    const numbers = constraintNumbers(deviceAttribute?.dataConstraint);
    return {
      propName: deviceAttribute?.propName,
      propValue: resolvePropValue(item, deviceAttribute),
      propCode: item.propCode,
      configAlarmValue: extractConfigAlarmValue(item.condition),
      minValue: isNumeric && numbers.length ? Math.min(...numbers) : 0,
      maxValue: isNumeric && numbers.length ? Math.max(...numbers) : 0,
      unit: deviceAttribute?.unitName ?? "",
      time: item.propValueTs,
    };
  });
}

export function filterChartSnapshotDetails(details: AlarmSnapshotDetail[], chartComponentKeys: Set<string>): AlarmSnapshotDetail[] {
  return details.filter((item) => chartComponentKeys.has(item.propCode));
}

export function extractProductPropVoList(deviceDetail: unknown): DevicePropVo[] {
  let payload: unknown = deviceDetail;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return [];
    }
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const root = payload as Record<string, unknown>;
  const unwrapped =
    root.code === 200 && root.data !== null && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const nested = unwrapped.data !== null && typeof unwrapped.data === "object" ? (unwrapped.data as Record<string, unknown>) : unwrapped;
  const list = nested.productPropVoList ?? unwrapped.productPropVoList ?? root.productPropVoList;
  return Array.isArray(list) ? (list as DevicePropVo[]) : [];
}
