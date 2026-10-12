import type { MdataClient } from "@g2-contract/mdata";

let client: MdataClient | undefined;
export function installLogClient(value: MdataClient): void { client = value; }
export function getLogClient(): MdataClient {
  if (!client) throw new Error("日志管理服务尚未安装");
  return client;
}
