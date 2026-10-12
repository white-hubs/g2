import { createFakeDomainContext } from "@g2-composition/contract";
import { ZhConfigProvider } from "@g2-platform/pc-ui";
import { createApp, h } from "vue";
import { createRouter, createWebHistory, RouterView } from "vue-router";

import { createFixture } from "../../../../page-libraries/safety-personnel-management/tests/fixtures";
import domain from "../../src/domain";
const fixture = createFixture();
declare global {
  interface Window {
    apiCalls: typeof fixture.calls;
  }
}
window.apiCalls = fixture.calls;
const auxiliary: Record<string, () => Promise<unknown>> = {
  fileClient: fixture.dependencies.file,
  ouaaClient: fixture.dependencies.ouaa,
  alarmCenterClient: fixture.dependencies.alarm,
  dictionaryClient: fixture.dependencies.dictionary,
};
const context = createFakeDomainContext({
  loadPlatform: async () => ({}),
  ensureClient: async <T>(name: string) => {
    return (name === "safetyPersonnelClient" ? fixture.client : await auxiliary[name]?.()) as T;
  },
});
const router = createRouter({ history: createWebHistory(), routes: domain.routes });
const app = createApp({ render: () => h(ZhConfigProvider, null, () => h(RouterView)) });
await domain.install?.(app, context, {});
app.use(router);
await router.isReady();
app.mount("#app");
