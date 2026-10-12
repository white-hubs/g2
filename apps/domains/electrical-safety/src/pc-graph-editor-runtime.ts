import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, type Component } from "vue";

type GraphEditorModule = typeof import("@g2-platform/pc-graph-editor");

let graphEditor: GraphEditorModule | undefined;

export async function installElectricalSafetyGraphEditor(context: DomainContext): Promise<void> {
  graphEditor = await context.loadRuntimeCommon<GraphEditorModule>("pcGraphEditor", "index");
}

function getGraphEditor(): GraphEditorModule {
  if (!graphEditor) throw new Error("electrical-safety pcGraphEditor Runtime Common 尚未加载");
  return graphEditor;
}

export const ElectricalEditor: GraphEditorModule["ElectricalEditor"] = defineAsyncComponent(
  async () => getGraphEditor().ElectricalEditor as Component,
) as unknown as GraphEditorModule["ElectricalEditor"];

export const provideGraphDeviceClient: GraphEditorModule["provideGraphDeviceClient"] = (...args) =>
  getGraphEditor().provideGraphDeviceClient(...args);

export const replaceData: GraphEditorModule["replaceData"] = (...args) => getGraphEditor().replaceData(...args);

export type { ElectricalData, ElectricalElementLibItem, ElectricalNode } from "@g2-platform/pc-graph-editor";
