import { Button, Empty, PageLayout, Spin, TabPane, Tabs } from "@g2-platform/pc-ui";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncRuntimeCommonComponent } from "@g2-runtime/common-loader/vue";
import { defineComponent, onMounted, ref, type PropType } from "vue";

import DeviceBasicData from "../components/device-basic-data";
import HistoryDataPanel from "../components/history-data-panel";
import { ScadaDeviceTab } from "../components/scada-device-tab";
import { GEM_PAGE_KEYS } from "../page-keys";
import type { GemPageProps } from "./page-props";

import styles from "./equipment-monitor-detail.module.css";

type CubePlayerComponent = (typeof import("@g2-platform/pc-player"))["CubePlayer"];
const CubePlayer = defineAsyncRuntimeCommonComponent<CubePlayerComponent>(loadRuntimeCommon, "pcPlayer", "index", "CubePlayer");

type VideoItem = {
  id?: string;
  name?: string;
  token?: string;
  thirdPartyId?: string;
};

function unwrapList(raw: unknown): VideoItem[] {
  if (Array.isArray(raw)) return raw as VideoItem[];
  if (raw && typeof raw === "object") {
    const root = raw as Record<string, unknown>;
    const data = root.data !== undefined ? root.data : raw;
    if (Array.isArray(data)) return data as VideoItem[];
  }
  return [];
}

export default defineComponent({
  name: "GemEquipmentMonitorDetail",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getDeviceClient: { type: Function as PropType<GemPageProps["getDeviceClient"]>, required: true },
    deviceId: { type: String, default: "" },
    title: { type: String, default: "设备信息" },
    scadaPageId: { type: String, default: "" },
    scadaViewerBase: { type: String, default: "" },
    applicationCode: { type: String, default: "" },
  },
  setup(props) {
    const activeKey = ref("1");
    const videos = ref<VideoItem[]>([]);
    const videosLoading = ref(false);
    const deviceProductId = ref("");

    const goBack = () => {
      props.onNavigatePage({ page: GEM_PAGE_KEYS.equipmentMonitorList });
    };

    const loadVideos = async () => {
      if (!props.deviceId || !props.getDeviceClient) return;
      videosLoading.value = true;
      try {
        const client = await props.getDeviceClient();
        videos.value = unwrapList(await client.getDeviceAssociatedVideos(props.deviceId));
        const info = (await client.getDeviceInfo(props.deviceId)) as Record<string, unknown>;
        const root = (info?.data && typeof info.data === "object" ? info.data : info) as Record<string, unknown>;
        const product = (root.productInfo || {}) as Record<string, unknown>;
        deviceProductId.value = String(product.id ?? product.prodId ?? product.productId ?? "");
      } catch {
        videos.value = [];
      } finally {
        videosLoading.value = false;
      }
    };

    onMounted(() => {
      void loadVideos();
    });

    const slots = {
      "layout-content": () => (
        <div class={styles.page}>
          <Tabs
            activeKey={activeKey.value}
            onUpdate:activeKey={(key: string | number) => {
              activeKey.value = String(key);
            }}
          >
            <TabPane key="1" tab="设备信息">
              <div class={styles.tabPane}>
                {props.deviceId ? (
                  <DeviceBasicData deviceId={props.deviceId} getDeviceClient={props.getDeviceClient!} />
                ) : (
                  <Empty description="缺少设备标识" />
                )}
              </div>
            </TabPane>
            <TabPane key="3" tab="历史数据">
              <div class={styles.tabPane}>
                {activeKey.value === "3" && props.deviceId ? (
                  <HistoryDataPanel deviceId={props.deviceId} getDeviceClient={props.getDeviceClient!} />
                ) : null}
              </div>
            </TabPane>
            <TabPane key="5" tab="组态">
              <div class={styles.tabPane}>
                {activeKey.value === "5" ? (
                  props.deviceId && (props.scadaPageId || deviceProductId.value) ? (
                    <ScadaDeviceTab
                      deviceId={props.deviceId}
                      scadaPageId={props.scadaPageId || deviceProductId.value}
                      viewerBase={props.scadaViewerBase}
                    />
                  ) : props.deviceId ? (
                    <Empty description="当前设备未关联产品，无法匹配二维组态" />
                  ) : (
                    <Empty description="缺少设备标识" />
                  )
                ) : null}
              </div>
            </TabPane>
            <TabPane key="4" tab="关联监控">
              <div class={styles.tabPane}>
                {videosLoading.value ? (
                  <Spin />
                ) : videos.value.length ? (
                  <div class={styles.videoBox}>
                    {videos.value.map((item, index) => (
                      <div class={styles.videoItem} key={String(item.id || index)}>
                        <span class={styles.videoTitle}>{item.name || `监控${index + 1}`}</span>
                        <CubePlayer class={styles.videoPlayer} deviceId={String(item.id || "")} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty />
                )}
              </div>
            </TabPane>
          </Tabs>
        </div>
      ),
      "footer-btn": () => (
        <div class={styles.footerBtn}>
          <Button onClick={goBack}>返回</Button>
        </div>
      ),
    };

    return () => <PageLayout title={props.title || "设备信息"} v-slots={slots} />;
  },
});
