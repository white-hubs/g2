import { describe, expect, test } from "bun:test";

import { contentTypeForPath } from "./content-type";

describe("contentTypeForPath", () => {
  test("maps common web extensions", () => {
    expect(contentTypeForPath("app.js")).toBe("application/javascript");
    expect(contentTypeForPath("app.mjs")).toBe("application/javascript");
    expect(contentTypeForPath("style.css")).toBe("text/css");
    expect(contentTypeForPath("index.html")).toBe("text/html");
    expect(contentTypeForPath("mf-manifest.json")).toBe("application/json");
    expect(contentTypeForPath("logo.svg")).toBe("image/svg+xml");
    expect(contentTypeForPath("module.wasm")).toBe("application/wasm");
    expect(contentTypeForPath("bundle.js.map")).toBe("application/json");
  });

  test("defaults to octet-stream for unknown extensions", () => {
    expect(contentTypeForPath("data.bin")).toBe("application/octet-stream");
    expect(contentTypeForPath("noext")).toBe("application/octet-stream");
  });
});
