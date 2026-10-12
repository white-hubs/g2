import { type PropType, defineComponent, onMounted, ref } from "vue";

import { getEnabledStrategies } from "../auth-strategy";

import "./VerifyAuthPage.css";

export default defineComponent({
  name: "VerifyAuthPage",
  props: {
    onLoginSuccess: {
      type: Function as PropType<(result: { token: string; tenant: string; refreshToken?: string }) => void>,
      required: true,
    },
  },
  emits: ["go-login"],
  setup(props, { emit }) {
    const loading = ref(true);

    onMounted(async () => {
      const query = new URLSearchParams(globalThis.location.search);
      for (const strategy of getEnabledStrategies()) {
        const result = await strategy.tryLogin({ query });
        if (result) {
          props.onLoginSuccess(result);
          return;
        }
      }
      loading.value = false;
    });

    return () => (
      <div class="pc-auth-verify">
        {loading.value ? (
          <p>鉴权验证中…</p>
        ) : (
          <div>
            <p>抱歉，您暂无权限访问此页面。</p>
            <button onClick={() => emit("go-login")}>回登录页</button>
          </div>
        )}
      </div>
    );
  },
});
