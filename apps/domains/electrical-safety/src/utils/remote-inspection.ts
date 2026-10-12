import { h } from "vue";

export interface RemoteInspectionHeaderLike {
  columnKey: string;
  columnType?: "REMOTE_PARAMETER" | "DATE_TIME" | "MANUAL_CONTENT";
  firstHeader: string;
  secondHeader?: string | null;
  sort: number;
}

const displayValue = (value: unknown): string => (value === null || value === undefined || value === "" ? "--" : String(value));

const createLeafColumn = (header: RemoteInspectionHeaderLike, title: string): Record<string, unknown> => ({
  title,
  dataIndex: ["values", header.columnKey],
  key: header.columnKey,
  width: 150,
  customRender: ({ text }: { text: unknown }) =>
    h("span", { class: `remote-inspection-value remote-inspection-value-${header.columnType ?? "REMOTE_PARAMETER"}` }, displayValue(text)),
});

/** 按一级表头聚合动态列；同名一级表头只生成一个分组，单级列直接作为叶子表头。 */
export function createRemoteInspectionColumns(headers: RemoteInspectionHeaderLike[]): Record<string, unknown>[] {
  const groups = new Map<string, RemoteInspectionHeaderLike[]>();

  headers
    .filter((header) => header.firstHeader.trim())
    .slice()
    .toSorted((left, right) => left.sort - right.sort)
    .forEach((header) => {
      const firstHeader = header.firstHeader.trim();
      const group = groups.get(firstHeader) ?? [];
      group.push(header);
      groups.set(firstHeader, group);
    });

  return [...groups.entries()].map(([firstHeader, group]) => {
    const isSingleLevel = group.length === 1 && !group[0].secondHeader?.trim();
    if (isSingleLevel) {
      return createLeafColumn(group[0], firstHeader);
    }
    return {
      title: firstHeader,
      key: `group:${firstHeader}`,
      children: group.map((header) => createLeafColumn(header, header.secondHeader?.trim() || " ")),
    };
  });
}
