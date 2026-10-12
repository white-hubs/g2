export interface RiskType {
  id: string;
  name: string;
  code?: string;
  remarks?: string;
  [key: string]: unknown;
}

export interface RiskLedgerRecord {
  id: string;
  codeNum?: string;
  name?: string;
  typeId?: string;
  typeName?: string;
  depName?: string;
  areaName?: string;
  detailAddress?: string;
  status?: string;
  [key: string]: unknown;
}

export interface RiskLedgerPage {
  records: RiskLedgerRecord[];
  total: number;
  pages?: number;
}

export interface RiskManagementClient {
  pageRiskLedger(params: Record<string, unknown>): Promise<RiskLedgerPage>;
  getRiskLedger(id: string): Promise<RiskLedgerRecord>;
  createRiskLedger(payload: Record<string, unknown>): Promise<unknown>;
  updateRiskLedger(payload: Record<string, unknown>): Promise<unknown>;
  deleteRiskLedgers(ids: string[]): Promise<unknown>;
  downloadRiskLedgerTemplate(): Promise<Blob>;
  importRiskLedgers(file: FormData): Promise<unknown>;
  downloadRiskLedgerQrcodes(payload: Record<string, unknown>): Promise<Blob>;
  getRiskTypes(params?: Record<string, unknown>): Promise<RiskType[] | RiskLedgerPage>;
  createRiskType(payload: { name: string; remarks?: string; itemCode: string; superiorsId?: string; level?: number }): Promise<unknown>;
  updateRiskType(payload: RiskType & Record<string, unknown>): Promise<unknown>;
  deleteRiskType(id: string): Promise<unknown>;
  getMessageConfigs(params: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  saveMessageConfig(payload: Record<string, unknown>): Promise<unknown>;
}
