const LEVEL_CLASS_MAP: Record<string, string> = {
  一级: "red",
  二级: "yellow",
  三级: "orange",
};

const LEVEL_IMAGE_MAP: Record<string, string> = {
  一级: "/resource/v1/alarm-center/hong.png",
  二级: "/resource/v1/alarm-center/cheng.png",
  三级: "/resource/v1/alarm-center/huang.png",
};

export function getAlarmLevelClass(levelName?: string): string {
  return LEVEL_CLASS_MAP[levelName ?? ""] ?? "blue";
}

export function getAlarmLevelImage(levelName?: string): string {
  return LEVEL_IMAGE_MAP[levelName ?? ""] ?? "/resource/v1/alarm-center/lan.png";
}
