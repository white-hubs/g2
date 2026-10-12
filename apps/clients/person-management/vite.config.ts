import { federation } from "@g2-tooling/mf-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5128, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5128" },
  preview: { host: true, port: 5128, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "personManagementClient",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      mfRuntime: { role: "remote" },
      exposes: { "./client": "./src/client.ts" },
    }),
  ],
});
