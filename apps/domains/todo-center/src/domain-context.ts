import type { TodoCenterClient } from "@g2-client/todo-center/client";
import type { DomainContext } from "@g2-composition/contract";
let context: DomainContext | undefined;
let client: TodoCenterClient | undefined;
let chart: typeof import("@g2-platform/pc-chart") | undefined;
export function installTodoCenterContext(ctx: DomainContext, api: TodoCenterClient): void {
  context = ctx;
  client = api;
}
export function getTodoCenterClient(): TodoCenterClient {
  if (!client) {throw new Error("待办中心 Client 未安装");}
  return client;
}
export function getTodoCenterContext(): DomainContext {
  if (!context) {throw new Error("待办中心 Domain 未安装");}
  return context;
}
export function installTodoCenterChart(module: typeof import("@g2-platform/pc-chart")): void {
  chart = module;
}
export function getTodoCenterChart(): typeof import("@g2-platform/pc-chart") {
  if (!chart) {throw new Error("待办中心 pcChart Runtime Common 未安装");}
  return chart;
}
