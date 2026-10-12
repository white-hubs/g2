import { federation } from "@g2-tooling/mf-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5075, strictPort: true, origin: "http://localhost:5075" },
  preview: { host: true, port: 5075, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "deviceCenterClient",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      mfRuntime: { role: "remote" },
      exposes: { "./client": "./src/client.ts" },
      shared: {},
    }),
  ],
});
