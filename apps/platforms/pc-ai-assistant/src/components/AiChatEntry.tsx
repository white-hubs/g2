import { type PropType, computed, defineComponent, ref } from "vue";

import { BIMOPS_AI_ENTRY_ICON, resolveStaticResourceUrl } from "../resource-api";

import styles from "./AiChatEntry.module.css";

export default defineComponent({
  name: "AiChatEntry",
  props: {
    /** 受控打开（install 宿主在收到 ai-assistant:open-requested 时置 true）。省略则组件内自持。 */
    open: { type: Boolean as PropType<boolean | undefined>, default: undefined },
  },
  emits: ["update:open"],
  setup(props, { emit }) {
    const internalVisible = ref(false);
    const visible = computed({
      get: () => (props.open === undefined ? internalVisible.value : props.open),
      set: (value: boolean) => {
        if (props.open === undefined) {
          internalVisible.value = value;
        } else {
          emit("update:open", value);
        }
      },
    });
    const aiEntryIcon = resolveStaticResourceUrl(BIMOPS_AI_ENTRY_ICON);

    return () => (
      <div class={["pc-ai-assistant-entry", styles.root]}>
        <button
          type="button"
          class="pc-ai-assistant-entry__trigger"
          data-testid="ai-assistant-entry"
          aria-label="AI 助手"
          onClick={() => {
            visible.value = !visible.value;
          }}
        >
          <img class="pc-ai-assistant-entry__icon" src={aiEntryIcon} alt="" width={30} height={30} />
        </button>
        {visible.value ? (
          <div class="pc-ai-assistant-drawer" data-testid="ai-assistant-drawer">
            聊天能力接入中（占位，具体协议见后端接线专项）
          </div>
        ) : null}
      </div>
    );
  },
});
