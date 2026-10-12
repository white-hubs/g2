/**
 * 计算顶栏分组有多少个能完整放下；放不下时预留 more 按钮宽度（对齐旧仓 ant-tabs more）。
 * 全部能放下时 more 不占位，返回全部数量。
 */
export function computeVisibleTabCount(tabWidths: number[], availableWidth: number, moreButtonWidth: number): number {
  if (tabWidths.length === 0 || availableWidth <= 0) {
    return 0;
  }
  const total = tabWidths.reduce((sum, width) => sum + width, 0);
  if (total <= availableWidth) {
    return tabWidths.length;
  }

  let used = Math.max(0, moreButtonWidth);
  let count = 0;
  for (const width of tabWidths) {
    if (used + width > availableWidth) {
      break;
    }
    used += width;
    count += 1;
  }
  return count;
}
