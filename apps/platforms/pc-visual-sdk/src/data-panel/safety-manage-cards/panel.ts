import type { PanelDescribe } from "../panel-definition";
import { safety_manage_cards } from "./cards";

export const safety_manage_panel: Record<string, PanelDescribe> = {
  // 安全管理-左面板
  safetyManageLeft: {
    name: "安全管理-左面板",
    cards: [
      safety_manage_cards.safetyManage.cards.alarmSituationStatistics,
      safety_manage_cards.safetyManage.cards.hiddenDangerStatistics,
      safety_manage_cards.safetyManage.cards.projectRecord,
    ],
  },
  // 安全管理-右面板
  safetyManageRight: {
    name: "安全管理-右面板",
    cards: [
      safety_manage_cards.safetyManage.cards.inspectionStatistics,
      safety_manage_cards.safetyManage.cards.safetyEducationStatistics,
      safety_manage_cards.safetyManage.cards.fireEquipmentStatistics,
    ],
  },
  // TODO 添加更多卡片
};
