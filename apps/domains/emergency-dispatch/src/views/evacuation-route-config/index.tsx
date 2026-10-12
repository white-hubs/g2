// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { defineComponent } from "vue";

import { AreaTreePanel } from "./components/area-tree-panel";
import { RouteFormModal } from "./components/route-form-modal";
import { RouteListTable } from "./components/route-list-table";
import { RouteMapCanvas } from "./components/route-map-canvas";
import { useEvacuationRouteState } from "./composables/use-evacuation-route-state";
import { DeviceSelectModal } from "@/components/device-select-modal";
import { APPLICATION_CODE } from "@/constants/env";
import { PageLayout } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

import styles from "./index.module.less";

export const EvacuationRouteConfig = defineComponent({
  name: "EvacuationRouteConfig",
  setup: () => {
    const { pageTitle } = usePageName();
    const state = useEvacuationRouteState();

    return (): JSX.Element => (
      <PageLayout title={pageTitle} showFooter={false}>
        {{
          "layout-content": () => (
            <div class={styles.page}>
              <div class={styles.layout}>
                <aside class={styles.sidebar}>
                  <AreaTreePanel state={state} />
                </aside>
                <main class={styles.main}>
                  <div class={styles.card}>
                    <RouteMapCanvas state={state} />
                  </div>
                  <RouteListTable state={state} />
                </main>
              </div>
            </div>
          ),
          default: () => (
            <>
              <RouteFormModal state={state} />
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
