import { createStreamEngineClient } from "@g2-client/stream-engine/client";
import { createApp, defineComponent, reactive } from "vue";

import { ASSET_CONTROLS } from "./asset-model";
import { renderFormControl, type FormControlHost } from "./form-controls";
import type { FormSchemaItem } from "./form-schema";
import { OFFICIAL_CONTROLS, RETROFIT_CONTROLS } from "./official-retrofit-model";

const query = new URLSearchParams(location.search);
const group = query.get("group") ?? "asset";
const readonly = query.has("readonly");
const requests: string[] = [];
const values = reactive<Record<string, unknown>>({
  AreaList: { id: ["area-1"], name: "东区" },
  ConsumablesOut: [{ id: "consumable-1", code: "C-1", name: "滤芯", avgPrice: 2.5, num: 3, storeAmount: 1 }],
  DeviceSelect: [{ id: "device-1", name: "循环泵" }],
  DeviceChangeStatus: [],
  FocusWorkTypeList: { id: "focus-type-1", name: "设备巡查" },
  progress: 50,
});
Object.assign(window, { migrationQaValues: values, migrationQaRequests: requests });

const client = createStreamEngineClient({
  get: async (url) => {
    requests.push(`GET ${url}`);
    if (url.includes("custom-area/list")) return { data: [{ id: "area-1", name: "东区", children: [{ id: "area-2", name: "泵房" }] }] };
    if (url.includes("getAssemblyClassifyTree"))
      return { data: [{ id: "asset-type-1", name: "机电设备", children: [{ id: "asset-type-2", name: "水泵" }] }] };
    if (url.includes("getAssemblyClassifyPage"))
      return {
        data: {
          records: [
            { id: "source-1", name: "购入" },
            { id: "reason-1", name: "到期" },
          ],
          total: 2,
        },
      };
    if (url.includes("storehouse/list")) return { data: [{ id: "warehouse-1", name: "总仓" }] };
    if (url.includes("consumable-category/tree")) return { data: [{ id: "consumable-type-1", name: "耗材" }] };
    if (url.includes("getPropertyDetailedPage"))
      return { data: { records: [{ id: "asset-1", serialNumber: "AS-1", name: "循环泵", typeName: "机电设备" }], total: 1 } };
    if (url.includes("outsource/device/list"))
      return {
        data: {
          records: [{ deviceId: "device-2", deviceCode: "D-2", deviceName: "排水泵", deviceCategory: "机电", areaName: "泵房" }],
          total: 1,
        },
      };
    if (url.includes("consumable/page"))
      return { data: { records: [{ id: "consumable-1", code: "C-1", name: "滤芯", avgPrice: 2.5, storeNum: 10 }], total: 1 } };
    if (url.includes("officialSeal/widget/list")) return { data: [{ id: "seal-1", name: "公章" }] };
    if (url.includes("focusWork/category/weight/list")) return { data: [{ id: "focus-type-1", name: "设备巡查" }] };
    if (url.includes("focusWork/weight/status/list")) return { data: [{ id: "active", name: "进行中" }] };
    if (url.includes("focusWork/weight/list")) return { data: [{ id: "focus-1", name: "巡查水泵" }] };
    if (url.includes("focusWork/weight/focus-type-1/requirement")) return { data: { id: "requirement-1", name: "每日巡查" } };
    if (url.includes("focusWork/weight/focus-1/completeTime")) return { data: { id: "time-1", name: "2026-10-01" } };
    if (url.includes("focusWork/weight/focus-1")) return { data: { id: "focus-1", name: "巡查水泵" } };
    if (url.includes("iot/north/device/detail"))
      return {
        data: {
          productPropVoList: [{ propCode: "temperature", propName: "温度", unitName: "℃" }],
          snapshots: [{ key: "temperature", value: 26 }],
        },
      };
    return { data: [] };
  },
  post: async (url) => {
    requests.push(`POST ${url}`);
    if (url.includes("device/instance/page")) return { data: { records: [{ id: "device-1", name: "循环泵" }], total: 1 } };
    return { data: [] };
  },
  put: async () => ({ data: {} }),
  delete: async () => ({ data: {} }),
});

const catalogs = {
  asset: ASSET_CONTROLS,
  official: OFFICIAL_CONTROLS,
  retrofit: RETROFIT_CONTROLS,
  outsource: [{ id: "DeviceSelect", title: "委外维修设备", name: "DeviceSelect", valueType: "Object" }],
};
const catalog = catalogs[group as keyof typeof catalogs] ?? ASSET_CONTROLS;
const items: FormSchemaItem[] = catalog.map((control) => ({
  id: control.name,
  name: control.name,
  title: control.title,
  props: {
    ...(control.name === "AreaList" ? { api: "/mdata/custom-area/list" } : {}),
    ...(control.name === "DeviceSelect" && group === "outsource" ? { outSource: true } : {}),
    ...(["FocusWorkRequirement", "DeviceStatus", "DeviceChangeStatus"].includes(control.name)
      ? { params: control.name === "FocusWorkRequirement" ? "FocusWorkTypeList" : "DeviceSelect" }
      : {}),
    ...(control.name === "WorkList" ? { params: "progress" } : {}),
  },
}));

createApp(
  defineComponent({
    setup() {
      const host: FormControlHost = {
        client,
        businessType:
          group === "asset"
            ? "PROPERTY_MANAGEMENT"
            : group === "official"
              ? "OFFICIAL_MANAGEMENT"
              : group === "outsource"
                ? "OUTSOURCE_REPAIR"
                : "RETROFIT",
        formValues: values,
        rootFormValues: values,
        schemaItems: items,
        readonly,
        setRelatedValue: (key, next) => {
          values[key] = next;
        },
      };
      return () => (
        <main style={{ padding: "24px", fontFamily: "Arial, sans-serif", maxWidth: "1180px", margin: "auto" }}>
          <h1 style={{ fontSize: "20px" }}>{group} 组件运行态</h1>
          {items.map((item) => (
            <section
              key={String(item.id)}
              data-control={item.name}
              style={{
                display: "grid",
                gridTemplateColumns: "170px minmax(0, 1fr)",
                gap: "16px",
                padding: "18px 0",
                borderBottom: "1px solid #ddd",
              }}
            >
              <strong>{item.title}</strong>
              <div>
                {renderFormControl(
                  item,
                  values[String(item.id)],
                  (next) => {
                    values[String(item.id)] = next;
                  },
                  host,
                )}
              </div>
            </section>
          ))}
        </main>
      );
    },
  }),
).mount("#app");
