/** PRD：待复审、已复审、复审逾期、无需复审 */
export const CERT_REVIEW_STATUS = {
  PENDING: "待复审",
  REVIEWED: "已复审",
  OVERDUE: "复审逾期",
  NOT_REQUIRED: "无需复审",
} as const;

export function resolveInitialReviewStatus(needReview: boolean): string {
  return needReview ? CERT_REVIEW_STATUS.PENDING : CERT_REVIEW_STATUS.NOT_REQUIRED;
}

/** 编辑时可选的复审状态（含无需复审） */
export function getEditReviewStatusOptions(): string[] {
  return [CERT_REVIEW_STATUS.PENDING, CERT_REVIEW_STATUS.REVIEWED, CERT_REVIEW_STATUS.OVERDUE, CERT_REVIEW_STATUS.NOT_REQUIRED];
}

/** 编辑时可选的复审状态 */
export function getReviewStatusOptions(needReview: boolean): string[] {
  if (needReview) {
    return [CERT_REVIEW_STATUS.PENDING, CERT_REVIEW_STATUS.REVIEWED, CERT_REVIEW_STATUS.OVERDUE];
  }
  return [CERT_REVIEW_STATUS.NOT_REQUIRED];
}

export function syncReviewStatusOnNeedReviewChange(needReview: boolean, currentStatus: string): string {
  if (!needReview) {
    return CERT_REVIEW_STATUS.NOT_REQUIRED;
  }
  const options = getReviewStatusOptions(true);
  if (options.includes(currentStatus)) {
    return currentStatus;
  }
  return CERT_REVIEW_STATUS.PENDING;
}

export function formatReviewStatus(cert: { needReview?: boolean; reviewStatus?: string | null }): string {
  const status = cert.reviewStatus?.trim();
  if (status) {
    return status;
  }
  if (cert.needReview === true) {
    return CERT_REVIEW_STATUS.PENDING;
  }
  if (cert.needReview === false) {
    return CERT_REVIEW_STATUS.NOT_REQUIRED;
  }
  return "--";
}
