import { existsSync } from "node:fs";
import { join } from "node:path";

import { findWorkspacePackagePath } from "./find-workspace-package";
import { loadReleaseSet } from "./load-release-set";
import { findRepoRoot } from "./repo-root";
import { createReleaseS3Client, releaseS3Bucket } from "./s3";
import { listDistKeys, uploadDist } from "./upload-dist";
import { uploadMfRuntime } from "./upload-mf-runtime";
import { releaseVersion } from "./version";

export interface UploadMemberResult {
  logicalName: string;
  package: string;
  entryKey: string;
  uploaded: number;
  skipped: number;
}

export interface RunUploadOptions {
  setName: string;
  repoRoot?: string;
  only?: Set<string>;
  dryRun?: boolean;
  version?: string;
}

export async function runUpload(
  options: RunUploadOptions,
): Promise<{ ok: true; results: UploadMemberResult[]; version: string } | { ok: false; code: number }> {
  const repoRoot = options.repoRoot ?? findRepoRoot();
  const dryRun = Boolean(options.dryRun);
  const releaseSet = loadReleaseSet(options.setName, repoRoot);
  const members = options.only ? releaseSet.members.filter((member) => options.only!.has(member.logicalName)) : releaseSet.members;

  if (members.length === 0) {
    console.error("[release] no members matched --only filter");
    return { ok: false, code: 1 };
  }

  const version = options.version ?? releaseVersion();
  console.log(`[release] upload set=${options.setName} version=${version} dryRun=${dryRun}`);

  const results: UploadMemberResult[] = [];

  for (const member of members) {
    const packageDir = findWorkspacePackagePath(member.package, repoRoot);
    const distDir = join(packageDir, "dist");

    if (!existsSync(distDir)) {
      if (dryRun) {
        const entryKey = `${member.logicalName}/${version}/${member.entryFile}`;
        console.warn(`[release] ${member.logicalName}: dist missing, entry key only → ${entryKey}`);
        results.push({
          logicalName: member.logicalName,
          package: member.package,
          entryKey,
          uploaded: 0,
          skipped: 0,
        });
        continue;
      }
      console.error(`[release] ${member.logicalName}: dist not found at ${distDir}`);
      return { ok: false, code: 1 };
    }

    if (dryRun) {
      const keys = listDistKeys(distDir, member.logicalName, version, member.entryFile);
      console.log(`[release] ${member.logicalName} (${member.package}) planned keys (${keys.length}):`);
      for (const key of keys) {
        console.log(`  ${key}`);
      }
      results.push({
        logicalName: member.logicalName,
        package: member.package,
        entryKey: `${member.logicalName}/${version}/${member.entryFile}`,
        uploaded: 0,
        skipped: keys.length,
      });
      continue;
    }

    const client = createReleaseS3Client();
    const bucket = releaseS3Bucket();
    const result = await uploadDist(client, bucket, distDir, member.logicalName, version, member.entryFile);
    console.log(
      `[release] ${member.logicalName}: uploaded=${result.uploaded.length} skipped=${result.skipped.length} entry=${result.entryKey}`,
    );
    results.push({
      logicalName: member.logicalName,
      package: member.package,
      entryKey: result.entryKey,
      uploaded: result.uploaded.length,
      skipped: result.skipped.length,
    });
  }

  if (dryRun) {
    await uploadMfRuntime(undefined, "", repoRoot, { dryRun: true });
  } else {
    await uploadMfRuntime(createReleaseS3Client(), releaseS3Bucket(), repoRoot);
  }

  console.log("[release] upload summary:");
  for (const row of results) {
    console.log(`  ${row.logicalName}: entry=${row.entryKey} uploaded=${row.uploaded} skipped=${row.skipped}`);
  }

  return { ok: true, results, version };
}
