import { pz_demo_panel } from "../data-panel/pz-demo/panel";
import { cardDefinition, type CardDescribe } from "./card-definition";
import { command_dispatch_cards } from "./command-dispatch/cards";
import { command_dispatch_panel } from "./command-dispatch/panel";
import { parking_car_panel } from "./parking-car/panel";
import { people_flow_panel } from "./people-flow/panel";
import { safety_manage_panel } from "./safety-manage-cards/panel";
import { shandong_panel } from "./shandong-cards/panel";
import { zhongda_heshun_panel } from "./zhongda-heshun/panel";

/** 内置面板定义 */
export interface PanelDescribe {
  /** 内置面板名称 */
  name: string;
  /** 内置面板卡片配置 */
  cards: CardDescribe[];
}

export const panelDefinition: Record<string, PanelDescribe> = {
  rebuildOverviewLeft: {
    name: "总览2.0-左面板",
    cards: [
      cardDefinition.security.cards.safeOperationDays,
      cardDefinition.security.cards.overviewAlarmSituation,
      cardDefinition.security.cards.deviceSituation,
      cardDefinition.security.cards.patrolSituation,
    ],
  },
  rebuildOverviewRight: {
    name: "总览2.0-右面板",
    cards: [
      cardDefinition.security.cards.monitorSituation,
      cardDefinition.security.cards.monitorPersonnelStatistics,
      cardDefinition.security.cards.managementSituation,
    ],
  },
  SafeOverviewLeft: {
    name: "园区总览2.0-左面板",
    cards: [cardDefinition.security.cards.securityMarketOverview, cardDefinition.security.cards.securityDeviceCount],
  },
  SafeOverviewRight: {
    name: "园区总览2.0-右面板",
    cards: [
      cardDefinition.security.cards.securityAnalysis,
      cardDefinition.security.cards.securityRiskSource,
      cardDefinition.security.cards.securityManageTrend,
    ],
  },
  ParkManageLeft: {
    name: "园区管理-左面板",
    cards: [
      cardDefinition.parkManage.cards.parkSpaceUtilization,
      cardDefinition.parkManage.cards.parkBuildingSpaceUtilization,
      cardDefinition.parkManage.cards.parkEnterpriseIndustryStats,
    ],
  },
  ParkManageRight: {
    name: "园区管理-右面板",
    cards: [
      cardDefinition.parkManage.cards.parkLeasingOverview,
      cardDefinition.parkManage.cards.parkLeasingTrends,
      cardDefinition.parkManage.cards.parkFloorLeasingRatio,
    ],
  },
  MeetingManageLeft: {
    name: "会议管理-左面板",
    cards: [
      cardDefinition.meeting.cards.MeetingAvailability,
      cardDefinition.meeting.cards.BookingPeriodAnalysis,
      cardDefinition.meeting.cards.MeetingRoomUtilization,
    ],
  },
  MeetingManageRight: {
    name: "会议管理-右面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentStatus,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
      cardDefinition.generic.cards.alarmStatusAndList,
    ],
  },

  shanghaiOverviewParkingLeft: {
    name: "上海总览2.0-左面板",
    cards: [
      cardDefinition.security.cards.safeOperationDays,
      cardDefinition.security.cards.overviewAlarmSituation,
      cardDefinition.security.cards.deviceSituation,
      cardDefinition.security.cards.patrolSituation,
    ],
  },
  shanghaiOverviewParkingRight: {
    name: "上海总览2.0-右面板",
    cards: [
      cardDefinition.security.cards.monitorSituation,
      cardDefinition.security.cards.hiddenDangerStatistics,
      cardDefinition.publicSecurity.cards.workOrderStatistics,
    ],
  },

  SecurityMonitoringSafeLeft: {
    name: "安防监控2.0-左面板",
    cards: [
      cardDefinition.security.cards.securityAlarmCount,
      cardDefinition.security.cards.securityAlarmEventCount,
      cardDefinition.security.cards.securityAlarmTrend,
    ],
  },
  SecurityMonitoringSafeRight: {
    name: "安防监控2.0-右面板",
    cards: [
      cardDefinition.security.cards.securityMonitor,
      cardDefinition.security.cards.securityMonitorDeviceCount,
      cardDefinition.security.cards.securityAlarmRecord,
    ],
  },
  SecurityMonitoringSafeParkingLeft: {
    name: "安防监控2.0园区-左面板",
    cards: [
      cardDefinition.security.cards.alarmStatistics,
      cardDefinition.security.cards.alarmLevelStatistics,
      cardDefinition.security.cards.securityAlarmTrend,
    ],
  },
  // 安防监控 园区右面板
  SecurityMonitoringSafeParkingRight: {
    name: "安防监控2.0园区-右面板",
    cards: [
      cardDefinition.security.cards.securityMonitor,
      cardDefinition.universalPanel.cards.alarmEventTop5,
      cardDefinition.security.cards.patrolAbnormalStats,
    ],
  },
  // 指挥调度2.0面板
  ...command_dispatch_panel,
  CommandDispatchSafeParkingLeft: {
    name: "指挥调度园区-左面板",
    cards: [cardDefinition.security.cards.alarmLevelStatistics, cardDefinition.security.cards.securityAlarmRecord],
  },
  CommandDispatchSafeParkingRight: {
    name: "指挥调度园区-右面板",
    cards: [
      command_dispatch_cards.commandDispatch.cards.commandDispatchDutyPerson,
      command_dispatch_cards.commandDispatch.cards.commandDispatchAlarmRank,
    ],
  },
  CommandDispatchSafeBuildLeft: {
    name: "指挥调度楼栋-左面板",
    cards: [cardDefinition.universalPanel.cards.publicDeviceDistribution, cardDefinition.universalPanel.cards.alarmEventTop5],
  },
  CommandDispatchSafeBuildRight: {
    name: "指挥调度楼栋-右面板",
    cards: [cardDefinition.security.cards.alarmLevelStatistics, cardDefinition.security.cards.securityAlarmRecord],
  },
  ElectricalSafetyParkingLeft: {
    name: "电气安全园区-左面板",
    cards: [cardDefinition.generic.cards.alarmStatusAndTrend, cardDefinition.security.cards.alarmLevelStatistics],
  },
  ElectricalSafetyParkingRight: {
    name: "电气安全园区-右面板",
    cards: [cardDefinition.universalPanel.cards.alarmAreaTop5, cardDefinition.security.cards.electricalDevice],
  },
  ElectricalSafetyBuildLeft: {
    name: "电气安全楼栋-左面板",
    cards: [cardDefinition.universalPanel.cards.alarmAreaTop5, cardDefinition.generic.cards.alarmStatusAndList],
  },
  ElectricalSafetyBuildRight: {
    name: "电气安全楼栋-右面板",
    cards: [cardDefinition.universalPanel.cards.alarmAreaTop5, cardDefinition.generic.cards.alarmStatusAndList],
  },
  ElectricalSafetyLeft: {
    name: "电气安全2.0-左面板",
    cards: [
      cardDefinition.security.cards.securityAlarmCount,
      cardDefinition.security.cards.securityAlarmEventRatio,
      cardDefinition.security.cards.securityAlarmTrend,
    ],
  },
  ElectricalSafetyRight: {
    name: "电气安全2.0-右面板",
    cards: [
      cardDefinition.security.cards.electricalDevice,
      cardDefinition.universalPanel.cards.alarmAreaTop5,
      cardDefinition.generic.cards.alarmStatusAndList,
    ],
  },
  FireSafetyParkingLeft: {
    name: "消防管理-左面板",
    cards: [cardDefinition.generic.cards.alarmStatusAndTrend, cardDefinition.universalPanel.cards.alarmAreaTop5],
  },
  FireSafetyParkingRight: {
    name: "消防管理-右面板",
    cards: [cardDefinition.security.cards.fireDeviceStats, cardDefinition.security.cards.fireExpiredDeviceStats],
  },
  FireSafetyFloorLeft: {
    name: "消防管理楼层面板",
    cards: [cardDefinition.universalPanel.cards.alarmAreaTop5, cardDefinition.generic.cards.alarmStatusAndList],
  },
  FireSafetyLeft: {
    name: "消防管理2.0-左面板",
    cards: [
      cardDefinition.security.cards.securityAlarmCount,
      cardDefinition.security.cards.securityAlarmEventCount,
      cardDefinition.security.cards.securityAlarmTrend,
    ],
  },
  FireSafetyRight: {
    name: "消防管理2.0-右面板",
    cards: [
      cardDefinition.security.cards.firePipeNetwork,
      cardDefinition.security.cards.fireDeviceDistribution,
      cardDefinition.generic.cards.alarmStatusAndList,
    ],
  },
  EnvironmentalMonitoringParkingLeft: {
    name: "动环监控园区-左面板",
    cards: [cardDefinition.generic.cards.alarmStatusAndTrend, cardDefinition.security.cards.alarmLevelStatistics],
  },
  EnvironmentalMonitoringParkingRight: {
    name: "动环监控园区-右面板",
    cards: [cardDefinition.universalPanel.cards.alarmAreaTop5, cardDefinition.security.cards.environmentalMonitoringDevice],
  },
  EnvironmentalMonitoringFloorLeft: {
    name: "动环监控楼层面板",
    cards: [cardDefinition.universalPanel.cards.alarmAreaTop5, cardDefinition.generic.cards.alarmStatusAndList],
  },
  EnvironmentalMonitoringPowerLeft: {
    name: "动环监控2.0-左面板",
    cards: [
      cardDefinition.security.cards.securityAlarmCount,
      cardDefinition.security.cards.securityAlarmEventRatio,
      cardDefinition.security.cards.securityAlarmTrend,
    ],
  },
  EnvironmentalMonitoringPowerRight: {
    name: "动环监控2.0-右面板",
    cards: [
      cardDefinition.universalPanel.cards.alarmAreaTop5,
      cardDefinition.security.cards.upsWorkSituation,
      cardDefinition.security.cards.environmentalMonitoringDevice,
    ],
  },
  // 用气管理2.0-左面板
  GasManagementLeft: {
    name: "用气管理2.0-左面板",
    cards: [
      cardDefinition.security.cards.securityAlarmCount,
      cardDefinition.security.cards.securityAlarmTrend,
      cardDefinition.generic.cards.alarmProcessingRanking,
    ],
  },
  // 用气管理2.0-右面板
  GasManagementRight: {
    name: "用气管理2.0-右面板",
    cards: [
      cardDefinition.universalPanel.cards.publicSecurityDeviceCount,
      cardDefinition.universalPanel.cards.alarmAreaTop5,
      cardDefinition.security.cards.securityAlarmRecord,
    ],
  },
  SecurityManagementLeft: {
    name: "安全管理2.0-左面板",
    cards: [
      cardDefinition.security.cards.securityAlarmCount,
      cardDefinition.security.cards.hiddenDangerStatistics,
      cardDefinition.security.cards.smallProjectRecords,
    ],
  },
  SecurityManagementRight: {
    name: "安全管理2.0-右面板",
    cards: [
      cardDefinition.security.cards.safetyInspectionStatistics,
      cardDefinition.security.cards.safetyEducationStatistics,
      cardDefinition.security.cards.fireEquipmentStatistics,
    ],
  },
  ElectronicPatrolManagementLeft: {
    name: "电子巡更-左面板",
    cards: [
      cardDefinition.security.cards.patrolRoute,
      cardDefinition.security.cards.patrolPlan,
      cardDefinition.security.cards.patrolPointAbnormalTop5,
    ],
  },
  ElectronicPatrolManagementRight: {
    name: "电子巡更-右面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentStatus,
      cardDefinition.security.cards.patrolPointMissedStatistics,
      cardDefinition.security.cards.patrolAbnormalEventStatistics,
    ],
  },
  ElectronicPatrolManagementHikLeft: {
    name: "电子巡更海康-左面板",
    cards: [
      cardDefinition.security.cards.todayPatrolStatistics,
      cardDefinition.security.cards.todayPatrolTimeDistribution,
      cardDefinition.security.cards.patrolPointRankingTop10,
    ],
  },
  ElectronicPatrolManagementHikRight: {
    name: "电子巡更海康-右面板",
    cards: [
      cardDefinition.security.cards.todayPatrolPersonnelLatestPosition,
      cardDefinition.security.cards.patrolPointRankingTop10HK,
      cardDefinition.security.cards.patrolPointTrend,
    ],
  },
  ElectronicPatrolManagement2Left: {
    name: "电子巡更2.0-左面板",
    cards: [
      cardDefinition.security.cards.monitoringEquipmentStatistics,
      cardDefinition.electronicPatrol.cards.taskExecutionStatus,
      cardDefinition.electronicPatrol.cards.patrolRouteNew,
    ],
  },
  ElectronicPatrolManagement2Right: {
    name: "电子巡更2.0-右面板",
    cards: [
      cardDefinition.electronicPatrol.cards.patrolPointDistribution,
      cardDefinition.electronicPatrol.cards.patrolPointAbnormalTop5New,
      cardDefinition.electronicPatrol.cards.taskAbnormalRecord,
    ],
  },
  AccessControlManagementLeft: {
    name: "门禁管理-左面板",
    cards: [
      cardDefinition.stopGeneralManage.cards.deviceRealtimeStatus,
      cardDefinition.stopGeneralManage.cards.abnormalEventTop5,
      cardDefinition.stopGeneralManage.cards.abnormalTrafficTrend,
    ],
  },
  AccessControlManagementRight: {
    name: "门禁管理-右面板",
    cards: [
      cardDefinition.stopGeneralManage.cards.personnelTrafficTrend,
      cardDefinition.stopGeneralManage.cards.passageAnalysis,
      cardDefinition.stopGeneralManage.cards.realTimePassageData,
    ],
  },
  AirConditioningManagementLeft: {
    name: "空调管理-左面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentRealTimeData,
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.universalPanel.cards.equipmentRate,
    ],
  },
  AirConditioningManagementRight: {
    name: "空调管理-右面板",
    cards: [
      cardDefinition.universalPanel.cards.publicDeviceDistribution,
      cardDefinition.universalPanel.cards.alarmEventTop5,
      cardDefinition.generic.cards.alarmStatusAndList,
    ],
  },
  WaterSupplyAndDrainageLeft: {
    name: "给排水-左面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentRealTimeData,
      cardDefinition.generic.cards.alarmStatusAndTrend,
      cardDefinition.universalPanel.cards.equipmentRate,
    ],
  },
  WaterSupplyAndDrainageRight: {
    name: "给排水-右面板",
    cards: [
      cardDefinition.universalPanel.cards.publicDeviceDistribution,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
      cardDefinition.universalPanel.cards.equipmentAlarmTop5,
    ],
  },
  SupplyAndExhaustAirLeft: {
    name: "送排风-左面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentRealTimeData,
      cardDefinition.generic.cards.alarmStatusAndTrend,
      cardDefinition.universalPanel.cards.equipmentRate,
    ],
  },
  SupplyAndExhaustAirRight: {
    name: "送排风-右面板",
    cards: [
      cardDefinition.universalPanel.cards.publicDeviceDistribution,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
      cardDefinition.universalPanel.cards.alarmAreaTop5,
    ],
  },
  IntrusionAlarmLeft: {
    name: "入侵报警-左面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentRealTimeData,
      cardDefinition.generic.cards.alarmStatusAndTrend,
      cardDefinition.universalPanel.cards.equipmentRate,
    ],
  },
  IntrusionAlarmRight: {
    name: "入侵报警-右面板",
    cards: [
      cardDefinition.universalPanel.cards.publicDeviceDistribution,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
      cardDefinition.universalPanel.cards.equipmentAlarmTop5,
    ],
  },
  ParkingManagementLeft: {
    name: "停车管理-左面板",
    cards: [
      cardDefinition.parkingManagement.cards.overviewParkingSpaces,
      cardDefinition.parkingManagement.cards.vehicleTrends,
      cardDefinition.parkingManagement.cards.strandedVehiclesAnalysis,
    ],
  },
  stopGeneralManageRight: {
    name: "停车管理-右面板",
    cards: [
      cardDefinition.stopGeneralManage.cards.entryAndExitRecords,
      cardDefinition.stopGeneralManage.cards.trendVehicleFlowDrivingOut,
      cardDefinition.stopGeneralManage.cards.realTimeAccessRecords,
    ],
  },
  ParkingManagementRight: {
    name: "停车管理-费用面板",
    cards: [
      cardDefinition.parkingManagement.cards.parkingCarCharge,
      cardDefinition.parkingManagement.cards.parkingCarChargeInterval,
      cardDefinition.parkingManagement.cards.parkingCarChargeTrend,
    ],
  },
  LightingManagementLeft: {
    name: "照明管理-左面板",
    cards: [
      cardDefinition.universalPanel.cards.publicDeviceClassification,
      cardDefinition.lightingManagement.cards.lightingCircuitStatus,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
    ],
  },
  LightingManagementRight: {
    name: "照明管理-右面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentRealTimeData,
      cardDefinition.lightingManagement.cards.groupControlRealtimeData,
      cardDefinition.lightingManagement.cards.timeControlRealtimeData,
    ],
  },
  BuildingManagementRight: {
    name: "院区总览-右面板",
    cards: [
      cardDefinition.smallAndMicro.cards.OverviewSecuritySituation,
      cardDefinition.energyPanel.cards.energyTrend,
      cardDefinition.universalPanel.cards.equipmentOverview,
    ],
  },
  OperationSituationLeft: {
    name: "运维态势-左面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentOverview,
      cardDefinition.universalPanel.cards.deviceOfflineSituation,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
    ],
  },
  OperationSituationRight: {
    name: "运维态势-右面板",
    cards: [
      cardDefinition.generic.cards.alarmProcessing,
      cardDefinition.stopGeneralManage.cards.informationPublish,
      cardDefinition.universalPanel.cards.publicEquipmentProcessingTrends,
    ],
  },
  SecuritySituationLeft1: {
    name: "安全态势-左面板",
    cards: [
      cardDefinition.stopGeneralManage.cards.personnelTrafficTrend,
      cardDefinition.stopGeneralManage.cards.passageAnalysis,
      cardDefinition.parkingManagement.cards.vehicleTrends,
    ],
  },
  SecuritySituationRight1: {
    name: "安全态势-右面板",
    cards: [
      cardDefinition.generic.cards.alarmProcessing,
      cardDefinition.security.cards.fireExpiredDeviceStats,
      cardDefinition.electricVehicleManagement.cards.elevatorAnalysisPanel,
    ],
  },
  EnergySituationLeft: {
    name: "能耗态势-左面板",
    cards: [
      cardDefinition.energyPanel.cards.energyStatistics,
      cardDefinition.energyPanel.cards.carbonTrends,
      cardDefinition.generic.cards.alarmStatusAndList,
    ],
  },
  EnergySituationRight: {
    name: "能耗态势-右面板",
    cards: [
      cardDefinition.energyPanel.cards.energyTrend,
      cardDefinition.energyPanel.cards.energyConsumptionTrend,
      cardDefinition.energyPanel.cards.energyAnalysis,
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
    ],
  },
  InformationPublishLeft: {
    name: "信息发布-左面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.universalPanel.cards.publicDeviceClassification,
      cardDefinition.security.cards.securityAlarmRecord,
    ],
  },
  InformationPublishRight: {
    name: "信息发布-右面板",
    cards: [
      cardDefinition.universalPanel.cards.publicDeviceDistribution,
      cardDefinition.security.cards.alarmLevelStatistics,
      cardDefinition.universalPanel.cards.equipmentAlarmTop5,
    ],
  },
  WeekBoundaryProtectionLeft: {
    name: "周界防护-左面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.generic.cards.PublicOfflineRateEquipment,
      cardDefinition.universalPanel.cards.assetOverview,
    ],
  },
  WeekBoundaryProtectionRight: {
    name: "周界防护-右面板",
    cards: [
      cardDefinition.generic.cards.alarmStatusAndList,
      cardDefinition.universalPanel.cards.alarmStatus,
      cardDefinition.security.cards.alarmLevelStatistics,
    ],
  },
  BroadcastSystem: {
    name: "广播系统-面板",
    cards: [
      cardDefinition.broadcastSystem.cards.recordRanking,
      cardDefinition.broadcastSystem.cards.recordTrend,
      cardDefinition.broadcastSystem.cards.latestRecords,
    ],
  },
  BoilerSystemLeft: {
    name: "锅炉系统-左面板",
    cards: [
      cardDefinition.boilerSystem.cards.dataOverview,
      cardDefinition.boilerSystem.cards.temperatureTrend,
      cardDefinition.boilerSystem.cards.waterTrend,
      cardDefinition.boilerSystem.cards.energyTrend,
    ],
  },
  BoilerSystemRight: {
    name: "锅炉系统-右面板",
    cards: [
      cardDefinition.boilerSystem.cards.deviceStats,
      cardDefinition.boilerSystem.cards.overTemperatureStats,
      cardDefinition.generic.cards.deviceAlarm,
    ],
  },
  ProcessWaterLeft: {
    name: "污水处理-左面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentRealTimeData,
      cardDefinition.universalPanel.cards.publicDeviceClassification,
      cardDefinition.generic.cards.deviceAlarm,
    ],
  },
  ProcessWaterRight: {
    name: "污水处理-右面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.universalPanel.cards.alarmAreaTop5,
      cardDefinition.boilerSystem.cards.waterTreatmentRealtime,
    ],
  },
  ProcessWaterNewLeft: {
    name: "净水系统-左面板",
    cards: [
      cardDefinition.waterSystem.cards.waterUsageSituation,
      cardDefinition.waterSystem.cards.waterUsageTrend,
      cardDefinition.waterSystem.cards.areaUsageOverview,
    ],
  },
  ProcessWaterNewRight: {
    name: "净水系统-右面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.universalPanel.cards.publicDeviceClassification,
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.generic.cards.deviceAlarm,
    ],
  },
  AirSourceLeft: {
    name: "空气源-左面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.universalPanel.cards.equipmentRate,
    ],
  },
  AirSourceRight: {
    name: "空气源-右面板",
    cards: [
      cardDefinition.universalPanel.cards.publicDeviceClassification,
      cardDefinition.universalPanel.cards.alarmAreaTop5,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
    ],
  },
  ElevatorManagementLeft: {
    name: "电梯管理-左面板",
    cards: [
      cardDefinition.elevatorManagement.cards.liftStats,
      cardDefinition.elevatorManagement.cards.liftOperationAnalysis,
      cardDefinition.elevatorManagement.cards.liftStatusMonitor,
    ],
  },
  ElevatorManagementRight: {
    name: "电梯管理-右面板",
    cards: [
      cardDefinition.elevatorManagement.cards.liftAlarmLevelStats,
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.elevatorManagement.cards.latestFiveWayCall,
    ],
  },
  LogisticsSystemLeft: {
    name: "物流系统-左面板",
    cards: [
      cardDefinition.logisticsSystem.cards.logisticsDeviceStatusDistribution,
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.logisticsSystem.cards.logisticsDeviceOnlineStatus,
    ],
  },
  LogisticsSystemRight: {
    name: "物流系统-右面板",
    cards: [
      cardDefinition.universalPanel.cards.publicDeviceClassification,
      cardDefinition.security.cards.securityAlarmRecord,
      cardDefinition.generic.cards.PublicOfflineRateEquipment,
    ],
  },
  FloorDevice: {
    name: "楼层设备-面板",
    cards: [cardDefinition.universalPanel.cards.floorDeviceList],
  },
  PipeGalleryDevice: {
    name: "管廊设备-面板",
    cards: [cardDefinition.universalPanel.cards.pipeDeviceList],
  },
  FlowAnalysisLeft: {
    name: "客流分析-左面板",
    cards: [
      cardDefinition.flowAnalysis.cards.passengerFlowOverview,
      cardDefinition.flowAnalysis.cards.passengerFlowRanking,
      cardDefinition.flowAnalysis.cards.passengerFlowAnalysis,
    ],
  },
  FlowAnalysisRight: {
    name: "客流分析-右面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.generic.cards.deviceAlarm,
      cardDefinition.flowAnalysis.cards.passengerFlowRegional,
    ],
  },
  GardenSystemLeft: {
    name: "园林系统-左面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.generic.cards.alarmStatusAndList,
      cardDefinition.gardenSystem.cards.gardenDeviceOnlineStatus,
    ],
  },
  GardenSystemRight: {
    name: "园林系统-右面板",
    cards: [
      cardDefinition.universalPanel.cards.alarmLevel,
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
    ],
  },
  EmergencyPhoneLeft: {
    name: "紧急电话-左面板",
    cards: [
      cardDefinition.emergencyPhone.cards.latestEmergencyCalls,
      cardDefinition.emergencyPhone.cards.callUsageTrends,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
    ],
  },
  EmergencyPhoneRight: {
    name: "紧急电话-右面板",
    cards: [
      cardDefinition.logisticsSystem.cards.logisticsDeviceStatusDistribution,
      cardDefinition.emergencyPhone.cards.callDeviceOnlineStatus,
      cardDefinition.universalPanel.cards.equipmentTrend,
    ],
  },
  TrafficLightLeft: {
    name: "交通灯-左面板",
    cards: [
      cardDefinition.logisticsSystem.cards.logisticsDeviceStatusDistribution,
      cardDefinition.trafficLight.cards.trafficLightDeviceOnlineStatus,
      cardDefinition.universalPanel.cards.equipmentTrend,
    ],
  },
  TrafficLightRight: {
    name: "交通灯-右面板",
    cards: [
      cardDefinition.universalPanel.cards.alarmLevel,
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
    ],
  },
  TrafficControlLeft: {
    name: "交通控制-左面板",
    cards: [
      cardDefinition.trafficControl.cards.trafficControlDeviceOnlineStatus,
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.universalPanel.cards.alarmEventTop5,
    ],
  },
  TrafficControlRight: {
    name: "交通控制-右面板",
    cards: [
      cardDefinition.universalPanel.cards.alarmLevel,
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
    ],
  },
  TrafficMonitoringLeft: {
    name: "车流量监测-左面板",
    cards: [
      cardDefinition.trafficMonitoring.cards.tunnelTodayTrafficFlow,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
      cardDefinition.security.cards.securityAlarmEventCount,
    ],
  },
  TrafficMonitoringRight: {
    name: "车流量监测-右面板",
    cards: [
      cardDefinition.trafficMonitoring.cards.tunnelLaneTrafficFlow,
      cardDefinition.trafficMonitoring.cards.sectionRealtimeSpeed,
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
    ],
  },
  EmergencyResourceLeft: {
    name: "应急资源-左面板",
    cards: [
      cardDefinition.emergencyResource.cards.EmergencySuppliesStatus,
      cardDefinition.emergencyResource.cards.EmergencySuppliesStock,
      cardDefinition.emergencyResource.cards.EmergencyFundsTrend,
    ],
  },
  EmergencyResourceRight: {
    name: "应急资源-右面板",
    cards: [
      cardDefinition.emergencyResource.cards.EmergencyPersonnelStats,
      cardDefinition.emergencyResource.cards.EmergencyEquipmentStats,
      cardDefinition.emergencyResource.cards.EmergencyFacilityUsage,
    ],
  },
  MedicalCardLeft: {
    name: "智能卡-左面板",
    cards: [
      cardDefinition.medicalCard.cards.smartCardStatusStats,
      cardDefinition.medicalCard.cards.smartVisitorTrends,
      cardDefinition.medicalCard.cards.smartAccessEventsTop10,
    ],
  },
  MedicalCardRight: {
    name: "智能卡-右面板",
    cards: [cardDefinition.medicalCard.cards.smartElevatorEventsTop10, cardDefinition.medicalCard.cards.smartIntercomEventsTop10],
  },
  EnvironmentMonitoringLeft: {
    name: "环境监测-左面板",
    cards: [
      cardDefinition.environmentMonitoring.cards.tunnelEnvironmentRealtime,
      cardDefinition.environmentMonitoring.cards.tunnelCoTrendAnalysis,
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
    ],
  },
  EnvironmentMonitoringRight: {
    name: "环境监测-右面板",
    cards: [
      cardDefinition.environmentMonitoring.cards.realtimeEnvironmentTrendAnalysis,
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
    ],
  },
  ConsumptionManagementLeft: {
    name: "消费管理-左面板",
    cards: [
      cardDefinition.consumptionManagement.cards.transactionOverview,
      cardDefinition.consumptionManagement.cards.transactionTrend,
      cardDefinition.consumptionManagement.cards.accountConsumptionTop10,
    ],
  },
  ConsumptionManagementRight: {
    name: "消费管理-右面板",
    cards: [
      cardDefinition.consumptionManagement.cards.shareTransactionOverview,
      cardDefinition.consumptionManagement.cards.shareTransactionTrend,
      cardDefinition.consumptionManagement.cards.accountStatusStats,
    ],
  },
  PrepaidLeft: {
    name: "预付费-左面板",
    cards: [
      cardDefinition.prepaid.cards.electricityUsageTrend,
      cardDefinition.prepaid.cards.lostElectricityMeterStats,
      cardDefinition.prepaid.cards.arrearsElectricityMeterStats,
    ],
  },
  PrepaidRight: {
    name: "预付费-右面板",
    cards: [
      cardDefinition.prepaid.cards.waterUsageTrend,
      cardDefinition.prepaid.cards.lostWaterMeterStats,
      cardDefinition.prepaid.cards.arrearsWaterMeterStats,
    ],
  },
  StarDeliveryLeft: {
    name: "星配送-左面板",
    cards: [
      cardDefinition.starDelivery.cards.starOrderDistribution,
      cardDefinition.starDelivery.cards.starOrderTrend,
      cardDefinition.starDelivery.cards.starUserDistribution,
      cardDefinition.starDelivery.cards.starUserTrend,
    ],
  },
  StarDeliveryRight: {
    name: "星配送-右面板",
    cards: [
      cardDefinition.starDelivery.cards.starRevenueDistribution,
      cardDefinition.starDelivery.cards.starRevenueTrend,
      cardDefinition.starDelivery.cards.starRealtimeEvaluation,
    ],
  },
  PorkSlideLeft: {
    name: "猪肉滑轨-左面板",
    cards: [cardDefinition.porkSlide.cards.meatTransactionTop5, cardDefinition.porkSlide.cards.meatSlaughterhouseSupplyTop],
  },
  PorkSlideRight: {
    name: "猪肉滑轨-右面板",
    cards: [
      cardDefinition.porkSlide.cards.meatTransactionInfo,
      cardDefinition.porkSlide.cards.meatSupplyInfo,
      cardDefinition.porkSlide.cards.meatFoodSafetyInfo,
    ],
  },
  PorkSlideFloorLeft: {
    name: "猪肉滑轨-楼层-左面板",
    cards: [
      cardDefinition.porkSlide.cards.meatFoodSafetyFloor,
      cardDefinition.porkSlide.cards.meatBatchSuspicionRate,
      cardDefinition.porkSlide.cards.meatDeviceData,
    ],
  },
  PorkSlideFloorRight: {
    name: "猪肉滑轨-楼层-右面板",
    cards: [cardDefinition.porkSlide.cards.meatWhiteStripeTransactionData, cardDefinition.porkSlide.cards.meatTallyAuditRate],
  },
  PorkSlideTianJinLeft: {
    name: "猪肉滑轨-左面板(天津)",
    cards: [cardDefinition.porkSlide.cards.tianjinTransactionTop5, cardDefinition.porkSlide.cards.tianjinSlaughterhouseSupplyTop],
  },
  PorkSlideTianJinRight: {
    name: "猪肉滑轨-右面板(天津)",
    cards: [
      cardDefinition.porkSlide.cards.tianjinTransactionInfo,
      cardDefinition.porkSlide.cards.tianjinSupplyInfo,
      cardDefinition.porkSlide.cards.tianjinFoodSafetyInfo,
    ],
  },
  PorkSlideTianJinFloorLeft: {
    name: "猪肉滑轨-楼层-左面板(天津)",
    cards: [
      cardDefinition.porkSlide.cards.tianjinFoodSafetyFloor,
      cardDefinition.porkSlide.cards.tianjinBatchSuspicionRate,
      cardDefinition.porkSlide.cards.tianjinDeviceData,
    ],
  },
  PorkSlideTianJinFloorRight: {
    name: "猪肉滑轨-楼层-右面板(天津)",
    cards: [cardDefinition.porkSlide.cards.tianjinWhiteStripeTransactionData, cardDefinition.porkSlide.cards.tianjinTallyAuditRate],
  },

  MedicalGasNewLeft: {
    name: "医用气体-左面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.universalPanel.cards.publicEquipmentProcessingTrends,
      cardDefinition.universalPanel.cards.publicDeviceClassification,
    ],
  },
  MedicalGasNewRight: {
    name: "医用气体-右面板",
    cards: [
      cardDefinition.hospitalManagement.cards.todayGasUsage,
      cardDefinition.hospitalManagement.cards.gasUsageSituation,
      cardDefinition.hospitalManagement.cards.gasUsageTrend,
    ],
  },
  ChildHospitalLeft: {
    name: "儿童医院-左面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.hospitalManagement.cards.hospitalAlarmSituation,
      cardDefinition.hospitalManagement.cards.hospitalAlarmTrend,
    ],
  },
  ChildHospitalRight: {
    name: "儿童医院-右面板",
    cards: [
      cardDefinition.smallAndMicro.cards.TrendPedestrianFlow,
      cardDefinition.stopGeneralManage.cards.abnormalEventTop5,
      cardDefinition.security.cards.securityMonitor,
    ],
  },
  LZHospitalLeft: {
    name: "泸州医院-左面板",
    cards: [
      cardDefinition.hospitalManagement.cards.introductionOfHospital,
      cardDefinition.universalPanel.cards.equipmentRealTimeData,
      cardDefinition.universalPanel.cards.equipmentStatus,
    ],
  },
  LZHospitalRight: {
    name: "泸州医院-右面板",
    cards: [
      cardDefinition.security.cards.alarmLevelStatistics,
      cardDefinition.generic.cards.alarmStatusAndTrend,
      cardDefinition.universalPanel.cards.alarmStatus,
    ],
  },
  MedicalFreezeLeft: {
    name: "医用冷冻冷藏-左面板",
    cards: [
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.universalPanel.cards.publicDeviceClassification,
      cardDefinition.universalPanel.cards.equipmentStatistics,
    ],
  },
  MedicalFreezeRight: {
    name: "医用冷冻冷藏-右面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.universalPanel.cards.equipmentDetails,
      cardDefinition.universalPanel.cards.equipmentAlarmTop5,
    ],
  },
  MedicalTeachingLeft: {
    name: "手术示教-左面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.universalPanel.cards.equipmentDetails,
      cardDefinition.universalPanel.cards.equipmentTrend,
    ],
  },
  MedicalTeachingRight: {
    name: "手术示教-右面板",
    cards: [
      cardDefinition.hospitalManagement.cards.teachingOverview,
      cardDefinition.hospitalManagement.cards.teachingLiveSessions,
      cardDefinition.hospitalManagement.cards.popularVideos,
    ],
  },
  MerchantManagementLeft: {
    name: "商户管理-左面板",
    cards: [
      cardDefinition.merchantManagement.cards.merchantGearStats,
      cardDefinition.merchantManagement.cards.merchantListCard,
      cardDefinition.merchantManagement.cards.areaGearCount,
      cardDefinition.merchantManagement.cards.questionnaireStats,
    ],
  },
  MerchantManagementRight: {
    name: "商户管理-右面板",
    cards: [
      cardDefinition.merchantManagement.cards.honestyProportion,
      cardDefinition.merchantManagement.cards.honestyStats,
      cardDefinition.merchantManagement.cards.contractStats,
    ],
  },
  VisitorManagementLeft: {
    name: "访客管理-左面板",
    cards: [
      cardDefinition.security.cards.securityMonitorDeviceCount,
      cardDefinition.security.cards.securityAlarmCount,
      cardDefinition.security.cards.securityAlarmTrend,
    ],
  },
  VisitorManagementRight: {
    name: "访客管理-右面板",
    cards: [cardDefinition.security.cards.securityMonitor, cardDefinition.bookStore.cards.blacklistAlarmList],
  },
  BuildingDetailsPanel: {
    name: "楼栋详情面板",
    cards: [cardDefinition.generic.cards.buildingIntroduction],
  },
  LibraryManagementLeft: {
    name: "图书馆管理-左面板",
    cards: [
      cardDefinition.library.cards.monthStatistics,
      cardDefinition.library.cards.ComprehensiveStatistics,
      cardDefinition.library.cards.DeviceStatusDistribution,
    ],
  },
  LibraryManagementRight: {
    name: "图书馆管理-右面板",
    cards: [cardDefinition.library.cards.BorrowingRecords, cardDefinition.library.cards.AuthorRank, cardDefinition.library.cards.BookRank],
  },
  visorLeftPanel: {
    name: "访客管理-左面板（留灯书屋）",
    cards: [
      cardDefinition.bookStore.cards.reserveDataView,
      cardDefinition.bookStore.cards.newReserveRecords,
      cardDefinition.bookStore.cards.useReserveStat,
    ],
  },
  visorRightPanel: {
    name: "访客管理-右面板（留灯书屋）",
    cards: [
      cardDefinition.generic.cards.publicSecurityDeviceCount,
      cardDefinition.bookStore.cards.visitorTransitTrend,
      cardDefinition.security.cards.securityAlarmRecord,
    ],
  },
  noticeAnnouncementLeftPanel: {
    name: "通知公告-左面板",
    cards: [
      cardDefinition.bookStore.cards.notificationDetailsOne,
      cardDefinition.bookStore.cards.notificationDetailsTwo,
      cardDefinition.bookStore.cards.noticeAnnouncementList,
    ],
  },
  noticeAnnouncementRightPanel: {
    name: "通知公告-右面板",
    cards: [
      cardDefinition.bookStore.cards.newsDetailsOne,
      cardDefinition.bookStore.cards.newsDetailsTwo,
      cardDefinition.bookStore.cards.newsAnnouncementList,
    ],
  },
  EnvironmentalMonitoringXwLeft: {
    name: "环境监测-左面板（小微）",
    cards: [
      cardDefinition.smallAndMicro.cards.overviewPmMonitoring,
      cardDefinition.smallAndMicro.cards.TopRealRankings,
      cardDefinition.generic.cards.publicSecurityDeviceCount,
    ],
  },
  EnvironmentalMonitoringXwRight: {
    name: "环境监测-右面板（小微）",
    cards: [
      cardDefinition.smallAndMicro.cards.AirQualityStatistics,
      cardDefinition.smallAndMicro.cards.EnvironmentalTrendAnalysis,
      cardDefinition.generic.cards.PublicOfflineRateEquipment,
    ],
  },
  ParkManagementXwLeft: {
    name: "园区运营-左面板（小微）",
    cards: [
      cardDefinition.smallAndMicro.cards.CompletionStatusInvestmentTargets,
      cardDefinition.smallAndMicro.cards.EnterpriseComplaintStatistics,
      cardDefinition.smallAndMicro.cards.ProjectInitiationStatistics,
    ],
  },
  ParkManagementXwRight: {
    name: "园区运营-右面板（小微）",
    cards: [
      cardDefinition.smallAndMicro.cards.SpaceUtilizationRate,
      cardDefinition.smallAndMicro.cards.RentalSalesSituation,
      cardDefinition.smallAndMicro.cards.TrendParkRental,
    ],
  },
  videoPatrolLeftPanel: {
    name: "视频巡逻-左面板",
    cards: [
      cardDefinition.smallAndMicro.cards.VideoPatrolStatistics,
      cardDefinition.smallAndMicro.cards.DistributionPatrolTime,
      cardDefinition.smallAndMicro.cards.PatrolAnomalyStatistics,
    ],
  },
  videoPatrolRightPanel: {
    name: "视频巡逻-右面板",
    cards: [
      cardDefinition.smallAndMicro.cards.PatrolPointRankingList,
      cardDefinition.smallAndMicro.cards.VideoPatrolRoutes,
      cardDefinition.smallAndMicro.cards.PatrolPersonnelPointStatistics,
    ],
  },
  PatrolRouteDetails: {
    name: "视频巡逻详情",
    cards: [cardDefinition.smallAndMicro.cards.PatrolRouteDetails],
  },
  convenientAccessLeftPanel: {
    name: "便捷通行-左面板",
    cards: [
      cardDefinition.smallAndMicro.cards.securityMonitor,
      cardDefinition.smallAndMicro.cards.TrendPedestrianFlow,
      cardDefinition.bookStore.cards.reserveDataView,
    ],
  },
  convenientAccessRightPanel: {
    name: "便捷通行-右面板",
    cards: [
      cardDefinition.smallAndMicro.cards.VehicleTrends,
      cardDefinition.smallAndMicro.cards.TrafficTrends,
      cardDefinition.bookStore.cards.useReserveStat,
    ],
  },
  comprehensiveProtectionLeftPanel: {
    name: "综合安防-左面板",
    cards: [
      cardDefinition.smallAndMicro.cards.VideoPatrolStatistics,
      cardDefinition.smallAndMicro.cards.OverviewSecuritySituation,
      cardDefinition.security.cards.securityAlarmTrend,
    ],
  },
  comprehensiveProtectionRightPanel: {
    name: "综合安防-右面板",
    cards: [
      cardDefinition.security.cards.securityMonitor,
      cardDefinition.smallAndMicro.cards.PersonnelEntrySituation,
      cardDefinition.smallAndMicro.cards.AccessControlSituation,
    ],
  },
  parkSituationLeftPanel: {
    name: "园区态势-左面板",
    cards: [
      cardDefinition.security.cards.securityMonitor,
      cardDefinition.smallAndMicro.cards.AbnormalTrafficTrend,
      cardDefinition.smallAndMicro.cards.VehicleTrends,
    ],
  },
  parkSituationRightPanel: {
    name: "园区态势-右面板",
    cards: [
      cardDefinition.smallAndMicro.cards.RealTimeIndicatorTrendAnalysis,
      cardDefinition.energyPanel.cards.energyTrend,
      cardDefinition.smallAndMicro.cards.SpaceUtilizationRate,
    ],
  },
  GuidePanel: {
    name: "导览",
    cards: [cardDefinition.smallAndMicro.cards.GuideDetails],
  },
  floorPipeGalleryEquipment: {
    name: "设备数据",
    cards: [cardDefinition.smallAndMicro.cards.FloorPipeGalleryEquipment],
  },
  courtTrialLeftPanel: {
    name: "法院庭审-左面板",
    cards: [cardDefinition.demoPanel.cards.courtTrialPanelLeft],
  },
  courtTrialRightPanel: {
    name: "法院庭审-右面板",
    cards: [cardDefinition.demoPanel.cards.courtTrialPanelRight],
  },
  overviewCourtLeftPanel: {
    name: "法院总览-左面板",
    cards: [cardDefinition.demoPanel.cards.campusIntroduction],
  },
  overviewCourtRightPanel: {
    name: "法院总览-右面板",
    cards: [cardDefinition.demoPanel.cards.energyCarbonEmissions],
  },
  legalPublicityLeftPanel: {
    name: "法治宣传-左面板",
    cards: [cardDefinition.demoPanel.cards.legalPublicityLeft],
  },
  legalPublicityRightPanel: {
    name: "法治宣传-右面板",
    cards: [cardDefinition.demoPanel.cards.legalPublicityRight],
  },
  // 法院安全
  courtSecurityLeftPanel: {
    name: "法院安全-左面板",
    cards: [cardDefinition.demoPanel.cards.campusSecurityLeft],
  },
  courtSecurityRightPanel: {
    name: "法院安全-右面板",
    cards: [cardDefinition.demoPanel.cards.campusSecurityRight],
  },
  judicialSpaceLeftPanel: {
    name: "司法空间-左面板",
    cards: [cardDefinition.demoPanel.cards.judicialSpaceLeft],
  },
  judicialSpaceRightPanel: {
    name: "司法空间-右面板",
    cards: [cardDefinition.demoPanel.cards.judicialSpaceRight],
  },
  /**
   * 司法态势左
   */
  judicialSituationOverviewLeftPanel: {
    name: "司法态势-左面板",
    cards: [cardDefinition.demoPanel.cards.judicialSituationOverviewLeft],
  },
  /**
   * 司法态势右
   */
  judicialSituationOverviewRightPanel: {
    name: "司法态势-右面板",
    cards: [cardDefinition.demoPanel.cards.judicialSituationOverviewRight],
  },
  /**
   * 民事态势
   */
  civilSituationLeftPanel: {
    name: "民事态势-左面板",
    cards: [cardDefinition.demoPanel.cards.civilSituationLeft],
  },
  civilSituationRightPanel: {
    name: "民事态势-右面板",
    cards: [cardDefinition.demoPanel.cards.civilSituationRight],
  },
  /**
   * 来访人员
   */
  visitorsLeftPanel: {
    name: "来访人员-左面板",
    cards: [cardDefinition.demoPanel.cards.visitorsLeft],
  },
  visitorsRightPanel: {
    name: "来访人员-右面板",
    cards: [cardDefinition.demoPanel.cards.visitorsRight],
  },
  /**
   * 法院大安防
   */
  courtBigSecurityLeftPanel: {
    name: "法院安防左面板",
    cards: [cardDefinition.demoPanel.cards.courtBigSecurityLeftPanel],
  },
  /**
   * 设备详情面板
   */
  deviceDetailsPanel: {
    name: "设备详情面板",
    cards: [cardDefinition.generic.cards.deviceDetailsPanel],
  },
  /** 预案演练 */
  "emergency-drill": {
    name: "预案关联",
    cards: [
      {
        title: "预案关联",
        code: "emergency-drill",
      },
    ],
  },
  /**
   * 苏州公安
   * 综合运行
   */
  comprehensiveOperationLeftPanel: {
    name: "综合运行-左面板",
    cards: [
      cardDefinition.publicSecurity.cards.briefIntroduction,
      cardDefinition.publicSecurity.cards.appointmentsNumber,
      cardDefinition.publicSecurity.cards.visitorVehicles,
    ],
  },
  comprehensiveOperationRightPanel: {
    name: "综合运行-右面板",
    cards: [
      cardDefinition.generic.cards.equipmentProcessingTrends,
      cardDefinition.energyPanel.cards.energyTrend,
      cardDefinition.generic.cards.publicSecurityDeviceCount,
    ],
  },
  // 园区安全态势
  parkSafetyLeftPanel: {
    name: "园区安全态势-左面板",
    cards: [
      cardDefinition.smallAndMicro.cards.OverviewSecuritySituation,
      cardDefinition.generic.cards.alarmProcessing,
      cardDefinition.security.cards.securityAlarmTrend,
    ],
  },
  parkSafetyRightPanel: {
    name: "园区安全态势-右面板",
    cards: [
      cardDefinition.security.cards.securityMonitor,
      cardDefinition.smallAndMicro.cards.PersonnelEntrySituation,
      cardDefinition.smallAndMicro.cards.AccessControlSituation,
    ],
  },
  // 园区安全态势
  trafficSituationLeftPanel: {
    name: "通行态势左面板",
    cards: [cardDefinition.publicSecurity.cards.accessOverview, cardDefinition.publicSecurity.cards.trafficData],
  },
  trafficSituationRightPanel: {
    name: "通行态势-右面板",
    cards: [
      cardDefinition.publicSecurity.cards.overviewParkingSpaces,
      cardDefinition.publicSecurity.cards.trafficFlowTrend,
      cardDefinition.publicSecurity.cards.analysisStrandedVehicles,
    ],
  },
  publicSecurityOperationRight: {
    name: "运维态势-右面板",
    cards: [
      cardDefinition.generic.cards.AlarmSituation,
      cardDefinition.publicSecurity.cards.workOrderStatistics,
      cardDefinition.publicSecurity.cards.warrantyArea,
    ],
  },
  middleSchoolOverviewLeftPanel: {
    name: "领川总览-左面板",
    cards: [
      cardDefinition.middleSchool.cards.briefIntroduction,
      cardDefinition.generic.cards.publicSecurityDeviceCount,
      cardDefinition.smallAndMicro.cards.PersonnelEntrySituation,
    ],
  },
  middleSchoolOverviewRightPanel: {
    name: "领川总览-左面板",
    cards: [
      cardDefinition.security.cards.securityMonitor,
      cardDefinition.smallAndMicro.cards.OverviewSecuritySituation,
      cardDefinition.generic.cards.equipmentProcessingTrends,
    ],
  },
  personnelCounting: {
    name: "人员清点-右面板",
    cards: [cardDefinition.middleSchool.cards.personnelCounting],
  },
  vehicleMonitoring: {
    name: "人员清点-右面板",
    cards: [cardDefinition.middleSchool.cards.vehicleMonitoring],
  },
  comprehensiveSituationLeftPanel: {
    name: "综合态势-左面板",
    cards: [
      cardDefinition.generic.cards.AlarmSituationPie,
      cardDefinition.generic.cards.AlarmSituation,
      cardDefinition.smallAndMicro.cards.VehicleTrends,
    ],
  },
  comprehensiveSituationRightPanel: {
    name: "综合态势-右面板",
    cards: [
      cardDefinition.smallAndMicro.cards.EnergyDistribution,
      cardDefinition.library.cards.DeviceStatusDistribution,
      cardDefinition.smallAndMicro.cards.TrendParkRental,
    ],
  },
  smartConsumerSecurityLeftPanel: {
    name: "智慧安消-左面板",
    cards: [
      cardDefinition.security.cards.securityMonitor,
      cardDefinition.smallAndMicro.cards.VideoPatrolStatistics,
      cardDefinition.smallAndMicro.cards.TrafficTrends,
    ],
  },
  smartConsumerSecurityRightPanel: {
    name: "智慧安消-右面板",
    cards: [
      cardDefinition.publicSecurity.cards.overviewParkingSpaces,
      cardDefinition.generic.cards.publicSecurityDeviceCount,
      cardDefinition.security.cards.patrolTaskStatistics,
    ],
  },
  equipmentIntelligentLeftPanel: {
    name: "设备智管-左面板",
    cards: [
      cardDefinition.generic.cards.publicSecurityDeviceCount,
      cardDefinition.generic.cards.alarmProcessing,
      cardDefinition.demoPanel.cards.groupControlPanel,
    ],
  },
  equipmentIntelligentRightPanel: {
    name: "设备智管-右面板",
    cards: [cardDefinition.demoPanel.cards.TimeControlPanel],
  },
  // 资产管理
  assetManagementLeftPanel: {
    name: "资产管理-左面板",
    cards: [
      cardDefinition.assetManagement.cards.assetOverview,
      cardDefinition.assetManagement.cards.distributionDepartmentalAssets,
      cardDefinition.assetManagement.cards.regionalAssetDistribution,
    ],
  },
  assetManagementRightPanel: {
    name: "资产管理-右面板",
    cards: [
      cardDefinition.assetManagement.cards.proportionAssetStatus,
      cardDefinition.assetManagement.cards.proportionAssetClassification,
      cardDefinition.assetManagement.cards.trendConsumablesOutbound,
    ],
  },
  UniversalPanel: {
    name: "设备通用面板",
    cards: [
      cardDefinition.universalPanel.cards.EquipmentStatusOverview,
      cardDefinition.universalPanel.cards.equipmentRealTimeData,
      cardDefinition.universalPanel.cards.equipmentStatus,
      cardDefinition.universalPanel.cards.equipmentAlarmTop5,
      cardDefinition.universalPanel.cards.alarmLevel,
      cardDefinition.universalPanel.cards.alarmEventTop5,
      cardDefinition.universalPanel.cards.alarmStatus,
      cardDefinition.universalPanel.cards.alarmRate,
      cardDefinition.universalPanel.cards.assetOverview,
      cardDefinition.universalPanel.cards.deviceOfflineDetails,
      cardDefinition.universalPanel.cards.equipmentDetails,
      cardDefinition.universalPanel.cards.equipmentRate,
      cardDefinition.universalPanel.cards.equipmentStatistics,
      cardDefinition.universalPanel.cards.equipmentTrend,
      cardDefinition.universalPanel.cards.publicSecurityDeviceCount,
      cardDefinition.universalPanel.cards.publicOfflineRateEquipment,
      cardDefinition.universalPanel.cards.publicDeviceClassification,
      cardDefinition.universalPanel.cards.publicDeviceDistribution,
      cardDefinition.universalPanel.cards.publicEquipmentProcessingTrends,
    ],
  },
  EnergyPanel: {
    name: "能耗通用面板",
    cards: [
      cardDefinition.energyPanel.cards.annualEnergyConsumptionTrend,
      cardDefinition.energyPanel.cards.carbonEmissionRatio,
      cardDefinition.energyPanel.cards.carbonRankingTop10,
      cardDefinition.energyPanel.cards.carbonRankingTop5,
      cardDefinition.energyPanel.cards.carbonTrends,
      cardDefinition.energyPanel.cards.energyConsumptionProportion,
      cardDefinition.energyPanel.cards.energyConsumptionTrend,
      cardDefinition.energyPanel.cards.energyOverview,
      cardDefinition.energyPanel.cards.energyRankingTop10,
      cardDefinition.energyPanel.cards.energyRankingTop5,
      cardDefinition.energyPanel.cards.energyStatistics,
      cardDefinition.energyPanel.cards.energyTrend,
      cardDefinition.energyPanel.cards.rankingComprehensiveConsumptionTop10,
      cardDefinition.energyPanel.cards.rankingComprehensiveConsumptionTop5,
      cardDefinition.energyPanel.cards.subProportion,
    ],
  },
  // 报警通用面板
  AlarmPanel: {
    name: "报警通用面板",
    cards: [
      cardDefinition.generic.cards.AlarmSituation,
      cardDefinition.generic.cards.AlarmSituationPie,
      cardDefinition.universalPanel.cards.alarmLevel,
      cardDefinition.universalPanel.cards.alarmStatus,
      cardDefinition.universalPanel.cards.alarmRate,
      cardDefinition.universalPanel.cards.alarmEventTop5,
      cardDefinition.universalPanel.cards.equipmentAlarmTop5,
      cardDefinition.universalPanel.cards.alarmAreaTop5,
      cardDefinition.security.cards.securityAlarmRecord,
      cardDefinition.generic.cards.alarmStatusAndTrend,
      cardDefinition.generic.cards.alarmStatusAndList,
      cardDefinition.security.cards.alarmLevelStatistics,
      cardDefinition.security.cards.securityAlarmCount,
      cardDefinition.generic.cards.alarmProcessingRanking,
      cardDefinition.security.cards.securityAlarmEventCount,
      cardDefinition.security.cards.securityAlarmEventRatio,
      cardDefinition.security.cards.securityMonitor,
      cardDefinition.security.cards.securityMonitorDeviceCount,
      cardDefinition.security.cards.securityAlarmRecord,
    ],
  },

  electronicPatrolLeftPanel: {
    name: "电子巡更-左面板(CBD)",
    cards: [
      cardDefinition.electronicPatrol.cards.patrolStatistics,
      cardDefinition.electronicPatrol.cards.rankingPatrolPersonnel,
      cardDefinition.electronicPatrol.cards.patrolRoute,
    ],
  },
  electronicPatrolRightPanel: {
    name: "电子巡更-右面板(CBD)",
    cards: [
      cardDefinition.generic.cards.publicSecurityDeviceCount,
      cardDefinition.electronicPatrol.cards.abnormalPatrolPoint,
      cardDefinition.electronicPatrol.cards.rankingListPatrolPoints,
    ],
  },
  estateManagementLeftPanel: {
    name: "物业管理-左面板",
    cards: [
      cardDefinition.estateManagement.cards.statisticsNumberEnterprises,
      cardDefinition.estateManagement.cards.trendEnterpriseSettlement,
      cardDefinition.estateManagement.cards.overviewPropertyRevenue,
    ],
  },
  estateManagementRightPanel: {
    name: "物业管理-右面板",
    cards: [
      cardDefinition.estateManagement.cards.comparisonPropertyRevenue,
      cardDefinition.estateManagement.cards.propertyIncomeDetails,
      cardDefinition.estateManagement.cards.summaryPropertyRevenue,
    ],
  },
  restaurantLeftPanel: {
    name: "餐厅管理-左面板",
    cards: [
      cardDefinition.restaurant.cards.trendConsumptionAmount,
      cardDefinition.restaurant.cards.displayConsumptionAmount,
      cardDefinition.restaurant.cards.topCountConsumption,
    ],
  },
  restaurantRightPanel: {
    name: "餐厅管理-右面板",
    cards: [
      cardDefinition.restaurant.cards.proportionConsumptionAmount,
      cardDefinition.restaurant.cards.consumerStatistics,
      cardDefinition.restaurant.cards.perCapitaConsumptionAmountStatistics,
    ],
  },
  toiletManagement: {
    name: "厕所管理面板",
    cards: [cardDefinition.toiletManagement.cards.squattingOccupancySituation],
  },
  staffManagementLeftPanel: {
    name: "人员管理-左面板",
    cards: [
      cardDefinition.staffManagement.cards.overviewCorrectionObject,
      cardDefinition.staffManagement.cards.listHighRiskPersonnel,
      cardDefinition.staffManagement.cards.proportionRiskLevelCorrectionObject,
    ],
  },
  staffManagementRightPanel: {
    name: "人员管理-右面板",
    cards: [
      cardDefinition.staffManagement.cards.overviewPoliceForce,
      cardDefinition.staffManagement.cards.overviewExternalPersonnel,
      cardDefinition.staffManagement.cards.personnelInformationReleasedTimeout,
    ],
  },
  staffManagementBuildingLeftPanel: {
    name: "人员管理楼栋-左面板",
    cards: [cardDefinition.staffManagement.cards.statisticsCorrectionObject, cardDefinition.staffManagement.cards.policeStatistics],
  },
  staffManagementBuildingRightPanel: {
    name: "人员管理楼栋-右面板",
    cards: [
      cardDefinition.staffManagement.cards.statisticsExternalPersonnel,
      cardDefinition.staffManagement.cards.todayDormitoryRollCallSituation,
    ],
  },
  SmallEngineeringManagementLeftPanel: {
    name: "小散工程-左面板",
    cards: [
      cardDefinition.SmallEngineeringManagement.cards.smallStatistics,
      cardDefinition.SmallEngineeringManagement.cards.engineeringInspectionStatistics,
    ],
  },
  SmallEngineeringManagementRightPanel: {
    name: "小散工程-右面板",
    cards: [
      cardDefinition.SmallEngineeringManagement.cards.engineeringRectificationStatistics,
      cardDefinition.SmallEngineeringManagement.cards.abnormalStatisticsEngineeringInspection,
    ],
  },
  electricVehicleManagementLeftPanel: {
    name: "电瓶车-左面板",
    cards: [
      cardDefinition.electricVehicleManagement.cards.electricVehicleRegistrationStatistics,
      cardDefinition.electricVehicleManagement.cards.violationStatisticsElectricVehicles,
      cardDefinition.electricVehicleManagement.cards.electricVehiclesIllegallyEnteringElevators,
    ],
  },
  electricVehicleManagementRightPanel: {
    name: "电瓶车-右面板",
    cards: [
      cardDefinition.electricVehicleManagement.cards.statisticsIllegalParkingElectricVehicles,
      cardDefinition.electricVehicleManagement.cards.statisticsIllegalChargingElectricVehicles,
    ],
  },
  OverviewMedicalIntercomLeft: {
    name: "医护对讲-左面板",
    cards: [cardDefinition.hospitalManagement.cards.callStatisticsPanel, cardDefinition.hospitalManagement.cards.callTrends],
  },
  OverviewMedicalIntercomRight: {
    name: "医护对讲-右面板",
    cards: [cardDefinition.hospitalManagement.cards.distributionCallTimePeriods],
  },
  TriageQueueBuildLeft: {
    name: "分诊排号-左面板",
    cards: [
      cardDefinition.hospitalManagement.cards.visitingDataPanel,
      cardDefinition.hospitalManagement.cards.receptionTrendsPanel,
      cardDefinition.hospitalManagement.cards.waitingSituationPanel,
      cardDefinition.hospitalManagement.cards.appointmentVisitDistributionPanel,
    ],
  },

  ...safety_manage_panel,
  /** 教务态势 */
  educationalSituationLeft: {
    name: "教务态势-左面板",
    cards: [
      cardDefinition.educationalSituation.cards.dataOverview,
      cardDefinition.educationalSituation.cards.classNumberTop5,
      cardDefinition.educationalSituation.cards.classNumberStatistics,
    ],
  },
  educationalSituationRight: {
    name: "教务态势-右面板",
    cards: [
      cardDefinition.educationalSituation.cards.trainingPeopleProportion,
      cardDefinition.educationalSituation.cards.projectNumberStatistics,
      cardDefinition.educationalSituation.cards.classTrendsAnalysis,
    ],
  },
  ...parking_car_panel,
  ...people_flow_panel,
  ...shandong_panel,
  ...pz_demo_panel,
  ...zhongda_heshun_panel,
};
