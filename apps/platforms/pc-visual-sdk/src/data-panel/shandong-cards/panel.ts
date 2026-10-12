import type { PanelDescribe } from "../panel-definition";
import { shandong_cards } from "./cards";

export const shandong_panel: Record<string, PanelDescribe> = {
  // 山东头社区-运维态势-左面板
  shandong_operationSituationLeft: {
    name: "山东头社区-运维态势-左面板",
    cards: [
      shandong_cards.operationSituation.cards.workOrderStatistics,
      shandong_cards.operationSituation.cards.faultObjectRankTop5,
      shandong_cards.operationSituation.cards.faultObjectStatusStatistics,
    ],
  },
  shandong_operationSituationRight: {
    name: "山东头社区-运维态势-右面板",
    cards: [
      shandong_cards.operationSituation.cards.maintenanceStatistics,
      shandong_cards.operationSituation.cards.personInspectionTaskTop5,
      shandong_cards.operationSituation.cards.inspectionAbnormalTrend,
    ],
  },
};
