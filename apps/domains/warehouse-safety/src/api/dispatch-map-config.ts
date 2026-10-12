import { getDictionaryClient } from "@/domain-context";
import { parseLntAndLat } from "@/utils/parse-lnt-lat";

export async function getDispatchMapCenter(): Promise<{ lng: number; lat: number } | null> {
  const items = await (
    await getDictionaryClient()
  ).getDataDictionaryByItem({
    itemCode: "COMMAND_DISPATCH_MAP_CONFIG",
  });
  return parseLntAndLat(items.find((item) => item.code === "lnglat")?.variable);
}
