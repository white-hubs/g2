import { federation } from "@g2-tooling/mf-vite";
import { defineConfig as viteDefineConfig } from "vite";

export default viteDefineConfig({
  server: { host: true, port: 5116, strictPort: true, origin: "http://localhost:5116" },
  preview: { host: true, port: 5116, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "workOrderCenterClient",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      exposes: { "./client": "./src/client.ts" },
      shared: {},
    }),
  ],
});
