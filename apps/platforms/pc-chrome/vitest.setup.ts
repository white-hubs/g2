/**
 * jsdom 没有实现 `window.matchMedia`，而 ant-design-vue 的 `Avatar`/`Row`/`FormItem` 内部用它做响应式
 * 断点监听（`ant-design-vue/lib/_util/responsiveObserve.js`），组件挂载时就会触发，与是否用到响应式
 * 布局无关。这里补一个最小 stub，只是为了让组件能挂载，不代表真的支持响应式断点行为。
 * 与 `apps/platforms/pc-auth/vitest.setup.ts` 是同一个 stub，两个包各自独立持有一份——这只是测试环境的 polyfill。
 */
import * as resourcePlatformApi from "@g2-platform/resource/api";

import { bindResourceApiFromModule } from "./src/resource-api";

bindResourceApiFromModule(resourcePlatformApi);

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
