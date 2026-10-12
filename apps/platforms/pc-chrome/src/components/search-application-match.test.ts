import { describe, expect, test } from "bun:test";

import { buildSearchMatchable, fuzzyMatch, matchesSearchEntry, normalizeSearchKeyword, toPinyinIndex } from "./search-application-match";

describe("normalizeSearchKeyword", () => {
  test("去空白并转小写", () => {
    expect(normalizeSearchKeyword("  YinHuan  ")).toBe("yinhuan");
  });
});

describe("toPinyinIndex", () => {
  test("隐患排查 → 全拼空格串 + 首字母", () => {
    const { pinyinFull, pinyinInitial } = toPinyinIndex("隐患排查");
    expect(pinyinFull).toContain("yin");
    expect(pinyinFull).toContain("huan");
    expect(pinyinInitial).toBe("yhpc");
  });
});

describe("fuzzyMatch", () => {
  test("子序列命中 / 未命中", () => {
    expect(fuzzyMatch("yin huan pai cha", "yinhuan")).toBe(true);
    expect(fuzzyMatch("yin huan", "xyz")).toBe(false);
  });
});

describe("matchesSearchEntry", () => {
  const hazard = buildSearchMatchable("隐患排查");

  test("中文包含", () => {
    expect(matchesSearchEntry(hazard, "隐患")).toBe(true);
  });

  test("全拼包含（带空格的索引用 includes 或 fuzzy）", () => {
    expect(matchesSearchEntry(hazard, "yinhuan")).toBe(true);
    expect(matchesSearchEntry(hazard, "yin huan")).toBe(true);
  });

  test("首字母", () => {
    expect(matchesSearchEntry(hazard, "yhpc")).toBe(true);
    expect(matchesSearchEntry(hazard, "yhp")).toBe(true);
  });

  test("无关词不命中", () => {
    expect(matchesSearchEntry(hazard, "能耗")).toBe(false);
    expect(matchesSearchEntry(hazard, "nhgl")).toBe(false);
  });

  test("空关键词全匹配", () => {
    expect(matchesSearchEntry(hazard, "   ")).toBe(true);
  });
});
