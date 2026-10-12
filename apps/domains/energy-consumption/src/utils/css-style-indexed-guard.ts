const GUARD_FLAG = "__g2CssStyleIndexedGuard";
const INSTALLED = Symbol.for("g2.cssStyleIndexedGuard.installed");

type GuardedElement = Element & { [GUARD_FLAG]?: CSSStyleDeclaration };
type StyleHost = { prototype: object };

function applyIndexedStyleValue(style: CSSStyleDeclaration, value: unknown, depth = 0): void {
  if (value == null || value === "" || depth > 4 || typeof value !== "object") {
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
    if (/^\d+$/.test(key)) {
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
      style.setProperty(
        key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`),
        text,
      );
    }
  }
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
      const guarded = new Proxy(style, {
        get(styleTarget, prop) {
          const value = Reflect.get(styleTarget, prop, styleTarget);
          return typeof value === "function" ? value.bind(styleTarget) : value;
        },
        set(styleTarget, prop, value) {
          if (typeof prop !== "symbol" && /^\d+$/.test(String(prop))) {
            applyIndexedStyleValue(styleTarget, value);
            return true;
          }
          return Reflect.set(styleTarget, prop, value, styleTarget);
        },
      });
      host[GUARD_FLAG] = guarded;
      return guarded;
    },
    set(value: string) {
      setter?.call(this, value);
    },
  });
}

/** Chrome 的 style 在 HTMLElement/SVGElement 上，能碳页渲染前安装，避免 style[0] 白屏。 */
export function installCssStyleIndexedGuard(): void {
  const view = globalThis as typeof globalThis & {
    HTMLElement?: StyleHost;
    SVGElement?: StyleHost;
    MathMLElement?: StyleHost;
  };
  installOnStyleHost(view.HTMLElement);
  installOnStyleHost(view.SVGElement);
  installOnStyleHost(view.MathMLElement);
}
