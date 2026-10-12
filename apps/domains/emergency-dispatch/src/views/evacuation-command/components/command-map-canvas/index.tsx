// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";
import { useRouter } from "vue-router";

import { EvacuationMapShell } from "../../../evacuation-shared/components/evacuation-map-shell";
import { useEvacuationMapEngine } from "../../../evacuation-shared/composables/use-evacuation-map-engine";
import type { AreaTreeItem, CommandRoute } from "../../../evacuation-shared/data/types";
import type { EvacuationCommandState } from "../../composables/use-evacuation-command-state";
import { Button } from "@/pc-ui-runtime";
import { getFloorPlanImagePath } from "@/utils/file-url";

import styles from "./index.module.less";

const MIN_MAP_HEIGHT = 280;

const CommandAreaTreeNodes = defineComponent({
  name: "CommandAreaTreeNodes",
  props: {
    nodes: { type: Array as PropType<AreaTreeItem[]>, required: true },
    depth: { type: Number, default: 0 },
    state: { type: Object as PropType<EvacuationCommandState>, required: true },
    onSelect: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    return (): JSX.Element => (
      <>
        {props.nodes.map((node) => (
          <div key={node.id}>
            <div
              class={[
                styles.treeNode,
                props.depth > 0 ? styles.treeNodeChild : "",
                props.state.selectedAreaId.value === node.id ? styles.treeNodeSelected : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ paddingLeft: `${10 + props.depth * 16}px` }}
              onClick={() => {
                props.state.selectArea(node.id);
                props.onSelect();
              }}
            >
              {node.children.length > 0 ? (
                <span
                  class={[styles.treeCaret, node.expanded ? styles.treeCaretExpanded : ""].filter(Boolean).join(" ")}
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    props.state.toggleAreaNode(node.id);
                  }}
                >
                  ▶
                </span>
              ) : (
                <span class={[styles.treeCaret, styles.treeCaretPlaceholder].join(" ")} />
              )}
              {props.depth > 0 ? "📍 " : null}
              {node.name}
            </div>
            {node.expanded && node.children.length > 0 ? (
              <CommandAreaTreeNodes nodes={node.children} depth={props.depth + 1} state={props.state} onSelect={props.onSelect} />
            ) : null}
          </div>
        ))}
      </>
    );
  },
});

export const CommandMapCanvas = defineComponent({
  name: "CommandMapCanvas",
  props: {
    state: { type: Object as () => EvacuationCommandState, required: true },
  },
  setup(props) {
    const router = useRouter();
    const locOpen = ref(false);
    const locWrapRef = ref<HTMLDivElement | null>(null);
    const mapBodyRef = ref<HTMLDivElement | null>(null);
    const mapHeight = ref(420);
    let mapBodyObserver: ResizeObserver | null = null;
    let lastFocusedKey = "";

    const onDocClick = (e: MouseEvent): void => {
      if (!locWrapRef.value?.contains(e.target as Node)) {
        locOpen.value = false;
      }
    };

    const firePointRef = computed(() => props.state.firePoint.value);

    const engine = useEvacuationMapEngine({
      editablePlan: false,
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
        skipInactiveRoutes: false,
        getRouteStyle: (route) => props.state.getRouteStyle(route as CommandRoute),
      },
      overlay: {
        firePoint: firePointRef,
      },
    });

    const syncMapHeight = (): void => {
      const el = mapBodyRef.value;
      if (!el) {
        return;
      }
      const style = getComputedStyle(el);
      const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      const height = el.clientHeight - verticalPadding;
      if (height >= MIN_MAP_HEIGHT) {
        mapHeight.value = height;
        engine.invalidateMapSize?.();
      }
    };

    onMounted(() => {
      document.addEventListener("click", onDocClick);
      if (mapBodyRef.value) {
        syncMapHeight();
        mapBodyObserver = new ResizeObserver(syncMapHeight);
        mapBodyObserver.observe(mapBodyRef.value);
      }
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", onDocClick);
      mapBodyObserver?.disconnect();
      mapBodyObserver = null;
    });

    watch(
      () => ({
        areaId: props.state.selectedAreaId.value,
        planId: props.state.uploadedImages.value[0]?.id,
        ready: engine.mapReady.value,
        center: props.state.uploadedImages.value[0]?.id
          ? props.state.getPlanTransform(props.state.uploadedImages.value[0].id)?.center
          : null,
      }),
      ({ areaId, planId, ready, center }) => {
        if (!areaId || !planId || !ready || !center) {
          return;
        }
        const key = `${areaId}-${planId}`;
        if (key === lastFocusedKey) {
          return;
        }
        lastFocusedKey = key;
        void engine.focusOnPoint(center);
      },
    );

    const hasPlan = computed(() => props.state.uploadedImages.value.some((p) => getFloorPlanImagePath(p)));
    const planBusy = computed(() => props.state.planLoading.value || props.state.areaLoading.value);

    const goToRouteConfig = (): void => {
      const areaId = props.state.selectedAreaId.value;
      void router.push({
        name: "evacuation-route-config",
        ...(areaId ? { query: { areaId } } : {}),
      });
    };

    const locContent = (): JSX.Element => (
      <div class={styles.locPanel}>
        {planBusy.value ? <div class={styles.locLoading}>加载中…</div> : null}
        {!planBusy.value && props.state.areaTree.value.length > 0 ? (
          <CommandAreaTreeNodes
            nodes={props.state.areaTree.value}
            state={props.state}
            onSelect={() => {
              locOpen.value = false;
            }}
          />
        ) : null}
        {props.state.areaTree.value.length === 0 && !planBusy.value ? <div class={styles.locEmpty}>暂无区域</div> : null}
      </div>
    );

    return (): JSX.Element => (
      <div class={styles.canvas}>
        <div class={styles.toolbar}>
          <div class={styles.toolbarMain}>
            <span class={styles.title}>建筑疏散地图</span>
            <span class={styles.hint}>{props.state.drawingHint.value}</span>
          </div>
          <div class={styles.actions}>
            <div class={styles.locWrap} ref={locWrapRef}>
              <button
                type="button"
                class={styles.locBtn}
                disabled={planBusy.value}
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  locOpen.value = !locOpen.value;
                }}
              >
                {props.state.selectedAreaName.value} ▼
              </button>
              {locOpen.value ? <div class={styles.locDropdown}>{locContent()}</div> : null}
            </div>
            <Button size="small" onClick={() => props.state.clearCurrentRoute()}>
              撤销当前
            </Button>
            <Button size="small" onClick={() => props.state.undoLastPoint()}>
              ↩ 回退
            </Button>
            <Button size="small" type="primary" onClick={() => props.state.openSaveRouteModal()}>
              新增路线
            </Button>
          </div>
        </div>
        {!hasPlan.value && !planBusy.value ? (
          <div class={styles.noPlan}>
            <p>暂无平面图，请先在「疏散引导配置」页上传平面图</p>
            <button type="button" class={styles.noPlanLink} onClick={goToRouteConfig}>
              前往配置 →
            </button>
          </div>
        ) : null}
        {planBusy.value && !hasPlan.value ? (
          <div class={styles.noPlan}>
            <p>正在加载平面图…</p>
          </div>
        ) : null}
        <div class={styles.mapBody} ref={mapBodyRef}>
          <EvacuationMapShell
            engine={engine}
            showPanControl
            panActive={props.state.panMode.value}
            onTogglePan={() => {
              props.state.togglePanMode();
              engine.scheduleRender();
            }}
            minHeight={mapHeight.value}
            mapClass={styles.map}
          />
        </div>
      </div>
    );
  },
});
