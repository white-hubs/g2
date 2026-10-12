import type { CertTypeVO } from "@g2-contract/safety-personnel";
import { dayjs } from "@g2-platform/pc-ui";

/** 根据发证日期与证书类型有效周期计算有效期（结束日为周期末日前一天） */
export function calcCertValidityFromIssueDate(
  issueDate: string,
  validPeriod?: number,
  validPeriodUnit?: string,
): { validStart: string; validEnd: string } {
  const start = dayjs(issueDate);
  const validStart = start.format("YYYY-MM-DD");
  if (!validPeriod || validPeriod <= 0) {
    return { validStart, validEnd: validStart };
  }
  const unit = validPeriodUnit?.toUpperCase() === "MONTH" ? "month" : "year";
  const validEnd = start.add(validPeriod, unit).subtract(1, "day").format("YYYY-MM-DD");
  return { validStart, validEnd };
}

export function calcCertValidityFromType(issueDate: string, certType?: CertTypeVO): { validStart: string; validEnd: string } {
  return calcCertValidityFromIssueDate(issueDate, certType?.validPeriod, certType?.validPeriodUnit);
}

/** 发证日期 ≤ 有效期开始 ≤ 有效期结束 */
export function isCertDateOrderInvalid(issueDate?: string | null, validStart?: string | null, validEnd?: string | null): boolean {
  if (!issueDate || !validStart || !validEnd) {
    return false;
  }
  const issue = dayjs(issueDate);
  const start = dayjs(validStart);
  const end = dayjs(validEnd);
  return issue.isAfter(start, "day") || start.isAfter(end, "day");
}
