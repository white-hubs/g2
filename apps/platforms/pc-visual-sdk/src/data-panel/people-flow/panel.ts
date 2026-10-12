import type { PanelDescribe } from "../panel-definition";
import { people_flow_cards } from "./cards";

export const people_flow_panel: Record<string, PanelDescribe> = {
  peopleFlowLeft: {
    name: "华威-人流量监测-左面板",
    cards: [
      people_flow_cards.peopleFlow.cards.peopleFlowTodayStatistics,
      people_flow_cards.peopleFlow.cards.peopleFlowStatistics,
      people_flow_cards.peopleFlow.cards.peopleFlowDistribution,
    ],
  },
  peopleFlowRight: {
    name: "华威-人流量监测-右面板",
    cards: [
      people_flow_cards.peopleFlow.cards.peopleFlowMonitor,
      people_flow_cards.peopleFlow.cards.peopleFlowPoint,
      people_flow_cards.peopleFlow.cards.peopleFlowAlarm,
      people_flow_cards.peopleFlow.cards.peopleFlowAlarmRecord,
    ],
  },
};
