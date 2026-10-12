import { ZhConfigProvider } from "@g2-platform/pc-ui";
import { defineComponent } from "vue";
import { RouterView } from "vue-router";

import "./assets/style.less";

/**
 * 使用 ZhConfigProvider：跟随 chrome 换肤（theme.token.colorPrimary），
 * 禁止再写死开河蓝，否则右侧域页面永远不随皮肤变化。
 */
export const App = defineComponent({
  name: "RiskGradedControl",
  setup: () => {
    return (): JSX.Element => (
      <ZhConfigProvider>
        <RouterView />
      </ZhConfigProvider>
    );
  },
});
