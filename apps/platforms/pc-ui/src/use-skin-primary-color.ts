import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

import { MF_ROOT_CHANGE_SKIN_EVENT, primaryColorFromSkinEvent, readStoredPrimaryColor } from "./skin-primary";

/**
 * 响应式皮肤主色：初始读 localStorage，之后听 `mf-root-change-skin`。
 * 供 ZhConfigProvider / 域内 ConfigProvider 使用。
 */
export function useSkinPrimaryColor(): Ref<string> {
  const color = ref(readStoredPrimaryColor());

  const onSkinChange = (event: Event): void => {
    const fromDetail = primaryColorFromSkinEvent((event as CustomEvent).detail);
    color.value = fromDetail ?? readStoredPrimaryColor();
  };

  onMounted(() => {
    // 挂载时再读一次，避免 chrome restoreSkinTheme 晚于本组件 setup 的竞态
    color.value = readStoredPrimaryColor();
    window.addEventListener(MF_ROOT_CHANGE_SKIN_EVENT, onSkinChange);
  });

  onBeforeUnmount(() => {
    window.removeEventListener(MF_ROOT_CHANGE_SKIN_EVENT, onSkinChange);
  });

  return color;
}
