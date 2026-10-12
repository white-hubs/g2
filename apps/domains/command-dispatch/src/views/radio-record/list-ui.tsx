import { defineComponent } from "vue";

import { Alert, Button, getCommandDispatchPcUi } from "../../pc-ui-runtime";

import styles from "./list.module.css";

export function formatTime(value: string | undefined): string {
  if (!value) {
    return "--";
  }
  const date = getCommandDispatchPcUi().dayjs(value);
  return date.isValid() ? date.format("YYYY-MM-DD HH:mm:ss") : value;
}

export const ListError = defineComponent({
  props: {
    error: { type: String, default: "" },
    loading: { type: Boolean, default: false },
  },
  emits: ["retry"],
  setup(props, { emit }) {
    return () =>
      props.error ? (
        <Alert class={styles.error} type="error" showIcon message="加载失败" description={props.error}>
          {{
            action: () => (
              <Button size="small" loading={props.loading} onClick={() => emit("retry")}>
                重试
              </Button>
            ),
          }}
        </Alert>
      ) : null;
  },
});
