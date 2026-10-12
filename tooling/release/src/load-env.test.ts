import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadReleaseEnvFile } from "./load-env";

const saved = { ...Bun.env };

afterEach(() => {
  for (const key of Object.keys(Bun.env)) {
    if (!(key in saved)) {
      delete Bun.env[key];
    }
  }
  Object.assign(Bun.env, saved);
});

describe("loadReleaseEnvFile", () => {
  test("loads RELEASE_S3_* from deploy/docker-compose/.env when unset", () => {
    const root = mkdtempSync(join(tmpdir(), "g2-release-env-"));
    mkdirSync(join(root, "deploy/docker-compose"), { recursive: true });
    writeFileSync(
      join(root, "deploy/docker-compose/.env"),
      ["RELEASE_S3_ENDPOINT=http://127.0.0.1:9000", "RELEASE_S3_ACCESS_KEY=from-file", "RELEASE_S3_SECRET_KEY=secret-from-file"].join("\n"),
    );

    delete Bun.env.RELEASE_S3_ENDPOINT;
    delete Bun.env.RELEASE_S3_ACCESS_KEY;
    delete Bun.env.RELEASE_S3_SECRET_KEY;

    const path = loadReleaseEnvFile(root);
    expect(path).toBe(join(root, "deploy/docker-compose/.env"));
    expect(Bun.env.RELEASE_S3_ENDPOINT).toBe("http://127.0.0.1:9000");
    expect(Bun.env.RELEASE_S3_ACCESS_KEY).toBe("from-file");
    expect(Bun.env.RELEASE_S3_SECRET_KEY).toBe("secret-from-file");
  });

  test("does not override already-set env", () => {
    const root = mkdtempSync(join(tmpdir(), "g2-release-env-"));
    mkdirSync(join(root, "deploy/docker-compose"), { recursive: true });
    writeFileSync(join(root, "deploy/docker-compose/.env"), "RELEASE_S3_ACCESS_KEY=from-file\n");

    Bun.env.RELEASE_S3_ACCESS_KEY = "from-shell";
    loadReleaseEnvFile(root);
    expect(Bun.env.RELEASE_S3_ACCESS_KEY).toBe("from-shell");
  });

  test("mirrors MINIO_ROOT_* into RELEASE_S3_* when release keys missing", () => {
    const root = mkdtempSync(join(tmpdir(), "g2-release-env-"));
    mkdirSync(join(root, "deploy/docker-compose"), { recursive: true });
    writeFileSync(
      join(root, "deploy/docker-compose/.env"),
      ["MINIO_ROOT_USER=minioadmin", "MINIO_ROOT_PASSWORD=minioadmin", "MINIO_HOST_PORT=9000"].join("\n"),
    );

    delete Bun.env.RELEASE_S3_ACCESS_KEY;
    delete Bun.env.RELEASE_S3_SECRET_KEY;
    delete Bun.env.RELEASE_S3_ENDPOINT;
    delete Bun.env.MINIO_ROOT_USER;
    delete Bun.env.MINIO_ROOT_PASSWORD;
    delete Bun.env.MINIO_HOST_PORT;

    loadReleaseEnvFile(root);
    expect(Bun.env.RELEASE_S3_ACCESS_KEY).toBe("minioadmin");
    expect(Bun.env.RELEASE_S3_SECRET_KEY).toBe("minioadmin");
    expect(Bun.env.RELEASE_S3_ENDPOINT).toBe("http://127.0.0.1:9000");
  });
});
