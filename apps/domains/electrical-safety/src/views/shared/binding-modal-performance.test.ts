import { describe, expect, it, mock } from "bun:test";
import { createRenderer, defineComponent, h, nextTick, onUpdated, shallowRef } from "vue";

let selectUpdateCount = 0;
let tagUpdateCount = 0;
let modalUpdateCount = 0;

const passthrough = (name: string) =>
  defineComponent({
    name,
    setup:
      (_props, { slots }) =>
      () =>
        h("div", slots.default?.()),
  });
const Select = defineComponent({
  name: "TestSelect",
  inheritAttrs: false,
  props: {
    mode: { type: String, default: "" },
    value: { type: [String, Array], default: undefined },
    options: { type: Array, default: () => [] },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    placeholder: { type: String, default: "" },
    style: { type: Object, default: undefined },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    onUpdated(() => {
      selectUpdateCount += 1;
    });
    return () =>
      h("test-select", {
        "data-select-kind": props.mode === "multiple" ? "property" : "binding",
        onClick: () => {
          if (props.mode !== "multiple") {
            emit("update:value", undefined);
            return;
          }
          const current = Array.isArray(props.value) ? props.value : [];
          emit("update:value", current.includes("__toggle") ? current.filter((code) => code !== "__toggle") : [...current, "__toggle"]);
        },
      });
  },
});
const Tag = defineComponent({
  name: "TestTag",
  setup: (_props, { slots }) => {
    onUpdated(() => {
      tagUpdateCount += 1;
    });
    return () => h("test-tag", slots.default?.());
  },
});
const Modal = defineComponent({
  name: "TestModal",
  setup: (_props, { slots }) => {
    onUpdated(() => {
      modalUpdateCount += 1;
    });
    return () => h("test-modal", slots.default?.());
  },
});

mock.module("@g2-platform/pc-ui", () => ({
  Empty: passthrough("Empty"),
  Modal,
  Select,
  Spin: passthrough("Spin"),
  Tag,
  message: { warning: () => undefined },
}));

interface HostNode {
  type: string;
  props: Record<string, unknown>;
  children: HostNode[];
  parent: HostNode | null;
  text?: string;
}

const renderer = createRenderer<HostNode, HostNode>({
  patchProp: (node, key, _previous, next) => {
    node.props[key] = next;
  },
  insert: (child, parent, anchor) => {
    child.parent = parent;
    if (!anchor) {
      parent.children.push(child);
    } else {
      parent.children.splice(parent.children.indexOf(anchor), 0, child);
    }
  },
  remove: (child) => {
    if (!child.parent) {
      return;
    }
    child.parent.children.splice(child.parent.children.indexOf(child), 1);
  },
  createElement: (type) => ({ type, props: {}, children: [], parent: null }),
  createText: (text) => ({ type: "#text", props: {}, children: [], parent: null, text }),
  createComment: (text) => ({ type: "#comment", props: {}, children: [], parent: null, text }),
  setText: (node, text) => {
    node.text = text;
  },
  setElementText: (node, text) => {
    node.children = [{ type: "#text", props: {}, children: [], parent: node, text }];
  },
  parentNode: (node) => node.parent,
  nextSibling: (node) => {
    if (!node.parent) {
      return null;
    }
    return node.parent.children[node.parent.children.indexOf(node) + 1] ?? null;
  },
  setScopeId: () => undefined,
  insertStaticContent: (content, parent, anchor) => {
    const node = { type: "#static", props: {}, children: [], parent, text: content };
    if (!anchor) {
      parent.children.push(node);
    } else {
      parent.children.splice(parent.children.indexOf(anchor), 0, node);
    }
    return [node, node];
  },
});

function findHostNode(node: HostNode, predicate: (candidate: HostNode) => boolean): HostNode | undefined {
  if (predicate(node)) {
    return node;
  }
  for (const child of node.children) {
    const match = findHostNode(child, predicate);
    if (match) {
      return match;
    }
  }
  return undefined;
}

async function measureSelectionUpdates(
  component: unknown,
  props: Record<string, unknown>,
  selectKind: "binding" | "property",
): Promise<{ modalUpdates: number; selectUpdates: number; tagUpdates: number }> {
  const open = shallowRef(false);
  const Root = defineComponent({
    setup: () => () => h(component as never, { ...props, open: open.value }),
  });
  const host: HostNode = { type: "root", props: {}, children: [], parent: null };
  const app = renderer.createApp(Root);
  app.config.warnHandler = () => undefined;
  app.mount(host);
  open.value = true;
  await nextTick();
  await nextTick();
  selectUpdateCount = 0;
  tagUpdateCount = 0;
  modalUpdateCount = 0;
  const targetSelect = findHostNode(host, (node) => node.props["data-select-kind"] === selectKind);
  if (!targetSelect) {
    throw new Error(`${selectKind} select was not rendered`);
  }
  (targetSelect.props.onClick as (() => void) | undefined)?.();
  await nextTick();
  const updates = { modalUpdates: modalUpdateCount, selectUpdates: selectUpdateCount, tagUpdates: tagUpdateCount };
  app.unmount();
  return updates;
}

const elements = Array.from({ length: 20 }, (_, index) => ({
  id: `element-${index}`,
  name: `绑定图元 ${index}`,
  type: "product-property-panel",
}));

describe("binding modal update scope", () => {
  it("updates only the changed facility-room row when selecting a property or clearing a binding", async () => {
    const { FacilityDeviceBindingModal } = await import("../device-monitoring/facility-device-binding-modal");
    const devices = elements.map((_, index) => ({
      deviceId: `device-${index}`,
      deviceName: `设备 ${index}`,
      productCode: "product",
      productName: "电气设备",
      productCategoryCode: "category",
      productCategoryName: "电气设备",
      onlineStatus: "ONLINE" as const,
      hasActiveAlarm: false,
      alarmLevelCode: null,
      alarmLevelName: null,
      maintenanceSummary: null,
      maintenanceStatus: "NORMAL" as const,
      displayProperties: [],
    }));
    const currentBindings = Object.fromEntries(elements.map((element, index) => [element.id, `device-${index}`]));
    const currentPropertyCodes = Object.fromEntries(elements.map((element) => [element.id, ["deviceName"]]));
    const deviceData = Object.fromEntries(
      elements.map((_, index) => [
        `device-${index}`,
        {
          basic: {
            deviceId: `device-${index}`,
            deviceCode: `D-${index}`,
            deviceName: `设备 ${index}`,
            productCode: "product",
            productName: "电气设备",
            productCategoryCode: "category",
            productCategoryName: "电气设备",
            brandName: null,
            model: null,
            facilityId: "facility-1",
            facilityName: "设施房",
            commissioningDate: null,
            deviceConfigDisplay: null,
            maintenanceCompany: null,
            onlineStatus: "ONLINE" as const,
          },
          realtime: { properties: [], methods: [] },
        },
      ]),
    );

    const modalProps = {
      elements,
      devices,
      deviceData,
      currentBindings,
      currentPropertyCodes,
      loadingDeviceIds: [],
      devicesLoading: false,
    };
    expect(await measureSelectionUpdates(FacilityDeviceBindingModal, modalProps, "property")).toEqual({
      modalUpdates: 0,
      selectUpdates: 1,
      tagUpdates: 0,
    });
    expect(await measureSelectionUpdates(FacilityDeviceBindingModal, modalProps, "binding")).toEqual({
      modalUpdates: 1,
      selectUpdates: 2,
      tagUpdates: 1,
    });
  });

  it("updates only the changed electrical-center row when selecting a property or clearing a binding", async () => {
    const { CenterFacilityBindingModal } = await import("../electrical-center/center-facility-binding-modal");
    const facilities = elements.map((_, index) => ({
      facilityId: `facility-${index}`,
      facilityName: `设施房 ${index}`,
      hasActiveAlarm: false,
      electricalDeviceTotal: 10,
      electricalDeviceOnline: 9,
      electricalDeviceOnlineRate: 90,
      displayProperties: [],
    }));
    const currentBindings = Object.fromEntries(elements.map((element, index) => [element.id, `facility-${index}`]));
    const currentPropertyCodes = Object.fromEntries(elements.map((element) => [element.id, ["facilityName"]]));

    const modalProps = {
      elements,
      facilities,
      currentBindings,
      currentPropertyCodes,
    };
    expect(await measureSelectionUpdates(CenterFacilityBindingModal, modalProps, "property")).toEqual({
      modalUpdates: 1,
      selectUpdates: 1,
      tagUpdates: 1,
    });
    expect(await measureSelectionUpdates(CenterFacilityBindingModal, modalProps, "binding")).toEqual({
      modalUpdates: 1,
      selectUpdates: 2,
      tagUpdates: 1,
    });
  });
});
