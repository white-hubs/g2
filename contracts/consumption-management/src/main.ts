export interface PageResult<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface AccountPageQuery {
  pageNumber: number;
  pageSize: number;
  /** 人员序号、工号、卡号或姓名 */
  enterParam?: string;
  /** 旧接口按账户类型描述筛选。 */
  accountName?: string;
}

export interface AccountStatusOption {
  description: string;
  value?: string | number;
  name?: string;
}

export interface TransactionOption {
  name: string;
  value: number | string;
}

export interface AccountRow {
  id: string;
  userCard?: string;
  userSerial?: string | number;
  userNo?: string;
  userName?: string;
  acName?: string;
  acMoney?: number | string;
  accountName?: string;
  accountStatus?: string;
  accountBalance?: number | string;
}

export interface AmountRecord {
  transactionTime?: string | number;
  transactionMoney?: number | string;
  balance?: number | string;
  transactionType?: number | string;
  subsidyBeginDate?: string | number | null;
  subsidyEndDate?: string | number | null;
  depName?: string;
  transactionChannel?: number | string;
  transactionStatus?: number | string;
  orderId?: string;
}

export interface CopiesRecord {
  transactionTime?: string | number;
  transactionCount?: number | string;
  transactionType?: number | string;
  depName?: string;
  subsidyBeginDate?: string | number | null;
  subsidyEndDate?: string | number | null;
  transactionStatus?: number | string;
}

export interface AccountDetail extends Omit<AccountRow, "id"> {
  id?: string;
  subsidyBalance?: number | string;
  cashBalance?: number | string;
  amountRecord?: AmountRecord[];
  copiesRecord?: CopiesRecord[];
}

export interface ChangePageQuery {
  pageNumber: number;
  pageSize: number;
  transactionType?: number | string;
  enterParam?: string;
  /** 旧服务格式：YYYY-MM-DD 00:00:00,YYYY-MM-DD 23:59:59。 */
  period: string;
}

export interface AmountChangeRow extends AmountRecord {
  id?: string;
  userCard?: string;
  userSerial?: string | number;
  userNo?: string;
  userName?: string;
  devSerial?: string;
}

export interface CopiesChangeRow extends CopiesRecord {
  id?: string;
  userCard?: string;
  userSerial?: string | number;
  userNo?: string;
  userName?: string;
}

export interface ChangeStatisticsQuery {
  enterParam?: string;
  period: string;
}

export interface ChangeStatistics {
  map: Record<string, number | string>;
}

export interface ChangeExportQuery extends ChangeStatisticsQuery {
  transactionType?: number | string;
}

export interface ConsumeRecordQuery {
  pageNumber: number;
  pageSize: number;
  interfaceEnum?: number | string;
  accountId?: string;
  period?: string;
}

export interface ConsumeRecordRow {
  id?: string;
  tradeTime?: string | number;
  tradeAmount?: number | string;
  subsidyAmount?: number | string;
  recordType?: string;
  type?: string;
  times?: number | string;
  device?: string;
  mode?: string;
}

export interface ConsumeAccountInfo {
  id?: string;
  userName?: string;
  userCard?: string;
  cashBalance?: number | string;
  subsidyBalance?: number | string;
  haircutCount?: number | string;
  laundryCount?: number | string;
}

export interface ConsumptionManagementClient {
  pageAccounts(query: AccountPageQuery): Promise<PageResult<AccountRow>>;
  getAccountDetail(id: string): Promise<AccountDetail>;
  listAccountStatuses(): Promise<AccountStatusOption[]>;

  pageAmountChanges(query: ChangePageQuery): Promise<PageResult<AmountChangeRow>>;
  pageCopiesChanges(query: ChangePageQuery): Promise<PageResult<CopiesChangeRow>>;
  listTransactionTypes(): Promise<TransactionOption[]>;
  getAmountChangeClassification(query: ChangeStatisticsQuery): Promise<ChangeStatistics>;
  getShareStatistics(query: ChangeStatisticsQuery): Promise<ChangeStatistics>;
  exportAmountChanges(query: ChangeExportQuery): Promise<Blob>;
  exportCopiesChanges(query: ChangeExportQuery): Promise<Blob>;

  listConsumeRecordTypes(): Promise<TransactionOption[]>;
  pageConsumeRecords(query: ConsumeRecordQuery): Promise<PageResult<ConsumeRecordRow>>;
  getConsumeAccountInfo(id: string | number): Promise<ConsumeAccountInfo>;
}
