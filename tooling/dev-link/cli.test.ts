import { expect, test } from "bun:test";
import { createServer } from "node:net";

import {
  decideLocalRemoteHeartbeat,
  findAvailablePort,
  isPortListening,
  isProcessAlive,
  isRemoteManifestReachable,
  parseRemoteMetadata,
} from "./cli";

test("extracts federation logical name and preferred port", () => {
  expect(parseRemoteMetadata(`defineConfig({ server: { port: 5050 }, plugins: [federation({ name: "accessControl" })] })`)).toEqual({
    logicalName: "accessControl",
    preferredPort: 5050,
  });
});

test("selects the next port when the preferred port is occupied", async () => {
  const occupied = createServer();
  await new Promise<void>((resolve) => occupied.listen(0, "127.0.0.1", resolve));
  const address = occupied.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind a TCP port");
  try {
    expect(await findAvailablePort(address.port)).toBe(address.port + 1);
  } finally {
    await new Promise<void>((resolve, reject) => occupied.close((error) => (error ? reject(error) : resolve())));
  }
});

test("selects the next port when the preferred port is occupied on IPv6", async () => {
  const occupied = createServer();
  try {
    await new Promise<void>((resolve, reject) => {
      occupied.once("error", reject);
      occupied.listen({ port: 0, host: "::1", ipv6Only: true }, resolve);
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL")) return;
    throw error;
  }
  const address = occupied.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind a TCP port");
  try {
    expect(await findAvailablePort(address.port)).toBe(address.port + 1);
  } finally {
    await new Promise<void>((resolve, reject) => occupied.close((error) => (error ? reject(error) : resolve())));
  }
});

test("treats an unreachable manifest as unavailable", async () => {
  const unavailable = await isRemoteManifestReachable("http://localhost:1/mf-manifest.json", async () => {
    throw new Error("connection refused");
  });
  const available = await isRemoteManifestReachable("http://localhost:1/mf-manifest.json", async () => new Response("{}", { status: 200 }));
  expect(unavailable).toBe(false);
  expect(available).toBe(true);
});

test("keeps heartbeat when manifest times out but Vite process and port remain", () => {
  expect(
    decideLocalRemoteHeartbeat({
      manifestReachable: false,
      registered: true,
      processAlive: true,
      portListening: true,
    }),
  ).toBe("keep-heartbeat");
});

test("unregisters when the Vite process is gone even if the port looks open", () => {
  expect(
    decideLocalRemoteHeartbeat({
      manifestReachable: false,
      registered: true,
      processAlive: false,
      portListening: true,
    }),
  ).toBe("unregister");
});

test("unregisters when the port is closed even if the process briefly remains", () => {
  expect(
    decideLocalRemoteHeartbeat({
      manifestReachable: false,
      registered: true,
      processAlive: true,
      portListening: false,
    }),
  ).toBe("unregister");
});

test("registers when the manifest is reachable", () => {
  expect(
    decideLocalRemoteHeartbeat({
      manifestReachable: true,
      registered: false,
      processAlive: true,
      portListening: true,
    }),
  ).toBe("register");
});

test("detects a live process and an open listening port", async () => {
  expect(isProcessAlive(process.pid)).toBe(true);
  expect(isProcessAlive(-1)).toBe(false);

  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind a TCP port");
  try {
    expect(await isPortListening(address.port)).toBe(true);
    expect(await isPortListening(address.port + 50)).toBe(false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
