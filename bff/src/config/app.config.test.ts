import { expect, test } from "bun:test";

import { loadAppConfig } from "./app.config";

test("uses the Cube gateway for safety-personnel requests when no override is supplied", () => {
  const previousUrl = process.env.SAFETY_PERSONNEL_URL;
  const previousConfigPath = process.env.APP_CONFIG_PATH;
  delete process.env.SAFETY_PERSONNEL_URL;
  process.env.APP_CONFIG_PATH = "/tmp/g2-no-safety-personnel-config.json";

  try {
    expect(loadAppConfig().safetyPersonnelUrl).toBe("https://cube.guhecloud.com:3000/");
  } finally {
    if (previousUrl === undefined) delete process.env.SAFETY_PERSONNEL_URL;
    else process.env.SAFETY_PERSONNEL_URL = previousUrl;
    if (previousConfigPath === undefined) delete process.env.APP_CONFIG_PATH;
    else process.env.APP_CONFIG_PATH = previousConfigPath;
  }
});
