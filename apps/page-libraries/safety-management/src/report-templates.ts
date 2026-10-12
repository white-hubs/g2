import marketTemplate0506 from "./report-templates/market-template-20240506.json";
import marketTemplate0611 from "./report-templates/market-template-20240611.json";
import marketTemplate20250520 from "./report-templates/market-template-20250520.json";
import marketTemplate20260116 from "./report-templates/market-template-20260116.json";
import summaryTemplate0506 from "./report-templates/summary-template-20240506.json";
import summaryTemplate0611 from "./report-templates/summary-template-20240611.json";
import summaryTemplate20250520 from "./report-templates/summary-template-20250520.json";
import summaryTemplate20260116 from "./report-templates/summary-template-20260116.json";

export type ReportTemplateKind = "market" | "summary";
export type ReportTemplate = Record<string, unknown>;

const copy = (value: unknown): ReportTemplate => JSON.parse(JSON.stringify(value)) as ReportTemplate;

export function getReportTemplate(kind: ReportTemplateKind, monthDate: unknown): ReportTemplate {
  const timestamp = Number(monthDate);
  const templates =
    kind === "market"
      ? [marketTemplate0506, marketTemplate0611, marketTemplate20250520, marketTemplate20260116]
      : [summaryTemplate0506, summaryTemplate0611, summaryTemplate20250520, summaryTemplate20260116];

  if (Number.isFinite(timestamp) && timestamp > 1767139200000) {
    return copy(templates[3]);
  }
  if (Number.isFinite(timestamp) && timestamp > 1743465600000) {
    return copy(templates[2]);
  }
  if (Number.isFinite(timestamp) && timestamp > 1717200000000) {
    return copy(templates[1]);
  }
  return copy(templates[0]);
}
