import { describe, expect, test } from "vitest";

import { guardCssStyleDeclaration, installCssStyleIndexedGuard } from "./css-style-indexed-guard";

describe("guardCssStyleDeclaration", () => {
  test("索引写入被吞掉，普通样式仍写入目标", () => {
    const raw = {
      color: "",
    };
    const throwing = new Proxy(raw, {
      set(target, prop, value) {
        if (String(prop) === "0") {
          throw new TypeError("Failed to set an indexed property [0] on 'CSSStyleDeclaration': Indexed property setter is not supported.");
        }
        return Reflect.set(target, prop, value);
      },
    });
    const style = guardCssStyleDeclaration(throwing as unknown as CSSStyleDeclaration) as CSSStyleDeclaration & {
      color: string;
      0?: string;
    };
    expect(() => {
      style[0] = "boom";
    }).not.toThrow();
    style.color = "red";
    expect(raw.color).toBe("red");
  });

  test("索引里的样式对象会写回真实 style，而不是丢弃", () => {
    const raw = { color: "", width: "" };
    const throwing = new Proxy(raw, {
      set(target, prop, value) {
        if (String(prop) === "0") {
          throw new TypeError("Failed to set an indexed property [0] on 'CSSStyleDeclaration': Indexed property setter is not supported.");
        }
        return Reflect.set(target, prop, value);
      },
    });
    const style = guardCssStyleDeclaration(throwing as unknown as CSSStyleDeclaration) as CSSStyleDeclaration & {
      color: string;
      width: string;
    };
    expect(() => {
      style[0] = { color: "red", width: "12px" } as unknown as string;
    }).not.toThrow();
    expect(raw.color).toBe("red");
    expect(raw.width).toBe("12px");
  });
});

describe("installCssStyleIndexedGuard", () => {
  test("安装后元素仍能写普通 inline style", () => {
    installCssStyleIndexedGuard(window);
    const el = document.createElement("div");
    el.style.color = "rgb(1, 2, 3)";
    expect(el.style.color).toBe("rgb(1, 2, 3)");
  });
});
