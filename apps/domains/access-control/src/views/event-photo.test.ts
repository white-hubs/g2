import { describe, expect, test } from "bun:test";

import { resolveEventPhoto } from "./event-photo";

describe("resolveEventPhoto", () => {
  test("reads endpointPath from pictureFile object", () => {
    expect(
      resolveEventPhoto({
        pictureFile: {
          id: "1",
          endpointPath: "http://192.168.0.243:9091/access-os/1.jpg",
          path: "/minio/access-os/1.jpg",
        },
      }),
    ).toBe("http://192.168.0.243:9091/access-os/1.jpg");
  });

  test("falls back to path then fileId download url", () => {
    expect(resolveEventPhoto({ pictureFile: { path: "/minio/a.jpg" } })).toBe("/minio/a.jpg");
    expect(resolveEventPhoto({ pictureFileId: "99" })).toBe("/resource/v1/file/download?id=99");
  });

  test("returns empty when no photo", () => {
    expect(resolveEventPhoto({})).toBe("");
    expect(resolveEventPhoto({ pictureFile: null, pictureFileId: null })).toBe("");
  });
});
