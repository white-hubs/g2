import { defineComponent, reactive, shallowRef, type PropType } from "vue";

import type { MultiLinePanelStyle } from "../fire-config-management.model";
import { usePcModal } from "@/pc-ui-runtime";
import { message } from "@/pc-ui-runtime";

import styles from "../fire-config-management.module.css";

const lightColors = ["#00b42a", "#f53f3f", "#ff7d00"];

export const MultiLineStyleModal = defineComponent({
  name: "MultiLineStyleModal",
  props: {
    save: { type: Function as PropType<(config: MultiLinePanelStyle) => Promise<boolean>>, required: true },
  },
  emits: ["saved"],
  setup: (props, { emit, expose }) => {
    const mode = shallowRef<2 | 3>(3);
    const lightButtons = reactive([
      { code: "", name: "启动反馈" },
      { code: "", name: "故障" },
      { code: "", name: "运行" },
    ]);

    const [PcModal, modalApi] = usePcModal({
      title: "多线盘样式配置",
      width: "720px",
      centered: true,
      closeOnClickModal: false,
      onConfirm: async () => {
        const activeButtons = lightButtons.slice(0, mode.value);
        if (activeButtons.some((button) => !button.code.trim())) {
          message.warning("指示灯配置缺少按钮编码，请重新加载后再试");
          return;
        }
        const nextConfig: MultiLinePanelStyle = {
          mode: mode.value,
          lightButtons: lightButtons.map((button) => ({ ...button })) as MultiLinePanelStyle["lightButtons"],
        };
        modalApi.setConfirmLoading(true);
        try {
          if (!(await props.save(nextConfig))) return;
          emit("saved", nextConfig);
          modalApi.close();
        } finally {
          modalApi.setConfirmLoading(false);
        }
      },
    });

    const openModal = (config: MultiLinePanelStyle): void => {
      mode.value = config.mode;
      config.lightButtons.forEach((button, index) => {
        lightButtons[index] = { ...button };
      });
      modalApi.open();
    };

    expose({ openModal });

    const styleOption = (optionMode: 2 | 3, title: string, description: string) => (
      <button
        type="button"
        class={[styles["panel-style-option"], mode.value === optionMode && styles["panel-style-option-active"]]}
        onClick={() => (mode.value = optionMode)}
      >
        <div class={styles["panel-light-preview"]}>
          {lightColors.slice(0, optionMode).map((color) => (
            <span key={color} style={{ backgroundColor: color }} />
          ))}
        </div>
        <strong>{title}</strong>
        <span>{description}</span>
      </button>
    );

    return () => (
      <PcModal
        v-slots={{
          default: () => (
            <div>
              <div class={styles["style-description"]}>选择指示灯数量，名称由主机指示灯按钮配置提供。</div>
              <div class={styles["panel-style-options"]}>
                {styleOption(3, "3 指示灯", "启动反馈 + 故障 + 运行")}
                {styleOption(2, "2 指示灯", "启动反馈 + 故障")}
              </div>
              <div class={styles["light-name-grid"]}>
                {lightButtons.slice(0, mode.value).map((button, index) => (
                  <div key={button.code || index} class={styles["light-name-field"]}>
                    <span>
                      <i style={{ backgroundColor: lightColors[index] }} />第 {index + 1} 盏灯名称
                    </span>
                    <strong class={styles["light-name-value"]}>{button.name || "--"}</strong>
                  </div>
                ))}
              </div>
              <div class={styles["style-tip"]}>保存时提交所选指示灯按钮的编码；3 指示灯模式下，第 3 盏灯名称作为点位反馈参数名称。</div>
            </div>
          ),
        }}
      />
    );
  },
});
