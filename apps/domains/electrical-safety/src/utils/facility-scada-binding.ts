import type {
  DeviceBasicInfo,
  DeviceRealtimeProperties,
  FacilityScadaBindingContent,
  FacilityScadaBindingSaveRequest,
} from "@g2-contract/electrical-safety";
import type { ElementPropertyBinding } from "@g2-platform/pc-scada/core";

import type { ScadaRuntimeElementDataBinding, ScadaRuntimeValue } from "./electrical-center-scada-binding";

const KEY_PREFIX = "electrical-safety:facility-scada-page:";

export interface FacilityScadaBinding {
  pageId: string;
  elementDeviceIds: Record<string, string>;
  /** 业务端明确选择的设备基本信息或实时属性编码。 */
  elementPropertyCodes?: Record<string, string[]>;
}

export interface FacilityDeviceBindingSelection {
  elementDeviceIds: Record<string, string>;
  elementPropertyCodes: Record<string, string[]>;
}

export interface FacilityDeviceScadaData {
  basic: DeviceBasicInfo;
  realtime: DeviceRealtimeProperties;
}

interface LoadFacilityScadaBindingOptions {
  facilityId: string;
  getBinding: (facilityId: string) => Promise<FacilityScadaBindingContent | null>;
  saveBinding: (facilityId: string, payload: FacilityScadaBindingSaveRequest) => Promise<void>;
  storage?: Storage;
}

export function facilityScadaBindingKey(facilityId: string): string {
  return `${KEY_PREFIX}${facilityId}`;
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

export function readFacilityScadaPageId(facilityId: string, storage?: Storage): string | null {
  return readFacilityScadaBinding(facilityId, storage)?.pageId ?? null;
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

function parseFacilityScadaBinding(value: unknown): FacilityScadaBinding | null {
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
    elementDeviceIds: normalizeStringRecord(record.elementDeviceIds),
    ...(elementPropertyCodes ? { elementPropertyCodes } : {}),
  };
}

function parseFacilityScadaBindingContent(content: string): FacilityScadaBinding | null {
  try {
    return parseFacilityScadaBinding(JSON.parse(content) as unknown);
  } catch {
    return null;
  }
}

export function readFacilityScadaBinding(facilityId: string, storage?: Storage): FacilityScadaBinding | null {
  if (!facilityId.trim()) {
    return null;
  }
  const raw = resolveStorage(storage)?.getItem(facilityScadaBindingKey(facilityId));
  if (!raw?.trim()) {
    return null;
  }
  const parsed = parseFacilityScadaBindingContent(raw);
  if (parsed) {
    return parsed;
  }
  // 兼容旧版本按设施房直接保存的纯 pageId 字符串。
  return raw.trim().startsWith("{") ? null : { pageId: raw.trim(), elementDeviceIds: {} };
}

export function writeFacilityScadaPageId(facilityId: string, pageId: string | null, storage?: Storage): void {
  const current = readFacilityScadaBinding(facilityId, storage);
  const nextPageId = pageId?.trim() ?? "";
  writeFacilityScadaBinding(
    facilityId,
    nextPageId
      ? {
          pageId: nextPageId,
          elementDeviceIds: current?.pageId === nextPageId ? current.elementDeviceIds : {},
          ...(current?.pageId === nextPageId && current.elementPropertyCodes ? { elementPropertyCodes: current.elementPropertyCodes } : {}),
        }
      : null,
    storage,
  );
}

export function writeFacilityScadaBinding(facilityId: string, binding: FacilityScadaBinding | null, storage?: Storage): void {
  if (!facilityId.trim()) {
    return;
  }
  const store = resolveStorage(storage);
  if (!store) {
    return;
  }
  const key = facilityScadaBindingKey(facilityId);
  if (!binding?.pageId.trim()) {
    store.removeItem(key);
    return;
  }
  store.setItem(
    key,
    JSON.stringify({
      pageId: binding.pageId.trim(),
      elementDeviceIds: binding.elementDeviceIds,
      ...(binding.elementPropertyCodes ? { elementPropertyCodes: binding.elementPropertyCodes } : {}),
    } satisfies FacilityScadaBinding),
  );
}

export function removeFacilityScadaBinding(facilityId: string, storage?: Storage): void {
  if (!facilityId.trim()) {
    return;
  }
  resolveStorage(storage)?.removeItem(facilityScadaBindingKey(facilityId));
}

export function toFacilityScadaBindingSaveRequest(binding: FacilityScadaBinding): FacilityScadaBindingSaveRequest {
  return {
    content: JSON.stringify({
      pageId: binding.pageId.trim(),
      elementDeviceIds: { ...binding.elementDeviceIds },
      elementPropertyCodes: Object.fromEntries(
        Object.entries(binding.elementPropertyCodes ?? {}).map(([elementId, codes]) => [elementId, [...codes]]),
      ),
    } satisfies FacilityScadaBinding),
  };
}

export async function loadFacilityScadaBindingFromServer({
  facilityId,
  getBinding,
  saveBinding,
  storage,
}: LoadFacilityScadaBindingOptions): Promise<FacilityScadaBinding | null> {
  const remoteContent = (await getBinding(facilityId))?.content?.trim() ?? "";
  if (remoteContent) {
    const remoteBinding = parseFacilityScadaBindingContent(remoteContent);
    if (!remoteBinding) {
      throw new Error("设施房二维组态绑定内容格式无效");
    }
    removeFacilityScadaBinding(facilityId, storage);
    return remoteBinding;
  }

  const localBinding = readFacilityScadaBinding(facilityId, storage);
  if (!localBinding) {
    return null;
  }
  await saveBinding(facilityId, toFacilityScadaBindingSaveRequest(localBinding));
  removeFacilityScadaBinding(facilityId, storage);
  return localBinding;
}

export function coerceFacilityBindingToAvailable(boundId: string | null, availableIds: string[]): string | null {
  if (!boundId) {
    return null;
  }
  return availableIds.includes(boundId) ? boundId : null;
}

export function reconcileFacilityScadaBinding(
  binding: FacilityScadaBinding | null,
  pages: readonly { id: string; bindableElements?: ReadonlyArray<{ id: string }> }[],
): FacilityScadaBinding | null {
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
    elementDeviceIds: Object.fromEntries(
      Object.entries(binding.elementDeviceIds).filter(([elementId]) => availableElementIds.has(elementId)),
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

function addValue(values: Record<string, ScadaRuntimeValue>, key: string, value: unknown): void {
  const normalizedKey = key.trim();
  const normalizedValue = toRuntimeValue(value);
  if (normalizedKey && normalizedValue !== undefined) {
    values[normalizedKey] = normalizedValue;
  }
}

export function deviceScadaDataToValues(data: FacilityDeviceScadaData): Record<string, ScadaRuntimeValue> {
  const { basic } = data;
  const values: Record<string, ScadaRuntimeValue> = {
    deviceId: String(basic.deviceId),
    deviceCode: basic.deviceCode,
    deviceName: basic.deviceName,
    productCode: basic.productCode,
    productName: basic.productName,
    productCategoryCode: basic.productCategoryCode,
    productCategoryName: basic.productCategoryName,
    facilityId: String(basic.facilityId),
    facilityName: basic.facilityName,
    onlineStatus: basic.onlineStatus,
    onlineStatusText: basic.onlineStatus === "ONLINE" ? "在线" : "离线",
  };
  addValue(values, "brandName", basic.brandName);
  addValue(values, "model", basic.model);
  addValue(values, "commissioningDate", basic.commissioningDate);
  addValue(values, "maintenanceCompany", basic.maintenanceCompany);
  if (basic.deviceConfigDisplay) {
    addValue(values, basic.deviceConfigDisplay.code, basic.deviceConfigDisplay.value);
    addValue(values, basic.deviceConfigDisplay.name, basic.deviceConfigDisplay.value);
  }
  for (const property of data.realtime.properties) {
    addValue(values, property.propertyCode, property.value);
    addValue(values, property.propertyName, property.value);
  }
  return values;
}

function propertyDataType(value: unknown, configured?: string | null): string {
  return configured?.trim() || (value === null || value === undefined ? "string" : typeof value);
}

export function deviceScadaDataToProperties(data: FacilityDeviceScadaData): ElementPropertyBinding[] {
  const { basic } = data;
  const properties = new Map<string, ElementPropertyBinding>();
  const addProperty = (propCode: string, propName: string, value: unknown, unitName?: string | null, dataType?: string | null): void => {
    const code = propCode.trim();
    if (!code || value === null || value === undefined || properties.has(code)) {
      return;
    }
    properties.set(code, {
      propCode: code,
      propName: propName.trim() || code,
      dataType: propertyDataType(value, dataType),
      ...(unitName?.trim() ? { unitName: unitName.trim() } : {}),
    });
  };

  addProperty("deviceName", "设备名称", basic.deviceName);
  addProperty("deviceCode", "设备编码", basic.deviceCode);
  addProperty("productName", "产品名称", basic.productName);
  addProperty("productCategoryName", "产品分类", basic.productCategoryName);
  addProperty("onlineStatusText", "在线状态", basic.onlineStatus === "ONLINE" ? "在线" : "离线");
  addProperty("brandName", "品牌", basic.brandName);
  addProperty("model", "型号", basic.model);
  addProperty("facilityName", "设施房名称", basic.facilityName);
  addProperty("commissioningDate", "投运日期", basic.commissioningDate);
  addProperty("maintenanceCompany", "维保单位", basic.maintenanceCompany);
  if (basic.deviceConfigDisplay) {
    addProperty(basic.deviceConfigDisplay.code, basic.deviceConfigDisplay.name, basic.deviceConfigDisplay.value);
  }
  for (const property of data.realtime.properties) {
    addProperty(property.propertyCode, property.propertyName, property.value, property.unit, property.dataType);
  }
  return [...properties.values()];
}

export function buildSingleDeviceScadaRuntimeBindings(
  elementIds: readonly string[],
  data: FacilityDeviceScadaData,
): ScadaRuntimeElementDataBinding[] {
  const deviceId = String(data.basic.deviceId);
  const values = deviceScadaDataToValues(data);
  const properties = deviceScadaDataToProperties(data);
  return [...new Set(elementIds.map((elementId) => elementId.trim()).filter(Boolean))].map((elementId) => ({
    elementId,
    deviceId,
    values,
    properties,
  }));
}

export function buildFacilityScadaRuntimeBindings(
  binding: FacilityScadaBinding | null,
  deviceData: Readonly<Record<string, FacilityDeviceScadaData>>,
): ScadaRuntimeElementDataBinding[] {
  if (!binding) {
    return [];
  }
  return Object.entries(binding.elementDeviceIds).flatMap(([elementId, deviceId]) => {
    const data = deviceData[deviceId];
    if (!data) {
      return [];
    }
    const availableProperties = deviceScadaDataToProperties(data);
    const propertySelectionExplicit = Boolean(binding.elementPropertyCodes && Object.hasOwn(binding.elementPropertyCodes, elementId));
    const properties = propertySelectionExplicit
      ? (binding.elementPropertyCodes?.[elementId] ?? []).flatMap((propCode) => {
          const property = availableProperties.find((item) => item.propCode === propCode);
          return property ? [property] : [];
        })
      : availableProperties;
    return [
      {
        elementId,
        deviceId,
        values: deviceScadaDataToValues(data),
        properties,
        ...(propertySelectionExplicit ? { propertySelectionExplicit: true } : {}),
      },
    ];
  });
}

/** 未绑定的设施房在组态视图首次进入时弹出绑定；已提示过或已绑定则不再自动弹出。 */
export function shouldPromptFacilityScadaBind(params: {
  facilityId: string;
  boundPageId: string | null;
  promptedFacilityIds: string[];
  hasPages: boolean;
  loading: boolean;
  viewIsScada: boolean;
}): boolean {
  if (!params.viewIsScada || params.loading || !params.facilityId.trim() || !params.hasPages || params.boundPageId) {
    return false;
  }
  return !params.promptedFacilityIds.includes(params.facilityId);
}
