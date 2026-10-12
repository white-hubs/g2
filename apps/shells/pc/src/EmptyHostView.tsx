import { defineComponent } from "vue";

/**
 * 门户 / 兜底路由空宿主：真实 UI 由 qiankun 挂到 `#appContainer`，
 * 不再渲染 HomeView 占位文案以免盖住子应用区域。
 */
export default defineComponent({
  name: "EmptyHostView",
  setup() {
    return () => null;
  },
});
