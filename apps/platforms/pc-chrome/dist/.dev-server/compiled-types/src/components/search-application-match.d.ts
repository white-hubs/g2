/** 规范化关键词（对齐旧仓 normalizeKeyword）。 */
export declare function normalizeSearchKeyword(keyword: string): string;
/** 生成拼音索引：全拼（空格分隔）+ 首字母串。 */
export declare function toPinyinIndex(name: string): {
    pinyinFull: string;
    pinyinInitial: string;
};
/** 子序列模糊匹配（对齐旧仓 fuzzyMatch）。 */
export declare function fuzzyMatch(target: string, query: string): boolean;
export interface SearchMatchable {
    label: string;
    pinyinFull: string;
    pinyinInitial: string;
}
/** 中文包含 / 全拼 / 首字母 / 模糊（名或全拼）。空关键词视为全匹配。 */
export declare function matchesSearchEntry(entry: SearchMatchable, keyword: string): boolean;
export declare function buildSearchMatchable(label: string): SearchMatchable;
//# sourceMappingURL=search-application-match.d.ts.map