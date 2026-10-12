import type { PlatformContext } from "@g2-composition/contract";
import { type DailyInspectionClient, type InspectionPage } from "@g2-contract/daily-inspection";
interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
export declare function asInspectionPage(value: unknown): InspectionPage;
export declare function createDailyInspectionClient(http: HttpClient): DailyInspectionClient;
export declare function create(ctx: PlatformContext): Promise<DailyInspectionClient>;
export type { DailyInspectionClient, InspectionPage, InspectionRecord } from "@g2-contract/daily-inspection";
//# sourceMappingURL=client.d.ts.map