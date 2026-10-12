import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { GemCapabilityCodes, GemMessageConfigClient, NavigatePage } from "@g2-pages/generic-equipment-monitor";
import { defineComponent, h, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ROTATING_MANAGEMENT_GEM_CAPABILITY_CODES } from "./capability-codes";
import { resolveRotatingManagementGemHostPath } from "./page-key-routes";

export type GemMountOptions = {
  idAs?: "deviceId" | "alarmId" | "ruleId";
  getAlarmClient?: () => Promise<AlarmCenterClient>;
  getDeviceClient?: () => Promise<DeviceCenterClient>;
  getOuaaClient?: () => Promise<OuaaClient>;
  getFileClient?: () => Promise<FileClient>;
  getDictionaryClient?: () => Promise<DictionaryClient>;
  getMessageConfigClient?: () => Promise<GemMessageConfigClient>;
  getFunctionCodes?: () => ReadonlySet<string>;
  pageProps?: Record<string, unknown>;
};

export function mountGemPage(Page: Component, options?: GemMountOptions) {
  return defineComponent({
    name: "RotatingManagementGemHostPageMount",
    setup() {
      const router = useRouter();
      const route = useRoute();
      const onNavigatePage: NavigatePage = (payload) => void router.push(resolveRotatingManagementGemHostPath(payload));
      const id = String(route.query.id ?? "");
      const idProps =
        options?.idAs === "deviceId"
          ? { deviceId: id }
          : options?.idAs === "alarmId"
            ? { alarmId: id }
            : options?.idAs === "ruleId"
              ? {
                  ruleId: id,
                  mode: String(route.query.type ?? (id ? "edit" : "add")),
                  copy: String(route.query.copy ?? ""),
                }
              : {};
      return () =>
        h(Page, {
          codes: ROTATING_MANAGEMENT_GEM_CAPABILITY_CODES as GemCapabilityCodes,
          functionCodes: [...(options?.getFunctionCodes?.() ?? [])],
          onNavigatePage,
          getAlarmClient: options?.getAlarmClient,
          getDeviceClient: options?.getDeviceClient,
          getOuaaClient: options?.getOuaaClient,
          getFileClient: options?.getFileClient,
          getDictionaryClient: options?.getDictionaryClient,
          getMessageConfigClient: options?.getMessageConfigClient,
          ...idProps,
          ...options?.pageProps,
        });
    },
  });
}
