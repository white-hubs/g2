import { defineComponent, onBeforeUnmount, onMounted, ref, type PropType } from "vue";

import styles from "./alarm-modal.module.css";

export const HeadquartersIframeOverlay = defineComponent({
  props: {
    iframeUrl: { type: String, required: true },
    alarmDetails: { type: Object as PropType<Record<string, unknown>>, required: true },
    visible: { type: Boolean, default: false },
    onClose: { type: Function as PropType<() => void>, required: true },
    onReady: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const iframeRef = ref<HTMLIFrameElement | null>(null);

    const pushAlarmMessage = (): void => {
      iframeRef.value?.contentWindow?.postMessage({ type: "cube-alarm-message", data: JSON.stringify(props.alarmDetails) }, "*");
    };

    const handleMessage = (event: MessageEvent): void => {
      const type = (event.data as { type?: string })?.type;
      if (type === "cube-alarm-modal-ready") {
        pushAlarmMessage();
      } else if (type === "cube-alarm-modal-completed") {
        props.onReady();
      } else if (type === "cube-alarm-modal-close") {
        props.onClose();
      }
    };

    onMounted(() => {
      window.addEventListener("message", handleMessage);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("message", handleMessage);
    });

    return (): JSX.Element => (
      <div class={styles.mask}>
        <iframe
          ref={iframeRef}
          class={styles["hq-iframe"]}
          src={props.iframeUrl}
          allowfullscreen
          allow="autoplay"
          style={{ display: props.visible ? "block" : "none" }}
        />
      </div>
    );
  },
});
