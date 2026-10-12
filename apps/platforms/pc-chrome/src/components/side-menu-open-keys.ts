/**
 * 手风琴：新展开某一项时，只保留该项及其祖先；关闭操作原样接受 next。
 * key 约定与 SideMenu 一致：`parent/child/...`。
 */
export function nextAccordionOpenKeys(prev: string[], next: string[]): string[] {
  const added = next.find((key) => !prev.includes(key));
  if (!added) {
    return next;
  }
  return next.filter((key) => key === added || added.startsWith(`${key}/`));
}
