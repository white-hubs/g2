import { onBeforeUnmount, onMounted, ref } from "vue";

export const usePageFullscreen = () => {
  const isFullscreen = ref(false);

  const syncFullscreenState = (): void => {
    isFullscreen.value = Boolean(document.fullscreenElement);
  };

  const toggleFullscreen = async (): Promise<void> => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    const appRoot = document.querySelector<HTMLElement>("#ElectricalSafety");
    await (appRoot ?? document.documentElement).requestFullscreen();
  };

  onMounted(() => {
    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
  });
  onBeforeUnmount(() => {
    document.removeEventListener("fullscreenchange", syncFullscreenState);
  });

  return {
    isFullscreen,
    toggleFullscreen,
  };
};
