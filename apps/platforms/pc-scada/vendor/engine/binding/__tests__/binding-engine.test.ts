import { describe, expect, it, vi } from "vitest";

import type { ElementInstance, TagValueMap } from "../../../core";
import { registry } from "../../../core";
import { BindingEngine } from "../binding-engine";

describe("BindingEngine", () => {
  it("binds values from driver and applies transform", () => {
    let callback: ((values: TagValueMap) => void) | null = null;
    const unsubscribe = vi.fn();

    const engine = new BindingEngine();
    engine.setDriver({
      subscribe(tags, cb) {
        callback = cb;
        return unsubscribe;
      },
      read: vi.fn(async () => ({})),
      write: vi.fn(async () => {}),
    });

    const instance: ElementInstance = {
      id: "el-1",
      type: "pump",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: 0,
      locked: false,
      visible: true,
      props: { statusText: "idle" },
      bindings: [
        {
          id: "b-1",
          propName: "statusText",
          tagName: "Alias.Temp",
          transform: "value > 50 ? 'hot' : 'cold'",
        },
      ],
      eventHandlers: [],
    };

    engine.bind([instance], [{ alias: "Alias.Temp", tagName: "PLC.Temp" }]);
    if (callback) {
      callback({
        "PLC.Temp": { value: 78, quality: "good", timestamp: Date.now() },
      });
    }

    expect(engine.getProps("el-1")?.statusText).toBe("hot");
  });

  it("resolves ${global.xxx} template in binding tagName", () => {
    let callback: ((values: TagValueMap) => void) | null = null;

    const engine = new BindingEngine();
    engine.setGlobals({ deviceId: "Pump1" });
    engine.setDriver({
      subscribe(_tags, cb) {
        callback = cb;
        return () => {};
      },
      read: vi.fn(async () => ({})),
      write: vi.fn(async () => {}),
    });

    const instance: ElementInstance = {
      id: "el-g1",
      type: "pump",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: 0,
      locked: false,
      visible: true,
      props: { running: false },
      bindings: [{ id: "b-g1", propName: "running", tagName: "PLC1.${global.deviceId}.Running" }],
      eventHandlers: [],
    };

    engine.bind([instance]);
    if (callback) {
      callback({
        "PLC1.Pump1.Running": { value: true, quality: "good", timestamp: Date.now() },
      });
    }

    expect(engine.getProps("el-g1")?.running).toBe(true);
  });

  it("falls back to global key when single-token value is empty", () => {
    let callback: ((values: TagValueMap) => void) | null = null;

    const engine = new BindingEngine();
    engine.setGlobals({ running: "" });
    engine.setDriver({
      subscribe(_tags, cb) {
        callback = cb;
        return () => {};
      },
      read: vi.fn(async () => ({})),
      write: vi.fn(async () => {}),
    });

    const instance: ElementInstance = {
      id: "el-g2",
      type: "pump",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: 0,
      locked: false,
      visible: true,
      props: { running: false },
      bindings: [{ id: "b-g2", propName: "running", tagName: "${global.running}" }],
      eventHandlers: [],
    };

    engine.bind([instance]);
    if (callback) {
      callback({
        running: { value: true, quality: "good", timestamp: Date.now() },
      });
    }

    expect(engine.getProps("el-g2")?.running).toBe(true);
  });

  it("subscribes propertyBindings propCodes for inlinePropertyPanel and synthesizes displayBody", () => {
    let callback: ((values: TagValueMap) => void) | null = null;

    registry.register({
      type: "product-property-panel",
      label: "Panel",
      category: "basic",
      version: "1.0.0",
      viewBox: "0 0 200 120",
      defaultSize: { width: 200, height: 120 },
      svgContent: "",
      svgBody: "",
      propsSchema: [
        {
          name: "displayBody",
          type: "string",
          label: "Display",
          default: "\uFF08\u672A\u7ED1\u5B9A\u4EA7\u54C1\u5B57\u6BB5\uFF09",
          domain: "observe",
        },
      ],
      mappings: [],
      animations: [],
      inlinePropertyPanel: true,
    });

    const engine = new BindingEngine();
    engine.setDriver({
      subscribe(_tags, cb) {
        callback = cb;
        return () => {};
      },
      read: vi.fn(async () => ({})),
      write: vi.fn(async () => {}),
    });

    const instance: ElementInstance = {
      id: "panel-1",
      type: "product-property-panel",
      x: 0,
      y: 0,
      width: 200,
      height: 120,
      rotation: 0,
      zIndex: 0,
      locked: false,
      visible: true,
      props: { displayBody: "\uFF08\u672A\u7ED1\u5B9A\u4EA7\u54C1\u5B57\u6BB5\uFF09" },
      bindings: [],
      eventHandlers: [],
      propertyBindings: [
        { propCode: "T1", propName: "Temp" },
        { propCode: "P1", propName: "Pressure", unitName: "kPa" },
      ],
    };

    engine.bind([instance]);
    if (callback) {
      callback({
        T1: { value: 42, quality: "good", timestamp: Date.now() },
        P1: { value: 1.2, quality: "good", timestamp: Date.now() },
      });
    }

    expect(engine.getProps("panel-1")?.displayBody).toContain("Temp: 42");
    expect(engine.getProps("panel-1")?.displayBody).toContain("Pressure: 1.2 kPa");

    registry.unregister("product-property-panel");
  });

  it("disposes all subscriptions", () => {
    const unsubscribe = vi.fn();
    const engine = new BindingEngine();
    engine.setDriver({
      subscribe() {
        return unsubscribe;
      },
      read: vi.fn(async () => ({})),
      write: vi.fn(async () => {}),
    });

    const instance: ElementInstance = {
      id: "el-2",
      type: "valve",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: 0,
      locked: false,
      visible: true,
      props: {},
      bindings: [{ id: "b-2", propName: "open", tagName: "PLC.Valve.Open" }],
      eventHandlers: [],
    };

    engine.bind([instance]);
    engine.dispose();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
