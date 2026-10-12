const GUARD_FLAG = "__g2CssStyleIndexedGuard";
const INSTALLED = Symbol.for("g2.cssStyleIndexedGuard.installed");

type GuardedElement = Element & { [GUARD_FLAG]?: CSSStyleDeclaration };
type StyleHost = { prototype: object };

function isIndexedStyleKey(prop: string | symbol): boolean {
  return typeof prop !== "symbol" && /^\d+$/.test(String(prop));
}

function hyphenate(name: string): string {
  return name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

/** Vue 把 style 数组写成 style[0] 时，把里面的真实样式补回去，避免只吞错导致样式丢失。 */
function applyIndexedStyleValue(style: CSSStyleDeclaration, value: unknown, depth = 0): void {
  if (value == null || value === "" || depth > 4) {
    return;
  }
  if (typeof value === "string") {
    if (value.includes(":")) {
      style.cssText = style.cssText ? `${style.cssText.replace(/;?\s*$/, ";")}${value}` : value;
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      applyIndexedStyleValue(style, item, depth + 1);
    }
    return;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const item = (value as Record<string, unknown>)[key];
    if (isIndexedStyleKey(key)) {
      applyIndexedStyleValue(style, item, depth + 1);
      continue;
    }
    if (item == null) {
      continue;
    }
    const text = Array.isArray(item) ? item.filter((part) => part != null && part !== "").join(" ") : String(item);
    try {
      (style as unknown as Record<string, string>)[key] = text;
    } catch {
      style.setProperty(hyphenate(key), text);
    }
  }
}

export function guardCssStyleDeclaration(style: CSSStyleDeclaration): CSSStyleDeclaration {
  return new Proxy(style, {
    get(styleTarget, prop) {
      const value = Reflect.get(styleTarget, prop, styleTarget);
      return typeof value === "function" ? value.bind(styleTarget) : value;
    },
    set(styleTarget, prop, value) {
      if (isIndexedStyleKey(prop)) {
        applyIndexedStyleValue(styleTarget, value);
        return true;
      }
      return Reflect.set(styleTarget, prop, value, styleTarget);
    },
  });
}

function installOnStyleHost(ctor: StyleHost | undefined): void {
  if (!ctor) {
    return;
  }
  const proto = ctor.prototype as { [INSTALLED]?: boolean };
  if (proto[INSTALLED]) {
    return;
  }
  const desc = Object.getOwnPropertyDescriptor(proto, "style");
  const getter = desc?.get;
  if (!getter) {
    return;
  }
  proto[INSTALLED] = true;
  const setter = desc.set;
  Object.defineProperty(proto, "style", {
    configurable: true,
    enumerable: desc.enumerable ?? true,
    get() {
      const style = getter.call(this) as CSSStyleDeclaration;
      const host = this as GuardedElement;
      const cached = host[GUARD_FLAG];
      if (cached) {
        return cached;
      }
      const guarded = guardCssStyleDeclaration(style);
      host[GUARD_FLAG] = guarded;
      return guarded;
    },
    set(value: string) {
      setter?.call(this, value);
    },
  });
}

/**
 * Chrome 的 `style` 在 HTMLElement / SVGElement 上（不是 Element），且带 setter。
 * 必须改这些原型，否则 `el.style[0] = ...` 仍会抛错并白屏。
 */
export function installCssStyleIndexedGuard(target: Window = window): void {
  const view = target as Window & {
    HTMLElement?: StyleHost;
    SVGElement?: StyleHost;
    MathMLElement?: StyleHost;
  };
  installOnStyleHost(view.HTMLElement);
  installOnStyleHost(view.SVGElement);
  installOnStyleHost(view.MathMLElement);
}

if (typeof window !== "undefined") {
  installCssStyleIndexedGuard(window);
}
