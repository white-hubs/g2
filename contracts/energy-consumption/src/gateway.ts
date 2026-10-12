import type { EnergyConsumptionClient } from "./client-facade";

/** BFF Gateway 与 Client 同面；能碳主路径直连 /api，暂无独立聚合需求。 */
export type EnergyConsumptionGateway = EnergyConsumptionClient;
