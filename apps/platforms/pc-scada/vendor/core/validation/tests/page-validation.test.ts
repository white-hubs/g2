import { describe, expect, it } from "vitest";

import { registry } from "../../registry";
import type { PageModel } from "../../types";
import { validatePageModel } from "../page-validation";

function makePage(overrides?: Partial<PageModel>): PageModel {
  return {
    version: "1.1",
    id: "page-1",
    name: "Validation",
    width: 800,
    height: 600,
    background: "#fff",
    grid: { show: true, size: 10, snap: true },
    globals: { deviceId: "dev-1" },
    aliases: [],
    tags: [],
    elements: [],
    connections: [],
    ...overrides,
  };
}

describe("validatePageModel", () => {
  it("reports missing action target element", () => {
    const page = makePage({
      elements: [
        {
          id: "el-1",
          type: "button",
          x: 0,
          y: 0,
          width: 50,
          height: 20,
          rotation: 0,
          zIndex: 0,
          locked: false,
          visible: true,
          props: {},
          bindings: [],
          eventHandlers: [
            {
              event: "click",
              actions: [
                {
                  type: "setTag",
                  params: {
                    tag: "PLC1.Tag",
                    value: 1,
                    targetElementId: "el-not-exists",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const result = validatePageModel(page);
    expect(result.errors.some((item) => item.code === "ACTION_TARGET_ELEMENT_NOT_FOUND")).toBe(true);
  });

  it("reports undefined global variable references", () => {
    const page = makePage({
      elements: [
        {
          id: "el-1",
          type: "text",
          x: 0,
          y: 0,
          width: 100,
          height: 20,
          rotation: 0,
          zIndex: 0,
          locked: false,
          visible: true,
          props: {},
          bindings: [{ id: "b-1", propName: "value", tagName: "PLC1.${global.undefinedKey}.Tag" }],
          eventHandlers: [],
        },
      ],
    });

    const result = validatePageModel(page);
    expect(result.errors.some((item) => item.code === "BINDING_GLOBAL_UNDEFINED")).toBe(true);
  });

  it("reports binding prop not in element schema", () => {
    registry.clear();
    registry.register({
      type: "text",
      label: "Text",
      category: "basic",
      version: "1.0.0",
      viewBox: "0 0 100 20",
      defaultSize: { width: 100, height: 20 },
      svgContent: "<svg />",
      svgBody: "<svg />",
      propsSchema: [{ name: "content", label: "Content", type: "string", domain: "observe" }],
      mappings: [],
      animations: [],
    });

    const page = makePage({
      elements: [
        {
          id: "el-1",
          type: "text",
          x: 0,
          y: 0,
          width: 100,
          height: 20,
          rotation: 0,
          zIndex: 0,
          locked: false,
          visible: true,
          props: {},
          bindings: [{ id: "b-1", propName: "unknown", tagName: "PLC1.Tag1" }],
          eventHandlers: [],
        },
      ],
    });

    const result = validatePageModel(page);
    expect(result.errors.some((item) => item.code === "BINDING_PROP_NOT_IN_SCHEMA")).toBe(true);
    registry.clear();
  });

  it("warns for control prop without semantic and range constraints", () => {
    registry.clear();
    registry.register({
      type: "controller",
      label: "Controller",
      category: "industrial",
      version: "1.0.0",
      viewBox: "0 0 100 20",
      defaultSize: { width: 100, height: 20 },
      svgContent: "<svg />",
      svgBody: "<svg />",
      propsSchema: [{ name: "setpoint", label: "Setpoint", type: "number", domain: "control", controllable: false }],
      mappings: [],
      animations: [],
    });

    const page = makePage({
      elements: [
        {
          id: "el-ctrl",
          type: "controller",
          x: 0,
          y: 0,
          width: 100,
          height: 20,
          rotation: 0,
          zIndex: 0,
          locked: false,
          visible: true,
          props: {},
          bindings: [],
          eventHandlers: [],
        },
      ],
    });

    const result = validatePageModel(page);
    expect(result.warnings.some((item) => item.code === "CONTROL_PROP_SEMANTIC_RECOMMENDED")).toBe(true);
    expect(result.warnings.some((item) => item.code === "CONTROL_PROP_CONTROLLABLE_RECOMMENDED")).toBe(true);
    expect(result.warnings.some((item) => item.code === "CONTROL_PROP_RANGE_RECOMMENDED")).toBe(true);
    expect(result.warnings.some((item) => item.code === "CONTROL_PROP_WITHOUT_ACTION")).toBe(true);
    registry.clear();
  });
});
