// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { defineComponent } from "vue";

import type { RouteTrafficStatus } from "../../../evacuation-shared/data/types";
import type { EvacuationCommandState } from "../../composables/use-evacuation-command-state";
import { Button } from "@/pc-ui-runtime";

import styles from "./index.module.less";

function statusClass(status: RouteTrafficStatus): string {
  switch (status) {
    case "畅通":
      return styles.statusOk;
    case "拥挤":
      return styles.statusWarn;
    case "阻断":
      return styles.statusBlock;
    default:
      return styles.statusDisabled;
  }
}

function priorityClass(priority: string): string {
  if (priority === "高") {
    return styles.priorityHigh;
  }
  if (priority === "低") {
    return styles.priorityLow;
  }
  return styles.priorityMid;
}

export const RouteCardPanel = defineComponent({
  name: "RouteCardPanel",
  props: {
    state: { type: Object as () => EvacuationCommandState, required: true },
  },
  setup(props) {
    const handleToggleRoute = (index: number): void => {
      void props.state.toggleRoute(index);
    };

    return (): JSX.Element => (
      <div class={styles.panel}>
        <div class={styles.header}>
          <span class={styles.title}>疏散路线</span>
          <span class={styles.count}>{props.state.routes.value.length}条</span>
        </div>
        <div class={styles.list}>
          {props.state.routes.value.map((route, index) => {
            const selected = props.state.selectedRouteId.value === route.id;
            return (
              <div
                key={route.id}
                class={[styles.card, !route.active ? styles.cardInactive : "", selected ? styles.cardSelected : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => props.state.selectRoute(route.id)}
              >
                <div class={styles.cardTop}>
                  <div class={styles.nameRow}>
                    <span class={styles.dot} style={{ background: route.color }} />
                    <span class={styles.name}>
                      {route.name}
                      {route.isSystem ? <span class={styles.sysTag}>·系统</span> : null}
                    </span>
                  </div>
                  <span class={[styles.status, statusClass(route.trafficStatus)].join(" ")}>
                    {route.active ? route.trafficStatus : "已禁用"}
                  </span>
                </div>
                <div class={styles.meta}>
                  <span>{route.capacityPerMin} 人/分钟</span>
                  <span class={priorityClass(route.priority)}>{route.priority}</span>
                </div>
                {route.boundCameras.length > 0 ? (
                  <div class={styles.camInfo}>📹 已绑 {route.boundCameras.length} 台</div>
                ) : (
                  <div class={styles.camEmpty}>📹 点击绑定</div>
                )}
                <div class={styles.actions} onClick={(e: MouseEvent) => e.stopPropagation()}>
                  <Button
                    size="small"
                    loading={props.state.routeTogglingId.value === route.id}
                    disabled={props.state.routesLoading.value || props.state.routeTogglingId.value !== null}
                    onClick={() => handleToggleRoute(index)}
                  >
                    {route.active ? "🚫 禁用" : "✅ 启用"}
                  </Button>
                  <Button size="small" class={styles.editBtn} onClick={() => props.state.openEditRouteModal(index)}>
                    ✏️ 编辑
                  </Button>
                  <Button size="small" onClick={() => props.state.openCameraBindModal(index)}>
                    📹
                  </Button>
                  {!route.isSystem ? (
                    <Button size="small" danger onClick={() => props.state.deleteRoute(index)}>
                      🗑
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
});
