import type { SourceProfileParsed } from "./validate-source-profile";

export interface LocalOverride {
  platform?: { name: string; entry: string }[];
}

export function mergeLocalOverride(source: SourceProfileParsed, override: LocalOverride): SourceProfileParsed {
  const overrideByName = new Map((override.platform ?? []).map((item) => [item.name, item.entry]));
  return {
    ...source,
    platform: source.platform.map((item) => {
      const overrideEntry = overrideByName.get(item.name);
      if (!overrideEntry) {
        return item;
      }
      return { ...item, entry: overrideEntry } as never; // 覆盖后这个条目携带 entry 而非 logicalName，仅用于本地 dev，不参与生产解析路径
    }),
  };
}
