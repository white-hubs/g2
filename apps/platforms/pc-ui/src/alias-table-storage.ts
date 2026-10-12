export interface AliasColumnConfig {
  code: string;
  sort: number;
  visible: boolean;
}

export interface AliasColumnInput {
  code: string;
  title: string;
  fixed?: boolean | string;
  defaultVisible?: boolean;
  [key: string]: unknown;
}

const memoryStore = new Map<string, string>();

const storageKey = (tableCode: string): string => `g2-pc-ui-table-alias:${tableCode}`;

function readRaw(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStore.get(key) ?? null;
}

function writeRaw(key: string, value: string): void {
  memoryStore.set(key, value);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
}

function removeRaw(key: string): void {
  memoryStore.delete(key);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function loadAliasColumnConfig(tableCode: string): AliasColumnConfig[] {
  if (!tableCode) return [];
  try {
    const raw = readRaw(storageKey(tableCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AliasColumnConfig[]) : [];
  } catch {
    return [];
  }
}

export function saveAliasColumnConfig(tableCode: string, config: AliasColumnConfig[]): void {
  if (!tableCode) return;
  writeRaw(storageKey(tableCode), JSON.stringify(config));
}

export function clearAliasColumnConfig(tableCode: string): void {
  if (!tableCode) return;
  removeRaw(storageKey(tableCode));
}

/** 合并别名配置：排序 + 显隐（对齐 cube getAliasTableColumn） */
export function applyAliasTableColumn(payload: {
  tableCode: string;
  columns: AliasColumnInput[];
  filter?: boolean;
  sort?: boolean;
}): (AliasColumnInput & { visible: boolean; sort: number })[] {
  const filter = payload.filter ?? true;
  const sortEnabled = payload.sort ?? true;
  const aliasItems = loadAliasColumnConfig(payload.tableCode);
  const findDefaultVisible = payload.columns.some((e) => e.defaultVisible);

  let columnsList = payload.columns.map((column, index) => {
    const findItem = aliasItems.find((item) => item.code === column.code);
    return {
      ...column,
      fixed: column.fixed || undefined,
      visible: findItem?.visible ?? (findDefaultVisible ? !!column.defaultVisible : true),
      sort: findItem?.sort ?? index,
    };
  });

  if (sortEnabled) {
    columnsList = columnsList.toSorted((a, b) => a.sort - b.sort);
  }
  if (filter) {
    columnsList = columnsList.filter((item) => item.visible);
  }

  return columnsList;
}
