import { federation } from "@g2-tooling/mf-vite";
import { defineConfig as viteDefineConfig } from "vite";

export default viteDefineConfig({
  server: { host: true, port: 5132, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5132" },
  preview: { host: true, port: 5132, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "consumptionManagementClient",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      mfRuntime: { role: "remote" },
      exposes: { "./client": "./src/client.ts" },
    }),
  ],
});
