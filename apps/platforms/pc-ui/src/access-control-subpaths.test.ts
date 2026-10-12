import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkgRoot = join(import.meta.dirname, "..");

/** access-control 域本波用到的 pc-ui 子路径（网络按需 + 具名 API） */
const SUBPATHS = [
  "button",
  "table",
  "modal",
  "space",
  "card",
  "image",
  "radio",
  "form",
  "select",
  "input",
  "cascader",
  "steps",
  "popover",
  "popconfirm",
  "message",
  "page",
  "date-picker",
  "page-layout",
  "use-pc-table",
  "use-pc-form",
] as const;

describe("@g2-platform/pc-ui access-control subpaths", () => {
  test("package.json exports and vite exposes cover the set", () => {
    const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8")) as {
      exports?: Record<string, string>;
    };
    const vite = readFileSync(join(pkgRoot, "vite.config.ts"), "utf8");
    for (const name of SUBPATHS) {
      expect(pkg.exports?.[`./${name}`]).toBe(`./src/${name}.ts`);
      expect(vite).toContain(`"./${name}": "./src/${name}.ts"`);
    }
  });

  test("each subpath exports the symbols access-control needs", async () => {
    const table = await import("./table");
    expect(table.Table).toBeDefined();

    const modal = await import("./modal");
    expect(modal.Modal).toBeDefined();

    const space = await import("./space");
    expect(space.Space).toBeDefined();

    const card = await import("./card");
    expect(card.Card).toBeDefined();

    const image = await import("./image");
    expect(image.Image).toBeDefined();

    const radio = await import("./radio");
    expect(radio.Radio).toBeDefined();
    expect(radio.RadioGroup).toBeDefined();

    const form = await import("./form");
    expect(form.Form).toBeDefined();
    expect(form.FormItem).toBeDefined();

    const select = await import("./select");
    expect(select.Select).toBeDefined();

    const input = await import("./input");
    expect(input.Input).toBeDefined();

    const cascader = await import("./cascader");
    expect(cascader.Cascader).toBeDefined();

    const steps = await import("./steps");
    expect(steps.Steps).toBeDefined();
    expect(steps.Step).toBeDefined();

    const popover = await import("./popover");
    expect(popover.Popover).toBeDefined();
    expect(popover.PopOver).toBe(popover.Popover);

    const popconfirm = await import("./popconfirm");
    expect(popconfirm.Popconfirm).toBeDefined();
    expect(popconfirm.PopConfirm).toBe(popconfirm.Popconfirm);

    const message = await import("./message");
    expect(typeof message.message.success).toBe("function");

    const page = await import("./page");
    expect(page.Page).toBeDefined();

    const datePicker = await import("./date-picker");
    expect(datePicker.RangePicker).toBeDefined();

    const pageLayout = await import("./page-layout");
    expect(pageLayout.PageLayout).toBeDefined();

    const tableHook = await import("./use-pc-table");
    expect(typeof tableHook.usePcTable).toBe("function");

    const formHook = await import("./use-pc-form");
    expect(typeof formHook.usePcForm).toBe("function");
  });
});
