import { HeadObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { describe, expect, test } from "bun:test";

import { contentMd5Hex, putIfChanged } from "./s3";

class FakeS3Client {
  private readonly objects = new Map<string, { contentLength: number; body: Uint8Array; contentType: string; etag: string }>();

  async send(command: HeadObjectCommand | PutObjectCommand): Promise<{ ContentLength?: number; ETag?: string }> {
    if (command instanceof HeadObjectCommand) {
      const key = `${command.input.Bucket}/${command.input.Key}`;
      const obj = this.objects.get(key);
      if (!obj) {
        throw new Error("NotFound");
      }
      return { ContentLength: obj.contentLength, ETag: `"${obj.etag}"` };
    }

    if (command instanceof PutObjectCommand) {
      const body = command.input.Body as Uint8Array;
      const key = `${command.input.Bucket}/${command.input.Key}`;
      this.objects.set(key, {
        contentLength: body.byteLength,
        body,
        contentType: command.input.ContentType ?? "application/octet-stream",
        etag: contentMd5Hex(body),
      });
      return {};
    }

    throw new Error("unsupported command");
  }
}

describe("putIfChanged", () => {
  test("uploads when object is missing", async () => {
    const client = new FakeS3Client() as unknown as S3Client;
    const body = new TextEncoder().encode("hello");
    const result = await putIfChanged(client, "bucket", "a/b.js", body, "application/javascript");
    expect(result).toEqual({ uploaded: true, key: "a/b.js" });
  });

  test("skips upload when etag matches content md5", async () => {
    const client = new FakeS3Client() as unknown as S3Client;
    const body = new TextEncoder().encode("same-size");
    await putIfChanged(client, "bucket", "a/b.js", body, "application/javascript");
    const second = await putIfChanged(client, "bucket", "a/b.js", body, "application/javascript");
    expect(second).toEqual({ uploaded: false, key: "a/b.js" });
  });

  test("uploads when length matches but content differs", async () => {
    const client = new FakeS3Client() as unknown as S3Client;
    // Same length, different Vite chunk hash suffix — classic remoteEntry false skip.
    await putIfChanged(
      client,
      "bucket",
      "remoteEntry.js",
      new TextEncoder().encode('import"./assets/chunk-D36hQx7F.js";'),
      "application/javascript",
    );
    const result = await putIfChanged(
      client,
      "bucket",
      "remoteEntry.js",
      new TextEncoder().encode('import"./assets/chunk-BMPCF7jJ.js";'),
      "application/javascript",
    );
    expect(result).toEqual({ uploaded: true, key: "remoteEntry.js" });
  });

  test("uploads when content length differs", async () => {
    const client = new FakeS3Client() as unknown as S3Client;
    await putIfChanged(client, "bucket", "a/b.js", new TextEncoder().encode("short"), "application/javascript");
    const result = await putIfChanged(client, "bucket", "a/b.js", new TextEncoder().encode("longer-body"), "application/javascript");
    expect(result).toEqual({ uploaded: true, key: "a/b.js" });
  });
});
