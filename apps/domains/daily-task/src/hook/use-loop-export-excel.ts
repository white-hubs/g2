import { type Ref, ref } from "vue";

import { message } from "@/pc-ui-runtime";
import { dayjs } from "@/pc-ui-runtime";

interface UseLoopExportExcel {
  exportLoading: Ref<boolean>;
  exportData: (payload: ExportPayload) => Promise<void>;
}

interface ExportPayload {
  exportTotal: number;
  fileName: string;
  pageSize: 999;
  columns: TableColumn[];
  getExportDataFunc: (pageNumber: number, pageSize: number) => Promise<{ records: unknown[] }>;
}

export interface TableColumn {
  title?: string;
  width?: number;
  dataIndex?: string;
  unit?: string;
  code?: string;
}

function normalizeCell(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map(normalizeCell).join("\n");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function escapeCsv(value: unknown): string {
  const text = normalizeCell(value).replaceAll('"', '""');
  return `"${text}"`;
}

function normalizeExportRow(raw: unknown, index: number, columns: TableColumn[]): Record<string, unknown> {
  const row = { ...((raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>) };
  if (columns.some((column) => column.dataIndex === "idx")) {
    row.idx = index + 1;
  }
  if (row.time) {
    row.time = dayjs(row.time as string | number | Date).format("YYYY-MM-DD HH:mm:ss");
  }
  if (row.result) {
    row.result = resultText(String(row.result));
  }
  if (row.targetCategory) {
    row.targetCategory = targetCategoryText(String(row.targetCategory));
  }
  if (Array.isArray(row.standardVOS)) {
    row.standardVOS = row.standardVOS
      .flatMap((standard: Record<string, unknown>) => {
        const items = Array.isArray(standard.itemVOS) ? standard.itemVOS : [];
        const errors = items.filter((item: Record<string, unknown>) => item.errorValueFlag);
        return errors.length > 0
          ? [
              String(standard.standardName ?? ""),
              ...errors.map((item: Record<string, unknown>, i: number) => `${i + 1}、${item.itemName ?? ""} ${item.errorDesc ?? ""}`),
            ]
          : [];
      })
      .join("\n");
  }
  return row;
}

function downloadCsv(fileName: string, columns: TableColumn[], data: unknown[]): void {
  const visibleColumns = columns.filter((column) => column.dataIndex && column.dataIndex !== "operation");
  const lines = [
    visibleColumns.map((column) => escapeCsv(column.title ?? column.dataIndex)).join(","),
    ...data.map((raw, index) => {
      const row = normalizeExportRow(raw, index, visibleColumns);
      return visibleColumns.map((column) => escapeCsv(row[column.dataIndex!])).join(",");
    }),
  ];
  const url = URL.createObjectURL(new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.download = `${fileName}.csv`;
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const useLoopExportExcel = (): UseLoopExportExcel => {
  const exportLoading = ref(false);

  const exportData = async (payload: ExportPayload): Promise<void> => {
    exportLoading.value = true;
    try {
      const pageCount = Math.ceil(payload.exportTotal / payload.pageSize);
      const records: unknown[] = [];
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const result = await payload.getExportDataFunc(pageNumber, payload.pageSize);
        records.push(...(result.records ?? []));
      }
      if (records.length === 0) {
        message.warning("暂无数据");
        return;
      }
      downloadCsv(payload.fileName || "导出记录", payload.columns, records);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "导出失败");
    } finally {
      exportLoading.value = false;
    }
  };

  return { exportLoading, exportData };
};

export function resultText(value: string): string {
  return (
    new Map([
      ["NORMAL", "正常"],
      ["ABNORMAL", "异常"],
    ]).get(value) ?? value
  );
}

export function targetCategoryText(value: string): string {
  return (
    new Map([
      ["AREA", "区域"],
      ["DEVICE", "设备"],
      ["STALL", "档位"],
      ["PROPERTY", "资产"],
      ["SITE_POINT", "现场点"],
      ["PATROL_POINT", "巡更点"],
      ["RISK_SOURCE", "风险源"],
      ["SMALL_ENGINEERING", "小散工程"],
    ]).get(value) ?? value
  );
}
