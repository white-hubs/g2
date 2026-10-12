import { describe, expect, test } from "bun:test";

import { legacyFilePreviewUrl, legacyPreviewKind } from "./file-preview";

describe("legacy file preview", () => {
  const origin = "https://g2.example.com";

  test("uses the old kkfileview Base64 URL for documents and videos", () => {
    for (const name of ["report.docx", "clip.mp4", "manual.pdf", "notes.txt"]) {
      const url = legacyFilePreviewUrl({ name, path: "/api/file/file/123" }, origin);
      expect(url).not.toBeNull();
      const parsed = new URL(String(url));
      expect(parsed.pathname).toBe("/tools/kkfileview/onlinePreview");
      expect(atob(String(parsed.searchParams.get("url")))).toBe(`${origin}/api/file/file/123`);
      expect(parsed.searchParams.get("fileName")).toBe(name);
    }
  });

  test("adds HTML mode only for Excel", () => {
    const excel = new URL(String(legacyFilePreviewUrl({ name: "台账.XLSX", url: "/files/1" }, origin)));
    expect(excel.searchParams.get("officePreviewType")).toBe("html");
    expect(excel.searchParams.get("fileName")).toBe("台账.XLSX");
    const doc = new URL(String(legacyFilePreviewUrl({ name: "合同.doc", path: "https://files.example.com/a.doc" }, origin)));
    expect(doc.searchParams.has("officePreviewType")).toBe(false);
    expect(atob(String(doc.searchParams.get("url")))).toBe("https://files.example.com/a.doc");
  });

  test("leaves images and unknown files to their existing preview paths", () => {
    expect(legacyPreviewKind("photo.png")).toBe("other");
    expect(legacyFilePreviewUrl({ name: "photo.png", path: "/files/a.png" }, origin)).toBeNull();
    expect(legacyFilePreviewUrl({ name: "missing.pdf" }, origin)).toBeNull();
  });
});
