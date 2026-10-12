// @ts-nocheck
/** Requires dependency: `wangeditor` (legacy used ^4.7.11). Parent should add to package.json if missing. */
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import E from "wangeditor";

import { sanitizeRichText } from "./rich-text";

import styles from "./generated-content-editor.module.css";

export const GeneratedContentEditor = defineComponent({
  name: "GeneratedContentEditor",
  props: {
    modelValue: { type: String, default: "" },
    readonly: { type: Boolean, default: false },
    metadata: { type: String, default: "" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const editorElement = ref<HTMLElement | null>(null);
    let editor: InstanceType<typeof E> | null = null;
    let editorMetadataElement: HTMLDivElement | null = null;

    const safeContent = computed(() => sanitizeRichText(props.modelValue));

    const setEditorHtml = (value: string) => {
      if (!editor) return;
      const html = sanitizeRichText(value);
      if (editor.txt.html() !== html) {
        editor.txt.html(html);
      }
    };

    const setEditorMetadata = (value: string) => {
      if (editorMetadataElement) {
        editorMetadataElement.textContent = value;
      }
    };

    onMounted(() => {
      if (props.readonly) return;
      void nextTick(() => {
        if (!editorElement.value) return;
        editor = new E(editorElement.value);
        editor.config.height = 420;
        editor.config.zIndex = 2;
        editor.config.showFullScreen = true;
        editor.config.zIndexFullScreen = 11000;
        editor.config.placeholder = "请输入预案正文";
        editor.config.menus = [
          "head",
          "bold",
          "italic",
          "underline",
          "strikeThrough",
          "foreColor",
          "backColor",
          "list",
          "justify",
          "quote",
          "table",
          "undo",
          "redo",
        ];
        editor.config.onchange = (html: string) => {
          emit("update:modelValue", html);
        };
        editor.create();
        editorMetadataElement = document.createElement("div");
        editorMetadataElement.className = "document-metadata";
        editorElement.value.querySelector(".w-e-text-container")?.before(editorMetadataElement);
        setEditorMetadata(props.metadata);
        setEditorHtml(props.modelValue);
      });
    });

    watch(
      () => props.modelValue,
      (value) => {
        setEditorHtml(value);
      },
    );

    watch(
      () => props.metadata,
      (value) => {
        setEditorMetadata(value);
      },
    );

    onBeforeUnmount(() => {
      editor?.destroy();
      editor = null;
      editorMetadataElement = null;
    });

    return () => (
      <div class={[styles.generatedContentEditor, !props.readonly ? styles.editing : null]}>
        {props.readonly ? (
          <>
            {props.metadata ? <div class={styles.documentMetadata}>{props.metadata}</div> : null}
            <div class={styles.generatedContentView} v-html={safeContent.value} />
          </>
        ) : (
          <div ref={editorElement} />
        )}
      </div>
    );
  },
});

export default GeneratedContentEditor;
