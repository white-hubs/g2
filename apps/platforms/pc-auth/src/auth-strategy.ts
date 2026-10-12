import { ref } from "vue";

export interface AuthResult {
  token: string;
  tenant: string;
  /** 组织切换需要；登录响应 `refresh_token`。 */
  refreshToken?: string;
}

export interface AuthStrategy {
  id: string;
  /** 静默尝试免登；不适用当前请求时返回 null，不抛错。 */
  tryLogin: (context: { query: URLSearchParams }) => Promise<AuthResult | null>;
}

export interface AuthStrategyConfig {
  strategies?: string[];
}

export interface AuthStrategyRegistry {
  enabled: AuthStrategy[];
}

export function createAuthStrategyRegistry(all: AuthStrategy[], config: AuthStrategyConfig): AuthStrategyRegistry {
  const requested = config.strategies ?? ["standard"];
  const byId = new Map(all.map((s) => [s.id, s]));
  const enabled = requested.map((id) => {
    const strategy = byId.get(id);
    if (!strategy) {
      throw new Error(`auth strategy "${id}" is not registered`);
    }
    return strategy;
  });
  return { enabled };
}

const enabledStrategiesRef = ref<AuthStrategy[]>([]);

export function setEnabledStrategies(strategies: AuthStrategy[]): void {
  enabledStrategiesRef.value = strategies;
}

export function getEnabledStrategies(): AuthStrategy[] {
  return enabledStrategiesRef.value;
}
