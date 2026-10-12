import { useRoute } from "vue-router";

export function resolvePageTitle(meta: Record<string, unknown>): string {
  return String(meta.title ?? "广播中心");
}

export function usePageName(): { pageTitle: string } {
  const route = useRoute();
  return { pageTitle: resolvePageTitle(route.meta as Record<string, unknown>) };
}

export function unwrapPage(raw: unknown): { records: Record<string, unknown>[]; total: number; pages: number } {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const nested = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data;
  const records = (nested.records ?? nested.list ?? nested.content ?? nested.rows ?? data.records ?? data.list ?? raw) as unknown;
  return {
    records: Array.isArray(records) ? (records as Record<string, unknown>[]) : [],
    total: Number(nested.total ?? nested.totalElements ?? data.total ?? (Array.isArray(records) ? records.length : 0)),
    pages: Number(nested.pages ?? data.pages ?? 0),
  };
}

export function unwrapData(raw: unknown): unknown {
  let current = raw;
  for (let i = 0; i < 4; i += 1) {
    if (current != null && typeof current === "object" && !Array.isArray(current) && "data" in current) {
      current = (current as { data: unknown }).data;
      continue;
    }
    break;
  }
  return current;
}

/** 将模板变量占位符替换为可读文案 */
export function formatBroadcastTemplateContent(text: string | undefined | null): string {
  if (!text) return "";
  return text
    .replaceAll("${name}", "{ 姓名 }")
    .replaceAll("${address}", "{ 地址 }")
    .replaceAll("${plateNo}", "{车牌号 }")
    .replaceAll("${curTime}", "{当前时间}")
    .replaceAll("${curDate}", "{当前日期}")
    .replaceAll("${phone}", "{ 电话 }")
    .replaceAll("${genericText}", "{ 通用文本 }");
}

/** 编辑态：把 ${var} 转为 { var } 展示 */
export function toEditableBroadcastContent(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/\${(\w+)}/g, "{ $1 }");
}

/** 保存态：把可读占位符还原为 ${var} */
export function toStoredBroadcastContent(text: string): string {
  return text
    .replaceAll("{ 姓名 }", "${name}")
    .replaceAll("{ 地址 }", "${address}")
    .replaceAll("{车牌号 }", "${plateNo}")
    .replaceAll("{当前时间}", "${curTime}")
    .replaceAll("{当前日期}", "${curDate}")
    .replaceAll("{ 电话 }", "${phone}")
    .replaceAll("{ 通用文本 }", "${genericText}");
}

export interface NormalizedUploadedFile {
  id: string;
  name: string;
  path: string;
}

/** 归一化文件上传返回 */
export function normalizeUploaded(raw: unknown): NormalizedUploadedFile | undefined {
  const body = unwrapData(raw);
  if (!body || typeof body !== "object") return undefined;
  const row = body as Record<string, unknown>;
  const id = row.id ?? row.fileId ?? row.ossId;
  if (id === undefined || id === null || id === "") return undefined;
  return {
    id: String(id),
    name: String(row.name ?? row.fileName ?? ""),
    path: String(row.path ?? row.url ?? row.endpointPath ?? ""),
  };
}
