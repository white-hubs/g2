/**
 * jsdom 没有实现 `window.matchMedia`，而 ant-design-vue 的 `Row`/`FormItem` 内部用它做响应式断点监听
 * （`ant-design-vue/lib/_util/responsiveObserve.js`），哪怕我们的表单是 `layout="vertical"` 也会触发。
 * 这里补一个最小 stub，只是为了让组件能挂载，不代表真的支持响应式断点行为。
 */
import * as loggerPlatformApi from "@g2-platform/logger/api";

import { bindLoggerApiFromModule } from "./src/logger-api";

bindLoggerApiFromModule(loggerPlatformApi);

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
