import type { SmallEngineeringClient } from "@g2-client/small-engineering/client";
import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { DomainContext } from "@g2-composition/contract";
import type { DailyInspectionClient } from "@g2-contract/daily-inspection";

let context: DomainContext | undefined;
let smallClient: SmallEngineeringClient | undefined;
let patrolClient: DailyInspectionClient | undefined;
let flowClient: StreamEngineClient | undefined;

export function installSmallEngineeringContext(
  nextContext: DomainContext,
  nextSmallClient: SmallEngineeringClient,
  nextPatrolClient: DailyInspectionClient,
  nextFlowClient: StreamEngineClient,
): void {
  context = nextContext;
  smallClient = nextSmallClient;
  patrolClient = nextPatrolClient;
  flowClient = nextFlowClient;
}
export function getSmallEngineeringContext(): DomainContext {
  if (!context) {
    throw new Error("小散工程 Domain 未安装");
  }
  return context;
}
export function getSmallEngineeringClient(): SmallEngineeringClient {
  if (!smallClient) {
    throw new Error("小散工程 Client 未安装");
  }
  return smallClient;
}
export function getPatrolClient(): DailyInspectionClient {
  if (!patrolClient) {
    throw new Error("日常巡检 Client 未安装");
  }
  return patrolClient;
}
export function getFlowClient(): StreamEngineClient {
  if (!flowClient) {
    throw new Error("流程引擎 Client 未安装");
  }
  return flowClient;
}

export function canUseSmallEngineeringFeature(group: string, action: string): boolean {
  return getSmallEngineeringContext().getFunctionCodes().has(`smallEngineering:${group}:${action}`);
}
