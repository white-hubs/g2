import type { FaultRepairClient } from "@g2-client/fault-repair/client";
import type { DomainContext } from "@g2-composition/contract";

import { resolveFaultMaintainRuntime, type FaultMaintainRuntime } from "./runtime";

let context: DomainContext | undefined;
let client: FaultRepairClient | undefined;
let runtime: FaultMaintainRuntime = resolveFaultMaintainRuntime({ applicationCode: "FAULT", basePath: "/d/fault-repair" });

export function installFaultRepairContext(
  nextContext: DomainContext,
  nextClient: FaultRepairClient,
  nextRuntime?: FaultMaintainRuntime,
): void {
  context = nextContext;
  client = nextClient;
  if (nextRuntime) {
    runtime = nextRuntime;
  }
}

export function getFaultRepairClient(): FaultRepairClient {
  if (!client) {
    throw new Error("故障报修 Client 未安装");
  }
  return client;
}

export function getFaultRepairContext(): DomainContext {
  if (!context) {
    throw new Error("故障报修 Domain 未安装");
  }
  return context;
}

export function getFaultMaintainRuntime(): FaultMaintainRuntime {
  return runtime;
}
