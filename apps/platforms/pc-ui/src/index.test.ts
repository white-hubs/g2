import { describe, expect, test } from "bun:test";
import type { App } from "vue";

import { installPcUi } from "./index";

describe("installPcUi", () => {
  test("仅挂样式/ConfigProvider 所需全局，不再强制 app.use(整桶 Antd)", () => {
    const usedPlugins: unknown[] = [];
    const fakeApp = { use: (plugin: unknown) => usedPlugins.push(plugin) } as unknown as App;

    installPcUi(fakeApp);

    // 域/页面以具名或 subpath 导入组件；install 可为空操作或仅轻量插件
    expect(usedPlugins.length).toBeLessThanOrEqual(1);
  });
});
