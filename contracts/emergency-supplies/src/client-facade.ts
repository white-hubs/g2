import type { EmergencySuppliesGateway } from "./gateway";

/** MF Client 与 Gateway 保持同一份业务契约，避免两套手写签名漂移。 */
export type EmergencySuppliesClient = EmergencySuppliesGateway;
