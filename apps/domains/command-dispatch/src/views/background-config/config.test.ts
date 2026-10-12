import { describe, expect, test } from "bun:test";

import { backgroundRecord, validateBackgroundFile } from "./config";

describe("dispatch background configuration", () => {
  test("background save is isolated from existing map configuration", () => {
    expect(
      backgroundRecord(
        [{ id: "zoom", code: "zoom", itemCode: "COMMAND_DISPATCH_MAP_CONFIG", name: "zoom", variable: "16" }],
        "/files/background.png",
      ),
    ).toMatchObject({ id: "", code: "background", itemCode: "COMMAND_DISPATCH_MAP_CONFIG", variable: "/files/background.png" });
    expect(
      backgroundRecord(
        [{ id: "bg", code: "background", itemCode: "COMMAND_DISPATCH_MAP_CONFIG", name: "背景", variable: "old.png", version: "9" }],
        "new.png",
      ),
    ).toMatchObject({ id: "bg", version: "9", variable: "new.png" });
  });
  test("all previously supported image formats remain accepted and non-images cannot upload", () => {
    for (const type of ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/bmp", "image/webp", "image/svg+xml"]) {
      expect(validateBackgroundFile(new Blob(["image"], { type }))).toBeUndefined();
    }
    expect(validateBackgroundFile(new Blob(["script"], { type: "text/javascript" }))).toBe("请上传图片文件");
    expect(validateBackgroundFile(new Blob(["data"]))).toBe("请上传图片文件");
  });
});
