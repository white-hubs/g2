// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { defineComponent, onBeforeUnmount, onMounted } from "vue";

import { RouteFormModal } from "../evacuation-route-config/components/route-form-modal";
import { CameraFeedPanel } from "./components/camera-feed-panel";
import { CameraPreviewModal } from "./components/camera-preview-modal";
import { CommandMapCanvas } from "./components/command-map-canvas";
import { EventHeader } from "./components/event-header";
import { EventListPanel } from "./components/event-list-panel";
import { RouteCardPanel } from "./components/route-card-panel";
import { useEvacuationCommandState } from "./composables/use-evacuation-command-state";
import { DeviceSelectModal } from "@/components/device-select-modal";
import { APPLICATION_CODE } from "@/constants/env";
import { PageLayout } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

import styles from "./index.module.less";

const LAYOUT_CONTENT_LOCK_CLASS = "evacuation-command-layout-lock";

export const EvacuationCommand = defineComponent({
  name: "EvacuationCommand",
  setup: () => {
    const { pageTitle } = usePageName();
    const state = useEvacuationCommandState();

    onMounted(() => {
      // G2 PageLayout 内容区 id 为 pc-layout-content；兼容旧 id
      document.getElementById("pc-layout-content")?.classList.add(LAYOUT_CONTENT_LOCK_CLASS);
      document.getElementById("cube-layout-content")?.classList.add(LAYOUT_CONTENT_LOCK_CLASS);
    });

    onBeforeUnmount(() => {
      document.getElementById("pc-layout-content")?.classList.remove(LAYOUT_CONTENT_LOCK_CLASS);
      document.getElementById("cube-layout-content")?.classList.remove(LAYOUT_CONTENT_LOCK_CLASS);
    });

    return (): JSX.Element => (
      <PageLayout title={pageTitle} showFooter={false}>
        {{
          "layout-content": () => (
            <div class={styles.page}>
              <div class={styles.eventBar}>
                <EventHeader state={state} />
              </div>
              <div class={styles.body}>
                <aside class={styles.colEvents}>
                  <EventListPanel state={state} />
                </aside>
                <aside class={styles.colCameras}>
                  <CameraFeedPanel state={state} />
                </aside>
                <main class={styles.colMap}>
                  <CommandMapCanvas state={state} />
                </main>
                <aside class={styles.colRoutes}>
                  <RouteCardPanel state={state} />
                </aside>
              </div>
            </div>
          ),
          default: () => (
            <>
              <RouteFormModal state={state} />
              <CameraPreviewModal state={state} />
              <DeviceSelectModal
                ref={state.deviceModalTableRef}
                v-model:value={state.deviceList.value}
                multiple
                applicationCode={APPLICATION_CODE}
                tagCodes={[state.tagCode]}
                title="关联设备"
                onOk={(values: { id: string; name: string }[]) => {
                  void state.handleCameraBindOk(values);
                }}
              />
            </>
          ),
        }}
      </PageLayout>
    );
  },
});
