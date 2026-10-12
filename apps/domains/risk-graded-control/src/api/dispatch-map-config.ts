import { getDispatchMapConfig } from "./server";
import { parseLntAndLat } from "@/utils/parse-lnt-lat";

interface DictionaryItem {
  code: string;
  variable: string;
}

export const getDispatchMapCenter = async (): Promise<{ lng: number; lat: number } | null> => {
  const resp = await getDispatchMapConfig();
  const items = (resp && typeof resp === "object" && "data" in resp ? (resp as { data?: unknown }).data : resp) as DictionaryItem[];
  if (!Array.isArray(items)) {
    return null;
  }
  const lnglatItem = items.find((item) => item.code === "lnglat");
  return parseLntAndLat(lnglatItem?.variable);
};
