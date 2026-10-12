import { describe, expect, test } from "bun:test";

import { checkPageLibrarySource } from "./check";

describe("page-library architecture check", () => {
  test("accepts pure page implementations", () => {
    expect(checkPageLibrarySource("page.tsx", 'import { defineComponent } from "vue";')).toEqual([]);
  });

  test("rejects router, host dependencies and browser auth storage", () => {
    const source = `
      import host from "@g2-domain/access-control";
      const router = useRouter();
      router.push("/host/path");
      sessionStorage.getItem("token");
    `;
    expect(checkPageLibrarySource("bad.ts", source).map((item) => item.rule)).toEqual([
      "must not depend on a Domain",
      "must not own Vue Router navigation",
      "must not read or write browser auth storage",
    ]);
  });
});
