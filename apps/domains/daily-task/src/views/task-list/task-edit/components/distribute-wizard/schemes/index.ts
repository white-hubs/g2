// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { DistributeSchemeStrategy } from "./base-strategy";
import { SchemeOneStrategy } from "./scheme-one-strategy";
import { SchemeTwoStrategy } from "./scheme-two-strategy";
import { DistributeSchemeType } from "./types";

const strategies = new Map<DistributeSchemeType, DistributeSchemeStrategy>([
  [DistributeSchemeType.SCHEME_ONE, new SchemeOneStrategy()],
  [DistributeSchemeType.SCHEME_TWO, new SchemeTwoStrategy()],
]);

// 策略工厂
export const DistributeSchemeStrategyFactory = {
  getStrategy(schemeType: DistributeSchemeType | null): DistributeSchemeStrategy | null {
    if (!schemeType) {
      return null;
    }
    return strategies.get(schemeType) || null;
  },

  getAllStrategies(): DistributeSchemeStrategy[] {
    return Array.from(strategies.values());
  },
};

// 导出策略类
export { SchemeOneStrategy } from "./scheme-one-strategy";
export { SchemeTwoStrategy } from "./scheme-two-strategy";
export type { DistributeSchemeStrategy } from "./base-strategy";
export type { StrategyContext, ValidationResult } from "./types";
export { STEP_INDEX } from "./types";
