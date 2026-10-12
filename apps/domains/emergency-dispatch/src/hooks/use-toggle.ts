import { ref, type Ref } from "vue";

interface UseToggleReturn {
  state: Ref<boolean>;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
}

/**
 * 布尔状态切换的小工具。常用于 Modal/Drawer 的显隐控制。
 */
export function useToggle(initial = false): UseToggleReturn {
  const state = ref(initial);
  return {
    state,
    toggle: (): void => {
      state.value = !state.value;
    },
    setTrue: (): void => {
      state.value = true;
    },
    setFalse: (): void => {
      state.value = false;
    },
  };
}
