import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * qiankun 兼容桥挂载容器（`#appContainer`）的状态机，驱动 `App.ts` 里 loading/error 态展示。
 *
 * - idle：还没有触发任何微应用加载（初始态，也是没有任何旧仓微应用需要挂载时的稳定态）。
 * - loading：`beforeLoad` 已触发，微应用正在加载/挂载中。
 * - mounted：`afterMount` 已触发，微应用挂载成功。
 * - error：加载过程中触发了全局未捕获错误（参照旧仓 `use-child-application.ts` 的
 *   `changeAppLoadStatus`/`addGlobalUncaughtErrorHandler` 逻辑）。
 *
 * 只有仍处于 loading 态时才允许转入 error——挂载成功之后子应用内部发生的、与加载过程无关的运行时错误
 * 不应该把已经成功的挂载态错误地打回 error（旧仓同样有这个保护）。
 */
export type QiankunMountStatus = "idle" | "loading" | "error" | "mounted";

export const useQiankunMountStatusStore = defineStore("qiankunMountStatus", () => {
  const status = ref<QiankunMountStatus>("idle");

  function toLoading(): void {
    status.value = "loading";
  }

  function toMounted(): void {
    status.value = "mounted";
  }

  function toError(): void {
    if (status.value === "loading") {
      status.value = "error";
    }
  }

  function reset(): void {
    status.value = "idle";
  }

  return { status, toLoading, toMounted, toError, reset };
});
