import type { S3Client } from "@aws-sdk/client-s3";
import { materializeMfRuntimeArtifact, mfRuntimeObjectKey, readMfRuntimeNpmVersion } from "@g2-tooling/mf-vite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { contentTypeForPath } from "./content-type";
import { putIfChanged } from "./s3";

export interface UploadMfRuntimeResult {
  key: string;
  uploaded: boolean;
  version: string;
}

export async function uploadMfRuntime(
  client: S3Client | undefined,
  bucket: string,
  repoRoot: string,
  options?: { dryRun?: boolean },
): Promise<UploadMfRuntimeResult> {
  const version = readMfRuntimeNpmVersion();
  const key = mfRuntimeObjectKey(version);
  const outFile = join(repoRoot, "node_modules/.cache/g2-release", key);
  mkdirSync(dirname(outFile), { recursive: true });
  materializeMfRuntimeArtifact(outFile);

  if (options?.dryRun) {
    console.log(`[release] mf-runtime (dry-run): ${key}`);
    return { key, uploaded: false, version };
  }

  if (!client) {
    throw new Error("uploadMfRuntime requires S3 client when not dry-run");
  }

  const body = new Uint8Array(readFileSync(outFile));
  const result = await putIfChanged(client, bucket, key, body, contentTypeForPath(outFile));
  console.log(`[release] mf-runtime: key=${key} uploaded=${result.uploaded}`);
  return { key, uploaded: result.uploaded, version };
}
