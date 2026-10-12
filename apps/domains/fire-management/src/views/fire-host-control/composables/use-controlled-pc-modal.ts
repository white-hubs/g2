import { watch, type WatchSource } from "vue";

import { usePcModal } from "@/pc-ui-runtime";

type PcModalOptions = NonNullable<Parameters<typeof usePcModal>[0]>;

export function useControlledPcModal(visibleSource: WatchSource<boolean>, options: PcModalOptions): ReturnType<typeof usePcModal> {
  const [PcModal, modalApi] = usePcModal(options);

  watch(
    visibleSource,
    (visible) => {
      if (visible === Boolean(modalApi.state.open)) return;
      if (visible) modalApi.open();
      else modalApi.close();
    },
    { immediate: true },
  );

  return [PcModal, modalApi];
}
