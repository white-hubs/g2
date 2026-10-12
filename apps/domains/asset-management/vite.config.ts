import { federation } from "@g2-tooling/mf-vite";
import jsxPlugin from "@vitejs/plugin-vue-jsx";
import { defineConfig as viteDefineConfig } from "vite";
export default viteDefineConfig({
  server: { host: true, port: 5139, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5139" },
  preview: { host: true, port: 5139, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    jsxPlugin(),
    federation({
      name: "assetManagement",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      mfRuntime: { role: "remote" },
      exposes: { "./domain": "./src/domain.ts" },
      shared: {
        vue: { singleton: true },
        "vue-router": { singleton: true },
      },
    }),
  ],
});
