import { describe, expect, test } from "bun:test";

import { validateCommitMessage } from "./validate-commit";

describe("validateCommitMessage", () => {
  test("accepts action(scope): subject", () => {
    expect(validateCommitMessage("feat(shell-pc): add composition loader").ok).toBe(true);
  });

  test("accepts multi-action brace form", () => {
    expect(validateCommitMessage("{feat(domain-fire), fix(platform-pc-ui)}: align shared vue").ok).toBe(true);
  });

  test("rejects free-form titles", () => {
    expect(validateCommitMessage("update stuff").ok).toBe(false);
  });
});
