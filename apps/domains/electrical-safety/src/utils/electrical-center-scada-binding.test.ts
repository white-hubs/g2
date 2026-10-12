import type { ElectricalFacilityOverview } from "@g2-contract/electrical-safety";
import type { PageModel } from "@g2-platform/pc-scada/core";
import { describe, expect, it, mock } from "bun:test";

import {
  applyScadaRuntimeElementData,
  buildElectricalCenterRuntimeBindings,
  loadElectricalCenterScadaBindingFromServer,
  reconcileElectricalCenterScadaBinding,
  toElectricalCenterScadaBindingSaveRequest,
} from "./electrical-center-scada-binding";

const LEGACY_BINDING_KEY = "electrical-safety:electrical-center-scada-binding";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => map.delete(key),
    setItem: (key, value) => map.set(key, String(value)),
  };
}

describe("electrical-center scada binding", () => {
  it("uses the server binding and removes the obsolete local copy", async () => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_BINDING_KEY, JSON.stringify({ pageId: "local-page", elementFacilityIds: {} }));
    const saveBinding = mock(async () => {});

    await expect(
      loadElectricalCenterScadaBindingFromServer({
        getBinding: async () => ({
          content: JSON.stringify({
            pageId: "server-page",
            elementFacilityIds: { "element-a": "facility-1" },
            elementPropertyCodes: { "element-a": ["facilityName"] },
          }),
        }),
        saveBinding,
        storage,
      }),
    ).resolves.toEqual({
      pageId: "server-page",
      elementFacilityIds: { "element-a": "facility-1" },
      elementPropertyCodes: { "element-a": ["facilityName"] },
    });
    expect(saveBinding).not.toHaveBeenCalled();
    expect(storage.getItem(LEGACY_BINDING_KEY)).toBeNull();
  });

  it("migrates the legacy local binding once when the server has no binding", async () => {
    const storage = createMemoryStorage();
    storage.setItem(
      LEGACY_BINDING_KEY,
      JSON.stringify({
        pageId: "center-page",
        elementFacilityIds: { "element-a": "facility-1" },
        elementPropertyCodes: { "element-a": ["temperature", "facilityName"] },
      }),
    );
    const saveBinding = mock(async () => {});

    await expect(loadElectricalCenterScadaBindingFromServer({ getBinding: async () => null, saveBinding, storage })).resolves.toEqual({
      pageId: "center-page",
      elementFacilityIds: { "element-a": "facility-1" },
      elementPropertyCodes: { "element-a": ["temperature", "facilityName"] },
    });
    expect(saveBinding).toHaveBeenCalledWith({
      content: JSON.stringify({
        pageId: "center-page",
        elementFacilityIds: { "element-a": "facility-1" },
        elementPropertyCodes: { "element-a": ["temperature", "facilityName"] },
      }),
    });
    expect(storage.getItem(LEGACY_BINDING_KEY)).toBeNull();
  });

  it("keeps the legacy local binding when migration fails", async () => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_BINDING_KEY, JSON.stringify({ pageId: "center-page", elementFacilityIds: {} }));

    await expect(
      loadElectricalCenterScadaBindingFromServer({
        getBinding: async () => null,
        saveBinding: async () => {
          throw new Error("save failed");
        },
        storage,
      }),
    ).rejects.toThrow("save failed");
    expect(storage.getItem(LEGACY_BINDING_KEY)).not.toBeNull();
  });

  it("converts the full binding to a server save payload", () => {
    expect(
      toElectricalCenterScadaBindingSaveRequest({
        pageId: "center-page",
        elementFacilityIds: { "element-a": "facility-1" },
        elementPropertyCodes: { "element-a": ["facilityName"] },
      }),
    ).toEqual({
      content: JSON.stringify({
        pageId: "center-page",
        elementFacilityIds: { "element-a": "facility-1" },
        elementPropertyCodes: { "element-a": ["facilityName"] },
      }),
    });
  });

  it("rejects malformed non-empty server content without overwriting it", async () => {
    const saveBinding = mock(async () => {});
    await expect(
      loadElectricalCenterScadaBindingFromServer({
        getBinding: async () => ({ content: "not-json" }),
        saveBinding,
      }),
    ).rejects.toThrow("电气中心二维组态绑定内容格式无效");
    expect(saveBinding).not.toHaveBeenCalled();
  });

  it("drops stale pages and removed binding elements", () => {
    const binding = {
      pageId: "center-page",
      elementFacilityIds: { "element-a": "facility-1", removed: "facility-2" },
    };
    expect(reconcileElectricalCenterScadaBinding(binding, [])).toBeNull();
    expect(reconcileElectricalCenterScadaBinding(binding, [{ id: "center-page", bindableElements: [{ id: "element-a" }] }])).toEqual({
      pageId: "center-page",
      elementFacilityIds: { "element-a": "facility-1" },
    });
  });

  it("isolates equal facility property codes by scada element", () => {
    const page = {
      id: "center-page",
      name: "电气中心",
      elements: [
        {
          id: "element-a",
          label: "A",
          bindings: [{ id: "a-name", propName: "text", tagName: "facilityName" }],
          propertyBindings: [{ propCode: "temperature", propName: "温度", unitName: "℃" }],
        },
        {
          id: "element-b",
          label: "B",
          bindings: [{ id: "b-name", propName: "text", tagName: "facilityName" }],
          propertyBindings: [{ propCode: "temperature", propName: "温度", unitName: "℃" }],
        },
      ],
    } as unknown as PageModel;
    const applied = applyScadaRuntimeElementData(page, [
      { elementId: "element-a", deviceId: "facility-1", values: { facilityName: "一号房", temperature: 26 } },
      { elementId: "element-b", deviceId: "facility-2", values: { facilityName: "二号房", temperature: 31 } },
    ]);

    expect(applied.page.elements[0].deviceId).toBe("facility-1");
    expect(applied.page.elements[1].deviceId).toBe("facility-2");
    expect(applied.page.elements[0].bindings[0].tagName).not.toBe(applied.page.elements[1].bindings[0].tagName);
    expect(applied.tagValues[applied.page.elements[0].bindings[0].tagName]).toBe("一号房");
    expect(applied.tagValues[applied.page.elements[1].bindings[0].tagName]).toBe("二号房");
    expect(applied.tagValues[applied.page.elements[0].propertyBindings?.[0].propCode ?? ""]).toBe(26);
    expect(applied.tagValues[applied.page.elements[1].propertyBindings?.[0].propCode ?? ""]).toBe(31);
  });

  it("creates facility fields for a bound inline panel without configured product properties", () => {
    const page = {
      id: "center-page",
      name: "电气中心",
      elements: [
        {
          id: "element-a",
          type: "product-property-panel",
          label: "设施房",
          bindings: [],
          propertyBindings: [],
        },
      ],
    } as unknown as PageModel;

    const applied = applyScadaRuntimeElementData(page, [
      {
        elementId: "element-a",
        deviceId: "facility-1",
        values: {
          facilityName: "一号配电房",
          alarmStatusText: "正常",
          deviceOnlineSummary: "7/8",
          temperature: 26.5,
        },
        properties: [
          { propCode: "facilityName", propName: "设施房名称", dataType: "string" },
          { propCode: "alarmStatusText", propName: "运行状态", dataType: "string" },
          { propCode: "deviceOnlineSummary", propName: "设备在线", dataType: "string" },
          { propCode: "temperature", propName: "温度", unitName: "℃", dataType: "number" },
        ],
      },
    ]);

    expect(applied.page.elements[0].propertyBindings?.map((binding) => binding.propName)).toEqual([
      "设施房名称",
      "运行状态",
      "设备在线",
      "温度",
    ]);
    expect(applied.page.elements[0].propertyBindings?.map((binding) => applied.tagValues[binding.propCode])).toEqual([
      "一号配电房",
      "正常",
      "7/8",
      26.5,
    ]);
  });

  it("builds runtime data from the facility overview used below the center", () => {
    const facility = {
      facilityId: "facility-1",
      facilityName: "一号配电房",
      hasActiveAlarm: false,
      electricalDeviceTotal: 8,
      electricalDeviceOnline: 7,
      electricalDeviceOnlineRate: 87.5,
      displayProperties: [
        {
          deviceId: "device-1",
          deviceName: "温感",
          propertyCode: "temperature",
          propertyName: "温度",
          value: 26.5,
          unit: "℃",
          status: "NORMAL",
          collectTime: null,
        },
      ],
    } satisfies ElectricalFacilityOverview;

    expect(
      buildElectricalCenterRuntimeBindings({ pageId: "center-page", elementFacilityIds: { "element-a": "facility-1" } }, [facility]),
    ).toEqual([
      {
        elementId: "element-a",
        deviceId: "facility-1",
        values: expect.objectContaining({
          facilityName: "一号配电房",
          alarmStatusText: "正常",
          deviceOnlineSummary: "7/8",
          electricalDeviceOnline: 7,
          temperature: 26.5,
        }),
        properties: [
          { propCode: "facilityName", propName: "设施房名称", dataType: "string" },
          { propCode: "alarmStatusText", propName: "运行状态", dataType: "string" },
          { propCode: "deviceOnlineSummary", propName: "设备在线", dataType: "string" },
          { propCode: "temperature", propName: "温度", dataType: "number", unitName: "℃" },
        ],
      },
    ]);
  });

  it("uses the business-selected property order and marks it as an explicit override", () => {
    const facility = {
      facilityId: "facility-1",
      facilityName: "一号配电房",
      hasActiveAlarm: false,
      electricalDeviceTotal: 8,
      electricalDeviceOnline: 7,
      electricalDeviceOnlineRate: 87.5,
      displayProperties: [
        {
          deviceId: "device-1",
          deviceName: "温感",
          propertyCode: "temperature",
          propertyName: "温度",
          value: 26.5,
          unit: "℃",
          status: "NORMAL",
          collectTime: null,
        },
      ],
    } satisfies ElectricalFacilityOverview;

    const [runtimeBinding] = buildElectricalCenterRuntimeBindings(
      {
        pageId: "center-page",
        elementFacilityIds: { "element-a": "facility-1" },
        elementPropertyCodes: { "element-a": ["temperature", "facilityName"] },
      },
      [facility],
    );

    expect(runtimeBinding?.propertySelectionExplicit).toBe(true);
    expect(runtimeBinding?.properties?.map((property) => property.propCode)).toEqual(["temperature", "facilityName"]);
  });

  it("lets an explicit business property selection override canvas product fields", () => {
    const page = {
      id: "center-page",
      name: "电气中心",
      elements: [
        {
          id: "element-a",
          type: "product-property-panel",
          bindings: [],
          propertyBindings: [{ propCode: "temperature", propName: "温度" }],
        },
      ],
    } as unknown as PageModel;

    const applied = applyScadaRuntimeElementData(page, [
      {
        elementId: "element-a",
        deviceId: "facility-1",
        values: { facilityName: "一号配电房", temperature: 26.5 },
        properties: [{ propCode: "facilityName", propName: "设施房名称", dataType: "string" }],
        propertySelectionExplicit: true,
      },
    ]);

    expect(applied.page.elements[0].propertyBindings?.map((property) => property.propName)).toEqual(["设施房名称"]);
  });
});
