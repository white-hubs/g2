import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vitest/config";

/**
 * Node 25+ 内置了 Web Storage API（`globalThis.localStorage`），会抢在 jsdom 自己的实现之前生效，
 * 但内置版本在没有传 `--localstorage-file` 时是一个不能用的空对象（调用 `.clear()`/`.setItem()` 会报错），
 * 导致 `LoginPage.vitest.ts` 里"记住我"相关用例访问 `localStorage` 直接炸掉。用 `--no-webstorage`
 * 关掉 Node 内置实现，让 jsdom 的 `localStorage`（挂在 `window` 上，jsdom 环境会合并到 globalThis）接管。
 * 参考 https://github.com/vitest-dev/vitest/issues/8757。
 */
process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--no-webstorage"].filter(Boolean).join(" ");

export default defineConfig({
  plugins: [vueJsx()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.vitest.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
