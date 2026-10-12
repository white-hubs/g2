import type { PanelDescribe } from "../panel-definition";
import { parking_car_cards } from "./cards";

export const parking_car_panel: Record<string, PanelDescribe> = {
  parkingCarLeft: {
    name: "华威-停车监测-左面板",
    cards: [
      parking_car_cards.parkingCar.cards.parkingCarStatisticsDetail,
      parking_car_cards.parkingCar.cards.parkingCarStatistics,
      parking_car_cards.parkingCar.cards.parkingCarMonitor,
      parking_car_cards.parkingCar.cards.parkingCarInOut,
      parking_car_cards.parkingCar.cards.parkingCarStay,
      parking_car_cards.parkingCar.cards.parkingCarDeviceList,
    ],
  },
  parkingCarRight: {
    name: "华威-停车监测-右面板",
    cards: [
      parking_car_cards.parkingCar.cards.parkingCarCharge,
      parking_car_cards.parkingCar.cards.parkingCarChargeInterval,
      parking_car_cards.parkingCar.cards.parkingCarChargeTrend,
      parking_car_cards.parkingCar.cards.parkingCarDistribution,
    ],
  },
};
