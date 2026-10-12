import type { SecureEduUpstreamPath } from "@g2-contract/secure-edu";
import type { ColumnType, UploadRequestOption } from "@g2-platform/pc-ui";
import { defineComponent, nextTick, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getSecureEduClient } from "../domain-context";
import {
  AntDatePicker,
  AntRangePicker,
  Button,
  Form,
  FormItem,
  Input,
  Page,
  Popconfirm,
  Select,
  Table,
  Upload,
  message,
  useTableXScroll,
} from "../pc-ui-runtime";
import { PageFrame } from "./page-frame";
import { displayValue, errorText, pageResult } from "./page-utils";

type FilterOptionValue = string | number;

export interface ListColumn {
  title: string;
  key: string;
  fallbackKeys?: string[];
  valueMap?: Record<string, string>;
  width?: number;
}

export interface ListFilterOption {
  label: string;
  value: FilterOptionValue;
}

export interface RemoteFilterOptions {
  endpoint: SecureEduUpstreamPath;
  query?: Record<string, unknown>;
  labelKey?: string;
  valueKey?: string;
}

export interface ListFilter {
  key: string;
  label: string;
  type: "select" | "date" | "dateRange";
  width?: number;
  options?: ListFilterOption[];
  remote?: RemoteFilterOptions;
  defaultValue?: unknown;
  serialize?: (value: unknown) => unknown;
}

export interface CrudListPageOptions {
  title: string;
  endpoint: SecureEduUpstreamPath;
  columns: ListColumn[];
  filters?: ListFilter[];
  keywordPlaceholder?: string;
  editorPath?: string;
  detailPath?: string;
  deletePath?: (id: string) => SecureEduUpstreamPath;
  statusAction?: {
    field: string;
    publishedValue: string;
    publishPath: (id: string) => SecureEduUpstreamPath;
    withdrawPath: (id: string) => SecureEduUpstreamPath;
  };
  query?: Record<string, unknown>;
  exportPath?: SecureEduUpstreamPath;
  templateDownloadPath?: SecureEduUpstreamPath;
  importPath?: SecureEduUpstreamPath;
  importErrorExportPath?: SecureEduUpstreamPath;
}

function downloadBlob(file: Blob, filename: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function cloneFilterValue(value: unknown): unknown {
  return Array.isArray(value) ? [...value] : value;
}

function recordValue(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    return (value as Record<string, unknown>)[key];
  }, record);
}

function resolveColumnValue(record: Record<string, unknown>, column: ListColumn): unknown {
  for (const key of [column.key, ...(column.fallbackKeys ?? [])]) {
    const value = recordValue(record, key);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function optionRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  }
  return pageResult(value).records;
}

export function createCrudListPage(options: CrudListPageOptions) {
  return defineComponent({
    name: `${options.title}List`,
    setup() {
      const client = getSecureEduClient();
      const router = useRouter();
      const { updateTableXScroll } = useTableXScroll();
      const query = reactive({ pageNumber: 1, pageSize: 10 });
      const filterState = reactive<Record<string, unknown>>({ keyword: "" });
      const remoteOptions = reactive<Record<string, ListFilterOption[]>>({});
      const remoteLoading = reactive<Record<string, boolean>>({});
      const state = reactive({ loading: false, error: "", records: [] as Record<string, unknown>[], total: 0 });
      const mutatingId = ref("");
      const importing = ref(false);
      const importErrors = ref<Record<string, unknown>[]>([]);

      for (const filter of options.filters ?? []) {
        filterState[filter.key] = cloneFilterValue(filter.defaultValue);
      }

      const requestQuery = (): Record<string, unknown> => {
        const result: Record<string, unknown> = { ...options.query, ...query };
        for (const [key, value] of Object.entries(filterState)) {
          if (value === undefined || value === null || value === "") {
            continue;
          }
          const serialized = Array.isArray(value) ? value.join(",") : value;
          result[key] = options.filters?.find((filter) => filter.key === key)?.serialize?.(serialized) ?? serialized;
        }
        return result;
      };

      const loadRemoteFilter = async (filter: ListFilter): Promise<void> => {
        if (!filter.remote) {
          return;
        }
        remoteLoading[filter.key] = true;
        try {
          const response = await client.get<unknown>(filter.remote.endpoint, filter.remote.query);
          const labelKey = filter.remote.labelKey ?? "name";
          const valueKey = filter.remote.valueKey ?? "id";
          remoteOptions[filter.key] = optionRecords(response)
            .map((record) => ({ label: displayValue(record[labelKey]), value: record[valueKey] as FilterOptionValue }))
            .filter((item) => item.label !== "--" && item.value !== undefined && item.value !== null);
        } catch {
          remoteOptions[filter.key] = [];
        } finally {
          remoteLoading[filter.key] = false;
        }
      };

      const load = async (): Promise<void> => {
        state.loading = true;
        state.error = "";
        try {
          const result = pageResult(await client.get(options.endpoint, requestQuery()));
          state.records = result.records;
          state.total = result.total;
        } catch (error) {
          state.records = [];
          state.total = 0;
          state.error = errorText(error, "读取列表失败，请重试");
        } finally {
          state.loading = false;
          await nextTick();
          updateTableXScroll();
        }
      };

      const search = (): void => {
        query.pageNumber = 1;
        void load();
      };
      const reset = (): void => {
        filterState.keyword = "";
        for (const filter of options.filters ?? []) {
          filterState[filter.key] = cloneFilterValue(filter.defaultValue);
        }
        query.pageNumber = 1;
        void load();
      };
      const open = (path: string, action: "add" | "edit" | "detail", record?: Record<string, unknown>): void => {
        void router.push({ path, query: { action, ...(record?.id ? { id: String(record.id) } : {}) } });
      };
      const remove = async (record: Record<string, unknown>): Promise<void> => {
        if (!options.deletePath || !record.id || mutatingId.value) {
          return;
        }
        mutatingId.value = String(record.id);
        try {
          await client.delete(options.deletePath(mutatingId.value));
          void message.success("删除成功");
          if (state.records.length === 1 && query.pageNumber > 1) {
            query.pageNumber -= 1;
          }
          await load();
        } catch (error) {
          void message.error(errorText(error, "删除失败，请重试"));
        } finally {
          mutatingId.value = "";
        }
      };
      const changeStatus = async (record: Record<string, unknown>): Promise<void> => {
        const status = options.statusAction;
        if (!status || !record.id || mutatingId.value) {
          return;
        }
        const id = String(record.id);
        mutatingId.value = id;
        try {
          const published = record[status.field] === status.publishedValue;
          await client.put(published ? status.withdrawPath(id) : status.publishPath(id), { id });
          void message.success(published ? "撤回成功" : "发布成功");
          await load();
        } catch (error) {
          void message.error(errorText(error, "操作失败，请重试"));
        } finally {
          mutatingId.value = "";
        }
      };
      const submitExport = async (): Promise<void> => {
        if (!options.exportPath || state.loading) {
          return;
        }
        state.loading = true;
        try {
          downloadBlob(await client.download(options.exportPath, requestQuery()), `${options.title}.xlsx`);
          void message.success("导出成功");
        } catch (error) {
          void message.error(errorText(error, "导出失败，请重试"));
        } finally {
          state.loading = false;
        }
      };
      const downloadTemplate = async (): Promise<void> => {
        if (!options.templateDownloadPath || state.loading) {
          return;
        }
        state.loading = true;
        try {
          downloadBlob(await client.download(options.templateDownloadPath, undefined, "GET"), `${options.title}导入模板.xlsx`);
          void message.success("模板下载成功");
        } catch (error) {
          void message.error(errorText(error, "模板下载失败，请重试"));
        } finally {
          state.loading = false;
        }
      };
      const importQuestions = async (request: UploadRequestOption): Promise<void> => {
        if (!options.importPath || !(request.file instanceof Blob)) {
          request.onError?.(new Error("请选择导入文件"));
          return;
        }
        const file = request.file as File;
        if (!/\.xlsx?$/iu.test(file.name ?? "")) {
          const error = new Error("请上传 .xls 或 .xlsx 文件");
          void message.warning(error.message);
          request.onError?.(error);
          return;
        }
        importing.value = true;
        importErrors.value = [];
        try {
          const payload = new FormData();
          payload.append("file", file);
          const result = await client.post<Record<string, unknown>>(options.importPath, payload);
          const success = Number(result.success ?? 0);
          const fail = Number(result.fail ?? 0);
          const errors = result.importErrorList;
          importErrors.value = Array.isArray(errors) ? (errors as Record<string, unknown>[]) : [];
          request.onSuccess?.(result);
          void message.success(`批量导入完成：成功 ${success} 条，失败 ${fail} 条`);
          await load();
        } catch (error) {
          void message.error(errorText(error, "批量导入失败，请重试"));
          request.onError?.(error instanceof Error ? error : new Error("批量导入失败"));
        } finally {
          importing.value = false;
        }
      };
      const downloadImportErrors = async (): Promise<void> => {
        if (!options.importErrorExportPath || importErrors.value.length === 0 || importing.value) {
          return;
        }
        importing.value = true;
        try {
          downloadBlob(await client.download(options.importErrorExportPath, importErrors.value), `${options.title}导入失败清单.xlsx`);
          void message.success("失败清单下载成功");
        } catch (error) {
          void message.error(errorText(error, "失败清单下载失败，请重试"));
        } finally {
          importing.value = false;
        }
      };

      const columns: ColumnType<Record<string, unknown>>[] = [
        {
          title: "序号",
          key: "index",
          width: 70,
          align: "center",
          customRender: ({ index }) => (query.pageNumber - 1) * query.pageSize + index + 1,
        },
        ...options.columns.map((column) => ({
          title: column.title,
          key: column.key,
          width: column.width,
          align: "center" as const,
          ellipsis: true,
          customRender: ({ record }: { record: Record<string, unknown> }) => {
            const value = resolveColumnValue(record, column);
            return column.valueMap?.[String(value)] ?? displayValue(value);
          },
        })),
        ...(options.editorPath || options.detailPath || options.deletePath || options.statusAction
          ? [
              {
                title: "操作",
                key: "actions",
                width: 250,
                fixed: "right" as const,
                customRender: ({ record }: { record: Record<string, unknown> }) => (
                  <div style="display:flex;justify-content:center;gap:8px;white-space:nowrap">
                    {options.detailPath ? (
                      <Button type="link" onClick={() => open(options.detailPath as string, "detail", record)}>
                        详情
                      </Button>
                    ) : null}
                    {options.editorPath ? (
                      <Button type="link" onClick={() => open(options.editorPath as string, "edit", record)}>
                        编辑
                      </Button>
                    ) : null}
                    {options.statusAction ? (
                      <Button type="link" loading={mutatingId.value === String(record.id)} onClick={() => void changeStatus(record)}>
                        {record[options.statusAction.field] === options.statusAction.publishedValue ? "撤回" : "发布"}
                      </Button>
                    ) : null}
                    {options.deletePath ? (
                      <Popconfirm title="确定删除该记录？" okText="确定" cancelText="取消" onConfirm={() => void remove(record)}>
                        <Button type="link" danger loading={mutatingId.value === String(record.id)}>
                          删除
                        </Button>
                      </Popconfirm>
                    ) : null}
                  </div>
                ),
              },
            ]
          : []),
      ];

      onMounted(() => {
        for (const filter of options.filters ?? []) {
          void loadRemoteFilter(filter);
        }
        void load();
      });

      const renderFilter = (filter: ListFilter) => {
        if (filter.type === "date") {
          return (
            <AntDatePicker
              value={filterState[filter.key] as string | undefined}
              valueFormat="YYYY-MM-DD"
              placeholder="请选择日期"
              style={{ width: `${filter.width ?? 180}px` }}
              onUpdate:value={(value: unknown) => {
                filterState[filter.key] = value;
              }}
            />
          );
        }
        if (filter.type === "dateRange") {
          return (
            <AntRangePicker
              value={filterState[filter.key] as [string, string] | undefined}
              valueFormat="YYYY-MM-DD HH:mm:ss"
              showTime
              placeholder={["开始时间", "结束时间"]}
              style={{ width: `${filter.width ?? 240}px` }}
              onUpdate:value={(value: unknown) => {
                filterState[filter.key] = value;
              }}
            />
          );
        }
        return (
          <Select
            value={filterState[filter.key] as FilterOptionValue | undefined}
            options={filter.options ?? remoteOptions[filter.key] ?? []}
            loading={remoteLoading[filter.key]}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={`请选择${filter.label}`}
            style={{ width: `${filter.width ?? 140}px` }}
            onUpdate:value={(value: unknown) => {
              filterState[filter.key] = value;
            }}
          />
        );
      };

      return () => (
        <PageFrame title={options.title}>
          {{
            actions: () => (
              <>
                {options.exportPath ? (
                  <Button type="primary" onClick={() => void submitExport()} loading={state.loading}>
                    导出
                  </Button>
                ) : null}
                {options.templateDownloadPath ? (
                  <Button type="primary" onClick={() => void downloadTemplate()} loading={state.loading}>
                    下载模板
                  </Button>
                ) : null}
                {options.importPath ? (
                  <Upload accept=".xls,.xlsx" customRequest={(request) => void importQuestions(request)} showUploadList={false}>
                    <Button type="primary" loading={importing.value}>
                      批量导入
                    </Button>
                  </Upload>
                ) : null}
                {options.importErrorExportPath && importErrors.value.length > 0 ? (
                  <Button onClick={() => void downloadImportErrors()} loading={importing.value}>
                    下载失败清单
                  </Button>
                ) : null}
                {options.editorPath ? (
                  <Button type="primary" onClick={() => open(options.editorPath as string, "add")}>
                    新增
                  </Button>
                ) : null}
              </>
            ),
            search: () => (
              <Form layout="inline" onFinish={search}>
                {(options.filters ?? []).map((filter) => (
                  <FormItem key={filter.key} label={filter.label} style={{ paddingRight: 0, marginRight: "5px", marginBottom: "10px" }}>
                    {renderFilter(filter)}
                  </FormItem>
                ))}
                <FormItem style={{ paddingRight: 0, marginRight: "10px", marginBottom: "10px" }}>
                  <Input
                    value={String(filterState.keyword ?? "")}
                    placeholder={options.keywordPlaceholder ?? "请输入关键字"}
                    allowClear
                    style="width:180px"
                    onUpdate:value={(value) => {
                      filterState.keyword = String(value ?? "");
                    }}
                  />
                </FormItem>
                <FormItem style={{ paddingRight: 0, marginRight: "10px", marginBottom: "10px" }}>
                  <Button type="primary" htmlType="submit" loading={state.loading}>
                    查询
                  </Button>
                  <Button style="margin-left:10px" disabled={state.loading} onClick={reset}>
                    重置
                  </Button>
                </FormItem>
              </Form>
            ),
            default: () => (
              <>
                {state.error ? (
                  <div role="alert" style="margin-bottom:12px;color:#cf1322">
                    {state.error}{" "}
                    <Button type="link" onClick={() => void load()}>
                      重试
                    </Button>
                  </div>
                ) : null}
                <Table
                  id="pc-table"
                  rowKey="id"
                  columns={columns}
                  dataSource={state.records}
                  loading={state.loading}
                  pagination={false}
                  size="small"
                  scroll={{ x: "max-content" }}
                />
              </>
            ),
            footer: () => (
              <Page
                current={query.pageNumber}
                pageSize={query.pageSize}
                total={state.total}
                onPageChange={(page: number, size: number) => {
                  query.pageNumber = page;
                  query.pageSize = size;
                  void load();
                }}
                onShowSizeChange={(page: number, size: number) => {
                  query.pageNumber = page;
                  query.pageSize = size;
                  void load();
                }}
              />
            ),
          }}
        </PageFrame>
      );
    },
  });
}
