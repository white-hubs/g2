import { federation } from "@g2-tooling/mf-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5103, strictPort: true, origin: "http://localhost:5103" },
  preview: { host: true, port: 5103, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "safetyCreditClient",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      dts: false,
      exposes: { "./client": "./src/client.ts" },
      shared: {},
    }),
  ],
});
