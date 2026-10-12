import { readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

import { findRepoRoot } from "./repo-root";

const releaseMemberSchema = z.object({
  logicalName: z.string().min(1),
  package: z.string().min(1),
  entryFile: z.string().min(1),
});

const releaseSetSchema = z.object({
  name: z.string().min(1),
  profile: z.string().min(1),
  addressTemplate: z.string().min(1),
  members: z.array(releaseMemberSchema).min(1),
});

export type ReleaseMember = z.infer<typeof releaseMemberSchema>;
export type ReleaseSet = z.infer<typeof releaseSetSchema>;

export interface LoadedReleaseSet extends ReleaseSet {
  repoRoot: string;
  profilePath: string;
  addressTemplatePath: string;
}

export function loadReleaseSet(name: string, repoRoot = findRepoRoot()): LoadedReleaseSet {
  const setPath = resolve(repoRoot, "deploy/release-sets", `${name}.yaml`);
  const raw = parseYaml(readFileSync(setPath, "utf8"));
  const parsed = releaseSetSchema.parse(raw);

  const toAbs = (relativePath: string) => (isAbsolute(relativePath) ? relativePath : join(repoRoot, relativePath));

  return {
    ...parsed,
    repoRoot,
    profilePath: toAbs(parsed.profile),
    addressTemplatePath: toAbs(parsed.addressTemplate),
  };
}
