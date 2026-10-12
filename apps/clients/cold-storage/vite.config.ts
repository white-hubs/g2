import { federation } from "@g2-tooling/mf-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5027, strictPort: true, origin: "http://localhost:5027" },
  preview: { host: true, port: 5027, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "coldStorageClient",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      exposes: { "./client": "./src/client.ts" },
      shared: {},
    }),
  ],
});
