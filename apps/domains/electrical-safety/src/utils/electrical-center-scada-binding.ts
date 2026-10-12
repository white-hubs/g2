import type {
  ElectricalCenterScadaBindingContent,
  ElectricalCenterScadaBindingSaveRequest,
  ElectricalFacilityOverview,
} from "@g2-contract/electrical-safety";
import type { ElementPropertyBinding, PageModel } from "@g2-platform/pc-scada/core";

const CENTER_SCADA_BINDING_KEY = "electrical-safety:electrical-center-scada-binding";

export type ScadaRuntimeValue = string | number | boolean;

export interface ElectricalCenterScadaBinding {
  pageId: string;
  elementFacilityIds: Record<string, string>;
  /** 用户在电气中心业务配置中明确选择的属性编码，缺省时沿用画布配置或设施房全部属性。 */
  elementPropertyCodes?: Record<string, string[]>;
}

export interface ElectricalCenterFacilityBindingSelection {
  elementFacilityIds: Record<string, string>;
  elementPropertyCodes: Record<string, string[]>;
}

export interface ScadaRuntimeElementDataBinding {
  elementId: string;
  deviceId: string;
  values: Record<string, ScadaRuntimeValue>;
  /** 空白属性面板在业务端绑定设施房后使用的运行时字段。 */
  properties?: ElementPropertyBinding[];
  /** 为 true 时，业务端属性选择覆盖画布内的产品字段配置。 */
  propertySelectionExplicit?: boolean;
}

export interface AppliedScadaRuntimeData {
  page: PageModel;
  tagValues: Record<string, ScadaRuntimeValue>;
}

interface LoadElectricalCenterScadaBindingOptions {
  getBinding: () => Promise<ElectricalCenterScadaBindingContent | null>;
  saveBinding: (payload: ElectricalCenterScadaBindingSaveRequest) => Promise<void>;
  storage?: Storage;
}

function resolveStorage(storage?: Storage): Storage | undefined {
  if (storage) {
    return storage;
  }
  if (typeof localStorage === "undefined") {
    return undefined;
  }
  return localStorage;
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, entryValue]) =>
      typeof entryValue === "string" && entryValue.trim() ? [[key, entryValue.trim()]] : [],
    ),
  );
}

function normalizeStringArrayRecord(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, entryValue]) => {
      if (!Array.isArray(entryValue)) {
        return [];
      }
      const codes = [
        ...new Set(
          entryValue
            .filter((code): code is string => typeof code === "string")
            .map((code) => code.trim())
            .filter(Boolean),
        ),
      ];
      return [[key, codes]];
    }),
  );
}

function parseElectricalCenterScadaBinding(value: unknown): ElectricalCenterScadaBinding | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.pageId !== "string" || !record.pageId.trim()) {
    return null;
  }
  const elementPropertyCodes = normalizeStringArrayRecord(record.elementPropertyCodes);
  return {
    pageId: record.pageId.trim(),
    elementFacilityIds: normalizeStringRecord(record.elementFacilityIds),
    ...(elementPropertyCodes ? { elementPropertyCodes } : {}),
  };
}

function parseElectricalCenterScadaBindingContent(content: string): ElectricalCenterScadaBinding | null {
  try {
    return parseElectricalCenterScadaBinding(JSON.parse(content) as unknown);
  } catch {
    return null;
  }
}

function readLegacyElectricalCenterScadaBinding(storage?: Storage): ElectricalCenterScadaBinding | null {
  const raw = resolveStorage(storage)?.getItem(CENTER_SCADA_BINDING_KEY);
  return raw ? parseElectricalCenterScadaBindingContent(raw) : null;
}

function removeLegacyElectricalCenterScadaBinding(storage?: Storage): void {
  resolveStorage(storage)?.removeItem(CENTER_SCADA_BINDING_KEY);
}

export function toElectricalCenterScadaBindingSaveRequest(binding: ElectricalCenterScadaBinding): ElectricalCenterScadaBindingSaveRequest {
  return {
    content: JSON.stringify({
      pageId: binding.pageId.trim(),
      elementFacilityIds: { ...binding.elementFacilityIds },
      elementPropertyCodes: Object.fromEntries(
        Object.entries(binding.elementPropertyCodes ?? {}).map(([elementId, codes]) => [elementId, [...codes]]),
      ),
    } satisfies ElectricalCenterScadaBinding),
  };
}

export async function loadElectricalCenterScadaBindingFromServer({
  getBinding,
  saveBinding,
  storage,
}: LoadElectricalCenterScadaBindingOptions): Promise<ElectricalCenterScadaBinding | null> {
  const remoteContent = (await getBinding())?.content?.trim() ?? "";
  if (remoteContent) {
    const remoteBinding = parseElectricalCenterScadaBindingContent(remoteContent);
    if (!remoteBinding) {
      throw new Error("电气中心二维组态绑定内容格式无效");
    }
    removeLegacyElectricalCenterScadaBinding(storage);
    return remoteBinding;
  }

  const localBinding = readLegacyElectricalCenterScadaBinding(storage);
  if (!localBinding) {
    return null;
  }
  await saveBinding(toElectricalCenterScadaBindingSaveRequest(localBinding));
  removeLegacyElectricalCenterScadaBinding(storage);
  return localBinding;
}

export function reconcileElectricalCenterScadaBinding(
  binding: ElectricalCenterScadaBinding | null,
  pages: readonly { id: string; bindableElements?: ReadonlyArray<{ id: string }> }[],
): ElectricalCenterScadaBinding | null {
  if (!binding) {
    return null;
  }
  const page = pages.find((item) => item.id === binding.pageId);
  if (!page) {
    return null;
  }
  const availableElementIds = new Set((page.bindableElements ?? []).map((element) => element.id));
  return {
    pageId: binding.pageId,
    elementFacilityIds: Object.fromEntries(
      Object.entries(binding.elementFacilityIds).filter(([elementId]) => availableElementIds.has(elementId)),
    ),
    ...(binding.elementPropertyCodes
      ? {
          elementPropertyCodes: Object.fromEntries(
            Object.entries(binding.elementPropertyCodes).filter(([elementId]) => availableElementIds.has(elementId)),
          ),
        }
      : {}),
  };
}

function toRuntimeValue(value: unknown): ScadaRuntimeValue | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

export function facilityOverviewToScadaValues(facility: ElectricalFacilityOverview): Record<string, ScadaRuntimeValue> {
  const values: Record<string, ScadaRuntimeValue> = {
    facilityId: String(facility.facilityId),
    facilityName: facility.facilityName,
    hasActiveAlarm: facility.hasActiveAlarm,
    alarmStatus: facility.hasActiveAlarm ? "ALARM" : "NORMAL",
    alarmStatusText: facility.hasActiveAlarm ? "有告警" : "正常",
    electricalDeviceTotal: facility.electricalDeviceTotal,
    electricalDeviceOnline: facility.electricalDeviceOnline,
    electricalDeviceOnlineRate: facility.electricalDeviceOnlineRate,
    deviceOnlineSummary: `${facility.electricalDeviceOnline}/${facility.electricalDeviceTotal}`,
    deviceTotal: facility.electricalDeviceTotal,
    deviceOnline: facility.electricalDeviceOnline,
    deviceOnlineRate: facility.electricalDeviceOnlineRate,
  };
  for (const property of facility.displayProperties) {
    const value = toRuntimeValue(property.value);
    if (value === undefined) {
      continue;
    }
    if (property.propertyCode.trim()) {
      values[property.propertyCode.trim()] = value;
    }
    if (property.propertyName.trim()) {
      values[property.propertyName.trim()] = value;
    }
  }
  return values;
}

function runtimeDataType(value: ScadaRuntimeValue): string {
  return typeof value;
}

export function facilityOverviewToScadaProperties(facility: ElectricalFacilityOverview): ElementPropertyBinding[] {
  const properties = new Map<string, ElementPropertyBinding>([
    ["facilityName", { propCode: "facilityName", propName: "设施房名称", dataType: "string" }],
    ["alarmStatusText", { propCode: "alarmStatusText", propName: "运行状态", dataType: "string" }],
    ["deviceOnlineSummary", { propCode: "deviceOnlineSummary", propName: "设备在线", dataType: "string" }],
  ]);

  for (const property of facility.displayProperties) {
    const propCode = property.propertyCode.trim();
    const value = toRuntimeValue(property.value);
    if (!propCode || value === undefined || properties.has(propCode)) {
      continue;
    }
    properties.set(propCode, {
      propCode,
      propName: property.propertyName.trim() || propCode,
      dataType: runtimeDataType(value),
      ...(property.unit?.trim() ? { unitName: property.unit.trim() } : {}),
    });
  }

  return [...properties.values()];
}

export function buildElectricalCenterRuntimeBindings(
  binding: ElectricalCenterScadaBinding | null,
  facilities: readonly ElectricalFacilityOverview[],
): ScadaRuntimeElementDataBinding[] {
  if (!binding) {
    return [];
  }
  const facilityMap = new Map(facilities.map((facility) => [String(facility.facilityId), facility]));
  return Object.entries(binding.elementFacilityIds).flatMap(([elementId, facilityId]) => {
    const facility = facilityMap.get(facilityId);
    const propertySelectionExplicit = Boolean(binding.elementPropertyCodes && Object.hasOwn(binding.elementPropertyCodes, elementId));
    const availableProperties = facility ? facilityOverviewToScadaProperties(facility) : [];
    const properties = propertySelectionExplicit
      ? (binding.elementPropertyCodes?.[elementId] ?? []).flatMap((propCode) => {
          const property = availableProperties.find((item) => item.propCode === propCode);
          return property ? [property] : [];
        })
      : availableProperties;
    return facility
      ? [
          {
            elementId,
            deviceId: facilityId,
            values: facilityOverviewToScadaValues(facility),
            properties,
            ...(propertySelectionExplicit ? { propertySelectionExplicit: true } : {}),
          },
        ]
      : [];
  });
}

function sourceValue(values: Record<string, ScadaRuntimeValue>, candidates: (string | undefined)[]): ScadaRuntimeValue | undefined {
  const lowerCaseValues = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  for (const candidate of candidates) {
    const normalized = candidate?.trim();
    if (!normalized) {
      continue;
    }
    if (Object.hasOwn(values, normalized)) {
      return values[normalized];
    }
    const direct = lowerCaseValues.get(normalized.toLowerCase());
    if (direct !== undefined) {
      return direct;
    }
    const tail = normalized.split(/[./:]/).filter(Boolean).at(-1);
    if (tail) {
      const tailValue = lowerCaseValues.get(tail.toLowerCase());
      if (tailValue !== undefined) {
        return tailValue;
      }
    }
  }
  return undefined;
}

export function applyScadaRuntimeElementData(
  sourcePage: PageModel,
  runtimeBindings: readonly ScadaRuntimeElementDataBinding[],
): AppliedScadaRuntimeData {
  const runtimeBindingMap = new Map(runtimeBindings.map((binding) => [binding.elementId, binding]));
  const tagValues: Record<string, ScadaRuntimeValue> = {};
  const elements = sourcePage.elements.map((element) => {
    const runtimeBinding = runtimeBindingMap.get(element.id);
    if (!runtimeBinding) {
      return {
        ...element,
        bindings: element.bindings.map((binding) => ({ ...binding })),
        ...(element.propertyBindings ? { propertyBindings: element.propertyBindings.map((binding) => ({ ...binding })) } : {}),
      };
    }

    const bindings = element.bindings.map((binding, index) => {
      const value = sourceValue(runtimeBinding.values, [binding.productProperty?.propCode, binding.tagName, binding.propName]);
      if (value === undefined) {
        return { ...binding };
      }
      const tagName = `__electricalCenter.${element.id}.binding.${index}`;
      tagValues[tagName] = value;
      return { ...binding, tagName };
    });
    const sourcePropertyBindings = runtimeBinding.propertySelectionExplicit
      ? (runtimeBinding.properties ?? [])
      : element.propertyBindings?.length
        ? element.propertyBindings
        : (runtimeBinding.properties ?? []);
    const propertyBindings = sourcePropertyBindings.map((binding, index) => {
      const value = sourceValue(runtimeBinding.values, [binding.propCode, binding.propName]);
      if (value === undefined) {
        return { ...binding };
      }
      const propCode = `__electricalCenter.${element.id}.property.${index}`;
      tagValues[propCode] = value;
      return { ...binding, propCode };
    });
    return {
      ...element,
      deviceId: runtimeBinding.deviceId,
      bindings,
      ...(propertyBindings.length > 0 || element.propertyBindings ? { propertyBindings } : {}),
    };
  });
  return {
    page: { ...sourcePage, elements },
    tagValues,
  };
}
