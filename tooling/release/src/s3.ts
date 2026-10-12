import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";

export interface ReleaseS3Env {
  RELEASE_S3_ENDPOINT?: string;
  RELEASE_S3_REGION?: string;
  RELEASE_S3_BUCKET?: string;
  RELEASE_S3_ACCESS_KEY?: string;
  RELEASE_S3_SECRET_KEY?: string;
  RELEASE_S3_FORCE_PATH_STYLE?: string;
}

export function assertReleaseS3Credentials(env: ReleaseS3Env = Bun.env): {
  accessKeyId: string;
  secretAccessKey: string;
} {
  const accessKeyId = env.RELEASE_S3_ACCESS_KEY?.trim();
  const secretAccessKey = env.RELEASE_S3_SECRET_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "missing RELEASE_S3_ACCESS_KEY / RELEASE_S3_SECRET_KEY (copy deploy/docker-compose/.env.example → .env, or export them)",
    );
  }
  return { accessKeyId, secretAccessKey };
}

export function createReleaseS3Client(env: ReleaseS3Env = Bun.env): S3Client {
  const credentials = assertReleaseS3Credentials(env);
  const endpoint = env.RELEASE_S3_ENDPOINT?.trim();
  if (!endpoint) {
    throw new Error("missing RELEASE_S3_ENDPOINT (e.g. http://127.0.0.1:9000 for local MinIO)");
  }
  return new S3Client({
    endpoint,
    region: env.RELEASE_S3_REGION ?? "us-east-1",
    forcePathStyle: env.RELEASE_S3_FORCE_PATH_STYLE !== "false",
    credentials,
  });
}

export function releaseS3Bucket(env: ReleaseS3Env = Bun.env): string {
  return env.RELEASE_S3_BUCKET ?? "g2-web-release";
}

/** MinIO / single-part S3 PutObject ETag is typically the MD5 hex (quoted). */
export function contentMd5Hex(body: Uint8Array): string {
  return createHash("md5").update(body).digest("hex");
}

export function normalizeS3Etag(etag: string | undefined): string | undefined {
  if (!etag) {
    return undefined;
  }
  return etag.replaceAll('"', "").toLowerCase();
}

export async function putIfChanged(
  client: S3Client,
  bucket: string,
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<{ uploaded: boolean; key: string }> {
  const bodyMd5 = contentMd5Hex(body);
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const remoteEtag = normalizeS3Etag(head.ETag);
    // Length-only skip is unsafe: Vite remoteEntry.js often keeps the same byte length when only the
    // hashed chunk filename changes (same hash string length → identical ContentLength, wrong body).
    if (remoteEtag === bodyMd5) {
      return { uploaded: false, key };
    }
  } catch {
    /* miss or head failure → upload */
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentMD5: Buffer.from(bodyMd5, "hex").toString("base64"),
    }),
  );
  return { uploaded: true, key };
}
