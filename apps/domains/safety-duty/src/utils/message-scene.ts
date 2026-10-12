interface NoticeWayDTO {
  noticeWay?: string | null;
}

export interface SceneConfigDTO {
  value?: string | number;
  label?: string;
  sceneCode?: string;
  noticeWays?: NoticeWayDTO[] | null;
}

export const SAFETY_DUTY_MESSAGE_BUSINESS_TYPE = "SAFETY_PERSONNEL_DUTY";
export const DUTY_DISPATCH_SIGN_MESSAGE_SCENE = "SAFETY_PERSONNEL::DUTY_DISPATCH_SIGN";
export const DUTY_SCORE_LEVEL_MESSAGE_SCENE = "SAFETY_PERSONNEL::DUTY_SCORE_LEVEL";

export interface NoticeWayOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export const normalizeNoticeWayOptions = (options: Array<{ label?: string; value?: string }>): NoticeWayOption[] => {
  const seen = new Set<string>();
  return options.reduce<NoticeWayOption[]>((result, option) => {
    const value = (option.value ?? "").trim();
    if (!value || seen.has(value)) {
      return result;
    }
    seen.add(value);
    result.push({
      label: option.label || value,
      value,
    });
    return result;
  }, []);
};

export const findSceneConfig = (configs: SceneConfigDTO[], sceneCode: string): SceneConfigDTO | undefined =>
  configs.find((item) => item.sceneCode === sceneCode);

export const configuredNoticeWays = (configs: SceneConfigDTO[], sceneCode: string, allowedOptions: NoticeWayOption[]): string[] => {
  const allowed = new Set(allowedOptions.map((item) => item.value));
  return (findSceneConfig(configs, sceneCode)?.noticeWays ?? [])
    .map((item) => (item.noticeWay ?? "").trim())
    .filter((code) => !!code && allowed.has(code));
};

export const toNoticeWaysDTO = (ways: string[]): Array<{ noticeWay: string }> =>
  ways.filter((item) => !!item).map((noticeWay) => ({ noticeWay }));
