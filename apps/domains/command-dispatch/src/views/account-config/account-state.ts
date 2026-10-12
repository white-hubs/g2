import type { DeviceUpdatePayload, PageQuery } from "@g2-contract/command-dispatch";

export type DeviceForm = Omit<DeviceUpdatePayload, "deviceLevel"> & { deviceLevel: number | null };

export function buildDevicePayload(form: DeviceForm): DeviceUpdatePayload {
  if (!form.name.trim()) {
    throw new Error("请输入账号名称");
  }
  if (!form.code) {
    throw new Error("缺少通讯号码");
  }
  if (!form.password) {
    throw new Error("请输入密码");
  }
  const level = form.deviceLevel;
  if (level === null || !Number.isInteger(level) || level < 0 || level > 100) {
    throw new Error("账号等级须为 0–100 的整数");
  }
  const bytes = new TextEncoder().encode(form.password);
  const password = btoa(Array.from(bytes, (byte) => String.fromCodePoint(byte)).join(""));
  return { ...form, name: form.name.trim(), password, deviceLevel: level };
}

export async function findAccountDevice<T extends { id: string; code: string }>(
  code: string,
  fetchPage: (query: PageQuery) => Promise<{ records: T[]; total: number }>,
): Promise<T | undefined> {
  if (!code) {
    return undefined;
  }
  let pageNumber = 1;
  let seen = 0;
  while (true) {
    const page = await fetchPage({ keyword: code, pageNumber, pageSize: 100 });
    const match = page.records.find((device) => device.code === code);
    if (match) {
      return match;
    }
    seen += page.records.length;
    if (page.records.length === 0 || seen >= page.total) {
      return undefined;
    }
    pageNumber += 1;
  }
}

export function accountStatus(status: string | undefined): { title: string; color?: string } {
  if (status === "IN_USED") {
    return { title: "在用", color: "#389e0d" };
  }
  if (status === "UNUSED") {
    return { title: "闲置", color: "#cf1322" };
  }
  return { title: status || "--" };
}
