import Slider from "ant-design-vue/es/slider";
import { defineComponent, nextTick, onBeforeUnmount, onMounted, reactive } from "vue";

import { InspectMapRuntime } from "./inspect-map-runtime";
import { getDailyInspectionContext } from "@/domain-context";
import { Button, Input, InputNumber, PageLayout, message } from "@/pc-ui-runtime";

import styles from "./inspect-map-config.module.css";

const MAP_CONTAINER_ID = "daily-inspection-map-config";
const DICT_CODE = "DAILY_INSPECTION_MAP_CONFIG";
const DEFAULT_CENTER = { lng: 116.397428, lat: 39.90923 };
const DEFAULT_ROTATION = 0;
const DEFAULT_ZOOM = 14;
const DEFAULT_RADIUS = 0;
const CONFIG_CODES = ["lnglat", "rotation", "zoom", "radius"] as const;

type MapConfigCode = (typeof CONFIG_CODES)[number];

interface DictRow {
  id: string;
  name: string;
  code: string;
  remarks: string;
  version: string;
  flag: boolean;
  variable: string;
  itemCode: string;
}

type MapConfig = Record<MapConfigCode, DictRow>;

interface DictionaryClient {
  getOrCreateDictionaryItem(params: { code: string; remarks?: string }): Promise<unknown>;
  getDictionaryByItem(params: { itemCode: string; code?: string }): Promise<unknown>;
  createDataDictionary(params: DictRow): Promise<unknown>;
  updateDataDictionary(params: DictRow): Promise<unknown>;
}

function asRecords(value: unknown): Record<string, unknown>[] {
  let current: unknown = value;
  for (let i = 0; i < 3; i += 1) {
    if (Array.isArray(current)) {
      return current.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
    }
    if (current && typeof current === "object" && "data" in current) {
      current = (current as { data: unknown }).data;
      continue;
    }
    break;
  }
  return [];
}

function createConfigItem(code: MapConfigCode, variable: string): DictRow {
  const nameMap: Record<MapConfigCode, string> = {
    lnglat: "中心坐标",
    rotation: "旋转角度",
    zoom: "放大层级",
    radius: "有效范围",
  };
  return {
    id: "",
    name: nameMap[code],
    code,
    remarks: "",
    version: "0",
    flag: false,
    variable,
    itemCode: DICT_CODE,
  };
}

function createDefaultConfig(): MapConfig {
  return {
    lnglat: createConfigItem("lnglat", `${DEFAULT_CENTER.lng},${DEFAULT_CENTER.lat}`),
    rotation: createConfigItem("rotation", String(DEFAULT_ROTATION)),
    zoom: createConfigItem("zoom", String(DEFAULT_ZOOM)),
    radius: createConfigItem("radius", String(DEFAULT_RADIUS)),
  };
}

function parseCenter(value: string | undefined): { lng: number; lat: number } {
  const [lng, lat] = String(value || "")
    .split(",")
    .map(Number);
  if (Number.isFinite(lng) && Number.isFinite(lat)) return { lng, lat };
  return DEFAULT_CENTER;
}

function parseFiniteNumber(value: string | number | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDictRow(raw: Record<string, unknown> | undefined, fallback: DictRow): DictRow {
  if (!raw) return fallback;
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? fallback.name),
    code: String(raw.code ?? fallback.code),
    remarks: String(raw.remarks ?? ""),
    version: String(raw.version ?? "0"),
    flag: Boolean(raw.flag),
    variable: String(raw.variable ?? fallback.variable),
    itemCode: String(raw.itemCode ?? DICT_CODE),
  };
}

async function getDictionaryClient(): Promise<DictionaryClient> {
  return getDailyInspectionContext().ensureClient<DictionaryClient>("dictionaryClient");
}

export const InspectMapConfig = defineComponent({
  name: "DailyInspectionMapConfig",
  setup() {
    const mapRuntime = new InspectMapRuntime();
    let disposed = false;
    const state = reactive({
      mapConfig: createDefaultConfig(),
      addressValue: "",
      subLoading: false,
      radius: DEFAULT_RADIUS,
      rotation: DEFAULT_ROTATION,
      zoom: DEFAULT_ZOOM,
    });

    const getCenter = (): { lng: number; lat: number } => parseCenter(state.mapConfig.lnglat.variable);

    const drawCircle = (): void => {
      mapRuntime.clearCircles();
      const radius = parseFiniteNumber(state.radius, DEFAULT_RADIUS);
      if (radius <= 0) return;
      mapRuntime.addCircle({ center: getCenter(), radius });
    };

    const drawMarker = async (lng: number, lat: number): Promise<void> => {
      mapRuntime.clearMarkers();
      mapRuntime.addMarker({ lng, lat });
      await mapRuntime.setCenter(lng, lat);
    };

    const loadMapKeys = async (): Promise<void> => {
      try {
        const client = await getDictionaryClient();
        const rows = asRecords(await client.getDictionaryByItem({ itemCode: "THIRD_SERVICE", code: "gdMap" }));
        const variable = String(rows[0]?.variable ?? "");
        if (!variable) {
          mapRuntime.configureKeys(null);
          return;
        }
        const parsed = JSON.parse(variable) as { webKey?: string; securityJsCode?: string };
        if (parsed.webKey) {
          mapRuntime.configureKeys({ webKey: parsed.webKey, securityJsCode: parsed.securityJsCode });
        }
      } catch {
        mapRuntime.configureKeys(null);
      }
    };

    const syncMapFromState = async (): Promise<void> => {
      const center = getCenter();
      state.radius = parseFiniteNumber(state.mapConfig.radius.variable, DEFAULT_RADIUS);
      state.rotation = parseFiniteNumber(state.mapConfig.rotation.variable, DEFAULT_ROTATION);
      state.zoom = parseFiniteNumber(state.mapConfig.zoom.variable, DEFAULT_ZOOM);
      try {
        const resultAddr = await mapRuntime.getAddressByLngLat(center.lng, center.lat);
        if (!disposed) state.addressValue = resultAddr.address;
      } catch {
        if (!disposed) state.addressValue = `${center.lng},${center.lat}`;
      }
      mapRuntime.clearMarkers();
      mapRuntime.addMarker(center);
      await mapRuntime.setZoom(state.zoom);
      mapRuntime.setRotation(state.rotation);
      await mapRuntime.setCenter(center.lng, center.lat);
      drawCircle();
    };

    const initMapConfig = async (): Promise<void> => {
      const client = await getDictionaryClient();
      const res = asRecords(await client.getDictionaryByItem({ itemCode: DICT_CODE }));
      const defaults = createDefaultConfig();
      state.mapConfig = CONFIG_CODES.reduce((config, code) => {
        const item = res.find((row) => String(row.code) === code);
        config[code] = toDictRow(item, defaults[code]);
        return config;
      }, {} as MapConfig);
      await syncMapFromState();
    };

    const ensureDictionary = async (): Promise<void> => {
      const client = await getDictionaryClient();
      await client.getOrCreateDictionaryItem({ code: DICT_CODE, remarks: "巡检地图配置" });
      await initMapConfig();
    };

    const handleSearch = (): void => {
      if (!state.addressValue) {
        message.warning("请输入地址");
        return;
      }
      void mapRuntime
        .getLngLatByAddress(state.addressValue)
        .then(async (res) => {
          state.mapConfig.lnglat.variable = `${res.lng},${res.lat}`;
          await drawMarker(res.lng, res.lat);
          drawCircle();
        })
        .catch(() => {
          message.error("获取地址失败");
        });
    };

    const handleRadiusChange = (): void => {
      state.mapConfig.radius.variable = String(parseFiniteNumber(state.radius, DEFAULT_RADIUS));
      drawCircle();
    };

    const handleRotationChange = (): void => {
      state.mapConfig.rotation.variable = String(parseFiniteNumber(state.rotation, DEFAULT_ROTATION));
      mapRuntime.setRotation(state.rotation);
    };

    const handleZoomChange = (): void => {
      state.mapConfig.zoom.variable = String(parseFiniteNumber(state.zoom, DEFAULT_ZOOM));
      void mapRuntime.setZoom(state.zoom);
    };

    const handleSave = async (): Promise<void> => {
      state.subLoading = true;
      try {
        state.mapConfig.radius.variable = String(parseFiniteNumber(state.radius, DEFAULT_RADIUS));
        state.mapConfig.rotation.variable = String(parseFiniteNumber(state.rotation, DEFAULT_ROTATION));
        state.mapConfig.zoom.variable = String(parseFiniteNumber(state.zoom, DEFAULT_ZOOM));
        const client = await getDictionaryClient();
        for (const code of CONFIG_CODES) {
          const config = state.mapConfig[code];
          if (!config.id) await client.createDataDictionary(config);
          else await client.updateDataDictionary(config);
        }
        message.success("保存成功");
        await initMapConfig();
      } catch {
        message.error("保存失败");
      } finally {
        state.subLoading = false;
      }
    };

    onMounted(async () => {
      try {
        disposed = false;
        await nextTick();
        await loadMapKeys();
        if (disposed) return;
        await mapRuntime.renderMap(MAP_CONTAINER_ID, DEFAULT_CENTER, DEFAULT_ZOOM);
        if (disposed) {
          mapRuntime.destroy();
          return;
        }
        mapRuntime.onMapClick = async (event): Promise<void> => {
          if (disposed) return;
          state.mapConfig.lnglat.variable = `${event.lng},${event.lat}`;
          try {
            const result = await mapRuntime.getAddressByLngLat(event.lng, event.lat);
            if (!disposed) state.addressValue = result.address;
          } catch {
            if (!disposed) state.addressValue = `${event.lng},${event.lat}`;
          }
          await drawMarker(event.lng, event.lat);
          drawCircle();
        };
        await ensureDictionary();
        mapRuntime.invalidateSize();
        setTimeout(() => mapRuntime.invalidateSize(), 200);
      } catch {
        if (!disposed) message.error("地图加载失败");
      }
    });

    onBeforeUnmount(() => {
      disposed = true;
      mapRuntime.destroy();
    });

    const slots = {
      "layout-content": () => (
        <div class={styles.mapConfig}>
          <div class={styles.toolbar}>
            <div class={styles.control}>
              <span class={styles.label}>地址：</span>
              <Input
                class={styles.input}
                value={state.addressValue}
                placeholder="请输入位置信息"
                maxlength={999}
                onUpdate:value={(value: string) => {
                  state.addressValue = value;
                }}
              />
              <Button type="primary" onClick={handleSearch}>
                搜索定位
              </Button>
            </div>
            <div class={styles.control}>
              <span class={styles.label}>有效范围半径(米)：</span>
              <InputNumber
                class={styles.input}
                value={state.radius}
                placeholder="有效范围半径"
                min={0}
                style={{ width: "100%" }}
                onUpdate:value={(value: number | string | null) => {
                  state.radius = parseFiniteNumber(value ?? 0, DEFAULT_RADIUS);
                  handleRadiusChange();
                }}
              />
            </div>
            <div class={styles.control}>
              <span class={styles.label}>旋转角度：</span>
              <Slider
                class={styles.slider}
                value={state.rotation}
                min={0}
                max={180}
                step={0.5}
                onChange={(value: number | number[]) => {
                  state.rotation = Array.isArray(value) ? Number(value[0]) : Number(value);
                  handleRotationChange();
                }}
              />
            </div>
            <div class={styles.control}>
              <span class={styles.label}>缩放层级：</span>
              <Slider
                class={styles.slider}
                value={state.zoom}
                min={3}
                max={18}
                step={0.5}
                onChange={(value: number | number[]) => {
                  state.zoom = Array.isArray(value) ? Number(value[0]) : Number(value);
                  handleZoomChange();
                }}
              />
            </div>
          </div>
          <div id={MAP_CONTAINER_ID} class={styles.map} />
        </div>
      ),
      "footer-page": () => (
        <div class={styles.footer}>
          <Button type="primary" loading={state.subLoading} onClick={() => void handleSave()}>
            保存
          </Button>
        </div>
      ),
    };

    return () => <PageLayout title="巡检地图配置" v-slots={slots} />;
  },
});
