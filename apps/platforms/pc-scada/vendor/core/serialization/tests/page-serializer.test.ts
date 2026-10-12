import { describe, expect, it } from "vitest";

import { createDefaultPage, deserializePage, PageModelMigrator, serializePage } from "../page-serializer";

describe("page-serializer", () => {
  it("serializes and deserializes page model", () => {
    const page = createDefaultPage({
      id: "page-1",
      name: "Test Page",
      elements: [],
    });

    const json = serializePage(page);
    const restored = deserializePage(json);

    expect(restored.id).toBe("page-1");
    expect(restored.name).toBe("Test Page");
    expect(restored.version).toBe("1.1");
  });

  it("fills defaults for missing fields during deserialize", () => {
    const restored = deserializePage(
      JSON.stringify({
        version: "1.0",
        id: "legacy-page",
        name: "Legacy",
      }),
    );

    expect(restored.width).toBe(1920);
    expect(restored.height).toBe(1080);
    expect(restored.grid.size).toBe(10);
    expect(restored.aliases).toEqual([]);
    expect(restored.elements).toEqual([]);
    expect(restored.connections).toEqual([]);
  });

  it("migrates through registered steps", () => {
    const migrator = new PageModelMigrator();
    migrator
      .register("0.9", "1.0", (raw) => ({
        ...raw,
        background: raw.background ?? "#000000",
      }))
      .register("1.0", "1.1", (raw) => ({
        ...raw,
        name: raw.name ?? "Migrated",
      }));

    const migrated = migrator.migrate(
      {
        version: "0.9",
        id: "p-1",
      },
      "1.1",
    );

    expect(migrated.version).toBe("1.1");
    expect(migrated.background).toBe("#000000");
    expect(migrated.name).toBe("Migrated");
  });
});
