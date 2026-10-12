import { cruise, type ICruiseResult } from "dependency-cruiser";

import { createBoundaryRuleSet } from "./rules";

export type BoundaryCheckResult = {
  ok: boolean;
  errorCount: number;
  messages: string[];
  raw: ICruiseResult;
};

/**
 * 对给定路径跑架构边界规则；供夹具测试共用。
 * 全仓 CLI 请走 Node 上的 depcruise 二进制（避免 Bun segfault）。
 */
export async function runBoundaryCheck(
  paths: string[],
  options?: { cwd?: string; enforceSharedRetirement?: boolean },
): Promise<BoundaryCheckResult> {
  const ruleSet = createBoundaryRuleSet({
    enforceSharedRetirement: options?.enforceSharedRetirement,
  });
  const commentByName = new Map((ruleSet.forbidden ?? []).map((rule) => [rule.name, rule.comment ?? ""]));
  const previous = process.cwd();
  if (options?.cwd) {
    process.chdir(options.cwd);
  }
  try {
    const { output } = await cruise(paths, {
      ...ruleSet.options,
      ruleSet: { forbidden: ruleSet.forbidden, allowed: ruleSet.allowed },
      validate: true,
    });
    const result = output as ICruiseResult;
    const messages: string[] = [];
    for (const violation of result.summary?.violations ?? []) {
      if (violation.rule.severity !== "error") {
        continue;
      }
      const comment = commentByName.get(violation.rule.name) ?? "";
      const to = "to" in violation ? String(violation.to) : "";
      messages.push(`${violation.rule.name}: ${violation.from} → ${to}${comment ? ` — ${comment}` : ""}`);
    }
    const errorCount = result.summary?.error ?? 0;
    return { ok: errorCount === 0, errorCount, messages, raw: result };
  } finally {
    if (options?.cwd) {
      process.chdir(previous);
    }
  }
}
