import { unwrapData } from "./unwrap";
import { getAlarmCenterClient, getDeviceCenterClient } from "@/domain-context";

/** 疏散指挥告警列表：走 alarm-center，对齐旧仓 device-supervise getAlarmRecordsPage */
export async function getAlarmRecordsPage(query: Record<string, unknown>): Promise<unknown> {
  const client = await getAlarmCenterClient();
  return client.getAlarmRecordPage(query);
}

/** 设备详情：对齐旧仓 getDeviceInstanceDetail */
export async function getDeviceInstanceDetail(payload: { deviceId: string }): Promise<unknown> {
  const client = await getDeviceCenterClient();
  return unwrapData(await client.getDeviceInfo(payload.deviceId));
}
