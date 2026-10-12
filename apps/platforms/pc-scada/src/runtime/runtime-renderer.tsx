import { defineComponent, onBeforeUnmount, watch } from "vue";

import { anchorForElementPort, type ElementInstance, type PageConnection, type PageModel, registry } from "../../vendor/core";
import { BindingEngine } from "../../vendor/engine";
import { ElementRenderer } from "../../vendor/renderer";
import { getRuntimeLayoutFrame } from "./runtime-content-bounds";

export interface RuntimeElementEvent {
  element: ElementInstance;
  eventName: string;
  event: Event;
}

const COORD_EPS = 1e-6;

/**
 * 完整 polyline 首尾应贴近端口；旧版误存 X6 routePoints（仅中间拐点）时首尾都远离端口。
 */
const POLYLINE_ANCHOR_TOL_PX = 28;

function pathFromPointList(poly: Array<{ x: number; y: number }>): string {
  let d = `M ${poly[0].x} ${poly[0].y}`;
  for (let i = 1; i < poly.length; i++) {
    d += ` L ${poly[i].x} ${poly[i].y}`;
  }
  return d;
}

/** 旧数据：polyline 实为 routePoints，需再接两端锚点 */
function pathFromLegacyRoutePointsPolyline(
  src: ElementInstance,
  tgt: ElementInstance,
  poly: Array<{ x: number; y: number }>,
  sourcePort: string | undefined,
  targetPort: string | undefined,
): string {
  const a = anchorForElementPort(src, sourcePort);
  const b = anchorForElementPort(tgt, targetPort);
  let d = `M ${a.x} ${a.y}`;
  for (const p of poly) {
    d += ` L ${p.x} ${p.y}`;
  }
  d += ` L ${b.x} ${b.y}`;
  return d;
}

/** 无顶点时：经中点的三段直角折线（水平—垂直—水平） */
function orthogonalFallback(ax: number, ay: number, bx: number, by: number): string {
  const mx = (ax + bx) / 2;
  return `M ${ax} ${ay} L ${mx} ${ay} L ${mx} ${by} L ${bx} ${by}`;
}

function connectionPathD(c: PageConnection, page: PageModel): string | null {
  const src = page.elements.find((e) => e.id === c.source.cellId);
  const tgt = page.elements.find((e) => e.id === c.target.cellId);
  if (!src || !tgt) return null;
  const poly = c.polyline;
  if (poly && poly.length >= 2) {
    const a = anchorForElementPort(src, c.source.port);
    const b = anchorForElementPort(tgt, c.target.port);
    const dStart = Math.hypot(poly[0].x - a.x, poly[0].y - a.y);
    const dEnd = Math.hypot(poly[poly.length - 1].x - b.x, poly[poly.length - 1].y - b.y);
    const startNear = dStart <= POLYLINE_ANCHOR_TOL_PX;
    const endNear = dEnd <= POLYLINE_ANCHOR_TOL_PX;
    if (startNear && endNear) {
      return pathFromPointList(poly);
    }
    if (!startNear && !endNear) {
      return pathFromLegacyRoutePointsPolyline(src, tgt, poly, c.source.port, c.target.port);
    }
    return pathFromPointList(poly);
  }
  const a = anchorForElementPort(src, c.source.port);
  const b = anchorForElementPort(tgt, c.target.port);
  const verts = c.vertices ?? [];
  if (verts.length === 0) {
    if (Math.abs(a.x - b.x) < COORD_EPS || Math.abs(a.y - b.y) < COORD_EPS) {
      return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    }
    return orthogonalFallback(a.x, a.y, b.x, b.y);
  }
  let d = `M ${a.x} ${a.y}`;
  for (const v of verts) d += ` L ${v.x} ${v.y}`;
  d += ` L ${b.x} ${b.y}`;
  return d;
}

export const RuntimeRenderer = defineComponent({
  name: "RuntimeRenderer",
  props: {
    page: { type: Object as () => PageModel, required: true },
    bindingEngine: { type: Object as () => BindingEngine, required: true },
    width: { type: Number, required: false },
    height: { type: Number, required: false },
    /** Numeric prop value transition duration in ms passed to each ElementRenderer. Set to 0 to disable. Default: 500 */
    tweenDuration: { type: Number, default: 500 },
  },
  emits: ["elementEvent"],
  setup(props, { emit }) {
    let unbind: (() => void) | null = null;

    const disposeBinding = () => {
      if (unbind) {
        unbind();
        unbind = null;
      }
    };

    watch(
      () => props.page,
      (page) => {
        disposeBinding();
        unbind = props.bindingEngine.bind(page.elements, page.aliases);
      },
      { immediate: true },
    );

    onBeforeUnmount(() => {
      disposeBinding();
    });

    const emitElementEvent = (element: ElementInstance, eventName: string, event: Event) => {
      emit("elementEvent", {
        element,
        eventName,
        event,
      } as RuntimeElementEvent);
    };

    return () => {
      const pageWidth = props.width ?? props.page.width;
      const pageHeight = props.height ?? props.page.height;
      const store = props.bindingEngine.getStore();
      const { spanW, spanH, tx, ty } = getRuntimeLayoutFrame(props.page, pageWidth, pageHeight);

      return (
        <div
          style={{
            position: "relative",
            width: `${spanW}px`,
            height: `${spanH}px`,
            background: props.page.background,
            overflow: "visible",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              transform: `translate(${tx}px, ${ty}px)`,
              transformOrigin: "0 0",
            }}
          >
            <svg
              width={spanW}
              height={spanH}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                zIndex: 0,
                pointerEvents: "none",
                overflow: "visible",
              }}
            >
              {(props.page.connections ?? []).map((c) => {
                const d = connectionPathD(c, props.page);
                if (!d) return null;
                const sw = c.strokeWidth ?? 2;
                return (
                  <path
                    key={c.id}
                    d={d}
                    fill="none"
                    stroke={c.stroke ?? "#5F95FF"}
                    {...({
                      "stroke-width": sw,
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                    } as Record<string, string | number>)}
                  />
                );
              })}
            </svg>
            {props.page.elements.map((element) => {
              const def = registry.get(element.type);
              if (!def) {
                return (
                  <div
                    key={element.id}
                    style={{
                      position: "absolute",
                      left: `${element.x}px`,
                      top: `${element.y}px`,
                      width: `${element.width}px`,
                      height: `${element.height}px`,
                      border: "1px dashed #ff4d4f",
                      color: "#ff4d4f",
                      background: "#fff2f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                    }}
                  >
                    未注册组件: {element.type}
                  </div>
                );
              }

              const boundProps = store[element.id];
              const elementProps = boundProps ? { ...element.props, ...boundProps } : element.props;
              const hasClickHandler = (element.eventHandlers ?? []).some((handler) => handler.event === "click");

              return (
                <div
                  key={element.id}
                  data-preview-node-id={element.id}
                  data-scada-click-glow={hasClickHandler ? "1" : "0"}
                  style={{
                    position: "absolute",
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: `${element.width}px`,
                    height: `${element.height}px`,
                    zIndex: 1,
                    transform: `rotate(${element.rotation}deg)`,
                    transformOrigin: "center center",
                    pointerEvents: "auto",
                  }}
                  onClick={(event) => emitElementEvent(element, "click", event)}
                  onDblclick={(event) => emitElementEvent(element, "dblclick", event)}
                  onContextmenu={(event) => emitElementEvent(element, "contextmenu", event)}
                  onMouseenter={(event) => emitElementEvent(element, "mouseenter", event)}
                  onMouseleave={(event) => emitElementEvent(element, "mouseleave", event)}
                >
                  <ElementRenderer
                    def={def}
                    elementProps={elementProps}
                    width={element.width}
                    height={element.height}
                    tweenDuration={props.tweenDuration}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    };
  },
});
