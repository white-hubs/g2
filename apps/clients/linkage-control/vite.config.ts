import { federation } from "@g2-tooling/mf-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5305, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5305" },
  preview: { host: true, port: 5305, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [federation({ name: "linkageControlClient", filename: "remoteEntry.js", manifest: true, dts: false, mfRuntime: { role: "remote" }, exposes: { "./client": "./src/main.ts" } })],
});
