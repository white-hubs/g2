import type { PcTableColumn } from "@g2-platform/pc-ui";
export async function downloadTable(name: string, columns: PcTableColumn[], rows: Record<string, unknown>[]): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(name.slice(0, 31));
  sheet.columns = columns.map((column) => ({ header: String(column.title), key: String(column.dataIndex), width: 24 }));
  sheet.addRows(
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, value == null ? "--" : typeof value === "object" ? JSON.stringify(value) : value]),
      ),
    ),
  );
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
