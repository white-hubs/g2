export type SceneCode = "RISK_SOURCE_OVERDUE_ABOUT" | "RISK_SOURCE_OVERDUE" | "MANDATORY_TESTING_OVERDUE_ABOUT";

export type NoticeObject = {
  id: string;
  objType?: string;
  objId: string[];
};

export type SceneItem = {
  id: string;
  label: SceneCode;
  sceneCode: SceneCode;
  value?: number;
  name: null;
  noticeWays: string[];
  noticeObjs: NoticeObject[];
};

export type SceneDefinition = {
  code: SceneCode;
  title: string;
  condition: string;
  content: string;
  needsDays: boolean;
};

/** 对齐旧页三类场景文案与天数校验规则。 */
export const RISK_MESSAGE_SCENES: SceneDefinition[] = [
  {
    code: "RISK_SOURCE_OVERDUE_ABOUT",
    title: "即将到期提醒",
    condition: "距离风险源设备到期还有",
    content: "【风险源名称、风险源名称】等【xx】个风险源设备使用期限将在【配置的通知条件】后到期，请知悉",
    needsDays: true,
  },
  {
    code: "RISK_SOURCE_OVERDUE",
    title: "已经到期提醒",
    condition: "风险源设备已到期，提醒相关人员",
    content: "【风险源名称、风险源名称、风险源名称】使用期限已到期，请知悉",
    needsDays: false,
  },
  {
    code: "MANDATORY_TESTING_OVERDUE_ABOUT",
    title: "强检提醒",
    condition: "距离风险源设备强检到期还有",
    content: "【风险源名称、风险源名称】等【xx】个风险源设备强检日期将在【配置的通知条件（例：5天）】后到期，请知悉",
    needsDays: true,
  },
];

export function createNoticeObject(): NoticeObject {
  return { id: crypto.randomUUID(), objId: [], objType: undefined };
}

export function createSceneItem(code: SceneCode): SceneItem {
  return {
    id: crypto.randomUUID(),
    label: code,
    sceneCode: code,
    value: 1,
    name: null,
    noticeWays: [],
    noticeObjs: [createNoticeObject()],
  };
}

export function normalizeSceneItem(raw: Record<string, unknown>, code: SceneCode): SceneItem {
  const noticeWays = Array.isArray(raw.noticeWays)
    ? raw.noticeWays
        .map((item) => (typeof item === "object" && item ? String((item as { noticeWay?: unknown }).noticeWay ?? "") : String(item)))
        .filter(Boolean)
    : [];
  const noticeObjs = Array.isArray(raw.noticeObjs)
    ? raw.noticeObjs.map((item) => {
        const value = item as {
          id?: unknown;
          objType?: unknown;
          objId?: unknown;
        };
        return {
          id: String(value.id ?? crypto.randomUUID()),
          objType: value.objType ? String(value.objType) : undefined,
          objId: Array.isArray(value.objId)
            ? value.objId.map(String)
            : String(value.objId ?? "")
                .split(",")
                .filter(Boolean),
        };
      })
    : [createNoticeObject()];
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    label: code,
    sceneCode: code,
    value: Number(raw.value ?? raw.warningDay ?? 1),
    name: null,
    noticeWays,
    noticeObjs: noticeObjs.length ? noticeObjs : [createNoticeObject()],
  };
}

/**
 * 保存体对齐旧 message 页：每项带 label/sceneCode/name，
 * noticeWays 为对象数组，空人员保持 []（非空字符串）。
 */
export function buildRiskMessageSavePayload(lists: Record<SceneCode, SceneItem[]>): {
  businessType: "RISK_SOURCE";
  sceneConfigDTOS: Array<Record<string, unknown>>;
} {
  const sceneConfigDTOS = RISK_MESSAGE_SCENES.flatMap((scene) =>
    lists[scene.code].map((item) => ({
      id: item.id,
      label: scene.code,
      sceneCode: scene.code,
      value: item.value,
      name: null,
      noticeWays: item.noticeWays.map((noticeWay) => ({ noticeWay })),
      noticeObjs: item.noticeObjs.map((obj) => ({
        id: obj.id,
        objType: obj.objType,
        objId: obj.objId.length === 0 ? [] : obj.objId.join(","),
      })),
    })),
  );
  return { businessType: "RISK_SOURCE", sceneConfigDTOS };
}

export function staffRecordsOf(response: unknown): Array<{ id: string; name: string }> {
  const pick = (rows: unknown[]): Array<{ id: string; name: string }> =>
    rows
      .map((row) => {
        const item = row as { id?: unknown; name?: unknown };
        return {
          id: String(item.id ?? ""),
          name: String(item.name ?? ""),
        };
      })
      .filter((row) => row.id);
  if (Array.isArray(response)) return pick(response);
  if (response && typeof response === "object") {
    const body = response as { records?: unknown; data?: unknown };
    if (Array.isArray(body.records)) return pick(body.records);
    if (Array.isArray(body.data)) return pick(body.data);
    if (body.data && typeof body.data === "object") {
      const nested = body.data as { records?: unknown };
      if (Array.isArray(nested.records)) return pick(nested.records);
    }
  }
  return [];
}
