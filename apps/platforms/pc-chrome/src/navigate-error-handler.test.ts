import { createFakeBus } from "@g2-composition/contract";
import { describe, expect, mock, test } from "bun:test";

import { SHELL_NAVIGATE_ERROR_EVENT, installNavigateErrorHandler } from "./navigate-error-handler";

describe("installNavigateErrorHandler", () => {
  test("收到 shell:navigate-error 时调用 messageError", () => {
    const bus = createFakeBus();
    const messageError = mock((msg: string) => {
      void msg;
    });
    installNavigateErrorHandler(bus, { messageError });

    bus.publish(SHELL_NAVIGATE_ERROR_EVENT, { message: "该应用下未分配菜单" });

    expect(messageError).toHaveBeenCalledWith("该应用下未分配菜单");
  });
});
