import { pinyin } from "pinyin-pro";

/** 规范化关键词（对齐旧仓 normalizeKeyword）。 */
export function normalizeSearchKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

/** 生成拼音索引：全拼（空格分隔）+ 首字母串。 */
export function toPinyinIndex(name: string): { pinyinFull: string; pinyinInitial: string } {
  const arr = pinyin(name, { toneType: "none", type: "array" }) as string[];
  const full = arr.join(" ").toLowerCase();
  const initial = arr
    .map((syllable) => syllable?.[0] ?? "")
    .join("")
    .toLowerCase();
  return { pinyinFull: full, pinyinInitial: initial };
}

/** 子序列模糊匹配（对齐旧仓 fuzzyMatch）。 */
export function fuzzyMatch(target: string, query: string): boolean {
  const t = (target || "").toLowerCase();
  const q = (query || "").toLowerCase();
  if (!q) {
    return false;
  }
  let i = 0;
  for (const char of q) {
    i = t.indexOf(char, i);
    if (i === -1) {
      return false;
    }
    i += 1;
  }
  return true;
}

export interface SearchMatchable {
  label: string;
  pinyinFull: string;
  pinyinInitial: string;
}

/** 中文包含 / 全拼 / 首字母 / 模糊（名或全拼）。空关键词视为全匹配。 */
export function matchesSearchEntry(entry: SearchMatchable, keyword: string): boolean {
  const normalized = normalizeSearchKeyword(keyword);
  if (!normalized) {
    return true;
  }
  const nameHit = entry.label.includes(keyword.trim()) || entry.label.toLowerCase().includes(normalized);
  const pinyinFullHit = entry.pinyinFull.includes(normalized);
  const pinyinInitialHit = entry.pinyinInitial.includes(normalized);
  const fuzzyHit = fuzzyMatch(entry.label, normalized) || fuzzyMatch(entry.pinyinFull, normalized);
  return nameHit || pinyinFullHit || pinyinInitialHit || fuzzyHit;
}

export function buildSearchMatchable(label: string): SearchMatchable {
  const { pinyinFull, pinyinInitial } = toPinyinIndex(label);
  return { label, pinyinFull, pinyinInitial };
}
