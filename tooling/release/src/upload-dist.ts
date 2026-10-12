import type { S3Client } from "@aws-sdk/client-s3";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { contentTypeForPath } from "./content-type";
import { joinReleaseKey } from "./paths";
import { isReleasePublishExcluded, sanitizeReleaseFileBody } from "./release-assets";
import { putIfChanged } from "./s3";

export interface UploadDistResult {
  uploaded: string[];
  skipped: string[];
  entryKey: string;
}

function walkFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function uploadDist(
  client: S3Client,
  bucket: string,
  distDir: string,
  logicalName: string,
  version: string,
  entryFile: string,
): Promise<UploadDistResult> {
  const prefix = joinReleaseKey(logicalName, version);
  const entryKey = joinReleaseKey(prefix, entryFile);
  const uploaded: string[] = [];
  const skipped: string[] = [];

  for (const filePath of walkFiles(distDir)) {
    const rel = relative(distDir, filePath).split("\\").join("/");
    if (isReleasePublishExcluded(rel)) {
      continue;
    }
    const key = joinReleaseKey(prefix, rel);
    const body = sanitizeReleaseFileBody(rel, new Uint8Array(readFileSync(filePath)));
    const contentType = contentTypeForPath(filePath);
    const result = await putIfChanged(client, bucket, key, body, contentType);
    if (result.uploaded) {
      uploaded.push(key);
    } else {
      skipped.push(key);
    }
  }

  if (!statSync(join(distDir, entryFile)).isFile()) {
    throw new Error(`entry file missing in dist: ${join(distDir, entryFile)}`);
  }

  return { uploaded, skipped, entryKey };
}

export function listDistKeys(distDir: string, logicalName: string, version: string, entryFile: string): string[] {
  const prefix = joinReleaseKey(logicalName, version);
  const keys = walkFiles(distDir)
    .map((filePath) => relative(distDir, filePath).split("\\").join("/"))
    .filter((rel) => !isReleasePublishExcluded(rel))
    .map((rel) => joinReleaseKey(prefix, rel));
  keys.push(joinReleaseKey(prefix, entryFile));
  return [...new Set(keys)].toSorted();
}
