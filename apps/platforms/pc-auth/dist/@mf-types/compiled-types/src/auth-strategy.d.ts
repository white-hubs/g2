export interface AuthResult {
    token: string;
    tenant: string;
    /** 组织切换需要；登录响应 `refresh_token`。 */
    refreshToken?: string;
}
export interface AuthStrategy {
    id: string;
    /** 静默尝试免登；不适用当前请求时返回 null，不抛错。 */
    tryLogin: (context: {
        query: URLSearchParams;
    }) => Promise<AuthResult | null>;
}
export interface AuthStrategyConfig {
    strategies?: string[];
}
export interface AuthStrategyRegistry {
    enabled: AuthStrategy[];
}
export declare function createAuthStrategyRegistry(all: AuthStrategy[], config: AuthStrategyConfig): AuthStrategyRegistry;
export declare function setEnabledStrategies(strategies: AuthStrategy[]): void;
export declare function getEnabledStrategies(): AuthStrategy[];
//# sourceMappingURL=auth-strategy.d.ts.map