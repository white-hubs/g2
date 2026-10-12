import { createOuaaClient } from "@g2-client/ouaa/client";
import { createStreamEngineClient } from "@g2-client/stream-engine/client";
import { createApp, h } from "vue";

import WorkOrderDesign from "./pages/work-order-design";

const query = new URLSearchParams(location.search);
const applicationCode = query.get("application") ?? "WORK_PERMIT_MANAGE";
sessionStorage.setItem(
  "GH-currentApplication",
  JSON.stringify({ code: applicationCode, name: applicationCode === "WORK_PERMIT_MANAGE" ? "作业管理" : "故障报修" }),
);
const requests: Array<{ method: string; url: string; body?: unknown; status?: number }> = [];
const navigations: Array<{ page: string }> = [];
Object.assign(window, { workOrderQa: { requests, navigations } });

async function request(method: string, url: string, body?: unknown): Promise<unknown> {
  const entry = { method, url, body, status: undefined as number | undefined };
  requests.push(entry);
  const response = await fetch(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  });
  entry.status = response.status;
  if (!response.ok) throw new Error(`${method} ${url} ${response.status}`);
  return response.json();
}
const http = {
  get: (url: string) => request("GET", url),
  post: (url: string, body?: unknown) => request("POST", url, body),
  put: (url: string, body?: unknown) => request("PUT", url, body),
  delete: (url: string) => request("DELETE", url),
};
const client = createStreamEngineClient(http);
const ouaa = createOuaaClient(http);

createApp({
  render: () =>
    h(WorkOrderDesign, {
      title: "工单流程设计",
      ...(query.has("propsMode") ? { formId: "custom1", formType: "CUSTOM_FORM", isCopy: true, groupId: 8, applicationCode } : {}),
      getClient: async () => client,
      getOuaaClient: async () => ouaa,
      onNavigate: (payload: { page: string }) => {
        navigations.push(payload);
      },
      onClose: () => {
        navigations.push({ page: "closed" });
      },
    }),
}).mount("#app");
