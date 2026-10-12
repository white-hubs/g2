import type { Binding, EventHandler, PageModel, ElementInstance, PageConnection, PortConfig, DeviceBindingMode } from "../types";

export const CURRENT_PAGE_MODEL_VERSION = "1.1";

/** Inlined port-utils (avoids cross-package dependency on editor) */
function portDefsFromConfig(cfg: PortConfig) {
  const distribute = (n: number) => Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
  const pct = (v: number) => `${+(v * 100).toFixed(4)}%`;
  return [
    ...distribute(cfg.top).map((x, i) => ({ id: `top-${i + 1}`, x: pct(x), y: "0%" })),
    ...distribute(cfg.right).map((y, i) => ({ id: `right-${i + 1}`, x: "100%", y: pct(y) })),
    ...distribute(cfg.bottom).map((x, i) => ({ id: `bottom-${i + 1}`, x: pct(x), y: "100%" })),
    ...distribute(cfg.left).map((y, i) => ({ id: `left-${i + 1}`, x: "0%", y: pct(y) })),
  ];
}

interface SerializableNode {
  id: string;
  getPosition(): { x: number; y: number };
  getSize(): { width: number; height: number };
  getData(): Record<string, unknown> | null | undefined;
  getAngle?(): number;
  getZIndex?(): number;
}

/** 与 X6 Edge 对齐的最小序列化接口（core 不依赖 @antv/x6） */
interface SerializableEdge {
  id: string;
  getSource(): unknown;
  getTarget(): unknown;
  getVertices(): Array<{ x: number; y: number }>;
  getAttrs?(): { line?: { stroke?: string; strokeWidth?: number } };
  getConnector?(): { name?: string; args?: unknown } | string | null | undefined;
  getRouter?(): { name?: string; args?: unknown } | string | null | undefined;
  getZIndex?(): number;
}

interface GraphLike {
  getNodes(): SerializableNode[];
  getEdges(): SerializableEdge[];
  clearCells(): void;
  /** 存在时（如 X6 Graph）：保存连线用 EdgeView.routePoints 写入中间折点 */
  findViewByCell?: (cell: unknown) => { routePoints?: Array<{ x: number; y: number }> } | null;
  addNode(node: {
    id: string;
    shape: string;
    x: number;
    y: number;
    width: number;
    height: number;
    angle?: number;
    zIndex?: number;
    data: Record<string, unknown>;
  }): unknown;
  addEdge(edge: {
    id?: string;
    source: { cell: string; port?: string };
    target: { cell: string; port?: string };
    vertices?: Array<{ x: number; y: number }>;
    connector?: { name: string; args?: Record<string, unknown> };
    router?: { name: string; args?: Record<string, unknown> };
    attrs?: {
      line?: { stroke?: string; strokeWidth?: number; targetMarker?: Record<string, unknown> };
    };
    zIndex?: number;
  }): unknown;
}

type RawPageModel = Partial<PageModel> & {
  version?: string;
  productCategory?: unknown;
};
type MigrationFn = (page: RawPageModel) => RawPageModel;

interface MigrationStep {
  to: string;
  migrate: MigrationFn;
}

export class PageModelMigrator {
  private readonly steps = new Map<string, MigrationStep>();

  register(from: string, to: string, migrate: MigrationFn): this {
    this.steps.set(from, { to, migrate });
    return this;
  }

  migrate(input: RawPageModel, targetVersion = CURRENT_PAGE_MODEL_VERSION): RawPageModel {
    let currentVersion = input.version ?? CURRENT_PAGE_MODEL_VERSION;
    let current: RawPageModel = { ...input, version: currentVersion };
    let guard = 0;

    while (currentVersion !== targetVersion) {
      const step = this.steps.get(currentVersion);
      if (!step) {
        throw new Error(`[PageModelMigrator] No migration step from ${currentVersion} to ${targetVersion}.`);
      }
      current = step.migrate(current);
      currentVersion = step.to;
      current.version = currentVersion;
      guard++;
      if (guard > 32) {
        throw new Error("[PageModelMigrator] Migration loop detected.");
      }
    }
    return current;
  }
}

export const pageModelMigrator = new PageModelMigrator();

pageModelMigrator.register("1.0", "1.1", (raw) => ({
  ...raw,
  connections: Array.isArray((raw as { connections?: unknown }).connections) ? (raw as { connections: PageConnection[] }).connections : [],
}));

export function createDefaultPage(overrides?: Partial<PageModel>): PageModel {
  return {
    version: CURRENT_PAGE_MODEL_VERSION,
    id: `page-${Date.now()}`,
    name: "未命名画面",
    width: 1920,
    height: 1080,
    background: "#f0f2f5",
    grid: { show: true, size: 10, snap: true },
    globals: {},
    aliases: [],
    tags: [],
    product: undefined,
    elements: [],
    connections: [],
    ...overrides,
  };
}

function terminalCellId(cell: unknown): string {
  if (typeof cell === "string") return cell;
  if (cell && typeof cell === "object" && "id" in cell) {
    return String((cell as { id: unknown }).id);
  }
  return "";
}

function asNodeTerminal(data: unknown): { cell: unknown; port?: string | null } | null {
  if (!data || typeof data !== "object" || !("cell" in data)) return null;
  const t = data as { cell?: unknown; port?: string | null };
  return { cell: t.cell, port: t.port };
}

function normalizeRoutePoint(p: unknown): { x: number; y: number } | null {
  if (Array.isArray(p) && p.length >= 2) {
    const x = Number(p[0]);
    const y = Number(p[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }
    return null;
  }
  if (p && typeof p === "object" && "x" in p && "y" in p) {
    const x = Number((p as { x: unknown }).x);
    const y = Number((p as { y: unknown }).y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }
  }
  return null;
}

const DEDUP_POINT_EPS = 1e-3;

function dedupeConsecutivePolylinePoints(pts: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (const p of pts) {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > DEDUP_POINT_EPS) {
      out.push(p);
    }
  }
  return out;
}

/**
 * X6 中 routePoints 仅为路由器产生的中间拐点；完整折线需拼接
 * sourcePoint → routePoints → targetPoint（与内置 connector 输入一致）。
 * @see https://x6.antv.vision/en/docs/api/registry/connector/
 */
function getX6EdgeFullPolyline(graph: GraphLike, edge: SerializableEdge): Array<{ x: number; y: number }> | undefined {
  if (typeof graph.findViewByCell !== "function") {
    return undefined;
  }
  try {
    const view = graph.findViewByCell(edge as unknown) as {
      routePoints?: unknown[];
      sourcePoint?: unknown;
      targetPoint?: unknown;
    } | null;
    if (!view) {
      return undefined;
    }
    const start = normalizeRoutePoint(view.sourcePoint);
    const end = normalizeRoutePoint(view.targetPoint);
    if (!start || !end) {
      return undefined;
    }
    const mid: Array<{ x: number; y: number }> = [];
    if (Array.isArray(view.routePoints)) {
      for (const p of view.routePoints) {
        const q = normalizeRoutePoint(p);
        if (q) {
          mid.push(q);
        }
      }
    }
    const merged = dedupeConsecutivePolylinePoints([start, ...mid, end]);
    return merged.length >= 2 ? merged : undefined;
  } catch {
    return undefined;
  }
}

function edgeToPageConnection(edge: SerializableEdge): PageConnection | null {
  const src = asNodeTerminal(edge.getSource());
  const tgt = asNodeTerminal(edge.getTarget());
  if (!src || !tgt) return null;
  const sourceId = terminalCellId(src.cell);
  const targetId = terminalCellId(tgt.cell);
  if (!sourceId || !targetId) return null;

  const attrs = edge.getAttrs?.();
  const line = attrs?.line ?? {};
  const stroke = typeof line.stroke === "string" ? line.stroke : undefined;
  const strokeWidth = typeof line.strokeWidth === "number" ? line.strokeWidth : undefined;
  const connRaw = edge.getConnector?.();
  const connector =
    connRaw && typeof connRaw === "object" && typeof (connRaw as { name?: string }).name === "string"
      ? {
          name: (connRaw as { name: string }).name,
          args:
            "args" in (connRaw as object) && (connRaw as { args?: Record<string, unknown> }).args
              ? (connRaw as { args: Record<string, unknown> }).args
              : undefined,
        }
      : undefined;

  const routeRaw = edge.getRouter?.();
  const router =
    routeRaw && typeof routeRaw === "object" && typeof (routeRaw as { name?: string }).name === "string"
      ? {
          name: (routeRaw as { name: string }).name,
          args:
            "args" in (routeRaw as object) && (routeRaw as { args?: Record<string, unknown> }).args
              ? (routeRaw as { args: Record<string, unknown> }).args
              : undefined,
        }
      : undefined;

  const verts = edge.getVertices();
  return {
    id: edge.id,
    source: { cellId: sourceId, port: src.port ?? undefined },
    target: { cellId: targetId, port: tgt.port ?? undefined },
    vertices: verts?.length ? verts : undefined,
    connector,
    router,
    stroke,
    strokeWidth,
    zIndex: edge.getZIndex?.(),
  };
}

export function graphToPageModel(
  graph: GraphLike,
  meta: Pick<PageModel, "id" | "name" | "width" | "height" | "background" | "globals" | "aliases" | "tags" | "product">,
): PageModel {
  const nodes = graph.getNodes();
  const elements: ElementInstance[] = nodes.map((node) => nodeToInstance(node));
  const connections: PageConnection[] = graph
    .getEdges()
    .map((e) => {
      const conn = edgeToPageConnection(e);
      if (!conn) {
        return null;
      }
      const poly = getX6EdgeFullPolyline(graph, e);
      if (poly && poly.length >= 2) {
        return {
          ...conn,
          polyline: poly,
          vertices: poly.length > 2 ? poly.slice(1, -1) : undefined,
        };
      }
      return conn;
    })
    .filter((c): c is PageConnection => c !== null);

  return {
    ...meta,
    version: CURRENT_PAGE_MODEL_VERSION,
    grid: { show: true, size: 10, snap: true },
    tags: meta.tags ?? [],
    elements,
    connections,
  };
}

export function nodeToInstance(node: SerializableNode): ElementInstance {
  const pos = node.getPosition();
  const size = node.getSize();
  const data = node.getData() ?? {};
  const elementType = typeof data.elementType === "string" ? data.elementType : "";
  const elementProps =
    typeof data.elementProps === "object" && data.elementProps !== null ? (data.elementProps as Record<string, any>) : {};
  const bindings = Array.isArray(data.bindings) ? (data.bindings as Binding[]) : [];
  const eventHandlers = Array.isArray(data.eventHandlers) ? (data.eventHandlers as EventHandler[]) : [];
  const propertyBindings = Array.isArray(data.propertyBindings)
    ? (data.propertyBindings as ElementInstance["propertyBindings"])
    : undefined;

  const instance: ElementInstance = {
    id: node.id,
    type: elementType,
    x: pos.x,
    y: pos.y,
    width: size.width,
    height: size.height,
    rotation: node.getAngle?.() ?? 0,
    zIndex: node.getZIndex?.() ?? 0,
    locked: false,
    visible: true,
    props: elementProps,
    bindings,
    eventHandlers,
    ...(propertyBindings && propertyBindings.length > 0 ? { propertyBindings } : {}),
  };

  if (typeof data.label === "string" && data.label) instance.label = data.label;
  if (typeof data.deviceId === "string" && data.deviceId) instance.deviceId = data.deviceId;
  if (data.deviceBinding === "required" || data.deviceBinding === "off") {
    instance.deviceBinding = data.deviceBinding;
  }
  if (typeof data.propertyBindName === "string" && data.propertyBindName.trim()) {
    instance.propertyBindName = data.propertyBindName.trim();
  }
  if (data.portConfig && typeof data.portConfig === "object") {
    instance.portConfig = data.portConfig as PortConfig;
  }

  return instance;
}

export function pageModelToGraph(graph: GraphLike, page: PageModel): void {
  graph.clearCells();

  for (const el of page.elements) {
    const nodeConfig: any = {
      id: el.id,
      shape: "scada-node",
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      angle: el.rotation,
      zIndex: el.zIndex,
      data: {
        elementType: el.type,
        elementProps: el.props,
        bindings: el.bindings,
        eventHandlers: el.eventHandlers,
        ...(el.propertyBindings?.length ? { propertyBindings: el.propertyBindings } : {}),
        ...(el.label ? { label: el.label } : {}),
        ...(el.deviceId ? { deviceId: el.deviceId } : {}),
        ...(el.deviceBinding ? { deviceBinding: el.deviceBinding } : {}),
        ...(typeof el.propertyBindName === "string" && el.propertyBindName.trim() ? { propertyBindName: el.propertyBindName.trim() } : {}),
        portConfig: el.portConfig ?? { top: 1, right: 1, bottom: 1, left: 1 },
      },
    };

    const portGroups = {
      side: {
        position: { name: "absolute" },
        markup: [{ tagName: "circle", selector: "portBody" }],
        attrs: {
          portBody: { r: 5, magnet: true, stroke: "#5F95FF", fill: "#fff", strokeWidth: 1 },
        },
      },
    };
    const cfg = el.portConfig ?? { top: 1, right: 1, bottom: 1, left: 1 };
    const portDefs = portDefsFromConfig(cfg);
    if (portDefs.length > 0) {
      nodeConfig.ports = {
        groups: portGroups,
        items: portDefs.map((p) => ({ id: p.id, group: "side", args: { x: p.x, y: p.y } })),
      };
    }

    graph.addNode(nodeConfig);
  }

  const idSet = new Set(page.elements.map((e) => e.id));
  for (const c of page.connections ?? []) {
    if (!idSet.has(c.source.cellId) || !idSet.has(c.target.cellId)) continue;
    const stroke = c.stroke ?? "#5F95FF";
    const strokeWidth = c.strokeWidth ?? 2;
    graph.addEdge({
      id: c.id,
      source: { cell: c.source.cellId, port: c.source.port ?? "top" },
      target: { cell: c.target.cellId, port: c.target.port ?? "bottom" },
      vertices: c.polyline && c.polyline.length > 2 ? c.polyline.slice(1, -1) : c.vertices,
      connector: c.connector ?? { name: "normal" },
      router: c.router ?? { name: "manhattan", args: { padding: 8, step: 16 } },
      attrs: {
        line: {
          stroke,
          strokeWidth,
          targetMarker: { name: "classic", size: Math.max(6, strokeWidth * 4) },
        },
      },
      zIndex: c.zIndex,
    });
  }
}

export function serializePage(page: PageModel): string {
  return JSON.stringify(page, null, 2);
}

export function deserializePage(json: string): PageModel {
  const raw = JSON.parse(json) as RawPageModel;
  const migrated = pageModelMigrator.migrate(raw, CURRENT_PAGE_MODEL_VERSION);
  return normalizePageModel(migrated);
}

function normalizePageModel(page: RawPageModel): PageModel {
  const { productCategory: _legacyProductCategory, ...safePage } = page;
  return createDefaultPage({
    ...safePage,
    version: page.version ?? CURRENT_PAGE_MODEL_VERSION,
    globals: typeof page.globals === "object" && page.globals !== null ? (page.globals as Record<string, string>) : {},
    aliases: Array.isArray(page.aliases) ? page.aliases : [],
    tags: Array.isArray((page as any).tags) ? (page as any).tags : [],
    product: page.product && typeof page.product === "object" ? page.product : undefined,
    elements: Array.isArray(page.elements) ? page.elements : [],
    connections: Array.isArray((page as { connections?: PageConnection[] }).connections)
      ? (page as { connections: PageConnection[] }).connections.map((c) => ({ ...c }))
      : [],
    grid: {
      show: page.grid?.show ?? true,
      size: page.grid?.size ?? 10,
      snap: page.grid?.snap ?? true,
    },
  });
}
