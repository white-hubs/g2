export interface PageResult<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  suffix?: string;
  path: string;
  size?: number;
  createTime?: string | number;
  refCount?: number;
  type?: string;
  businessKey?: string | null;
}

export interface KnowledgeDocumentRow {
  id: string;
  name: string;
  status?: boolean | string | null;
  typeId: string;
  typeName: string;
  format: string;
  size: number;
  deptId?: string | null;
  deptName?: string | null;
  createBy?: string | null;
  updateTime?: string | number | null;
  fileList: KnowledgeFile[];
  productId?: string | null;
  productName?: string | null;
  entryCount?: number | null;
}

export interface KnowledgeTypeNode {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  level?: number;
  typeName?: string;
  icon?: KnowledgeFile | null;
  entryCount?: number | null;
  entryCount30d?: number | null;
  children?: KnowledgeTypeNode[] | null;
}

export interface ReferenceOption {
  id: string;
  name?: string;
  prodName?: string;
  parentId?: string | null;
  children?: ReferenceOption[] | null;
}

export interface KnowledgeDocumentPageQuery {
  pageNumber: number;
  pageSize: number;
  name?: string;
  status?: boolean;
  typeId?: string;
  deptId?: string;
  productId?: string;
}

export interface KnowledgeDocumentPayload {
  id?: string;
  name: string;
  typeId: string;
  deptId: string | null;
  productId: string | null;
  entryCount?: number | null;
  fileIds: string[];
}

export interface KnowledgeTypePayload {
  id?: string;
  name: string;
  description: string | null;
  parentId: string | null;
  icon?: string | null;
}

export interface KnowledgeDocumentBatchResult {
  errorCount: number;
  successCount: number;
  errorList: string[];
}

export interface KnowledgeDocumentStatistics {
  total: number;
  statList: { key: string; value: number }[];
}

export interface KnowledgeDocumentClient {
  getStatistics(): Promise<KnowledgeDocumentStatistics>;
  pageDocuments(query: KnowledgeDocumentPageQuery): Promise<PageResult<KnowledgeDocumentRow>>;
  getDocument(id: string): Promise<KnowledgeDocumentRow>;
  setDocumentStatus(id: string, status: boolean): Promise<boolean>;
  createDocument(body: KnowledgeDocumentPayload): Promise<unknown>;
  createDocuments(body: KnowledgeDocumentPayload[]): Promise<KnowledgeDocumentBatchResult>;
  updateDocument(body: KnowledgeDocumentPayload & { id: string }): Promise<unknown>;
  deleteDocuments(ids: string[]): Promise<unknown>;

  listTypeTree(query?: { name?: string }): Promise<KnowledgeTypeNode[]>;
  createType(body: KnowledgeTypePayload): Promise<unknown>;
  updateType(body: KnowledgeTypePayload & { id: string }): Promise<unknown>;
  deleteType(id: string): Promise<unknown>;

  listProducts(): Promise<ReferenceOption[]>;
  listDepartments(query?: { enabled?: boolean }): Promise<ReferenceOption[]>;
}
