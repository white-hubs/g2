import { defineComponent } from "vue";

import "./CheckPasswordModal.css";

export default defineComponent({
  name: "CheckPasswordModal",
  props: {
    visible: { type: Boolean, required: true },
    forced: { type: Boolean, required: true },
  },
  emits: ["dismiss", "go-modify"],
  setup(props, { emit }) {
    function dismiss(): void {
      emit("dismiss");
    }

    function goModify(): void {
      emit("go-modify");
    }

    return () =>
      props.visible ? (
        <div class="pc-auth-password-modal" role="alertdialog">
          <p>密码过期，请及时修改！</p>
          {!props.forced ? <button onClick={dismiss}>暂不修改</button> : null}
          <button onClick={goModify}>去修改</button>
        </div>
      ) : null;
  },
});
