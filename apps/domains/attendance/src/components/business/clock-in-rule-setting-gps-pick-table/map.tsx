import type { MapConfig } from "@g2-platform/pc-map";
import { Spin, message } from "@g2-platform/pc-ui";
import { defineComponent, onBeforeUnmount, onMounted, ref } from "vue";

import { getTenantInfo } from "@/api/ouaa";
import { getDictionaryByItem } from "@/api/selection";
import { getDomainContext } from "@/domain-context";

let mapSequence = 0;
export const Map = defineComponent({
  emits: ["click"],
  setup(_, { emit }) {
    const mapId = `attendance-location-map-${++mapSequence}`;
    const loading = ref(true);
    let cubeMap: InstanceType<(typeof import("@g2-platform/pc-map"))["InteractiveMap"]> | undefined;
    let disposed = false;
    let request = 0;
    onBeforeUnmount(() => {
      disposed = true;
      request++;
      cubeMap?.destroy();
    });
    onMounted(async () => {
      try {
        const tenant = getDomainContext().getAuthHeaders().tenant;
        const [tenantInfo, tdConfig] = await Promise.all([
          getTenantInfo(tenant),
          getDictionaryByItem({ itemCode: "THIRD_SERVICE", code: "TD_MAP" }),
        ]);
        const mapType = tdConfig[0]?.variable ? "TD_MAP" : "gdMap";
        const configs = mapType === "TD_MAP" ? tdConfig : await getDictionaryByItem({ itemCode: "THIRD_SERVICE", code: "gdMap" });
        if (!configs[0]?.variable) {
          throw new Error("未获取到地图配置");
        }
        const config = JSON.parse(configs[0].variable) as MapConfig;
        if (disposed) {
          return;
        }
        const { InteractiveMap } = await getDomainContext().loadRuntimeCommon<typeof import("@g2-platform/pc-map")>("pcMap", "index");
        const map = new InteractiveMap({ ...config, mapType });
        cubeMap = map;
        await map.renderMap(mapId);
        if (disposed) {
          map.destroy();
          return;
        }
        if (tenantInfo.data.lntAndLat) {
          const [lng, lat] = tenantInfo.data.lntAndLat.split(",").toReversed().map(Number);
          map.setCenter(lng, lat);
          map.addMarker({ position: { lng, lat } });
        }
        map.onMapClick = async (point) => {
          const version = ++request;
          map.clearMap();
          map.setCenter(point.lng, point.lat);
          map.addMarker({ position: { lng: point.lng, lat: point.lat } });
          loading.value = true;
          try {
            const address = await map.getAddressByLntLat(point.lng, point.lat);
            if (disposed || version !== request) {
              return;
            }
            emit("click", { lng: point.lng, lat: point.lat, address: address.address });
          } catch (error) {
            if (!disposed) {
              message.error(error instanceof Error ? error.message : "地址解析失败");
            }
          } finally {
            if (version === request) {
              loading.value = false;
            }
          }
        };
        map.registerMapClickEvent();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "地图加载失败");
      } finally {
        loading.value = false;
      }
    });
    return () => (
      <Spin spinning={loading.value}>
        <div id={mapId} style="width:100%;height:450px" />
      </Spin>
    );
  },
});
