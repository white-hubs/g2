import { createFakeDomainContext } from "@g2-composition/contract";
import { ZhConfigProvider } from "@g2-platform/pc-ui";
import { createApp, h } from "vue";
import { createRouter, createWebHistory, RouterView } from "vue-router";

import { createFileClient } from "../../../../clients/file/src/client";
import { createMessageClient } from "../../../../clients/message/src/client";
import { createOuaaClient } from "../../../../clients/ouaa/src/client";
import { createSafetyPersonnelClient } from "../../../../clients/safety-personnel/src/client";
import { createHttpClient } from "../../../../platforms/http/src/create-http-client";
import domain from "../../src/domain";
const http = createHttpClient({ getAuthHeaders: () => ({ Authorization: "Bearer ui-fixture" }), baseUrl: location.origin });
const clients: Record<string, unknown> = {
  safetyPersonnelClient: createSafetyPersonnelClient(http),
  messageClient: createMessageClient(http),
  fileClient: createFileClient(http),
  ouaaClient: createOuaaClient(http),
};
const context = createFakeDomainContext({
  loadPlatform: async () => ({}),
  ensureClient: async <T>(name: string) => clients[name] as T,
});
const router = createRouter({ history: createWebHistory(), routes: domain.routes });
const app = createApp({ render: () => h(ZhConfigProvider, null, () => h(RouterView)) });
await domain.install?.(app, context, {});
app.use(router);
await router.isReady();
app.mount("#app");
