import { federation } from "@g2-tooling/mf-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5030, strictPort: true, origin: "http://localhost:5030" },
  preview: { host: true, port: 5030, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "emergencySuppliesClient",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      dts: false,
      exposes: { "./client": "./src/client.ts" },
      shared: {},
    }),
  ],
});
