import { type PageLibraryViolation, checkPageLibrarySource } from "./check";

const repoRoot = new URL("../../../", import.meta.url);
const glob = new Bun.Glob("apps/page-libraries/*/src/**/*.{ts,tsx,js,jsx,vue}");
const violations: PageLibraryViolation[] = [];

for await (const file of glob.scan({ cwd: repoRoot.pathname, onlyFiles: true })) {
  const source = await Bun.file(new URL(file, repoRoot)).text();
  violations.push(...checkPageLibrarySource(file, source));
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${violation.file}: ${violation.rule}`);
  }
  process.exitCode = 1;
} else {
  console.info("page-library architecture check passed");
}
