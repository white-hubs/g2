import { readFile } from "node:fs/promises";
import type { HmrContext, Plugin } from "vite";

function fileFromModuleId(id: string): string | undefined {
  if (!id || id.includes("\0") || id.startsWith("virtual:")) return undefined;
  const file = id.split("?", 1)[0];
  if (!file || file.includes("node_modules")) return undefined;
  return file;
}

/** @internal exported for unit tests */
export function createUnchangedHmrTracker() {
  const lastContent = new Map<string, string>();

  return {
    lastContent,
    async seedFromModuleId(id: string): Promise<void> {
      const file = fileFromModuleId(id);
      if (!file || lastContent.has(file)) return;
      try {
        lastContent.set(file, await readFile(file, "utf8"));
      } catch {
        // ignore unreadable ids
      }
    },
    async decide(file: string, content: string): Promise<"skip" | "update"> {
      const prev = lastContent.get(file);
      lastContent.set(file, content);
      return prev !== undefined && prev === content ? "skip" : "update";
    },
  };
}

/**
 * IDE「无改动保存」仍会更新 mtime，Vite 会推 HMR；vue-jsx 对 defineComponent 走
 * `__VUE_HMR_RUNTIME__.reload`，表现为组件 remount + 重新请求接口（像整页刷了一下）。
 * 内容未变时跳过本次 HMR。
 */
export function skipUnchangedHmrPlugin(): Plugin {
  const tracker = createUnchangedHmrTracker();

  return {
    name: "g2-skip-unchanged-hmr",
    apply: "serve",
    async transform(_code, id) {
      await tracker.seedFromModuleId(id);
    },
    async handleHotUpdate(ctx: HmrContext) {
      let content: string;
      try {
        content = await ctx.read();
      } catch {
        return;
      }
      if ((await tracker.decide(ctx.file, content)) === "skip") {
        return [];
      }
    },
  };
}
