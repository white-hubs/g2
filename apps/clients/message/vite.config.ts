import { federation } from "@g2-tooling/mf-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5020, strictPort: true, origin: "http://localhost:5020" },
  preview: { host: true, port: 5020, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "messageClient",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      exposes: {
        "./client": "./src/client.ts",
      },
      // ADR-0057 U1：服务 Client 纯逻辑，不强制 vue shared
      shared: {},
    }),
  ],
});
