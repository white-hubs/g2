import { describe, expect, it } from "bun:test";

import {
  type FacilityDeviceScadaData,
  buildFacilityScadaRuntimeBindings,
  buildSingleDeviceScadaRuntimeBindings,
  coerceFacilityBindingToAvailable,
  deviceScadaDataToProperties,
  deviceScadaDataToValues,
  facilityScadaBindingKey,
  loadFacilityScadaBindingFromServer,
  readFacilityScadaBinding,
  readFacilityScadaPageId,
  reconcileFacilityScadaBinding,
  shouldPromptFacilityScadaBind,
  writeFacilityScadaBinding,
  writeFacilityScadaPageId,
} from "./facility-scada-binding";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

describe("facility scada binding", () => {
  it("stores and reads a page id per facility", () => {
    const storage = createMemoryStorage();
    writeFacilityScadaPageId("room-1", "page-a", storage);
    expect(readFacilityScadaPageId("room-1", storage)).toBe("page-a");
    expect(facilityScadaBindingKey("room-1")).toBe("electrical-safety:facility-scada-page:room-1");
    expect(readFacilityScadaPageId("room-2", storage)).toBeNull();
  });

  it("persists element devices and selected properties per facility", () => {
    const storage = createMemoryStorage();
    writeFacilityScadaBinding(
      "room-1",
      {
        pageId: "page-a",
        elementDeviceIds: { panelA: "device-1" },
        elementPropertyCodes: { panelA: ["temperature", "deviceName"] },
      },
      storage,
    );
    expect(readFacilityScadaBinding("room-1", storage)).toEqual({
      pageId: "page-a",
      elementDeviceIds: { panelA: "device-1" },
      elementPropertyCodes: { panelA: ["temperature", "deviceName"] },
    });
  });

  it("reads the legacy plain page id and migrates it on the next write", () => {
    const storage = createMemoryStorage();
    storage.setItem(facilityScadaBindingKey("room-1"), "legacy-page");
    expect(readFacilityScadaBinding("room-1", storage)).toEqual({ pageId: "legacy-page", elementDeviceIds: {} });
    writeFacilityScadaPageId("room-1", "legacy-page", storage);
    expect(JSON.parse(storage.getItem(facilityScadaBindingKey("room-1")) ?? "null")).toEqual({
      pageId: "legacy-page",
      elementDeviceIds: {},
    });
  });

  it("clears the binding when page id is empty", () => {
    const storage = createMemoryStorage();
    writeFacilityScadaPageId("room-1", "page-a", storage);
    writeFacilityScadaPageId("room-1", null, storage);
    expect(readFacilityScadaPageId("room-1", storage)).toBeNull();
  });

  it("keeps independent bindings when switching facilities", () => {
    const storage = createMemoryStorage();
    writeFacilityScadaPageId("room-1", "page-a", storage);
    writeFacilityScadaPageId("room-2", "page-b", storage);
    expect(readFacilityScadaPageId("room-1", storage)).toBe("page-a");
    expect(readFacilityScadaPageId("room-2", storage)).toBe("page-b");
  });

  it("uses the server binding and removes the obsolete local copy", async () => {
    const storage = createMemoryStorage();
    writeFacilityScadaPageId("room-1", "local-page", storage);
    const serverBinding = {
      pageId: "server-page",
      elementDeviceIds: { panelA: "device-1" },
      elementPropertyCodes: { panelA: ["temperature"] },
    };

    await expect(
      loadFacilityScadaBindingFromServer({
        facilityId: "room-1",
        storage,
        getBinding: async () => ({ content: JSON.stringify(serverBinding) }),
        saveBinding: async () => undefined,
      }),
    ).resolves.toEqual(serverBinding);
    expect(storage.getItem(facilityScadaBindingKey("room-1"))).toBeNull();
  });

  it("migrates one local binding when the server has no binding", async () => {
    const storage = createMemoryStorage();
    writeFacilityScadaBinding(
      "room-1",
      {
        pageId: "local-page",
        elementDeviceIds: { panelA: "device-1" },
        elementPropertyCodes: { panelA: ["temperature"] },
      },
      storage,
    );
    const savedPayloads: unknown[] = [];

    await expect(
      loadFacilityScadaBindingFromServer({
        facilityId: "room-1",
        storage,
        getBinding: async () => null,
        saveBinding: async (_facilityId, payload) => {
          savedPayloads.push(payload);
        },
      }),
    ).resolves.toEqual({
      pageId: "local-page",
      elementDeviceIds: { panelA: "device-1" },
      elementPropertyCodes: { panelA: ["temperature"] },
    });
    expect(savedPayloads).toEqual([
      {
        content: JSON.stringify({
          pageId: "local-page",
          elementDeviceIds: { panelA: "device-1" },
          elementPropertyCodes: { panelA: ["temperature"] },
        }),
      },
    ]);
    expect(JSON.stringify(savedPayloads)).not.toContain("revision");
    expect(storage.getItem(facilityScadaBindingKey("room-1"))).toBeNull();
  });

  it("keeps the local binding when migration to the server fails", async () => {
    const storage = createMemoryStorage();
    writeFacilityScadaPageId("room-1", "local-page", storage);

    await expect(
      loadFacilityScadaBindingFromServer({
        facilityId: "room-1",
        storage,
        getBinding: async () => null,
        saveBinding: async () => {
          throw new Error("save failed");
        },
      }),
    ).rejects.toThrow("save failed");
    expect(readFacilityScadaPageId("room-1", storage)).toBe("local-page");
  });

  it("rejects malformed non-empty server content without overwriting it", async () => {
    const savedPayloads: unknown[] = [];
    await expect(
      loadFacilityScadaBindingFromServer({
        facilityId: "room-1",
        getBinding: async () => ({ content: "not-json" }),
        saveBinding: async (_facilityId, payload) => {
          savedPayloads.push(payload);
        },
      }),
    ).rejects.toThrow("设施房二维组态绑定内容格式无效");
    expect(savedPayloads).toEqual([]);
  });

  it("drops stale bindings that are no longer in the facility-room list", () => {
    expect(coerceFacilityBindingToAvailable("page-a", ["page-a", "page-b"])).toBe("page-a");
    expect(coerceFacilityBindingToAvailable("page-gone", ["page-a"])).toBeNull();
    expect(coerceFacilityBindingToAvailable(null, ["page-a"])).toBeNull();
  });

  it("drops a stale page and removed element mappings", () => {
    const binding = {
      pageId: "page-a",
      elementDeviceIds: { panelA: "device-1", removed: "device-2" },
      elementPropertyCodes: { panelA: ["temperature"], removed: ["humidity"] },
    };
    expect(reconcileFacilityScadaBinding(binding, [])).toBeNull();
    expect(reconcileFacilityScadaBinding(binding, [{ id: "page-a", bindableElements: [{ id: "panelA" }] }])).toEqual({
      pageId: "page-a",
      elementDeviceIds: { panelA: "device-1" },
      elementPropertyCodes: { panelA: ["temperature"] },
    });
  });

  it("prompts bind only on first scada visit of an unbound facility", () => {
    const base = {
      facilityId: "room-1",
      boundPageId: null,
      promptedFacilityIds: [] as string[],
      hasPages: true,
      loading: false,
      viewIsScada: true,
    };
    expect(shouldPromptFacilityScadaBind(base)).toBe(true);
    expect(shouldPromptFacilityScadaBind({ ...base, promptedFacilityIds: ["room-1"] })).toBe(false);
    expect(shouldPromptFacilityScadaBind({ ...base, boundPageId: "page-a" })).toBe(false);
    expect(shouldPromptFacilityScadaBind({ ...base, facilityId: "room-2", promptedFacilityIds: ["room-1"] })).toBe(true);
    expect(shouldPromptFacilityScadaBind({ ...base, viewIsScada: false })).toBe(false);
  });

  it("converts device basic information and realtime parameters for scada", () => {
    const data: FacilityDeviceScadaData = {
      basic: {
        deviceId: "device-1",
        deviceCode: "D-001",
        deviceName: "一号进线柜",
        productCode: "P-001",
        productName: "智能断路器",
        productCategoryCode: "breaker",
        productCategoryName: "断路器",
        brandName: "正泰",
        model: "NXM",
        facilityId: "room-1",
        facilityName: "一号配电房",
        commissioningDate: "2026-08-01",
        deviceConfigDisplay: null,
        maintenanceCompany: null,
        onlineStatus: "ONLINE",
      },
      realtime: {
        properties: [
          {
            deviceId: "device-1",
            deviceName: "一号进线柜",
            propertyCode: "temperature",
            propertyName: "温度",
            value: 26.5,
            unit: "℃",
            status: "NORMAL",
            dataType: "number",
          },
        ],
        methods: [],
      },
    };

    expect(deviceScadaDataToValues(data)).toEqual(
      expect.objectContaining({
        deviceName: "一号进线柜",
        deviceCode: "D-001",
        productName: "智能断路器",
        facilityName: "一号配电房",
        onlineStatusText: "在线",
        temperature: 26.5,
      }),
    );
    expect(deviceScadaDataToProperties(data)).toEqual(
      expect.arrayContaining([
        { propCode: "deviceName", propName: "设备名称", dataType: "string" },
        { propCode: "temperature", propName: "温度", dataType: "number", unitName: "℃" },
      ]),
    );

    const [runtimeBinding] = buildFacilityScadaRuntimeBindings(
      {
        pageId: "page-a",
        elementDeviceIds: { panelA: "device-1" },
        elementPropertyCodes: { panelA: ["temperature", "deviceName"] },
      },
      { "device-1": data },
    );
    expect(runtimeBinding).toEqual(
      expect.objectContaining({
        elementId: "panelA",
        deviceId: "device-1",
        propertySelectionExplicit: true,
        properties: [
          { propCode: "temperature", propName: "温度", dataType: "number", unitName: "℃" },
          { propCode: "deviceName", propName: "设备名称", dataType: "string" },
        ],
      }),
    );

    const singleDeviceBindings = buildSingleDeviceScadaRuntimeBindings(["meter", "status", "meter", ""], data);
    expect(singleDeviceBindings.map((binding) => binding.elementId)).toEqual(["meter", "status"]);
    expect(singleDeviceBindings).toEqual([
      expect.objectContaining({
        elementId: "meter",
        deviceId: "device-1",
        values: expect.objectContaining({ deviceName: "一号进线柜", temperature: 26.5 }),
      }),
      expect.objectContaining({
        elementId: "status",
        deviceId: "device-1",
        values: expect.objectContaining({ deviceName: "一号进线柜", temperature: 26.5 }),
      }),
    ]);
  });
});
