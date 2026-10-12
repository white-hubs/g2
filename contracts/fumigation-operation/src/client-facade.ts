import type { FumigationOperationGateway } from "./gateway";

/** MF Client 与 Gateway 使用同一份业务签名，避免迁移期间两套接口漂移。 */
export type FumigationOperationClient = FumigationOperationGateway;
