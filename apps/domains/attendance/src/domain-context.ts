import type { DomainContext } from "@g2-composition/contract";
let context: DomainContext | undefined;
export function installDomainContext(value: DomainContext): void {
  context = value;
}
export function getDomainContext(): DomainContext {
  if (!context) {
    throw new Error("考勤管理领域尚未安装");
  }
  return context;
}
export const useDomainContext = getDomainContext;
