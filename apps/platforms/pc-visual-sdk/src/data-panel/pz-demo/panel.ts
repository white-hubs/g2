import type { PanelDescribe } from "../panel-definition";
import { pz_demo_cards } from "./cards";

export const pz_demo_panel: Record<string, PanelDescribe> = {
  LaboratoryManagementDeviceAnalysisLeft: {
    name: "彭州-实验室管理-设备分析-左面板",
    cards: [
      pz_demo_cards.laboratoryManagement.cards.overallUtilization,
      pz_demo_cards.laboratoryManagement.cards.spaceUtilization,
      pz_demo_cards.laboratoryManagement.cards.deviceIdleStatistics,
      pz_demo_cards.laboratoryManagement.cards.idleRankTop5,
    ],
  },
  LaboratoryManagementDeviceAnalysisRight: {
    name: "彭州-实验室管理-设备分析-右面板",
    cards: [
      pz_demo_cards.laboratoryManagement.cards.deviceNumberStatistics,
      pz_demo_cards.laboratoryManagement.cards.statusAnalysis,
      pz_demo_cards.laboratoryManagement.cards.deviceAbnormalStatistics,
      pz_demo_cards.laboratoryManagement.cards.deviceFaultStatistics,
    ],
  },
  LaboratoryManagementEnvironmentalMonitoringLeft: {
    name: "彭州-实验室管理-环境监测-左面板",
    cards: [
      pz_demo_cards.laboratoryManagement.cards.temperatureTrendStatistics,
      pz_demo_cards.laboratoryManagement.cards.humidityTrendStatistics,
      pz_demo_cards.laboratoryManagement.cards.pressureTrendStatistics,
      pz_demo_cards.laboratoryManagement.cards.windSpeedTrendStatistics,
    ],
  },
  LaboratoryManagementEnvironmentalMonitoringRight: {
    name: "彭州-实验室管理-环境监测-右面板",
    cards: [
      pz_demo_cards.laboratoryManagement.cards.precipitationTrendStatistics,
      pz_demo_cards.laboratoryManagement.cards.carbonMonoxideTrendStatistics,
      pz_demo_cards.laboratoryManagement.cards.ozoneTrendStatistics,
      pz_demo_cards.laboratoryManagement.cards.sulfurDioxideTrendStatistics,
      pz_demo_cards.laboratoryManagement.cards.nitrogenOxideTrendStatistics,
    ],
  },
  LaboratoryManagementUseAnalysisLeft: {
    name: "彭州-实验室管理-使用分析-左面板",
    cards: [
      pz_demo_cards.laboratoryManagement.cards.reservationStatistics,
      pz_demo_cards.laboratoryManagement.cards.idleStatistics,
      pz_demo_cards.laboratoryManagement.cards.utilizationStatistics,
      pz_demo_cards.laboratoryManagement.cards.areaUtilization,
    ],
  },
  LaboratoryManagementUseAnalysisRight: {
    name: "彭州-实验室管理-使用分析-右面板",
    cards: [
      pz_demo_cards.laboratoryManagement.cards.areaUtilization,
      pz_demo_cards.laboratoryManagement.cards.areaUsageRate,
      pz_demo_cards.laboratoryManagement.cards.reservationTrend,
    ],
  },
  LaboratoryManagementOperationalAnalysisLeft: {
    name: "彭州-实验室管理-运营分析-左面板",
    cards: [
      pz_demo_cards.laboratoryManagement.cards.usageAnalysis,
      pz_demo_cards.laboratoryManagement.cards.reservationAnalysis,
      pz_demo_cards.laboratoryManagement.cards.reservationTrendAnalysis,
    ],
  },
  LaboratoryManagementOperationalAnalysisRight: {
    name: "彭州-实验室管理-运营分析-右面板",
    cards: [
      pz_demo_cards.laboratoryManagement.cards.deviceUtilizationAnalysis,
      pz_demo_cards.laboratoryManagement.cards.deviceStatusDistribution,
      pz_demo_cards.laboratoryManagement.cards.areaUsageRateAnalysis,
    ],
  },

  /** 能耗监测-区域能耗分析-左面板 */
  EnergyMonitoringAreaEnergyAnalysisLeft: {
    name: "彭州-能耗监测-区域能耗分析-左面板",
    cards: [
      pz_demo_cards.energyMonitoring.cards.regionalEnergyConsumptionAnalysis,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionByArea,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionTrend,
    ],
  },
  /** 能耗监测-区域能耗分析-右面板 */
  EnergyMonitoringAreaEnergyAnalysisRight: {
    name: "彭州-能耗监测-区域能耗分析-右面板",
    cards: [pz_demo_cards.energyMonitoring.cards.energyConsumptionAlarms, pz_demo_cards.energyMonitoring.cards.energyConsumptionHollow],
  },
  /** 能耗监测-能耗类型分析-左面板 */
  EnergyMonitoringEnergyTypeAnalysisLeft: {
    name: "彭州-能耗监测-能耗类型分析-左面板",
    cards: [
      pz_demo_cards.energyMonitoring.cards.energyConsumptionTypeOverview,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionTypeTrend,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionTypeOverviewElectricity,
    ],
  },
  /** 能耗监测-能耗类型分析-右面板 */
  EnergyMonitoringEnergyTypeAnalysisRight: {
    name: "彭州-能耗监测-能耗类型分析-右面板",
    cards: [
      pz_demo_cards.energyMonitoring.cards.energyConsumptionTypeTrendElectricity,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionTypeOverviewGas,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionTypeTrendGas,
    ],
  },
  /** 能耗监测-用能设备分析-左面板 */
  EnergyMonitoringDeviceAnalysisLeft: {
    name: "彭州-能耗监测-用能设备分析-左面板",
    cards: [
      pz_demo_cards.energyMonitoring.cards.energyConsumptionDeviceAnalysisWater,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionDeviceAnalysisElectricity,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionDeviceAnalysisGas,
    ],
  },
  /** 能耗监测-用能设备分析-右面板 */
  EnergyMonitoringDeviceAnalysisRight: {
    name: "彭州-能耗监测-用能设备分析-右面板",
    cards: [
      pz_demo_cards.energyMonitoring.cards.energyConsumptionDeviceAnalysisUsage,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionDeviceAnalysisLastPeriod,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionDeviceAnalysisArea,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionDeviceAnalysisFault,
    ],
  },
  /** 能耗监测-报警分析-左面板 */
  EnergyMonitoringAlarmAnalysisLeft: {
    name: "彭州-能耗监测-报警分析-左面板",
    cards: [
      pz_demo_cards.energyMonitoring.cards.energyConsumptionAlarmOverview,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionAlarmAnalysis,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionAlarmLevel,
    ],
  },
  /** 能耗监测-报警分析-右面板 */
  EnergyMonitoringAlarmAnalysisRight: {
    name: "彭州-能耗监测-报警分析-右面板",
    cards: [
      pz_demo_cards.energyMonitoring.cards.energyConsumptionAlarmType,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionAlarmTime,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionAlarmTrend,
    ],
  },
  /** 能耗监测-能耗指标-左面板 */
  EnergyMonitoringEnergyIndexLeft: {
    name: "彭州-能耗监测-能耗指标-左面板",
    cards: [
      pz_demo_cards.energyMonitoring.cards.energyConsumptionIndexOverview,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionIndexRatio,
    ],
  },
  /** 能耗监测-能耗指标-右面板 */
  EnergyMonitoringEnergyIndexRight: {
    name: "彭州-能耗监测-能耗指标-右面板",
    cards: [pz_demo_cards.energyMonitoring.cards.energyConsumptionIndexAreaRatio],
  },
  /** 能耗监测-能耗对比-左面板 */
  EnergyMonitoringEnergyComparisonLeft: {
    name: "彭州-能耗监测-能耗对比-左面板",
    cards: [
      pz_demo_cards.energyMonitoring.cards.energyConsumptionComparison,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionComparisonTrend,
    ],
  },
  /** 能耗监测-能耗对比-右面板 */
  EnergyMonitoringEnergyComparisonRight: {
    name: "彭州-能耗监测-能耗对比-右面板",
    cards: [
      pz_demo_cards.energyMonitoring.cards.energyConsumptionComparisonPeak,
      pz_demo_cards.energyMonitoring.cards.energyConsumptionComparisonTimeTrend,
    ],
  },
  /** 招商运营-左面板 */
  BusinessDevelopmentLeft: {
    name: "彭州-招商运营-左面板",
    cards: [
      pz_demo_cards.businessDevelopment.cards.introductionToChineseMedicineCity,
      pz_demo_cards.businessDevelopment.cards.introductionToDoubleLake,
    ],
  },
  /** 招商运营-右面板 */
  BusinessDevelopmentRight: {
    name: "彭州-招商运营-右面板",
    cards: [
      pz_demo_cards.businessDevelopment.cards.onlineReservationOverview,
      pz_demo_cards.businessDevelopment.cards.consultationStatistics,
      pz_demo_cards.businessDevelopment.cards.consultationServiceRecord,
    ],
  },
  /** 招商运营-配套信息-左面板 */
  BusinessDevelopmentComplementaryInformationLeft: {
    name: "彭州-招商运营-配套信息-左面板",
    cards: [
      pz_demo_cards.businessDevelopment.cards.buildingDistributionDensity,
      pz_demo_cards.businessDevelopment.cards.buildingStatistics,
      pz_demo_cards.businessDevelopment.cards.projectFormat,
      pz_demo_cards.businessDevelopment.cards.enterpriseScaleAnalysis,
    ],
  },
  /** 招商运营-配套信息-右面板 */
  BusinessDevelopmentComplementaryInformationRight: {
    name: "彭州-招商运营-配套信息-右面板",
    cards: [
      pz_demo_cards.businessDevelopment.cards.surroundingFacilities,
      pz_demo_cards.businessDevelopment.cards.projectFormatResourceFlowAnalysis,
      pz_demo_cards.businessDevelopment.cards.resourceTrendAnalysis,
    ],
  },
  /** 停车服务-运行监控-左面板 */
  ParkingServiceRunningMonitoringLeft: {
    name: "彭州-停车服务-运行监控-左面板",
    cards: [
      pz_demo_cards.parkingService.cards.parkingRateStatistics,
      pz_demo_cards.parkingService.cards.parkingTrendAnalysis,
      pz_demo_cards.parkingService.cards.areaParkingAnalysis,
    ],
  },
  /** 停车服务-运行监控-右面板 */
  ParkingServiceRunningMonitoringRight: {
    name: "彭州-停车服务-运行监控-右面板",
    cards: [
      pz_demo_cards.parkingService.cards.idleParkingStatistics,
      pz_demo_cards.parkingService.cards.parkingTypeStatistics,
      pz_demo_cards.parkingService.cards.averageParkingDurationStatistics,
      pz_demo_cards.parkingService.cards.stuckParkingAnalysis,
    ],
  },
  /** 停车服务-预约分析-左面板 */
  ParkingServiceReservationAnalysisLeft: {
    name: "彭州-停车服务-预约分析-左面板",
    cards: [
      pz_demo_cards.parkingService.cards.parkingReservationOverview,
      pz_demo_cards.parkingService.cards.parkingReservationPaymentAnalysis,
    ],
  },
  /** 停车服务-预约分析-右面板 */
  ParkingServiceReservationAnalysisRight: {
    name: "彭州-停车服务-预约分析-右面板",
    cards: [
      pz_demo_cards.parkingService.cards.parkingReservationOccupationTimeAnalysis,
      pz_demo_cards.parkingService.cards.parkingReservationEarlyReservationTimeTrendAnalysis,
    ],
  },
  /** 停车服务-费用分析-左面板 */
  ParkingServiceFeeAnalysisLeft: {
    name: "彭州-停车服务-费用分析-左面板",
    cards: [
      pz_demo_cards.parkingService.cards.parkingFeeTimeAnalysis,
      pz_demo_cards.parkingService.cards.parkingFeeOverview,
      pz_demo_cards.parkingService.cards.parkingFeeMonthlyServiceRatio,
    ],
  },
  /** 停车服务-费用分析-右面板 */
  ParkingServiceFeeAnalysisRight: {
    name: "彭州-停车服务-费用分析-右面板",
    cards: [pz_demo_cards.parkingService.cards.parkingFeeAnalysis, pz_demo_cards.parkingService.cards.parkingFeeDiscountRatio],
  },
  /** 停车服务-充电桩分析-左面板 */
  ParkingServiceChargingStationAnalysisLeft: {
    name: "彭州-停车服务-充电桩分析-左面板",
    cards: [
      pz_demo_cards.parkingService.cards.parkingChargeStationOverview,
      pz_demo_cards.parkingService.cards.parkingChargeStationAreaDistributionAnalysis,
    ],
  },
  /** 停车服务-充电桩分析-右面板 */
  ParkingServiceChargingStationAnalysisRight: {
    name: "彭州-停车服务-充电桩分析-右面板",
    cards: [
      pz_demo_cards.parkingService.cards.parkingChargeStationUsageTrendAnalysis,
      pz_demo_cards.parkingService.cards.parkingChargeStationRankingStatistics,
    ],
  },
  /** 设备设施-运行监控-左面板 */
  DeviceFacilitiesRunningMonitoringLeft: {
    name: "彭州-设备设施-运行监控-左面板",
    cards: [
      pz_demo_cards.deviceFacilities.cards.onlineStatistics,
      pz_demo_cards.deviceFacilities.cards.runningTimeStatistics,
      pz_demo_cards.deviceFacilities.cards.runningPowerStatistics,
    ],
  },
  /** 设备设施-运行监控-右面板 */
  DeviceFacilitiesRunningMonitoringRight: {
    name: "彭州-设备设施-运行监控-右面板",
    cards: [
      pz_demo_cards.deviceFacilities.cards.deviceUtilizationAnalysis,
      pz_demo_cards.deviceFacilities.cards.deviceAreaDistribution,
      pz_demo_cards.deviceFacilities.cards.deviceClassificationTotal,
    ],
  },
  /** 设备设施-数据分析-左面板 */
  DeviceFacilitiesDataAnalysisLeft: {
    name: "彭州-设备设施-数据分析-左面板",
    cards: [
      pz_demo_cards.deviceFacilities.cards.dataAssessment,
      pz_demo_cards.deviceFacilities.cards.dataAnalysis,
      pz_demo_cards.deviceFacilities.cards.dataCollection,
    ],
  },
  /** 设备设施-数据分析-右面板 */
  DeviceFacilitiesDataAnalysisRight: {
    name: "彭州-设备设施-数据分析-右面板",
    cards: [pz_demo_cards.deviceFacilities.cards.ruleMaking, pz_demo_cards.deviceFacilities.cards.dataMining],
  },
  /** 设备设施-保险与保养-左面板 */
  DeviceFacilitiesInsuranceAndMaintenanceLeft: {
    name: "彭州-设备设施-保险与保养-左面板",
    cards: [
      pz_demo_cards.deviceFacilities.cards.riskCoverage,
      pz_demo_cards.deviceFacilities.cards.riskCoverageTemplate,
      pz_demo_cards.deviceFacilities.cards.riskCoverageCycle,
    ],
  },
  /** 设备设施-保险与保养-右面板 */
  DeviceFacilitiesInsuranceAndMaintenanceRight: {
    name: "彭州-设备设施-保险与保养-右面板",
    cards: [pz_demo_cards.deviceFacilities.cards.riskCoverageContract, pz_demo_cards.deviceFacilities.cards.riskCoveragePlan],
  },
  /** 设备设施-故障分析-左面板 */
  DeviceFacilitiesFaultAnalysisLeft: {
    name: "彭州-设备设施-故障分析-左面板",
    cards: [
      pz_demo_cards.deviceFacilities.cards.riskCoverageDataCollection,
      pz_demo_cards.deviceFacilities.cards.riskCoverageFaultClassification,
    ],
  },
  /** 设备设施-故障分析-右面板 */
  DeviceFacilitiesFaultAnalysisRight: {
    name: "彭州-设备设施-故障分析-右面板",
    cards: [
      pz_demo_cards.deviceFacilities.cards.riskCoverageFaultFrequency,
      pz_demo_cards.deviceFacilities.cards.riskCoverageReasonAnalysis,
    ],
  },
  /** 设备设施-设备报警-左面板 */
  DeviceFacilitiesDeviceAlarmLeft: {
    name: "彭州-设备设施-设备报警-左面板",
    cards: [
      pz_demo_cards.deviceFacilities.cards.riskCoverageRunningStatus,
      pz_demo_cards.deviceFacilities.cards.riskCoverageDeviceQuantityStatistics,
      pz_demo_cards.deviceFacilities.cards.riskCoverageDeviceAlarmStatus,
    ],
  },
  /** 设备设施-设备报警-右面板 */
  DeviceFacilitiesDeviceAlarmRight: {
    name: "彭州-设备设施-设备报警-右面板",
    cards: [
      pz_demo_cards.deviceFacilities.cards.riskCoverageAlarmDeviceTypeAnalysis,
      pz_demo_cards.deviceFacilities.cards.riskCoverageAlarmDeviceTypeStatistics,
    ],
  },
  /** 园区安全-实时监控-左面板 */
  ParkSafetyRealTimeMonitoringLeft: {
    name: "彭州-园区安全-实时监控-左面板",
    cards: [pz_demo_cards.parkSafety.cards.realTimeMonitoring],
  },
  /** 园区安全-访客通行-左面板 */
  ParkSafetyVisitorPassageLeft: {
    name: "彭州-园区安全-访客通行-左面板",
    cards: [pz_demo_cards.parkSafety.cards.visitorInformationEntry, pz_demo_cards.parkSafety.cards.visitorIdentityVerification],
  },
  /** 园区安全-访客通行-右面板 */
  ParkSafetyVisitorPassageRight: {
    name: "彭州-园区安全-访客通行-右面板",
    cards: [pz_demo_cards.parkSafety.cards.visitorAgeDistribution, pz_demo_cards.parkSafety.cards.visitorTrendStatistics],
  },
  /** 园区安全-报警信息-左面板 */
  ParkSafetyAlarmInformationLeft: {
    name: "彭州-园区安全-报警信息-左面板",
    cards: [pz_demo_cards.parkSafety.cards.alarmLevelClassification, pz_demo_cards.parkSafety.cards.alarmProcessingDurationStatistics],
  },
  /** 园区安全-报警信息-右面板 */
  ParkSafetyAlarmInformationRight: {
    name: "彭州-园区安全-报警信息-右面板",
    cards: [pz_demo_cards.parkSafety.cards.alarmMessageNotification, pz_demo_cards.parkSafety.cards.alarmEventAnalysis],
  },
  /** 园区安全-安全事件分析-左面板 */
  ParkSafetySecurityEventAnalysisLeft: {
    name: "彭州-园区安全-安全事件分析-左面板",
    cards: [
      pz_demo_cards.parkSafety.cards.overview,
      pz_demo_cards.parkSafety.cards.securityEventAnalysis,
      pz_demo_cards.parkSafety.cards.alarmLevelStatistics,
      pz_demo_cards.parkSafety.cards.processorStatistics,
    ],
  },
  /** 园区安全-安全事件分析-右面板 */
  ParkSafetySecurityEventAnalysisRight: {
    name: "彭州-园区安全-安全事件分析-右面板",
    cards: [
      pz_demo_cards.parkSafety.cards.feedbackStatistics,
      pz_demo_cards.parkSafety.cards.areaSecurityEventAnalysis,
      pz_demo_cards.parkSafety.cards.securityEventTrendAnalysis,
    ],
  },
  /** 物业服务-日常服务-左面板 */
  PropertyServiceDailyServiceLeft: {
    name: "彭州-物业服务-日常服务-左面板",
    cards: [
      pz_demo_cards.propertyService.cards.announcementStatistics,
      pz_demo_cards.propertyService.cards.announcementDetails,
      pz_demo_cards.propertyService.cards.vehiclePassageStatistics,
      pz_demo_cards.propertyService.cards.vehiclePassageAnalysis,
      pz_demo_cards.propertyService.cards.itemPassageStatistics,
    ],
  },
  /** 物业服务-日常服务-右面板 */
  PropertyServiceDailyServiceRight: {
    name: "彭州-物业服务-日常服务-右面板",
    cards: [
      pz_demo_cards.propertyService.cards.itemPassageAnalysis,
      pz_demo_cards.propertyService.cards.serviceSatisfactionStatistics,
      pz_demo_cards.propertyService.cards.serviceSatisfactionAnalysis,
      pz_demo_cards.propertyService.cards.propertyNoticeCategory,
      pz_demo_cards.propertyService.cards.propertyNoticeTimeAnalysis,
    ],
  },
  /** 物业服务-安全巡查-左面板 */
  PropertyServiceSecurityPatrolLeft: {
    name: "彭州-物业服务-安全巡查-左面板",
    cards: [
      pz_demo_cards.propertyService.cards.propertyPatrolManagement,
      pz_demo_cards.propertyService.cards.propertyPatrolEventStatistics,
    ],
  },
  /** 物业服务-安全巡查-右面板 */
  PropertyServiceSecurityPatrolRight: {
    name: "彭州-物业服务-安全巡查-右面板",
    cards: [
      pz_demo_cards.propertyService.cards.propertyPatrolRecordAnalysis,
      pz_demo_cards.propertyService.cards.propertyPatrolAlarmTypeStatistics,
    ],
  },
  /** 物业服务-会议室-左面板 */
  PropertyServiceMeetingRoomLeft: {
    name: "彭州-物业服务-会议室-左面板",
    cards: [
      pz_demo_cards.propertyService.cards.propertyRoomAvailableTime,
      pz_demo_cards.propertyService.cards.propertyRoomRemainingTime,
      pz_demo_cards.propertyService.cards.propertyRoomBookingCount,
    ],
  },
  /** 物业服务-会议室-右面板 */
  PropertyServiceMeetingRoomRight: {
    name: "彭州-物业服务-会议室-右面板",
    cards: [pz_demo_cards.propertyService.cards.propertyRoomDeviceStatus, pz_demo_cards.propertyService.cards.propertyRoomRevenueStatus],
  },
  /** 物业服务-报事报修-左面板 */
  PropertyServiceRepairReportLeft: {
    name: "彭州-物业服务-报事报修-左面板",
    cards: [
      pz_demo_cards.propertyService.cards.propertyRepairTodayReporter,
      pz_demo_cards.propertyService.cards.propertyRepairReceiverProcessRate,
      pz_demo_cards.propertyService.cards.propertyRepairImportantEventStatistics,
      pz_demo_cards.propertyService.cards.propertyRepairEventCategoryStatistics,
      pz_demo_cards.propertyService.cards.propertyRepairDisposalSituationStatistics,
    ],
  },
  /** 物业服务-报事报修-右面板 */
  PropertyServiceRepairReportRight: {
    name: "彭州-物业服务-报事报修-右面板",
    cards: [
      pz_demo_cards.propertyService.cards.propertyRepairWorkOrderTypeStatistics,
      pz_demo_cards.propertyService.cards.propertyRepairWorkOrderRanking,
      pz_demo_cards.propertyService.cards.propertyRepairWorkOrderProcessingProgress,
      pz_demo_cards.propertyService.cards.propertyRepairTimeTrend,
      pz_demo_cards.propertyService.cards.propertyRepairAreaDistribution,
    ],
  },
  /** 物业服务-缴费分析-左面板 */
  PropertyServicePaymentAnalysisLeft: {
    name: "彭州-物业服务-缴费分析-左面板",
    cards: [
      pz_demo_cards.propertyService.cards.propertyPaymentAmountOverview,
      pz_demo_cards.propertyService.cards.propertyPaymentCategoryAnalysis,
      pz_demo_cards.propertyService.cards.propertyPaymentPendingAnalysis,
      pz_demo_cards.propertyService.cards.propertyPaymentArrearsAnalysis,
      pz_demo_cards.propertyService.cards.propertyPaymentPaidStatistics,
    ],
  },
  /** 物业服务-缴费分析-右面板 */
  PropertyServicePaymentAnalysisRight: {
    name: "彭州-物业服务-缴费分析-右面板",
    cards: [
      pz_demo_cards.propertyService.cards.propertyPaymentEfficiencyAnalysis,
      pz_demo_cards.propertyService.cards.propertyPaymentNotificationSuccessRateAnalysis,
      pz_demo_cards.propertyService.cards.propertyPaymentMethodStatistics,
      pz_demo_cards.propertyService.cards.propertyPaymentTimePeriodAnalysis,
      pz_demo_cards.propertyService.cards.propertyPaymentAreaAnalysis,
    ],
  },
  /** 物业服务-租赁分析-左面板 */
  PropertyServiceLeaseAnalysisLeft: {
    name: "彭州-物业服务-租赁分析-左面板",
    cards: [
      pz_demo_cards.propertyService.cards.propertyRentalDecorationApplicationQuantity,
      pz_demo_cards.propertyService.cards.propertyRentalTenantDecorationDurationAnalysis,
      pz_demo_cards.propertyService.cards.propertyRentalTenantLeaseDataStatistics,
      pz_demo_cards.propertyService.cards.propertyRentalTenantEntryAndExitAnalysis,
    ],
  },
  /** 物业服务-租赁分析-右面板 */
  PropertyServiceLeaseAnalysisRight: {
    name: "彭州-物业服务-租赁分析-右面板",
    cards: [
      pz_demo_cards.propertyService.cards.propertyRentalEnterprisesEntryAndExitAnalysis,
      pz_demo_cards.propertyService.cards.propertyRentalTenantLeaseTypeAnalysis,
      pz_demo_cards.propertyService.cards.propertyRentalTenantLeaseEnterpriseAnalysis,
    ],
  },
  /** 公共服务-共享空间-左面板 */
  PropertyServiceSharedSpaceLeft: {
    name: "彭州-公共服务-共享空间-左面板",
    cards: [
      pz_demo_cards.publicService.cards.reservationAgeDistribution,
      pz_demo_cards.publicService.cards.reservationGenderDistribution,
      pz_demo_cards.publicService.cards.reservationOccupationDistribution,
    ],
  },
  /** 公共服务-共享空间-右面板 */
  PropertyServiceSharedSpaceRight: {
    name: "彭州-公共服务-共享空间-右面板",
    cards: [
      pz_demo_cards.publicService.cards.reservationTimeTrend,
      pz_demo_cards.publicService.cards.reservationAreaAnalysis,
      pz_demo_cards.publicService.cards.reservationSpaceTrend,
    ],
  },
  /** 公共服务-消费分析-左面板 */
  PropertyServiceConsumptionAnalysisLeft: {
    name: "彭州-公共服务-消费分析-左面板",
    cards: [
      pz_demo_cards.publicService.cards.totalIncome,
      pz_demo_cards.publicService.cards.consumptionModeDistribution,
      pz_demo_cards.publicService.cards.consumptionPeople,
      pz_demo_cards.publicService.cards.consumptionAge,
    ],
  },
  /** 公共服务-消费分析-右面板 */
  PropertyServiceConsumptionAnalysisRight: {
    name: "彭州-公共服务-消费分析-右面板",
    cards: [
      pz_demo_cards.publicService.cards.consumptionGender,
      pz_demo_cards.publicService.cards.consumptionTrend,
      pz_demo_cards.publicService.cards.consumptionOverview,
      pz_demo_cards.publicService.cards.consumptionTrendStatistics,
    ],
  },
  /** 公共服务-专家咨询-左面板 */
  PropertyServiceExpertConsultationLeft: {
    name: "彭州-公共服务-专家咨询-左面板",
    cards: [
      pz_demo_cards.publicService.cards.technologyConsultingDistribution,
      pz_demo_cards.publicService.cards.technologyConsultingTrend,
      pz_demo_cards.publicService.cards.legalConsultingDistribution,
    ],
  },
  /** 公共服务-专家咨询-右面板 */
  PropertyServiceExpertConsultationRight: {
    name: "彭州-公共服务-专家咨询-右面板",
    cards: [
      pz_demo_cards.publicService.cards.legalConsultingTrend,
      pz_demo_cards.publicService.cards.marketingConsultingDistribution,
      pz_demo_cards.publicService.cards.marketingConsultingTrend,
    ],
  },
  /** 公共服务-项目孵化-左面板 */
  PropertyServiceProjectIncubationLeft: {
    name: "彭州-公共服务-项目孵化-左面板",
    cards: [
      pz_demo_cards.publicService.cards.projectDeclarationDistribution,
      pz_demo_cards.publicService.cards.projectDeclarationTrend,
      pz_demo_cards.publicService.cards.projectDeclarationCategoryAnalysis,
    ],
  },
  /** 公共服务-项目孵化-右面板 */
  PropertyServiceProjectIncubationRight: {
    name: "彭州-公共服务-项目孵化-右面板",
    cards: [
      pz_demo_cards.publicService.cards.projectReviewDistribution,
      pz_demo_cards.publicService.cards.projectReviewTrend,
      pz_demo_cards.publicService.cards.projectFundingDistribution,
      pz_demo_cards.publicService.cards.projectConsultingTrend,
    ],
  },
  /** 公共服务-投诉建议-左面板 */
  PropertyServiceComplaintSuggestionLeft: {
    name: "彭州-公共服务-投诉建议-左面板",
    cards: [
      pz_demo_cards.publicService.cards.ageDistribution,
      pz_demo_cards.publicService.cards.genderDistribution,
      pz_demo_cards.publicService.cards.occupationDistribution,
      pz_demo_cards.publicService.cards.timeTrend,
    ],
  },
  /** 公共服务-投诉建议-右面板 */
  PropertyServiceComplaintSuggestionRight: {
    name: "彭州-公共服务-投诉建议-右面板",
    cards: [
      pz_demo_cards.publicService.cards.areaAnalysis,
      pz_demo_cards.publicService.cards.timeDistribution,
      pz_demo_cards.publicService.cards.crowdDistribution,
      pz_demo_cards.publicService.cards.satisfactionAnalysis,
    ],
  },
  /** 空间管理-利用率分析-左面板 */
  PropertyServiceUtilizationAnalysisLeft: {
    name: "彭州-空间管理-利用率分析-左面板",
    cards: [pz_demo_cards.spaceManagement.cards.areaUtilization],
  },
  /** 空间管理-利用率分析-右面板 */
  PropertyServiceUtilizationAnalysisRight: {
    name: "彭州-空间管理-利用率分析-右面板",
    cards: [pz_demo_cards.spaceManagement.cards.categoryUtilization],
  },
  /** 空间管理-租售收益分析-左面板 */
  PropertyServiceRentalSaleProfitAnalysisLeft: {
    name: "彭州-空间管理-租售收益分析-左面板",
    cards: [
      pz_demo_cards.spaceManagement.cards.overview,
      pz_demo_cards.spaceManagement.cards.timeIncomeSummary,
      pz_demo_cards.spaceManagement.cards.areaIncomeStatistics,
      pz_demo_cards.spaceManagement.cards.leaseUtilization,
    ],
  },
  /** 空间管理-租售收益分析-右面板 */
  PropertyServiceRentalSaleProfitAnalysisRight: {
    name: "彭州-空间管理-租售收益分析-右面板",
    cards: [
      pz_demo_cards.spaceManagement.cards.saleUtilization,
      pz_demo_cards.spaceManagement.cards.rentIncomeAnalysis,
      pz_demo_cards.spaceManagement.cards.saleIncome,
      pz_demo_cards.spaceManagement.cards.areaSaleIncomeAnalysis,
    ],
  },
  /** 空间管理-资产状态-左面板 */
  PropertyServiceAssetStatusLeft: {
    name: "彭州-空间管理-资产状态-左面板",
    cards: [pz_demo_cards.spaceManagement.cards.deviceRunStatusHistory, pz_demo_cards.spaceManagement.cards.deviceAlarmLog],
  },
  /** 空间管理-资产状态-右面板 */
  PropertyServiceAssetStatusRight: {
    name: "彭州-空间管理-资产状态-右面板",
    cards: [pz_demo_cards.spaceManagement.cards.deviceWarningLog],
  },
  /** 空间管理-租售比分析-左面板 */
  PropertyServiceRentalSaleScoreAnalysisLeft: {
    name: "彭州-空间管理-租售比分析-左面板",
    cards: [pz_demo_cards.spaceManagement.cards.rentRatioStatistics, pz_demo_cards.spaceManagement.cards.rentRatioAnalysis],
  },
  /** 空间管理-租售比分析-右面板 */
  PropertyServiceRentalSaleScoreAnalysisRight: {
    name: "彭州-空间管理-租售比分析-右面板",
    cards: [
      pz_demo_cards.spaceManagement.cards.rentRatioDataCollection,
      pz_demo_cards.spaceManagement.cards.rentRatioClassificationAnalysis,
      pz_demo_cards.spaceManagement.cards.areaRentRatio,
    ],
  },
  /** 态势感知-总览-左面板 */
  PropertyServiceOverviewLeft: {
    name: "彭州-态势感知-总览-左面板",
    cards: [pz_demo_cards.situationPerception.cards.overallTrend, pz_demo_cards.situationPerception.cards.parkingTrend],
  },
  /** 态势感知-总览-右面板 */
  PropertyServiceOverviewRight: {
    name: "彭州-态势感知-总览-右面板",
    cards: [pz_demo_cards.situationPerception.cards.assetOperation, pz_demo_cards.situationPerception.cards.deviceFacilities],
  },
  /** 态势感知-异常监测-左面板 */
  PropertyServiceExceptionMonitoringLeft: {
    name: "彭州-态势感知-异常监测-左面板",
    cards: [
      pz_demo_cards.situationPerception.cards.warningInformationConvergence,
      pz_demo_cards.situationPerception.cards.warningInformationDisplay,
    ],
  },
  /** 态势感知-异常监测-右面板 */
  PropertyServiceExceptionMonitoringRight: {
    name: "彭州-态势感知-异常监测-右面板",
    cards: [pz_demo_cards.situationPerception.cards.warningThreshold],
  },
  /** 校园服务-课程分析-左面板 */
  CampusServiceCourseInfoLeft: {
    name: "彭州-校园服务-课程分析-左面板",
    cards: [pz_demo_cards.campusService.cards.courseInformationOverview, pz_demo_cards.campusService.cards.courseSelectionTrend],
  },
  /** 校园服务-课程分析-右面板 */
  CampusServiceCourseInfoRight: {
    name: "彭州-校园服务-课程分析-右面板",
    cards: [
      pz_demo_cards.campusService.cards.courseSelectionTypeAnalysis,
      pz_demo_cards.campusService.cards.courseWithdrawalTimeAnalysis,
      pz_demo_cards.campusService.cards.courseWithdrawalTrend,
    ],
  },
  /** 校园服务-学生信息-左面板 */
  CampusServiceStudentInfoLeft: {
    name: "彭州-校园服务-学生信息-左面板",
    cards: [pz_demo_cards.campusService.cards.studentPersonalInformation, pz_demo_cards.campusService.cards.studentEnrollmentInformation],
  },
  /** 校园服务-学生信息-右面板 */
  CampusServiceStudentInfoRight: {
    name: "彭州-校园服务-学生信息-右面板",
    cards: [pz_demo_cards.campusService.cards.studentCourseScoreStatistics, pz_demo_cards.campusService.cards.studentAttendanceStatistics],
  },
  /** 校园服务-教学资源分析-左面板 */
  CampusServiceTeachingResourceAnalysisLeft: {
    name: "彭州-校园服务-教学资源分析-左面板",
    cards: [pz_demo_cards.campusService.cards.coursewareOverview, pz_demo_cards.campusService.cards.coursewareTrend],
  },
  /** 校园服务-教学资源分析-右面板 */
  CampusServiceTeachingResourceAnalysisRight: {
    name: "彭州-校园服务-教学资源分析-右面板",
    cards: [pz_demo_cards.campusService.cards.textbookOverview, pz_demo_cards.campusService.cards.multimediaResourcesAnalysis],
  },
  /** 校园服务-校园活动-左面板 */
  CampusServiceCampusActivityLeft: {
    name: "彭州-校园服务-校园活动-左面板",
    cards: [pz_demo_cards.campusService.cards.activityOverview, pz_demo_cards.campusService.cards.activityTrend],
  },
  /** 校园服务-校园活动-右面板 */
  CampusServiceCampusActivityRight: {
    name: "彭州-校园服务-校园活动-右面板",
    cards: [pz_demo_cards.campusService.cards.activityGroupAge, pz_demo_cards.campusService.cards.activityGroupAgeDistribution],
  },
};
