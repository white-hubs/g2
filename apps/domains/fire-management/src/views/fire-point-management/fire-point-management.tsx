import { computed, defineComponent, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { FirePointConfigTab } from "./components/fire-point-config-tab";
import { HostButtonConfigTab } from "./components/host-button-config-tab";
import { VideoDeviceConfigTab } from "./components/video-device-config-tab";
import type { FireConfigTabKey } from "./fire-config-management.model";
import { PageLayout } from "@/pc-ui-runtime";
import { Button, TabPane, Tabs } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

import styles from "./fire-config-management.module.css";

export const FirePointManagement = defineComponent({
  name: "FirePointManagement",
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const router = useRouter();
    const hostId = String(route.query.hostId || "FIRE-HOST-001");
    const hostNameFromQuery = String(route.query.deviceName || "");
    const pointTotal = shallowRef(0);

    const activeTab = computed<FireConfigTabKey>(() => {
      const tab = route.query.tab;
      return tab === "button" || tab === "video" ? tab : "point";
    });
    const hostName = computed(() => hostNameFromQuery || "消防主机");

    const changeTab = (tab: string | number): void => {
      void router.replace({
        query: {
          ...route.query,
          tab: String(tab),
        },
      });
    };

    return () => (
      <PageLayout
        title={pageTitle}
        showFooter
        v-slots={{
          "layout-header": () => (
            <div class={styles["host-header"]}>
              <span class={styles["host-context"]}>
                {hostName.value} · 共 {pointTotal.value} 个点位
              </span>
            </div>
          ),
          "layout-content": () => (
            <div class={styles["fire-config-page"]}>
              <Tabs activeKey={activeTab.value} onChange={changeTab}>
                <TabPane key="point" tab="消防点位" />
                <TabPane key="button" tab="主机按钮" />
                <TabPane key="video" tab="视频设备" />
              </Tabs>
              {activeTab.value === "point" && (
                <FirePointConfigTab
                  hostId={hostId}
                  hostName={hostName.value}
                  onTotalChanged={(total: number) => (pointTotal.value = total)}
                />
              )}
              {activeTab.value === "button" && <HostButtonConfigTab hostId={hostId} hostName={hostName.value} />}
              {activeTab.value === "video" && <VideoDeviceConfigTab hostId={hostId} />}
            </div>
          ),
          "footer-page": () => <Button onClick={() => router.push("/d/fire-management/fire-host-config")}>返回</Button>,
        }}
      />
    );
  },
});

export default FirePointManagement;
