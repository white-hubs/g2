import type { DeviceCenterClient } from "@g2-client/device-center/client";
import { defineComponent, onMounted, ref, type PropType } from "vue";

/** 动环专业面板：按设备属性拉取 UPS / 温湿度 / 电池 / 消防 / 电力分组展示。 */
export const RotatingRingPanel = defineComponent({
  name: "GemRotatingRingPanel",
  props: {
    deviceId: { type: String, required: true },
    getDeviceClient: { type: Function as PropType<() => Promise<DeviceCenterClient>>, required: true },
  },
  setup(props) {
    const tab = ref<"ups" | "climate" | "battery" | "fire" | "power">("ups");
    const attrs = ref<Record<string, unknown>[]>([]);
    const error = ref("");

    async function load(): Promise<void> {
      if (!props.deviceId) return;
      try {
        const client = await props.getDeviceClient();
        const raw = await client.getDeviceAttribute(props.deviceId);
        const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
        const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
        const list = (data.list || data.dataArr || []) as Record<string, unknown>[];
        attrs.value = Array.isArray(list) ? list : [];
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
      }
    }

    onMounted(() => {
      void load();
    });

    function filterByTab(items: Record<string, unknown>[]): Record<string, unknown>[] {
      const keywords: Record<typeof tab.value, string[]> = {
        ups: ["ups", "市电", "负载"],
        climate: ["温", "湿", "climate", "temp"],
        battery: ["电池", "battery", "soc"],
        fire: ["烟", "火", "fire"],
        power: ["电", "电压", "电流", "power", "kw"],
      };
      const keys = keywords[tab.value];
      const matched = items.filter((item) => {
        const blob = `${item.attributeName || ""}${item.attributeCode || ""}`.toLowerCase();
        return keys.some((k) => blob.includes(k.toLowerCase()));
      });
      return matched.length ? matched : items.slice(0, 12);
    }

    return () => (
      <section>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          {(
            [
              ["ups", "UPS"],
              ["climate", "温湿度"],
              ["battery", "电池"],
              ["fire", "消防"],
              ["power", "电力"],
            ] as const
          ).map(([key, label]) => (
            <button type="button" key={key} onClick={() => (tab.value = key)} style={{ fontWeight: tab.value === key ? 700 : 400 }}>
              {label}
            </button>
          ))}
        </div>
        {error.value ? <p style={{ color: "#c00" }}>{error.value}</p> : null}
        <ul>
          {filterByTab(attrs.value).map((item, i) => (
            <li key={String(item.attributeCode || i)}>
              {String(item.attributeName || item.attributeCode || "--")}: {String(item.value ?? "--")} {String(item.unitName || "")}
            </li>
          ))}
        </ul>
      </section>
    );
  },
});
