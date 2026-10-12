import type { ElectricalReferenceClient } from "@g2-contract/electrical-safety/references";
import type { LegacySceneScopeKind, SceneScopeKind } from "@g2-platform/pc-scada/core";

import { getElectricalSafetyClient } from "../domain-context";
import { readLegacySceneScopeFromContent, resolvePageSceneScope } from "../pc-scada-runtime";

export const SCADA_API_BASE = "/scada/api";
export const SCADA_STUDIO_PATH = "/portal/scada-studio";
export const SCADA_STUDIO_ASSET_BASE = "/resource/v1/scada-studio";

export interface ScadaPageSummary {
  id: string;
  name: string;
  sceneScope?: LegacySceneScopeKind | SceneScopeKind;
  bindableElements?: ScadaBindableElementSummary[];
}

export interface ScadaBindableElementSummary {
  id: string;
  name: string;
  type?: string;
}

export interface DeviceScadaPageSummary extends ScadaPageSummary {
  sceneScope: "singleDevice";
  elementIds: string[];
}

export interface ElectricalCenterPageRef {
  id: string;
  name: string;
}

export function parseLegacySceneScopeFromPageContent(content: string | undefined | null): LegacySceneScopeKind | undefined {
  return readLegacySceneScopeFromContent(content);
}

export function toScadaPageSummary(item: { id: string; name: string }, content?: string): ScadaPageSummary {
  const sceneScope = parseLegacySceneScopeFromPageContent(content);
  return {
    id: item.id,
    name: item.name,
    ...(sceneScope ? { sceneScope } : {}),
  };
}

export function filterPagesByScope(pages: ScadaPageSummary[], scope: LegacySceneScopeKind): ScadaPageSummary[] {
  return pages.filter((page) => page.sceneScope === scope);
}

function parsePageContentRecord(content: string | undefined | null): Record<string, unknown> | null {
  if (!content) {
    return null;
  }
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const nestedPage = record.page;
    return nestedPage && typeof nestedPage === "object" && !Array.isArray(nestedPage) ? (nestedPage as Record<string, unknown>) : record;
  } catch {
    return null;
  }
}

function parseBindableElements(elements: unknown[]): ScadaBindableElementSummary[] {
  return elements.flatMap((element): ScadaBindableElementSummary[] => {
    if (!element || typeof element !== "object") {
      return [];
    }
    const record = element as Record<string, unknown>;
    if (record.deviceBinding !== "required" || typeof record.id !== "string" || !record.id.trim()) {
      return [];
    }
    const nameCandidates = [record.propertyBindName, record.label, record.id];
    const name = nameCandidates.find((value) => typeof value === "string" && value.trim()) as string;
    return [
      {
        id: record.id.trim(),
        name: name.trim(),
        ...(typeof record.type === "string" && record.type.trim() ? { type: record.type.trim() } : {}),
      },
    ];
  });
}

function parseBindablePage(content: string | undefined | null): {
  sceneScope: SceneScopeKind;
  legacySceneScope?: LegacySceneScopeKind;
  bindableElements: ScadaBindableElementSummary[];
} | null {
  const page = parsePageContentRecord(content);
  if (!page) {
    return null;
  }
  const elements = Array.isArray(page.elements) ? page.elements : [];
  return {
    sceneScope: resolvePageSceneScope({
      sceneScope: page.sceneScope,
      elements: elements.map((element) =>
        element && typeof element === "object" ? { deviceBinding: (element as Record<string, unknown>).deviceBinding } : {},
      ),
    }),
    ...(parseLegacySceneScopeFromPageContent(content) ? { legacySceneScope: parseLegacySceneScopeFromPageContent(content) } : {}),
    bindableElements: parseBindableElements(elements),
  };
}

export function toDeviceScadaPageSummary(
  item: { id: string; name: string },
  content: string | undefined,
  productCode: string,
): DeviceScadaPageSummary | null {
  const page = parsePageContentRecord(content);
  const normalizedProductCode = productCode.trim();
  if (!page || !normalizedProductCode) {
    return null;
  }
  const product = page.product;
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    return null;
  }
  const productId = (product as Record<string, unknown>).id;
  if (typeof productId !== "string" || productId.trim() !== normalizedProductCode) {
    return null;
  }
  const elements = Array.isArray(page.elements) ? page.elements : [];
  const sceneScope = resolvePageSceneScope({
    sceneScope: page.sceneScope,
    elements: elements.map((element) =>
      element && typeof element === "object" ? { deviceBinding: (element as Record<string, unknown>).deviceBinding } : {},
    ),
  });
  if (sceneScope !== "singleDevice") {
    return null;
  }
  const elementIds = [
    ...new Set(
      elements.flatMap((element) => {
        if (!element || typeof element !== "object") {
          return [];
        }
        const id = (element as Record<string, unknown>).id;
        return typeof id === "string" && id.trim() ? [id.trim()] : [];
      }),
    ),
  ];
  return { id: item.id, name: item.name, sceneScope, elementIds };
}

export function toFacilityRoomPageSummary(item: { id: string; name: string }, content?: string): ScadaPageSummary | null {
  const parsed = parseBindablePage(content);
  if (!parsed) {
    return null;
  }
  if (parsed.legacySceneScope && parsed.legacySceneScope !== "facilityRoom") {
    return null;
  }
  if (!parsed.legacySceneScope && parsed.bindableElements.length === 0) {
    return null;
  }
  return {
    id: item.id,
    name: item.name,
    sceneScope: parsed.legacySceneScope ?? parsed.sceneScope,
    ...(parsed.bindableElements.length > 0 ? { bindableElements: parsed.bindableElements } : {}),
  };
}

export function toMultiDevicePageSummary(item: { id: string; name: string }, content?: string): ScadaPageSummary | null {
  const parsed = parseBindablePage(content);
  if (!parsed || parsed.sceneScope !== "multiDevice") {
    return null;
  }
  return { id: item.id, name: item.name, sceneScope: parsed.sceneScope, bindableElements: parsed.bindableElements };
}

export function parseElectricalCenterRef(payload: unknown): ElectricalCenterPageRef | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as { id?: unknown; name?: unknown };
  if (typeof record.id !== "string" || !record.id.trim()) {
    return null;
  }
  return {
    id: record.id,
    name: typeof record.name === "string" && record.name.trim() ? record.name : record.id,
  };
}

export function openScadaStudio(): void {
  globalThis.location.assign(SCADA_STUDIO_PATH);
}

type ScadaPageClient = Pick<ElectricalReferenceClient, "listScadaPages" | "getScadaPage" | "getDefaultElectricalCenterPage">;

export async function fetchElectricalCenterPage(
  client: ScadaPageClient = getElectricalSafetyClient(),
): Promise<ElectricalCenterPageRef | null> {
  return parseElectricalCenterRef(await client.getDefaultElectricalCenterPage());
}

async function hydratePages<T>(
  client: ScadaPageClient,
  parse: (item: { id: string; name: string }, content?: string) => T | null,
): Promise<T[]> {
  const list = await client.listScadaPages();
  const pages = await Promise.all(
    list.map(async (item) => {
      const detail = await client.getScadaPage(item.id);
      return { page: detail ? parse(item, detail.content) : null };
    }),
  );
  return pages.flatMap(({ page }) => (page === null ? [] : [page]));
}

export function fetchFacilityRoomPages(client: ScadaPageClient = getElectricalSafetyClient()): Promise<ScadaPageSummary[]> {
  return hydratePages(client, toFacilityRoomPageSummary);
}

export async function fetchDeviceScadaPageByProduct(
  productCode: string,
  client: ScadaPageClient = getElectricalSafetyClient(),
): Promise<DeviceScadaPageSummary | null> {
  if (!productCode.trim()) {
    return null;
  }
  const pages = await hydratePages(client, (item, content) => toDeviceScadaPageSummary(item, content, productCode));
  return pages[0] ?? null;
}

export function fetchMultiDevicePages(client: ScadaPageClient = getElectricalSafetyClient()): Promise<ScadaPageSummary[]> {
  return hydratePages(client, toMultiDevicePageSummary);
}
