import { expect, test } from "bun:test";

import packageJson from "../package.json";
import { RichTextEditor } from "./rich-text-editor";

test("富文本编辑器作为正式 pc-ui 子路径发布并支持双向绑定", () => {
  expect(packageJson.exports["./rich-text-editor"]).toBe("./src/rich-text-editor.ts");
  expect(RichTextEditor.name).toBe("RichTextEditor");
  expect(RichTextEditor.emits).toContain("update:modelValue");
});
