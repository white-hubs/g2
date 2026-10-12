import { getTheme, subscribeTheme, type ThemeTokens } from "@g2-platform/theme-contract";
import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

/** 让 Ant Design CSS-in-JS 与根节点 CSS Token 使用同一个完整主题。 */
export function useThemeTokens(): Ref<ThemeTokens> {
  const tokens = ref<ThemeTokens>(getTheme().tokens);
  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    tokens.value = getTheme().tokens;
    unsubscribe = subscribeTheme((theme) => {
      tokens.value = theme.tokens;
    });
  });

  onBeforeUnmount(() => unsubscribe?.());
  return tokens;
}
