import { inject, provide, type InjectionKey } from "vue";

export interface ApplicationDevice {
  deviceId: string;
  deviceName: string;
  deviceType?: string;
  areaName?: string;
  deviceAreaName?: string;
  deviceCode?: string;
  [key: string]: unknown;
}

export interface GraphDeviceClient {
  getDeviceArea(): Promise<Array<{ id: string; name: string }>>;
  getApplicationDevice(query: {
    applicationCode: string;
    areaId?: string;
    keyword?: string;
    pageNumber: number;
    pageSize: number;
  }): Promise<{ records: ApplicationDevice[]; total: number }>;
}

const deviceClientKey: InjectionKey<GraphDeviceClient> = Symbol("graph-device-client");
export function provideGraphDeviceClient(client: GraphDeviceClient): void {
  provide(deviceClientKey, client);
}
export function useGraphDeviceClient(): GraphDeviceClient {
  const client = inject(deviceClientKey);
  if (!client) throw new Error("拓扑编辑器未注入设备 Client");
  return client;
}
