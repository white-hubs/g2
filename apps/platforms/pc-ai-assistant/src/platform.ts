import type { PlatformModule } from "@g2-composition/contract";
import { defineComponent, h, onUnmounted, ref } from "vue";

import AiChatEntry from "./components/AiChatEntry";
import { bindResourceApi } from "./resource-api";

/**
 * 与 Shell `AI_ASSISTANT_OPEN_REQUESTED_EVENT` 同值；不静态 import Shell（独立发版 Platform）。
 * ADR-0053：占位点击 ensure 后发此事件，避免用户再点一次。
 */
const AI_ASSISTANT_OPEN_REQUESTED = "ai-assistant:open-requested";

export const platformModule: PlatformModule = {
  label: "pc-ai-assistant",
  install: async (_app, _router, ctx) => {
    await bindResourceApi(ctx);
    const AiChatEntryHost = defineComponent({
      name: "AiChatEntryHost",
      setup() {
        const open = ref(false);
        const unsubscribe = ctx.bus.subscribe(AI_ASSISTANT_OPEN_REQUESTED, () => {
          open.value = true;
        });
        onUnmounted(unsubscribe);
        return () =>
          h(AiChatEntry, {
            open: open.value,
            "onUpdate:open": (value: boolean) => {
              open.value = value;
            },
          });
      },
    });
    ctx.bus.publish("chrome:register-top-bar-action", { id: "ai-assistant", component: AiChatEntryHost });
  },
};

export default platformModule;
