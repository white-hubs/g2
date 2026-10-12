// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { defineComponent } from "vue";

import { EvacuationMapShell } from "../../../evacuation-shared/components/evacuation-map-shell";
import { useEvacuationMapEngine } from "../../../evacuation-shared/composables/use-evacuation-map-engine";
import type { EvacuationRouteState } from "../../composables/use-evacuation-route-state";
import { PlanImagePanel } from "../plan-image-panel";
import { Button, Input, SearchOutlined } from "@/pc-ui-runtime";

import "./index.less";

export const RouteMapCanvas = defineComponent({
  name: "RouteMapCanvas",
  props: {
    state: { type: Object as () => EvacuationRouteState, required: true },
  },
  setup(props) {
    const engine = useEvacuationMapEngine({
      editablePlan: true,
      editableRoutes: true,
      plan: {
        uploadedImages: props.state.uploadedImages,
        selectedPlanId: props.state.selectedPlanId,
        pendingPlanCenterId: props.state.pendingPlanCenterId,
        getPlanTransform: props.state.getPlanTransform,
        initPlanTransform: props.state.initPlanTransform,
        setPlanCenter: props.state.setPlanCenter,
        setPlanAspectRatio: props.state.setPlanAspectRatio,
        placePlanAtCenter: props.state.placePlanAtCenter,
      },
      route: {
        routes: props.state.routes,
        currentPoints: props.state.currentPoints,
        panMode: props.state.panMode,
        drawingHint: props.state.drawingHint,
        placePoint: props.state.placePoint,
        moveRoutePoint: props.state.moveRoutePoint,
        moveCurrentPoint: props.state.moveCurrentPoint,
      },
    });

    const refreshSelectedPlan = (): void => {
      engine.refreshSelectedPlan();
    };

    const resetPlan = (): void => {
      const id = props.state.floorPlan.value?.id;
      if (!id) {
        return;
      }
      props.state.resetPlanTransform(id, engine.readMapCenter());
      refreshSelectedPlan();
    };

    const togglePan = (): void => {
      props.state.togglePanMode();
      engine.scheduleRender();
    };

    const handleSearch = async (): Promise<void> => {
      await engine.handleSearch();
    };

    return (): JSX.Element => (
      <div class="route-map-canvas">
        <PlanImagePanel state={props.state} onRefresh={refreshSelectedPlan} onResetPlan={resetPlan} />
        <div class="route-map-canvas__toolbar">
          <span class="route-map-canvas__title">📍 路线标注</span>
          <div class="route-map-canvas__actions">
            <span class="route-map-canvas__hint">{props.state.drawingHint.value}</span>
            <Button size="small" onClick={() => props.state.clearCurrentRoute()}>
              撤销当前
            </Button>
            <Button size="small" onClick={() => props.state.undoLastPoint()}>
              ↩ 回退一步
            </Button>
          </div>
        </div>
        <div class="route-map-canvas__search">
          <Input
            value={engine.mapSearch.value}
            placeholder="搜索地址，如：深圳市南山区科技园"
            allowClear
            suffix={<SearchOutlined style={{ cursor: "pointer" }} onClick={() => void handleSearch()} />}
            onPressEnter={() => void handleSearch()}
            onUpdate:value={(v: string) => {
              engine.mapSearch.value = v ?? "";
            }}
          />
          <Button type="primary" onClick={() => void handleSearch()}>
            搜索定位
          </Button>
        </div>
        <div class="route-map-canvas__body">
          <EvacuationMapShell
            engine={engine}
            showPanControl
            panActive={props.state.panMode.value}
            onTogglePan={togglePan}
            mapClass="route-map-canvas__map"
          />
          <div class="route-map-canvas__footer-hint">
            {props.state.selectedPlanId.value
              ? "平面图编辑模式：拖动图片对齐 · 滑块或按钮调整缩放/旋转 · 点击「保存」后可标注路线"
              : "路线标注模式：点击地图放置节点 · 可拖动地图平移视图"}
          </div>
        </div>
      </div>
    );
  },
});
