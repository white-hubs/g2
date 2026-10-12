import { createStreamEngineClient } from "@g2-client/stream-engine/client";
import { createApp, h } from "vue";

import StreamEngineRender from "./pages/stream-engine-render";

const query = new URLSearchParams(location.search);
const mode = query.get("mode") ?? "empty";
const requests: Array<{ method: string; url: string; body?: unknown }> = [];
const submissions: unknown[] = [];
Object.assign(window, { consumablesQaRequests: requests, consumablesQaSubmissions: submissions });

const stock = [
  {
    id: "cons-1",
    name: "滤芯",
    code: "CO-001",
    model: "10寸",
    brand: "品牌A",
    categoryName: "日常耗材",
    unit: "个",
    storeNum: 5,
    useLimit: 0,
    avgPrice: 7.35,
  },
  {
    id: "cons-2",
    name: "零库存手套",
    code: "CO-002",
    model: "M",
    brand: "品牌B",
    categoryName: "日常耗材",
    unit: "双",
    storeNum: 0,
    useLimit: 0,
    avgPrice: 2.5,
  },
];
const savedRows =
  mode === "existing"
    ? [{ ...stock[0], num: 2, storeAmount: 14.7, flowConvertData: false }]
    : mode === "shortage"
      ? [{ ...stock[0], num: 6, storeAmount: 44.1, flowConvertData: false }]
      : mode === "zero"
        ? [{ ...stock[1], num: 1, storeAmount: 2.5, flowConvertData: false }]
        : [];
const schema = [
  {
    id: "consumables",
    name: "ConsumablesOut",
    title: "耗材领用",
    width: 100,
    show: true,
    props: { required: false, showPrint: true, hideLabel: true, defaultValue: savedRows },
  },
];
const process = { id: "root", props: { formPerms: [{ id: "consumables", perm: "E" }] } };
const client = createStreamEngineClient({
  get: async (url) => {
    requests.push({ method: "GET", url });
    const request = new URL(url, location.origin);
    if (request.pathname === "/api/flow/form-flow-business/type")
      return {
        data: {
          id: "consumables-flow",
          callType: "INTERNAL",
          application: "FAULT",
          applicationName: "故障报修",
          businessType: "FAULT",
          formJson: JSON.stringify(schema),
          flowJson: JSON.stringify(process),
        },
      };
    if (request.pathname === "/api/property/consumable-store-stock/page") {
      const records = stock.filter((row) => row.name.includes(request.searchParams.get("keyword") ?? ""));
      return { data: { records, total: records.length } };
    }
    if (request.pathname === "/api/property/consumable-category/tree") return { data: [{ id: "cat-1", name: "日常耗材" }] };
    return { data: [] };
  },
  post: async (url, body) => {
    requests.push({ method: "POST", url, body });
    if (url === "/api/flow/form-flows/first/submit") submissions.push(body);
    return { data: {} };
  },
  put: async () => ({}),
  delete: async () => ({}),
});

createApp({
  render: () =>
    h(StreamEngineRender, {
      title: "故障报修",
      type: "add",
      businessType: "FAULT",
      getClient: async () => client,
    }),
}).mount("#app");
