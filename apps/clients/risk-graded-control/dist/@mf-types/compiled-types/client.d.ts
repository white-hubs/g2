import type { PlatformContext } from "@g2-composition/contract";
import type { RiskGradedControlGateway, RiskPageQuery } from "@g2-contract/risk-graded-control";
interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    patch(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
export interface RiskGradedControlClient extends RiskGradedControlGateway {
    getDispatchMapConfig(): Promise<unknown>;
    /** 第三方地图服务字典：TD_MAP / gdMap（与旧仓 CubeMapCore 一致）。 */
    getMapServiceConfig(code: "TD_MAP" | "gdMap"): Promise<unknown>;
    getPropertyDetailedPage(params?: Record<string, unknown>): Promise<unknown>;
    getPropertyDetail(id: string | number): Promise<unknown>;
    getMessageConfig(params?: Record<string, unknown>): Promise<unknown>;
    addMessageConfig(payload: Record<string, unknown>): Promise<void>;
    sceneNotificationMethod(sceneCode: string): Promise<Array<{
        label: string;
        value: string;
    }>>;
    exportMeasureExecutions(params?: RiskPageQuery): Promise<Blob>;
    exportControlMeasures(params?: RiskPageQuery): Promise<Blob>;
    exportWarningRecords(params?: RiskPageQuery): Promise<Blob>;
    exportUnitInventory(params?: RiskPageQuery): Promise<Blob>;
    exportNoticeCards(params?: RiskPageQuery): Promise<Blob>;
    exportUnits(params?: RiskPageQuery): Promise<Blob>;
}
export declare function createRiskGradedControlClient(http: HttpClient): RiskGradedControlClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<RiskGradedControlClient>;
export {};
//# sourceMappingURL=client.d.ts.map