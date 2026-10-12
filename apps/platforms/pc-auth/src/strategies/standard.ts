import type { AuthStrategy } from "../auth-strategy";

/** 标准账密登录本身走独立的登录表单提交（见 LoginPage.vue），不需要在 tryLogin 里做静默尝试，这里返回 null 即可。 */
export const standardStrategy: AuthStrategy = {
  id: "standard",
  async tryLogin() {
    return null;
  },
};
