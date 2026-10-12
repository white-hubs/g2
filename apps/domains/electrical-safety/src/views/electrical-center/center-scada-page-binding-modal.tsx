import { Modal, Select, message } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, shallowRef, watch } from "vue";

import type { ScadaPageSummary } from "@/utils/scada-pages";

export const CenterScadaPageBindingModal = defineComponent({
  name: "CenterScadaPageBindingModal",
  props: {
    open: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
    pages: { type: Array as PropType<ScadaPageSummary[]>, default: () => [] },
    currentPageId: { type: String, default: "" },
  },
  emits: ["cancel", "submit"],
  setup(props, { emit }) {
    const pendingPageId = shallowRef<string | undefined>();

    watch(
      () => props.open,
      (open) => {
        if (open) {
          pendingPageId.value = props.currentPageId || undefined;
        }
      },
    );

    const submit = (): void => {
      if (!pendingPageId.value) {
        message.warning("请选择要绑定的多设备二维组态");
        return;
      }
      emit("submit", pendingPageId.value);
    };

    return (): JSX.Element => (
      <Modal
        okText="确定"
        cancelText="取消"
        open={props.open}
        title={props.currentPageId ? "切换电气中心二维组态" : "绑定电气中心二维组态"}
        width="520px"
        wrapClassName="electrical-viewport-modal"
        confirmLoading={props.submitting}
        destroyOnClose
        onCancel={() => emit("cancel")}
        onOk={submit}
      >
        <div class="center-scada-binding-form">
          <span>多设备组态页面</span>
          <Select
            showSearch
            optionFilterProp="label"
            value={pendingPageId.value}
            options={props.pages.map((page) => ({
              label: `${page.name}（${page.bindableElements?.length ?? 0} 个待绑定图元）`,
              value: page.id,
            }))}
            placeholder="请选择电气中心组态"
            disabled={props.submitting}
            style={{ width: "100%" }}
            onUpdate:value={(inputValue) => {
              const value = inputValue as string | undefined;
              return (pendingPageId.value = value);
            }}
          />
          <small>绑定页面后，将继续为画布中标记“需要运行端绑定设备”的图元绑定设施房。</small>
        </div>
      </Modal>
    );
  },
});
