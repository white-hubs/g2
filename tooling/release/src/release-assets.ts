/**
 * Dist files that belong in local/CI MF type-hint workflows, not on the public release CDN.
 * Browser runtime never loads @mf-types; shipping them only exposes build internals.
 */
export function isReleasePublishExcluded(relPath: string): boolean {
  const rel = relPath.split("\\").join("/");
  if (rel === "@mf-types.zip" || rel === "@mf-types.d.ts") return true;
  if (rel.startsWith("@mf-types/")) return true;
  if (rel === ".dev-server.zip" || rel === ".dev-server.d.ts") return true;
  if (rel.startsWith(".dev-server/")) return true;
  // Host may emit CDN-isomorphic mf-runtime under dist/_mf/; upload goes to bucket-root key separately (ADR-0054).
  if (rel === "_mf" || rel.startsWith("_mf/")) return true;
  return false;
}

/** Strip MF dts pointers from manifests before upload (generateTypes may still run at build). */
export function sanitizeReleaseFileBody(relPath: string, body: Uint8Array): Uint8Array {
  const rel = relPath.split("\\").join("/");
  if (rel !== "mf-manifest.json" && rel !== "mf-stats.json") {
    return body;
  }
  try {
    const json = JSON.parse(new TextDecoder().decode(body)) as {
      metaData?: { types?: unknown };
    };
    if (json.metaData && "types" in json.metaData) {
      delete json.metaData.types;
      return new TextEncoder().encode(`${JSON.stringify(json, null, 2)}\n`);
    }
  } catch {
    /* leave unmodified if not JSON */
  }
  return body;
}
