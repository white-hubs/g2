import type { EventBus } from "@g2-composition/contract";
import { defineComponent, h, nextTick, ref } from "vue";

import { BIMOPS_AI_ENTRY_ICON, resolveStaticResourceUrl } from "./library-platform-apis";

import "./ai-assistant-lazy.css";

/** 与 pc-ai-assistant install 贡献的 id 一致，供同 id 替换。 */
export const AI_ASSISTANT_ACTION_ID = "ai-assistant";

/** Shell 在 ensure 完成后发布；pc-ai-assistant 宿主监听以打开抽屉（避免点两次）。 */
export const AI_ASSISTANT_OPEN_REQUESTED_EVENT = "ai-assistant:open-requested";

const CHROME_REGISTER_TOP_BAR_ACTION = "chrome:register-top-bar-action";

/**
 * 已登录且 chrome 就绪后注册顶栏 AI 占位；首次点击再 ensure pcAiAssistant（ADR-0053）。
 */
export function registerAiAssistantPlaceholder(bus: EventBus, ensureAiAssistant: () => Promise<void>): void {
  const AiAssistantLazyEntry = defineComponent({
    name: "AiAssistantLazyEntry",
    setup() {
      const loading = ref(false);
      const iconUrl = resolveStaticResourceUrl(BIMOPS_AI_ENTRY_ICON);

      return () =>
        h("div", { class: "shell-ai-assistant-lazy" }, [
          h(
            "button",
            {
              type: "button",
              class: "shell-ai-assistant-lazy__trigger",
              "data-testid": "ai-assistant-lazy-entry",
              "aria-label": "AI 助手",
              disabled: loading.value,
              onClick: () => {
                if (loading.value) {
                  return;
                }
                loading.value = true;
                void (async () => {
                  try {
                    await ensureAiAssistant();
                    await nextTick();
                    bus.publish(AI_ASSISTANT_OPEN_REQUESTED_EVENT);
                  } finally {
                    loading.value = false;
                  }
                })();
              },
            },
            [h("img", { class: "shell-ai-assistant-lazy__icon", src: iconUrl, alt: "", width: 30, height: 30 })],
          ),
        ]);
    },
  });

  bus.publish(CHROME_REGISTER_TOP_BAR_ACTION, { id: AI_ASSISTANT_ACTION_ID, component: AiAssistantLazyEntry });
}
