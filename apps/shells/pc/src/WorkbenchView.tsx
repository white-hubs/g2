import { defineComponent } from "vue";

/**
 * 工作台路由占位：真实挂载点 `#workbench-container` 由 `App` chrome 常驻提供，
 * 避免 qiankun start 时容器尚未因 RouterView 渲染而不存在。
 */
export default defineComponent({
  name: "WorkbenchView",
  setup() {
    return () => null;
  },
});
