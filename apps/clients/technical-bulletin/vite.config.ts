import { federation } from "@g2-tooling/mf-vite";
import { defineConfig as viteDefineConfig } from "vite";

export default viteDefineConfig({
  server: { host: true, port: 5120, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5120" },
  preview: { host: true, port: 5120, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "technicalBulletinClient",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      mfRuntime: { role: "remote" },
      exposes: { "./client": "./src/client.ts" },
    }),
  ],
});
