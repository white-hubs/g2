import type { ElementDef } from "../core";

function isHtmlMappedElement(el: Element): el is HTMLElement {
  return typeof HTMLElement !== "undefined" && el instanceof HTMLElement && !(el instanceof SVGElement);
}

export function applyMappings(root: Element, def: ElementDef, propVals: Record<string, any>): void {
  for (const m of def.mappings) {
    const el = root.querySelector(m.selector);
    if (!el) continue;

    const raw = propVals[m.prop];
    let val: any;
    if (m.transform) {
      try {
        // `value` = this prop's value; `props` = all prop values (allows cross-prop transforms)
        val = new Function("value", "props", `return (${m.transform})`)(raw, propVals);
      } catch {
        val = raw;
      }
    } else {
      val = raw;
    }

    if (m.attr === "textContent") {
      el.textContent = String(val ?? "");
    } else if (val != null && val !== "") {
      if (isHtmlMappedElement(el)) {
        if (m.attr === "font-size") {
          const n = typeof raw === "number" ? raw : Number.parseFloat(String(val));
          el.style.fontSize = Number.isFinite(n) ? `${n}px` : String(val);
        } else if (m.attr === "fill") {
          el.style.color = String(val);
        } else {
          el.setAttribute(m.attr, String(val));
        }
      } else {
        el.setAttribute(m.attr, String(val));
      }
    }
  }
}
