export const DEFAULT_ALARM_AUDIO = "/resource/v1/alarm-center/alarm-audio.mp3";

export type AlarmLevelPlayConfig = {
  file?: { path?: string };
  looped?: boolean;
  playNum?: number;
};

export type AlarmAudioPlayback = Pick<AlarmLevelPlayConfig, "looped" | "playNum">;

export function shouldPlayAlarmAudio(turnWarningSound: boolean | null | undefined, alarmLevelCode: string | undefined): boolean {
  const isNull = turnWarningSound === null || turnWarningSound === undefined;
  return turnWarningSound === true || (isNull && alarmLevelCode === "one_level");
}

export function resolveAlarmAudioUrl(filePath: string | undefined, origin = ""): string {
  let url = filePath?.trim() ?? "";
  if (!url) {
    return DEFAULT_ALARM_AUDIO;
  }
  if (!url.includes("http")) {
    const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
    url = `${base}${url}`;
  }
  return url;
}

export function shouldReplayAfterEnd(config: AlarmAudioPlayback, playCount: number): boolean {
  if (config.looped) {
    return false;
  }
  const playNum = config.playNum ?? 1;
  return playCount < playNum;
}

export function resolveAudioFromConfig(
  config: AlarmLevelPlayConfig | undefined,
  origin?: string,
): { audioUrl: string; looped: boolean; playNum: number } {
  return {
    audioUrl: resolveAlarmAudioUrl(config?.file?.path, origin),
    looped: config?.looped ?? false,
    playNum: config?.playNum ?? 1,
  };
}
