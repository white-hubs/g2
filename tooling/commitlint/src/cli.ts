import { readFileSync } from "node:fs";

import { validateCommitMessage } from "./validate-commit";

const file = process.argv[2];
if (!file) {
  console.error("usage: g2-commitlint <commit-msg-file>");
  process.exit(1);
}

const message = readFileSync(file, "utf8");
const result = validateCommitMessage(message);
if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}
