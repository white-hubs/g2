export type ExpireDisplay = "normal" | "expiring" | "expired";

export const getExpireDisplay = (remainingDays: number, warnDays = 30): ExpireDisplay => {
  if (remainingDays < 0) {
    return "expired";
  }
  if (remainingDays <= warnDays) {
    return "expiring";
  }
  return "normal";
};

export const expireDisplayLabel: Record<ExpireDisplay, string> = {
  normal: "正常",
  expiring: "临期",
  expired: "过期",
};

const certStatusLabel: Record<string, string> = {
  VALID: "正常",
  LEFT: "已离职",
  DISABLED: "禁用",
};

export function formatCertStatusLabel(cert: {
  certStatus?: string;
  expireStatus?: string;
  remainingDays?: number;
  validEnd?: string;
  warnDaysSnapshot?: number;
}): string {
  if (cert.certStatus && certStatusLabel[cert.certStatus]) {
    return certStatusLabel[cert.certStatus];
  }
  if (cert.expireStatus && expireDisplayLabel[cert.expireStatus as ExpireDisplay]) {
    return expireDisplayLabel[cert.expireStatus as ExpireDisplay];
  }
  const remaining = cert.remainingDays ?? 0;
  const display = getExpireDisplay(remaining, cert.warnDaysSnapshot ?? 30);
  return expireDisplayLabel[display];
}

export function formatRemainingDays(remainingDays?: number | null): string {
  if (remainingDays == null) {
    return "--";
  }
  if (remainingDays < 0) {
    return "已过期";
  }
  return `剩余${remainingDays}天`;
}
