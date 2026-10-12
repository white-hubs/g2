import { reactive } from "vue";

import { useAuthRequest } from "@/api/request";
import { urgeHazard } from "@/api/server";
import { message } from "@/pc-ui-runtime";

interface UseHazardUrgeOptions {
  onUrged?: () => void | Promise<void>;
}

const readHazardId = (id: string | number): string => String(id);

export function useHazardUrge(options: UseHazardUrgeOptions = {}) {
  const urgingIds = reactive(new Set<string>());

  const isUrging = (id: string | number): boolean => urgingIds.has(readHazardId(id));

  const urge = async (id: string | number): Promise<void> => {
    const hazardId = readHazardId(id);
    if (urgingIds.has(hazardId)) {
      return;
    }

    urgingIds.add(hazardId);
    try {
      await useAuthRequest(() => urgeHazard(id));
      message.success("已发送整改催办");
      await options.onUrged?.();
    } finally {
      urgingIds.delete(hazardId);
    }
  };

  return {
    isUrging,
    urge,
  };
}
