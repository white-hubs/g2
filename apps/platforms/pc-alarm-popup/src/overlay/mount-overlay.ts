import { createApp, defineComponent, h, onBeforeUnmount, onMounted, ref, type App as VueApp } from "vue";

import { HeadquartersIframeOverlay } from "./headquarters-iframe";
import { TenantAlarmPopup } from "./tenant-alarm-popup";
import type { OverlayRuntimeDeps } from "./types";

const HOST_ID = "g2-pc-alarm-popup-host";

export type { OverlayRuntimeDeps } from "./types";

let hostApp: VueApp | null = null;

export function mountAlarmPopupOverlay(deps: OverlayRuntimeDeps): void {
  if (hostApp) {
    return;
  }
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    document.body.appendChild(host);
  }

  const Root = defineComponent({
    setup() {
      const tick = ref(0);
      onMounted(() => {
        const unsub = deps.controller.subscribe(() => {
          tick.value += 1;
        });
        onBeforeUnmount(unsub);
      });
      return () => {
        void tick.value;
        const view = deps.controller.getView();
        if (view.mode === "tenant") {
          return h(TenantAlarmPopup, {
            queue: view.queue,
            controller: deps.controller,
            bus: deps.bus,
            intentCodes: deps.intentCodes,
            showLocateButton: deps.showLocateButton,
            CubePlayer: deps.CubePlayer,
            AlarmChartComponents: deps.AlarmChartComponents,
            deviceCenter: deps.deviceCenter,
          });
        }
        if (view.mode === "headquarters") {
          return h(HeadquartersIframeOverlay, {
            iframeUrl: view.iframeUrl,
            alarmDetails: view.alarmDetails,
            visible: view.visible,
            onClose: () => deps.controller.closeHeadquarters(),
            onReady: () => deps.controller.setHeadquartersVisible(true),
          });
        }
        return null;
      };
    },
  });

  hostApp = createApp(Root);
  hostApp.mount(host);
}

export function unmountAlarmPopupOverlay(): void {
  const host = document.getElementById(HOST_ID);
  if (hostApp) {
    hostApp.unmount();
    hostApp = null;
  }
  host?.remove();
}
