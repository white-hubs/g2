import type { PanelDescribe } from "../panel-definition";
import { zhongda_heshun_cards } from "./cards";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const zhongda_heshun_panel: Record<string, PanelDescribe> = {
  overviewLeft: {
    name: "中大合顺-总览-左面板",
    cards: [
      zhongda_heshun_cards.overview.cards.sanitizeItems,
      zhongda_heshun_cards.overview.cards.projectArea,
      zhongda_heshun_cards.overview.cards.projectCycle,
    ],
  },
  overviewRight: {
    name: "中大合顺-总览-右面板",
    cards: [zhongda_heshun_cards.overview.cards.keyPlace, zhongda_heshun_cards.overview.cards.projectPerson],
  },
  sanitizeItemsLeft: {
    name: "中大合顺-消杀项目-左面板",
    cards: [zhongda_heshun_cards.sanitizeItems.cards.projectList],
  },
  sanitizeItemsRight: {
    name: "中大合顺-消杀项目-右面板",
    cards: [
      zhongda_heshun_cards.sanitizeItems.cards.projectKeyPlace,
      zhongda_heshun_cards.sanitizeItems.cards.projectTask,
      zhongda_heshun_cards.sanitizeItems.cards.projectPerson,
    ],
  },
  projectPersonLeft: {
    name: "中大合顺-项目人员-左面板",
    cards: [
      zhongda_heshun_cards.projectPerson.cards.projectStatistics,
      zhongda_heshun_cards.projectPerson.cards.projectPostDistribution,
      zhongda_heshun_cards.projectPerson.cards.projectPersonTaskCompletionNumber,
    ],
  },
  projectPersonRight: {
    name: "中大合顺-项目人员-右面板",
    cards: [zhongda_heshun_cards.projectPerson.cards.projectPersonList],
  },
  keyPlaceLeft: {
    name: "中大合顺-重点场所-左面板",
    cards: [
      zhongda_heshun_cards.keyPlace.cards.keyPlaceStatistics,
      zhongda_heshun_cards.keyPlace.cards.keyPlacePercentage,
      zhongda_heshun_cards.keyPlace.cards.keyPlaceDistribution,
    ],
  },
  keyPlaceRight: {
    name: "中大合顺-重点场所-右面板",
    cards: [zhongda_heshun_cards.keyPlace.cards.keyPlaceList],
  },
  projectProductLeft: {
    name: "中大合顺-产品-左面板",
    cards: [
      zhongda_heshun_cards.projectProduct.cards.projectProductOverview,
      zhongda_heshun_cards.projectProduct.cards.projectProductNewTrends,
      zhongda_heshun_cards.projectProduct.cards.projectProductUserTrends,
    ],
  },
  projectProductRight: {
    name: "中大合顺-产品-右面板",
    cards: [
      zhongda_heshun_cards.projectProduct.cards.productRegionDistribution,
      zhongda_heshun_cards.projectProduct.cards.sanitizeDeviceUsageTendency,
      zhongda_heshun_cards.projectProduct.cards.sanitizeDeviceStatus,
    ],
  },
};
