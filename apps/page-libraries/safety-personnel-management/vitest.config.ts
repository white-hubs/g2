import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vitest/config";
export default defineConfig({
  plugins: [vueJsx()],
  test: { environment: "jsdom", include: ["tests/**/*.vitest.ts"], setupFiles: ["./tests/setup.ts"] },
});
