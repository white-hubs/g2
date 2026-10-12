import { federation } from "@g2-tooling/mf-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5021, strictPort: true, origin: "http://localhost:5021" },
  preview: { host: true, port: 5021, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "authClient",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      exposes: {
        "./client": "./src/client.ts",
      },
      shared: {},
    }),
  ],
});
