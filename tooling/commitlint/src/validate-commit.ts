const single = /^(feat|fix|chore|docs|refactor|test|ci|build|perf|style)(\([a-z0-9/_-]+\))?!?: .+/u;
const multi =
  /^\{(feat|fix|chore|docs|refactor|test|ci|build|perf|style)(\([a-z0-9/_-]+\))?(,\s*(feat|fix|chore|docs|refactor|test|ci|build|perf|style)(\([a-z0-9/_-]+\))?)+\}: .+/u;

export function validateCommitMessage(message: string): { ok: true } | { ok: false; error: string } {
  const title = message.split("\n")[0]?.trim() ?? "";
  if (single.test(title) || multi.test(title)) {
    return { ok: true };
  }
  return {
    ok: false,
    error: "commit title must be `action(scope): subject` or `{action(scope), action(scope)}: subject`",
  };
}
