import type { Area } from "./response";

export interface MetadataGateway {
  listAllArea: () => Promise<Area[]>;
}
