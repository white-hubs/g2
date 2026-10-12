import { federation } from "@g2-tooling/mf-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5121, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5121" },
  preview: { host: true, port: 5121, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [federation({ name: "userCenterClient", filename: "remoteEntry.js", manifest: true, mfRuntime: { role: "remote" }, exposes: { "./client": "./src/client.ts" }, shared: {} })],
});
