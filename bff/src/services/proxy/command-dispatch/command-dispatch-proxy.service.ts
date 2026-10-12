import { CONFIG_SERVICE_TOKEN, ConfigService, Inject, Injectable } from "@dangao/bun-server";
import type {
  DeviceUpdatePayload,
  DispatchDevice,
  FusionAccount,
  GroupPayload,
  IntercomGroup,
  PageQuery,
  PageResult,
  Recording,
  RecordingQuery,
} from "@g2-contract/command-dispatch";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";
import { requireUpstreamUrl, unwrapUpstreamResponse } from "@/services/upstream-response";

@Injectable()
export class CommandDispatchProxyService {
  public constructor(
    private readonly proxy: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
  ) {}

  pageRecordings(query: RecordingQuery): Promise<PageResult<Recording>> {
    return this.request("dispatchUrl", "/dispatch-platform/file/page", "GET", undefined, query);
  }
  pageGroups(query: PageQuery): Promise<PageResult<IntercomGroup>> {
    return this.request("dispatchUrl", "/dispatch-device-group/page", "GET", undefined, query);
  }
  createGroup(payload: GroupPayload): Promise<unknown> {
    return this.request("dispatchUrl", "/dispatch-device-group", "POST", payload);
  }
  updateGroup(id: string, payload: GroupPayload): Promise<unknown> {
    return this.request("dispatchUrl", `/dispatch-device-group/${encodeURIComponent(id)}`, "PUT", { ...payload, id });
  }
  deleteGroup(code: string): Promise<unknown> {
    return this.request("dispatchUrl", `/dispatch-device-group/code/${encodeURIComponent(code)}`, "DELETE");
  }
  pageDevices(query: PageQuery): Promise<PageResult<DispatchDevice>> {
    return this.request("dispatchUrl", "/dispatch-device/page", "GET", undefined, query);
  }
  updateDevice(id: string, payload: DeviceUpdatePayload): Promise<unknown> {
    return this.request("dispatchUrl", `/dispatch-device/${encodeURIComponent(id)}`, "PUT", { ...payload, id });
  }
  setGroupMembers(code: string, deviceCodes: string[]): Promise<unknown> {
    if (!Array.isArray(deviceCodes) || deviceCodes.some((value) => typeof value !== "string" || value.includes(","))) {
      throw Response.json({ message: "deviceCodes 必须为不含逗号的设备编号数组" }, { status: 400 });
    }
    const members = [...new Set(deviceCodes)].join(",");
    return this.request(
      "dispatchUrl",
      `/dispatch-device-group/${encodeURIComponent(code)}/add-and-delete/member`,
      "POST",
      { code, deviceCodes: members },
      { deviceCodes: members },
    );
  }
  pageAccounts(query: PageQuery): Promise<PageResult<FusionAccount>> {
    return this.request("fusionCommunicateUrl", "/fusion-communicate-account/page", "GET", undefined, query);
  }

  private async request<T>(
    service: "dispatchUrl" | "fusionCommunicateUrl",
    path: string,
    method: string,
    body?: unknown,
    query?: object,
  ): Promise<T> {
    const base = requireUpstreamUrl(this.config.get<string>(`app.${service}`), service);
    const response = await this.proxy.request(buildUrl(`${base}${path}`, query ? { ...query } : undefined), {
      method,
      body,
      passthroughError: true,
    });
    return unwrapUpstreamResponse<T>(response.data);
  }
}
