import { HazardActionCode } from "@g2-contract/hazard-governance";

import { Button, Space } from "@/pc-ui-runtime";

export const hazardActionText: Record<HazardActionCode, string> = {
  [HazardActionCode.CONFIRM]: "确认属实",
  [HazardActionCode.VIEW]: "查看",
  [HazardActionCode.URGE]: "催办",
  [HazardActionCode.APPROVAL]: "审批",
  [HazardActionCode.FALSE_REPORT]: "误报",
  [HazardActionCode.FILL_PLAN]: "填写方案",
  [HazardActionCode.UPDATE_PROGRESS]: "更新进度",
  [HazardActionCode.ACCEPTANCE]: "验收",
};

const hazardActionCodeSet = new Set<string>(Object.values(HazardActionCode));

export const normalizeHazardAction = (value: string | undefined): HazardActionCode | undefined => {
  if (!value) {
    return undefined;
  }
  return hazardActionCodeSet.has(value) ? (value as HazardActionCode) : undefined;
};

export type HazardActionHandlers<T> = Partial<Record<HazardActionCode, (record: T) => void>>;

const dangerActions = new Set<HazardActionCode>([HazardActionCode.FALSE_REPORT]);

interface RenderHazardActionButtonsOptions<T> {
  isLoading?: (action: HazardActionCode, record: T) => boolean;
  isDisabled?: (action: HazardActionCode, record: T) => boolean;
}

export const renderHazardActionButtons = <T,>(
  record: T,
  actions: readonly string[] | undefined,
  handlers: HazardActionHandlers<T>,
  options: RenderHazardActionButtonsOptions<T> = {},
): JSX.Element | null => {
  const normalizedActions = (actions ?? [])
    .map((action) => normalizeHazardAction(action))
    .filter((action): action is HazardActionCode => Boolean(action))
    .filter((action) => Boolean(handlers[action]));

  if (normalizedActions.length === 0) {
    return null;
  }

  return (
    <Space size={[6, 2]} wrap>
      {normalizedActions.map((action) => (
        <Button
          key={action}
          type="link"
          danger={dangerActions.has(action)}
          size="small"
          loading={options.isLoading?.(action, record)}
          disabled={options.isDisabled?.(action, record)}
          onClick={() => handlers[action]?.(record)}
        >
          {hazardActionText[action]}
        </Button>
      ))}
    </Space>
  );
};
