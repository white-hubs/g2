import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { GemMessageConfigClient } from "@g2-pages/generic-equipment-monitor";
import type { GemCapabilityCodes, NavigatePage } from "@g2-pages/generic-equipment-monitor/contract";
import { defineComponent, h, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";

import { SECURITY_MONITOR_GEM_CAPABILITY_CODES } from "./capability-codes";
import { resolveSecurityMonitorGemHostPath } from "./page-key-routes";

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
  routeQueryAs?: string;
};

export function mountGemPage(Page: Component, options?: GemMountOptions) {
  return defineComponent({
    name: "SecurityMonitorGemHostPageMount",
    setup() {
      const router = useRouter();
      const route = useRoute();
      const onNavigatePage: NavigatePage = (payload) => void router.push(resolveSecurityMonitorGemHostPath(payload));
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
          codes: SECURITY_MONITOR_GEM_CAPABILITY_CODES as GemCapabilityCodes,
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
          ...(options?.routeQueryAs ? { [options.routeQueryAs]: { ...route.query } } : {}),
        });
    },
  });
}
