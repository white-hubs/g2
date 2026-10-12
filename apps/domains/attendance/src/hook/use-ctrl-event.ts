import { onMounted, onUnmounted } from "vue";
export function useCtrlEvent(options: { onKeyDown: () => void; onKeyUp: () => void }): void {
  const down = (event: KeyboardEvent) => {
    if (event.key === "Control") {
      options.onKeyDown();
    }
  };
  const up = (event: KeyboardEvent) => {
    if (event.key === "Control") {
      options.onKeyUp();
    }
  };
  onMounted(() => {
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
  });
  onUnmounted(() => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
  });
}
