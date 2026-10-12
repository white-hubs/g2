import type { ElectricalData, ElectricalNode } from "../types";

interface SavedNode {
  id: string;
  name: string;
  type: string;
  /** 设备 ID 列表，使用中文逗号拼接的字符串 */
  deviceIds?: string;
  /** 子节点 ID 列表，使用中文逗号拼接的字符串 */
  childrenIds?: string;
  /** 业务上的“所在位置”字段（字符串），不是节点坐标 */
  location?: string;
  webStyle?: string;
  [key: string]: unknown;
}

interface SavedEdge {
  id: string;
  lineName?: string;
  fromNodeId?: string;
  toNodeId?: string;
  webStyle?: string;
  [key: string]: unknown;
  fromDeviceId?: string;
  toDeviceId?: string;
  lineLossRate?: number;
  condition?: string;
}

interface SavedPayload {
  nodeList?: SavedNode[];
  connectionList?: SavedEdge[];
  [key: string]: unknown;
}

/** 中英文逗号拆分（低压总柜等节点 childrenIds 常用英文逗号拼接） */
function splitCommaList(raw: string): string[] {
  return raw
    .split(/[，,]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/**
 * 从 **未经过 JSON 数字解析** 的文本里取出整数字段（引号字符串或裸数字均可）。
 * 接口 axios/fetch 对 body 做 JSON.parse 时，大于 2^53-1 的 id 会先被舍入，不能再用 `String(n.id)` 还原；
 * 但 webStyle 仍是字符串，其内部 JSON 文本里的数字位序列是完整的。
 *
 * 同一 JSON 内可能出现多个 `"id"`（如 ports.items），取 **最长** 的纯数字串作为节点/边 id。
 */
function extractDigitsFieldFromJsonRaw(raw: string, field: string): string | undefined {
  if (!raw || typeof raw !== "string") {
    return undefined;
  }
  const re = new RegExp(`"${field}"\\s*:\\s*(?:"([0-9]+)"|([0-9]+)(?=\\s*[,}\\]]))`, "g");
  let best = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const [, quoted, unquoted] = m;
    const val = (quoted || unquoted) as string;
    if (val.length > best.length) {
      best = val;
    }
  }
  return best || undefined;
}

/** 从边的 webStyle 原文解析 source/target.cell（避免接口把 cell 解析成不精确 number） */
function extractEdgeEndpointCellsFromRaw(raw: string): { from?: string; to?: string } {
  const sourceRe = /"source"\s*:\s*\{[^{}]*"cell"\s*:\s*(?:"([0-9]+)"|([0-9]+))/;
  const targetRe = /"target"\s*:\s*\{[^{}]*"cell"\s*:\s*(?:"([0-9]+)"|([0-9]+))/;
  const sm = raw.match(sourceRe);
  const tm = raw.match(targetRe);
  const [, sQuoted, sUnquoted] = sm || [];
  const [, tQuoted, tUnquoted] = tm || [];
  return {
    from: (sQuoted || sUnquoted) as string | undefined,
    to: (tQuoted || tUnquoted) as string | undefined,
  };
}

/** 节点稳定 id：优先 webStyle 原文中的 id 位，其次外层 id（文件导入多为字符串，仍可用） */
function resolveCanonicalNodeId(n: SavedNode): string {
  if (typeof n.webStyle === "string" && n.webStyle.length > 0) {
    const fromStyle = extractDigitsFieldFromJsonRaw(n.webStyle, "id");
    if (fromStyle) {
      return fromStyle;
    }
  }
  return String(n.id);
}

function resolveCanonicalEdgeEndpoints(e: SavedEdge): {
  edgeId: string;
  fromId?: string;
  toId?: string;
} {
  const ws = typeof e.webStyle === "string" ? e.webStyle : "";
  const idFromStyle = ws.length > 0 ? extractDigitsFieldFromJsonRaw(ws, "id") : undefined;
  const cells = ws.length > 0 ? extractEdgeEndpointCellsFromRaw(ws) : { from: undefined, to: undefined };

  const fromApi = e.fromNodeId !== undefined && e.fromNodeId !== null && String(e.fromNodeId).length > 0 ? String(e.fromNodeId) : undefined;
  const toApi = e.toNodeId !== undefined && e.toNodeId !== null && String(e.toNodeId).length > 0 ? String(e.toNodeId) : undefined;

  return {
    edgeId: idFromStyle || String(e.id),
    fromId: cells.from || fromApi,
    toId: cells.to || toApi,
  };
}

/**
 * 雪花 ID 常大于 Number.MAX_SAFE_INTEGER。解析后的对象里 id/cell 可能已损坏；
 * 用 resolveCanonical* 从 webStyle 原文或外层字段恢复。
 */
function normalizeParsedNodeWebStyle(n: SavedNode, parsed: Record<string, unknown>): Record<string, unknown> {
  const canonicalId = resolveCanonicalNodeId(n);
  parsed.id = canonicalId;
  return parsed;
}

function normalizeParsedEdgeWebStyle(e: SavedEdge, parsed: Record<string, unknown>, isLine: boolean | undefined): Record<string, unknown> {
  const { edgeId, fromId, toId } = resolveCanonicalEdgeEndpoints(e);

  parsed.id = edgeId;

  if (fromId !== undefined) {
    const src =
      typeof parsed.source === "object" && parsed.source !== null && !Array.isArray(parsed.source)
        ? (parsed.source as Record<string, unknown>)
        : {};
    parsed.source = { ...src, cell: fromId };
  }
  if (toId !== undefined) {
    const tgt =
      typeof parsed.target === "object" && parsed.target !== null && !Array.isArray(parsed.target)
        ? (parsed.target as Record<string, unknown>)
        : {};
    parsed.target = { ...tgt, cell: toId };
  }

  const data =
    typeof parsed.data === "object" && parsed.data !== null && !Array.isArray(parsed.data)
      ? ({ ...(parsed.data as Record<string, unknown>) } as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  if (isLine) {
    data.lineLossRate = e.lineLossRate;
    data.condition = e.condition;
    data.id = String(e.id);
    data.fromDeviceId = e.fromDeviceId;
    data.toDeviceId = e.toDeviceId;
  }
  if (fromId !== undefined) {
    data.from = fromId;
  }
  if (toId !== undefined) {
    data.to = toId;
  }
  parsed.data = data;
  return parsed;
}

export const replaceData = (data: SavedPayload, isLine?: boolean): { electricalData: ElectricalData } => {
  const nodeList: SavedNode[] = Array.isArray(data.nodeList) ? data.nodeList : [];
  const edgeList: SavedEdge[] = Array.isArray(data.connectionList) ? data.connectionList : [];

  const electricalNodes: ElectricalNode[] = nodeList.map((n) => {
    const deviceIdList = typeof n.deviceIds === "string" && n.deviceIds ? splitCommaList(n.deviceIds) : [];
    const deviceId = deviceIdList.length > 0 ? deviceIdList[0] : undefined;

    const childrenIdList = typeof n.childrenIds === "string" && n.childrenIds ? splitCommaList(n.childrenIds) : [];

    return {
      id: resolveCanonicalNodeId(n),
      name: String(n.name ?? ""),
      type: (n.type || "device") as ElectricalNode["type"],
      deviceId,
      childrenIds: childrenIdList.map((cid) => String(cid)),
      metadata: {
        location: n.location,
      },
    };
  });

  const graphNodes = nodeList.map((n) => {
    const canonicalId = resolveCanonicalNodeId(n);
    if (n.webStyle && typeof n.webStyle === "string") {
      try {
        const parsed = JSON.parse(n.webStyle) as Record<string, unknown>;
        return normalizeParsedNodeWebStyle(n, parsed);
      } catch {
        // ignore parse error and fall back to minimal node
      }
    }

    return {
      id: canonicalId,
      label: n.name,
      data: {
        nodeName: n.name,
        nodeType: n.type,
        location: n.location,
      },
    };
  });

  const graphEdges = edgeList.map((e) => {
    if (e.webStyle && typeof e.webStyle === "string") {
      try {
        const parsed = JSON.parse(e.webStyle) as Record<string, unknown>;
        return normalizeParsedEdgeWebStyle(e, parsed, isLine);
      } catch {
        // ignore parse error and fall back to minimal edge
      }
    }

    return {
      id: String(e.id),
      source: e.fromNodeId ? { cell: String(e.fromNodeId) } : undefined,
      target: e.toNodeId ? { cell: String(e.toNodeId) } : undefined,
      data: {
        from: e.fromNodeId !== undefined && e.fromNodeId !== null ? String(e.fromNodeId) : undefined,
        to: e.toNodeId !== undefined && e.toNodeId !== null ? String(e.toNodeId) : undefined,
        lineName: e.lineName,
        lineLossRate: e.lineLossRate,
        condition: e.condition,
      },
    };
  });

  const electricalData: ElectricalData = {
    nodes: electricalNodes,
    graph: {
      nodes: graphNodes,
      edges: graphEdges,
    },
    deviceBindings: {},
    metadata: {
      restoredBy: "replaceData",
      restoredAt: new Date().toISOString(),
    },
  };

  return { electricalData };
};
