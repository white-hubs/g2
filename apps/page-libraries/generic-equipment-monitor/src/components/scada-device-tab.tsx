import { defineComponent, computed } from "vue";

/**
 * 监测详情 SCADA Tab：拼 viewer iframe（与 pcScada CubeScada iframe 模式一致）。
 * 避免页面库静态依赖 scada vendor 类型图。
 */
export const ScadaDeviceTab = defineComponent({
  name: "GemScadaDeviceTab",
  props: {
    deviceId: { type: String, required: true },
    scadaPageId: { type: String, default: "" },
    viewerBase: { type: String, default: "" },
  },
  setup(props) {
    const iframeSrc = computed(() => {
      if (!props.scadaPageId) return "";
      const base = (props.viewerBase || "").replace(/\/$/, "");
      const params = new URLSearchParams();
      params.set("page", props.scadaPageId);
      params.set("vars", JSON.stringify({ deviceId: props.deviceId }));
      return `${base}/viewer?${params.toString()}`;
    });

    return () => (
      <div>
        {!props.scadaPageId ? (
          <p style={{ color: "#c00" }}>未配置 scadaPageId（宿主 Profile config 可注入）</p>
        ) : iframeSrc.value ? (
          <iframe src={iframeSrc.value} title="SCADA" style={{ width: "100%", height: "420px", border: 0 }} />
        ) : null}
      </div>
    );
  },
});
