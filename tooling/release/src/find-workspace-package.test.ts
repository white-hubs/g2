import { describe, expect, test } from "bun:test";

import { findWorkspacePackagePath } from "./find-workspace-package";
import { findRepoRoot } from "./repo-root";

describe("findWorkspacePackagePath", () => {
  test("resolves known workspace packages", () => {
    const repoRoot = findRepoRoot();
    expect(findWorkspacePackagePath("@g2-shell/pc", repoRoot)).toEndWith("apps/shells/pc");
    expect(findWorkspacePackagePath("@g2-platform/pc-auth", repoRoot)).toEndWith("apps/platforms/pc-auth");
  });
});
