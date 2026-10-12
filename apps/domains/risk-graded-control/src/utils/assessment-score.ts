/** 评估总分截断保留两位小数（不四舍五入）。 */
export function truncateAssessmentScore(score: number): number {
  return Math.trunc(score * 100) / 100;
}

/** 按评估方法维度顺序计算总分（维度分值相乘）。 */
export function calcAssessmentTotalScore(scores: Record<string, number>, dimensions: Array<{ code: string }>): number {
  if (dimensions.length === 0) return 0;
  const product = dimensions.map((dimension) => scores[dimension.code]).reduce((acc, value) => acc * value, 1);
  return truncateAssessmentScore(product);
}

/** 展示评估总分：整数不带小数，否则截断保留两位小数。 */
export function formatAssessmentScore(score: number | undefined | null): string {
  if (score == null || Number.isNaN(score)) return "—";
  const truncated = truncateAssessmentScore(score);
  if (Number.isInteger(truncated)) return String(truncated);
  return truncated.toFixed(2);
}
