import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, type Component } from "vue";

type ScadaModule = typeof import("@g2-platform/pc-scada");
type ScadaCoreModule = typeof import("@g2-platform/pc-scada/core");

let scada: ScadaModule | undefined;
let scadaCore: ScadaCoreModule | undefined;

export async function installElectricalSafetyScada(context: DomainContext): Promise<void> {
  [scada, scadaCore] = await Promise.all([
    context.loadRuntimeCommon<ScadaModule>("pcScada", "index"),
    context.loadRuntimeCommon<ScadaCoreModule>("pcScada", "core"),
  ]);
}

function getScada(): ScadaModule {
  if (!scada) throw new Error("electrical-safety pcScada Runtime Common 尚未加载");
  return scada;
}

function getScadaCore(): ScadaCoreModule {
  if (!scadaCore) throw new Error("electrical-safety pcScada/core Runtime Common 尚未加载");
  return scadaCore;
}

export const CubeScada: ScadaModule["CubeScada"] = new Proxy({} as ScadaModule["CubeScada"], {
  get(_target, key: keyof ScadaModule["CubeScada"]) {
    return getScada().CubeScada[key];
  },
});

export const CubeScadaPage: ScadaModule["CubeScadaPage"] = defineAsyncComponent(
  async () => getScada().CubeScadaPage as Component,
) as unknown as ScadaModule["CubeScadaPage"];

export const readLegacySceneScopeFromContent: ScadaCoreModule["readLegacySceneScopeFromContent"] = (...args) =>
  getScadaCore().readLegacySceneScopeFromContent(...args);

export const resolvePageSceneScope: ScadaCoreModule["resolvePageSceneScope"] = (...args) => getScadaCore().resolvePageSceneScope(...args);

export type { ScadaPageHandle } from "@g2-platform/pc-scada";
export type { LegacySceneScopeKind, PageModel, SceneScopeKind } from "@g2-platform/pc-scada/core";
