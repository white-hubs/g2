import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type E from "wangeditor";

/** 与旧站相同的 wangEditor 4 富文本输入，供迁域表单复用。 */
export const RichTextEditor = defineComponent({
  name: "RichTextEditor",
  props: {
    modelValue: { type: String, default: "" },
    placeholder: { type: String, default: "请输入内容" },
    height: { type: Number, default: 200 },
    disabled: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const container = ref<HTMLElement | null>(null);
    const loadError = ref(false);
    let editor: InstanceType<typeof E> | undefined;
    let mounted = true;
    onMounted(() => {
      void import("wangeditor")
        .then(({ default: Editor }) => {
          if (!mounted || !container.value) {
            return;
          }
          editor = new Editor(container.value);
          editor.config.height = props.height;
          editor.config.zIndex = 2;
          editor.config.placeholder = props.placeholder;
          editor.config.showFullScreen = true;
          editor.config.zIndexFullScreen = 11000;
          editor.config.onchange = (html: string) => emit("update:modelValue", html);
          editor.create();
          if (props.modelValue) {
            editor.txt.html(props.modelValue);
          }
          if (props.disabled) {
            editor.disable();
          }
        })
        .catch(() => {
          if (mounted) {
            loadError.value = true;
          }
        });
    });
    watch(
      () => props.modelValue,
      (value) => {
        if (editor && editor.txt.html() !== value) {
          editor.txt.html(value || "");
        }
      },
    );
    watch(
      () => props.disabled,
      (disabled) => {
        if (disabled) {
          editor?.disable();
        } else {
          editor?.enable();
        }
      },
    );
    onBeforeUnmount(() => {
      mounted = false;
      editor?.destroy();
      editor = undefined;
    });
    return () =>
      h("div", null, [
        h("div", { ref: container }),
        loadError.value ? h("div", { role: "alert" }, "富文本编辑器加载失败，请刷新重试") : null,
      ]);
  },
});
