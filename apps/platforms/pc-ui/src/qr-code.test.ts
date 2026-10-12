import { expect, test } from "bun:test";

import { generateQrCode } from "./qr-code";
test("公共二维码生成真实 PNG，空内容返回可见错误", async () => {
  expect(await generateQrCode("secure-edu-task-1")).toStartWith("data:image/png;base64,");
  await expect(generateQrCode("")).rejects.toThrow("二维码内容不能为空");
});
