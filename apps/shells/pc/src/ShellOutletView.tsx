import { defineComponent } from "vue";
import { RouterView } from "vue-router";

/**
 * 鉴权后壳层父路由出口：只嵌套渲染子路由，不渲染任何占位文案。
 * 工作台/门户真实 UI 由 App 内 `#workbench-container` / `#appContainer` 承载。
 */
export default defineComponent({
  name: "ShellOutletView",
  setup() {
    return () => <RouterView />;
  },
});
