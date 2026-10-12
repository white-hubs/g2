import type { Key } from "ant-design-vue/es/table/interface";
import { reactive, ref, type Ref } from "vue";

import type { PcTableApiOptions, PcTableProps, PageResultVo } from "./pc-table-types";

function bindMethods<T extends object>(instance: T): void {
  const prototype = Object.getPrototypeOf(instance) as object;
  for (const propertyName of Object.getOwnPropertyNames(prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    const propertyValue = instance[propertyName as keyof T];
    if (typeof propertyValue === "function" && propertyName !== "constructor" && descriptor && !descriptor.get && !descriptor.set) {
      instance[propertyName as keyof T] = (propertyValue as (...a: unknown[]) => unknown).bind(instance) as T[keyof T];
    }
  }
}

export class PcTableApi {
  public state: PcTableProps = reactive({ columns: [], dataSource: [] }) as PcTableProps;

  public loading: Ref<boolean> = ref(false);
  private readonly selectedRowKeys: Ref<Key[]> = ref([]);
  private selectedRows: unknown[] = [];
  private readonly api: Pick<PcTableApiOptions, "rowSelectionChange" | "fetchApi" | "fetchLoaded">;
  private autoFetchTimer: ReturnType<typeof setTimeout> | null = null;

  public constructor(options: PcTableApiOptions) {
    const { rowSelectionChange, fetchApi, fetchLoaded, ...optionsState } = options;
    // 领域页默认不需要自行计算表格高度；只有明确传 false 才使用页面整体滚动。
    optionsState.autoScrollY = optionsState.autoScrollY ?? true;
    this.api = { rowSelectionChange, fetchApi, fetchLoaded };
    Object.assign(this.state, optionsState);
    this.checkDataIndexUnique();
    bindMethods(this);
    optionsState.autoFetch = optionsState.autoFetch ?? true;
    this.state.autoFetch = optionsState.autoFetch;
    if (optionsState.autoFetch) {
      this.autoFetchTimer = setTimeout(() => {
        this.autoFetchTimer = null;
        void this.fetchData();
      }, 0);
    }
  }

  public setColumns(columns: PcTableProps["columns"]): void {
    this.state.columns = columns;
  }

  public setDataSource(dataSource: PcTableProps["dataSource"]): void {
    this.state.dataSource = dataSource;
  }

  public getDataSource(): unknown[] | undefined {
    return this.state.dataSource;
  }

  public setSelectedRowKeys(selectedRowKeys: Key[]): void {
    this.selectedRowKeys.value = selectedRowKeys;
  }

  public getSelectedRowKeys(): Key[] {
    return this.selectedRowKeys.value;
  }

  public setState(state: Partial<PcTableProps>): void {
    Object.assign(this.state, state);
  }

  public setSelectedRows(selectedRows: unknown[]): void {
    this.selectedRows = selectedRows;
  }

  public getSelectedRows(): unknown[] {
    return this.selectedRows;
  }

  public rowSelectionChange(): void {
    this.api.rowSelectionChange?.(this.selectedRowKeys.value, this.selectedRows);
  }

  public query(): void {
    this.cancelAutoFetch();
    void this.fetchData();
  }

  public resetFetch(): void {
    this.cancelAutoFetch();
    if (typeof this.state.pagination === "object" && this.state.pagination) {
      this.state.pagination.current = 1;
      this.state.pagination.pageSize = 10;
    }
    void this.fetchData();
  }

  private checkDataIndexUnique(): void {
    // 仅使用 customRender 的列可以不提供 dataIndex；忽略空值，
    // 防止它们都转换成同一个 "undefined" 而被误判为重复。
    const columnsDataIndex = this.state.columns.map((item) => item.dataIndex).filter((d) => d !== undefined && d !== null && d !== "");
    const columnsDataIndexSet = new Set(columnsDataIndex.map((d) => String(d)));
    if (columnsDataIndex.length !== columnsDataIndexSet.size) {
      throw new Error("dataIndex must be unique");
    }
  }

  private cancelAutoFetch(): void {
    if (this.autoFetchTimer) {
      clearTimeout(this.autoFetchTimer);
      this.autoFetchTimer = null;
    }
  }

  private async fetchData(): Promise<void> {
    if (!this.api.fetchApi) {
      return;
    }
    try {
      this.loading.value = true;
      const result: PageResultVo =
        typeof this.state.pagination === "object" && this.state.pagination
          ? await this.api.fetchApi(this.state.pagination)
          : await this.api.fetchApi();
      this.state.dataSource = result?.records ?? [];
      if (typeof this.state.pagination === "object" && this.state.pagination) {
        this.state.pagination.total = result?.total ?? 0;
      }
      this.api.fetchLoaded?.(result);
    } finally {
      this.loading.value = false;
    }
  }
}
