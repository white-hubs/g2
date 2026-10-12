import { CubeScadaRuntime } from "./cube-scada-instance";
import type { CreateOptions } from "./types";

function normalizeBase(input?: string): string {
  if (!input) return "";
  return input.endsWith("/") ? input.slice(0, -1) : input;
}

export class CubeScada {
  static create(options: CreateOptions = {}): CubeScadaRuntime {
    return new CubeScadaRuntime(normalizeBase(options.viewerBase), options);
  }
}
