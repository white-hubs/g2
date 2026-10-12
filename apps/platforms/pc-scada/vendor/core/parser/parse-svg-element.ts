import type { AnimationDef, ElementDef, PortDef, PropMapping, PropSchema } from "../types/element";

export function parseSvgElement(svgString: string): ElementDef {
  const metadataMatch = svgString.match(/<metadata[\s\S]*?>([\s\S]*?)<\/metadata>/i);
  if (!metadataMatch) {
    throw new Error("Missing <metadata> block in SVG");
  }
  const metaBlock = metadataMatch[1];

  const metaTag = matchTag(metaBlock, "scada:meta");
  if (!metaTag) {
    throw new Error("Missing <scada:meta> in SVG metadata");
  }

  const type = attrVal(metaTag, "type") ?? "";
  const label = attrVal(metaTag, "label") ?? type;
  const category = attrVal(metaTag, "category") ?? "uncategorized";
  const version = attrVal(metaTag, "version") ?? "1.0.0";
  const inlinePanelRaw = attrVal(metaTag, "inlinePropertyPanel");
  const inlinePropertyPanel = inlinePanelRaw === "true" || inlinePanelRaw === "1" || inlinePanelRaw === "yes";

  const viewBoxMatch = svgString.match(/viewBox\s*=\s*"([^"]+)"/);
  const viewBox = viewBoxMatch?.[1] ?? "0 0 100 100";
  const vbParts = viewBox.split(/\s+/).map(Number);
  const vbW = vbParts[2] || 100;
  const vbH = vbParts[3] || 100;

  // Prefer explicit width/height on <svg> root as default display size.
  // Only use numeric values (not "100%" or "auto"); fall back to viewBox dimensions.
  const svgRootMatch = svgString.match(/<svg\s([^>]*)>/);
  const svgRootAttrs = svgRootMatch?.[1] ?? "";
  const wAttr = svgRootAttrs.match(/\bwidth\s*=\s*"([^"]+)"/)?.[1];
  const hAttr = svgRootAttrs.match(/\bheight\s*=\s*"([^"]+)"/)?.[1];
  const parsedW = wAttr && /^\d+(\.\d+)?$/.test(wAttr) ? Number(wAttr) : null;
  const parsedH = hAttr && /^\d+(\.\d+)?$/.test(hAttr) ? Number(hAttr) : null;
  const defaultW = parsedW ?? vbW;
  const defaultH = parsedH ?? vbH;

  const propsSchema = parseProps(metaBlock);
  const mappings = parseMappings(metaBlock);
  const animations = parseAnimations(metaBlock);
  const renderFn = parseScript(metaBlock);
  const ports = parsePorts(metaBlock);

  const innerContent = svgString
    .replace(/<metadata[\s\S]*?<\/metadata>/i, "")
    .replace(/<\?xml[^?]*\?>\s*/i, "")
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();

  const svgBody = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${innerContent}</svg>`;

  return {
    type,
    label,
    category,
    version,
    viewBox,
    defaultSize: { width: defaultW, height: defaultH },
    svgContent: svgString,
    svgBody,
    propsSchema,
    mappings,
    animations,
    renderFn,
    ...(ports.length > 0 ? { ports } : {}),
    ...(inlinePropertyPanel ? { inlinePropertyPanel: true } : {}),
  };
}

function matchTag(block: string, tagName: string): string | null {
  const selfClose = new RegExp(`<${tagName}\\s([^>]*?)\\/>`, "i");
  const m1 = block.match(selfClose);
  if (m1) return m1[0];

  const open = new RegExp(`<${tagName}\\s([\\s\\S]*?)>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const m2 = block.match(open);
  if (m2) return m2[0];

  return null;
}

function matchAllTags(block: string, tagName: string): string[] {
  const results: string[] = [];

  const selfCloseRe = new RegExp(`<${tagName}\\s[^>]*?\\/>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = selfCloseRe.exec(block)) !== null) {
    results.push(m[0]);
  }

  const openRe = new RegExp(`<${tagName}\\s[\\s\\S]*?>[\\s\\S]*?<\\/${tagName}>`, "gi");
  while ((m = openRe.exec(block)) !== null) {
    results.push(m[0]);
  }

  return results;
}

function attrVal(tag: string, name: string): string | undefined {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i");
  const m = tag.match(re);
  if (m) return decodeXmlEntities(m[1]);
  const re2 = new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i");
  const m2 = tag.match(re2);
  return m2?.[1] ? decodeXmlEntities(m2[1]) : undefined;
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseProps(metaBlock: string): PropSchema[] {
  const tags = matchAllTags(metaBlock, "scada:prop");
  return tags.map((tag) => {
    const name = attrVal(tag, "name") ?? "";
    const type = (attrVal(tag, "type") as PropSchema["type"]) ?? "string";
    const schema: PropSchema = {
      name,
      type,
      label: attrVal(tag, "label") ?? name,
    };

    const def = attrVal(tag, "default");
    if (def != null) {
      switch (schema.type) {
        case "number":
          schema.default = Number(def);
          break;
        case "boolean":
          schema.default = def === "true";
          break;
        default:
          schema.default = def;
      }
    }

    const domain = attrVal(tag, "domain");
    schema.domain = domain === "control" || domain === "observe" ? domain : inferDomainBySchema(schema);
    schema.required = toBoolean(attrVal(tag, "required"));
    schema.semantic = attrVal(tag, "semantic") ?? inferSemanticByName(name);
    schema.unit = attrVal(tag, "unit");
    schema.hint = attrVal(tag, "hint");
    schema.bindable = toBoolean(attrVal(tag, "bindable"));
    schema.controllable = toBoolean(attrVal(tag, "controllable"));
    if (schema.bindable === undefined) schema.bindable = schema.domain === "observe";
    if (schema.controllable === undefined) schema.controllable = schema.domain === "control";

    if (schema.type === "number") {
      const min = attrVal(tag, "min");
      const max = attrVal(tag, "max");
      const step = attrVal(tag, "step");
      const precision = attrVal(tag, "precision");
      if (min != null) schema.min = Number(min);
      if (max != null) schema.max = Number(max);
      if (step != null) schema.step = Number(step);
      if (precision != null) schema.precision = Number(precision);
    }

    if (schema.type === "string") {
      const maxLength = attrVal(tag, "maxLength");
      const pattern = attrVal(tag, "pattern");
      if (maxLength != null) schema.maxLength = Number(maxLength);
      if (pattern != null) schema.pattern = pattern;
    }

    if (schema.type === "number" || schema.type === "string") {
      const unit = attrVal(tag, "unit");
      if (unit) schema.unit = unit;
    }

    if (schema.type === "select") {
      const optStr = attrVal(tag, "options");
      if (optStr) {
        try {
          const parsed = JSON.parse(optStr.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
          schema.options = Array.isArray(parsed) ? parsed : [];
        } catch {
          schema.options = [];
        }
      }
    }

    return schema;
  });
}

function toBoolean(value?: string): boolean | undefined {
  if (value == null) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function inferDomainBySchema(schema: Pick<PropSchema, "name" | "type">): "observe" | "control" {
  const key = schema.name.toLowerCase();
  const controlLike = ["command", "cmd", "setpoint", "set", "target", "desired", "open", "close", "start", "stop", "reset"];
  if (controlLike.some((token) => key.includes(token))) return "control";
  return "observe";
}

function inferSemanticByName(name: string): string | undefined {
  const key = name.toLowerCase();
  const semanticTable: Array<{ match: string; semantic: string }> = [
    { match: "running", semantic: "status.running" },
    { match: "flowing", semantic: "status.flowing" },
    { match: "fault", semantic: "status.fault" },
    { match: "speed", semantic: "status.speed" },
    { match: "state", semantic: "status.state" },
    { match: "color", semantic: "style.color" },
    { match: "label", semantic: "display.label" },
    { match: "content", semantic: "display.content" },
  ];
  const hit = semanticTable.find((item) => key.includes(item.match));
  return hit?.semantic;
}

function parseMappings(metaBlock: string): PropMapping[] {
  const tags = matchAllTags(metaBlock, "scada:map");
  return tags.map((tag) => ({
    prop: attrVal(tag, "prop") ?? "",
    selector: attrVal(tag, "selector") ?? "",
    attr: attrVal(tag, "attr") ?? "",
    transform: attrVal(tag, "transform"),
  }));
}

function parseAnimations(metaBlock: string): AnimationDef[] {
  const tags = matchAllTags(metaBlock, "scada:animation");
  return tags.map((tag, i) => {
    let keyframes: Keyframe[] = [];
    const kfStr = attrVal(tag, "keyframes");
    if (kfStr) {
      try {
        keyframes = JSON.parse(kfStr.replace(/&quot;/g, '"'));
      } catch {
        /* skip */
      }
    }

    const iterStr = attrVal(tag, "iterations") ?? "1";
    return {
      id: attrVal(tag, "id") ?? `anim-${i}`,
      triggerProp: attrVal(tag, "triggerProp") ?? "",
      triggerCondition: attrVal(tag, "triggerCondition") ?? "true",
      target: attrVal(tag, "target") ?? "",
      keyframes,
      duration: Number(attrVal(tag, "duration") ?? "1000"),
      iterations: iterStr === "Infinity" ? ("Infinity" as const) : Number(iterStr),
      easing: attrVal(tag, "easing") ?? "linear",
    };
  });
}

function parsePorts(metaBlock: string): PortDef[] {
  const portsBlockMatch = metaBlock.match(/<scada:ports>([\s\S]*?)<\/scada:ports>/i);
  if (!portsBlockMatch) return [];
  const portTags = matchAllTags(portsBlockMatch[1], "scada:port");
  return portTags
    .map((tag) => ({
      id: attrVal(tag, "id") ?? "",
      x: attrVal(tag, "x") ?? "50%",
      y: attrVal(tag, "y") ?? "50%",
    }))
    .filter((p) => p.id !== "");
}

function parseScript(metaBlock: string): ElementDef["renderFn"] | undefined {
  const scriptMatch = metaBlock.match(/<scada:script\s[^>]*type\s*=\s*"render"[^>]*>([\s\S]*?)<\/scada:script>/i);
  if (!scriptMatch) return undefined;

  let code = scriptMatch[1].trim();
  const cdataMatch = code.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) code = cdataMatch[1].trim();
  if (!code) return undefined;

  try {
    return new Function("svg", "props", "prevProps", code) as ElementDef["renderFn"];
  } catch {
    return undefined;
  }
}
