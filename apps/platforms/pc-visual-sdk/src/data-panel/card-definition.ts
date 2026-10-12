import { pz_demo_cards } from "./pz-demo/cards";

/**
 * 卡片描述信息
 */
export interface CardDescribe {
  /**
   * 卡片默认标题
   */
  title: string;
  /**
   * 卡片 code
   */
  code: string;
  /**
   * 卡片默认数据
   */
  defaultData?: Record<string, unknown>;
}

/** 卡片定义集合 */
export const cardDefinition = {
  security: {
    name: "安全2.0",
    cards: {
      /** 总览-安全运营天数 */
      safeOperationDays: {
        title: "安全运营天数",
        code: "safe-operation-days",
      },
      /** 总览-报警态势 */
      overviewAlarmSituation: {
        title: "报警态势",
        code: "overview-alarm-situation",
      },
      /** 总览-设备态势 */
      deviceSituation: {
        title: "设备态势",
        code: "device-situation",
      },
      /** 总览-巡查态势 */
      patrolSituation: {
        title: "巡查态势",
        code: "patrol-situation",
      },
      /** 总览-监控态势 */
      monitorSituation: {
        title: "监控态势",
        code: "monitor-situation",
      },
      /** 总览-监控人员统计 */
      monitorPersonnelStatistics: {
        title: "监控人员统计",
        code: "monitor-personnel-statistics",
      },
      /** 总览-管理态势 */
      managementSituation: {
        title: "管理态势",
        code: "management-situation",
      },
      /** 安防监控园区-报警统计 */
      alarmStatistics: {
        title: "报警统计",
        code: "alarm-statistics",
      },
      /** 安防监控园区-报警级别统计 */
      alarmLevelStatistics: {
        title: "报警级别统计",
        code: "alarm-level-statistics",
      },
      /** 安防监控园区-巡逻异常数统计 */
      patrolAbnormalStats: {
        title: "巡逻异常数统计",
        code: "patrol-abnormal-stats",
      },
      /** 电气安全-电气设备 */
      electricalDevice: {
        title: "电气设备",
        code: "electrical-device",
      },
      /** 消防管理-消防设备 */
      fireDeviceStats: {
        title: "消防设备",
        code: "fire-device-stats",
      },
      /** 消防管理-消防到期设备统计 */
      fireExpiredDeviceStats: {
        title: "消防到期设备统计",
        code: "fire-expired-device-stats",
      },
      /** 消防管理-消防管网监测 */
      firePipeNetwork: {
        title: "消防管网监测",
        code: "fire-pipe-network",
      },
      /** 消防管理-消防设备分布情况 */
      fireDeviceDistribution: {
        title: "消防设备分布情况",
        code: "fire-device-distribution",
      },
      /** 动环监控-动环设备 */
      environmentalMonitoringDevice: {
        title: "动环设备",
        code: "environmental-device",
      },
      /** 动环监控-UPS工作情况 */
      upsWorkSituation: {
        title: "UPS工作情况",
        code: "ups-work-situation",
      },
      /** 市场总览 安全组 */
      securityMarketOverview: {
        title: "市场总览",
        code: "security-market-overview",
      },
      /** 设备统计 安全组 */
      securityDeviceCount: {
        title: "设备统计",
        code: "security-device-count",
      },
      /** 安全分析 安全组 */
      securityAnalysis: {
        title: "安全分析",
        code: "security-analysis",
      },
      /** 风险源分析 安全组 */
      securityRiskSource: {
        title: "风险源分析",
        code: "security-risk-source",
      },
      /** 管理态势 安全组 */
      securityManageTrend: {
        title: "管理态势分析",
        code: "security-manage-trend",
      },
      /** 报警情况统计 安全组 */
      securityAlarmCount: {
        title: "报警情况统计",
        code: "security-alarm-count",
      },
      /** 报警事件统计 安全组 */
      securityAlarmEventCount: {
        title: "报警事件统计",
        code: "security-alarm-event-count",
      },
      /** 报警事件占比 安全组 */
      securityAlarmEventRatio: {
        title: "报警事件占比",
        code: "security-alarm-event-ratio",
      },
      /** 报警趋势 安全组 */
      securityAlarmTrend: {
        title: "报警趋势",
        code: "security-alarm-trend",
      },
      /** 视频监控 安全组 */
      securityMonitor: {
        title: "视频监控",
        code: "security-monitor",
      },
      /** 监控设备统计 安全组 */
      securityMonitorDeviceCount: {
        title: "监控设备统计",
        code: "security-monitor-device-count",
      },
      /** 报警记录 安全组 */
      securityAlarmRecord: {
        title: "报警记录",
        code: "security-alarm-record",
      },
      /** 巡更任务统计 */
      patrolTaskStatistics: {
        title: "巡更任务统计",
        code: "patrol-task-statistics",
      },
      /** 隐患统计 */
      hiddenDangerStatistics: {
        title: "隐患统计",
        code: "hidden-danger-statistics",
      },
      /** 小散工程记录 */
      smallProjectRecords: {
        title: "小散工程记录",
        code: "small-project-records",
      },
      /** 安全巡检统计 */
      safetyInspectionStatistics: {
        title: "安全巡检统计",
        code: "safety-inspection-statistics",
      },
      /** 安全教育统计 */
      safetyEducationStatistics: {
        title: "安全教育统计",
        code: "safety-education-statistics",
      },
      /** 消防设备统计 */
      fireEquipmentStatistics: {
        title: "消防设备统计",
        code: "fire-equipment-statistics",
      },
      /** 巡更路线 */
      patrolRoute: {
        title: "巡更路线",
        code: "patrol-route",
      },
      /** 巡更计划 */
      patrolPlan: {
        title: "巡更计划",
        code: "patrol-plan",
      },
      /** 巡更点异常top5统计 */
      patrolPointAbnormalTop5: {
        title: "巡更点异常top5统计",
        code: "patrol-point-abnormal-top5",
      },
      /** 巡更点漏巡点位统计 */
      patrolPointMissedStatistics: {
        title: "巡更点漏巡点位统计",
        code: "patrol-point-missed-statistics",
      },
      /** 巡更异常事件统计 */
      patrolAbnormalEventStatistics: {
        title: "巡更异常事件统计",
        code: "patrol-abnormal-event-statistics",
      },
      /** 今日巡更统计 */
      todayPatrolStatistics: {
        title: "今日巡更统计",
        code: "today-patrol-statistics",
      },
      /** 今日巡更时段分布 */
      todayPatrolTimeDistribution: {
        title: "今日巡更时段分布",
        code: "today-patrol-time-distribution",
      },
      /** 巡更点位排行榜Top10 */
      patrolPointRankingTop10: {
        title: "巡更点位排行榜Top10",
        code: "patrol-point-ranking-top10",
      },
      /** 今日巡更人员最新位置 */
      todayPatrolPersonnelLatestPosition: {
        title: "今日巡更人员最新位置",
        code: "today-patrol-personnel-latest-position",
      },
      /** 巡更点位排行榜Top10 */
      patrolPointRankingTop10HK: {
        title: "巡更点位排行榜Top10",
        code: "patrol-point-ranking-top10-hk",
      },
      /** 巡更点位趋势图 */
      patrolPointTrend: {
        title: "巡更点位趋势图",
        code: "patrol-point-trend",
      },
      /** 监控设备统计 */
      monitoringEquipmentStatistics: {
        title: "监控设备统计",
        code: "monitoring-equipment-statistics",
      },
    },
  },
  generic: {
    name: "通用展示组件",
    cards: {
      /** 楼栋详情组件 */
      buildingIntroduction: {
        title: "楼栋简介",
        code: "building-introduction",
      },
      /** 设备总览组件 */
      publicSecurityDeviceCount: {
        title: "设备总览",
        code: "public-security-device-count",
      },
      /** 设备离线率 */
      PublicOfflineRateEquipment: {
        title: "设备离线率",
        code: "public-offline-rate-equipment",
      },
      /** 设备详情 */
      deviceDetailsPanel: {
        title: "设备详情面板(整体)",
        code: "deviceDetailsPanel",
      },
      /** 报警处理及趋势分析 */
      equipmentProcessingTrends: {
        title: "报警处理及趋势分析",
        code: "public-equipment-processing-trends",
      },
      /** 设备报警处理情况 */
      alarmProcessing: {
        title: "设备报警处理情况",
        code: "security-alarm-record",
      },
      deviceAlarm: {
        title: "设备报警",
        code: "boiler-device-alarm",
      },
      /** 报警处理排名 */
      alarmProcessingRanking: {
        title: "报警处理排名",
        code: "public-alarm-processing-ranking",
      },
      /** 报警态势 */
      AlarmSituation: {
        title: "报警态势",
        code: "public-alarm-situation",
      },
      /** 报警统计（饼图） */
      AlarmSituationPie: {
        title: "报警统计",
        code: "public-alarm-situation-pie",
      },
      /** 报警状态统计 & 报警趋势折线图统计 */
      alarmStatusAndTrend: {
        title: "报警状态和报警趋势统计",
        code: "alarm-status-and-trend",
      },
      /** 报警状态统计 & 报警列表统计 */
      alarmStatusAndList: {
        title: "报警状态和报警列表统计",
        code: "alarm-status-and-list",
      },
    },
  },
  library: {
    name: "图书馆管理",
    cards: {
      /** 月度编目工作量统计 */
      monthStatistics: {
        title: "月度编目工作量统计",
        code: "month-statistics",
      },
      /** 编目综合统计 */
      ComprehensiveStatistics: {
        title: "编目综合统计",
        code: "comprehensive-statistics",
      },
      /** 设备状态分布 */
      DeviceStatusDistribution: {
        title: "设备状态分布",
        code: "device-status-distribution",
      },
      /** 借阅记录 */
      BorrowingRecords: {
        title: "借阅记录",
        code: "borrowing-records",
      },
      /** 热门作者排行top10 */
      AuthorRank: {
        title: "热门作者排行top10",
        code: "author-rank",
      },
      /** 热门书籍排行top10 */
      BookRank: {
        title: "热门书籍排行top10",
        code: "book-rank",
      },
    },
  },
  bookStore: {
    name: "留灯图书",
    cards: {
      /** 预约数据组件 */
      reserveDataView: {
        title: "预约数据展示",
        code: "reserve-data-view",
      },
      /** 预约时段分析组件 */
      newReserveRecords: {
        title: "最新预约记录",
        code: "new-reserve-records",
      },
      /** 使用预约组件 */
      useReserveStat: {
        title: "使用预约统计",
        code: "use-reserve-stat",
      },
      /** 访客通信趋势组件 */
      visitorTransitTrend: {
        title: "访客通行趋势",
        code: "visitor-transit-trend",
      },
      /** 通知明细组件 */
      notificationDetailsOne: {
        title: "通知明细",
        code: "notification-details-one",
      },
      notificationDetailsTwo: {
        title: "通知明细",
        code: "notification-details-two",
      },
      newsDetailsOne: {
        title: "通知明细",
        code: "news-details-one",
      },
      newsDetailsTwo: {
        title: "通知明细",
        code: "news-details-two",
      },
      /** 通知公告列表 */
      noticeAnnouncementList: {
        title: "通知公告",
        code: "notice-announcement-list",
      },
      newsAnnouncementList: {
        title: "新闻资讯",
        code: "news-announcement-list",
      },
      blacklistAlarmList: {
        title: "黑名单预警",
        code: "blacklist-alarm-list",
      },
    },
  },
  smallAndMicro: {
    name: "小微产业园",
    cards: {
      /** PM2.5监测概览 */
      overviewPmMonitoring: {
        title: "PM2.5监测概览",
        code: "overview-pm-monitoring",
      },
      /** PM2.5实时监测排行榜Top10 */
      TopRealRankings: {
        title: "PM2.5实时监测排行榜Top10",
        code: "top-real-rankings",
      },
      /** 空气质量统计 */
      AirQualityStatistics: {
        title: "空气质量统计",
        code: "air-quality-statistics",
      },
      /** 实时环境指标趋势分析 */
      EnvironmentalTrendAnalysis: {
        title: "实时环境指标趋势分析",
        code: "environmental-trend-analysis",
      },
      /** 实时环境指标趋势分析 */
      CompletionStatusInvestmentTargets: {
        title: "招商目标完成情况",
        code: "completion-status-investment-targets",
      },
      /** 企业投诉建议统计 */
      EnterpriseComplaintStatistics: {
        title: "企业投诉建议统计",
        code: "enterprise-complaint-statistics",
      },
      /** 项目立项统计 */
      ProjectInitiationStatistics: {
        title: "项目立项统计",
        code: "project-initiation-statistics",
      },
      /** 空间利用率 */
      SpaceUtilizationRate: {
        title: "空间利用率",
        code: "space-utilization-rate",
      },
      /** 园区租售总情况 */
      RentalSalesSituation: {
        title: "园区租售总情况",
        code: "rental-sales-situation",
      },
      /** 园区租赁趋势 */
      TrendParkRental: {
        title: "物业管理",
        code: "trend-park-rental",
      },
      /** 视频巡逻统计 */
      VideoPatrolStatistics: {
        title: "视频巡逻统计",
        code: "video-patrol-statistics",
      },
      /** 视频巡逻路线 */
      VideoPatrolRoutes: {
        title: "视频巡逻路线",
        code: "video-patrol-routes",
      },
      /** 巡逻异常统计 */
      PatrolAnomalyStatistics: {
        title: "巡逻异常统计",
        code: "patrol-anomaly-statistics",
      },
      /** 巡逻点位排行榜 */
      PatrolPointRankingList: {
        title: "巡逻点位排行榜",
        code: "patrol-point-ranking-list",
      },
      /** 巡逻时间分布 */
      DistributionPatrolTime: {
        title: "巡逻时间分布",
        code: "distribution-patrol-time",
      },
      /** 巡逻人员点位统计 */
      PatrolPersonnelPointStatistics: {
        title: "巡逻人员点位统计",
        code: "patrol-personnel-point-statistics",
      },
      /** 视频巡逻详情 */
      PatrolRouteDetails: {
        title: "视频巡逻详情",
        code: "patrol-route-details",
      },
      /** 人流通行趋势 */
      TrendPedestrianFlow: {
        title: "人流通行趋势",
        code: "trend-pedestrian-flow",
      },
      /** 车流趋势 */
      VehicleTrends: {
        title: "车流趋势",
        code: "vehicle-trends",
      },
      /** 通行数据 */
      TrafficTrends: {
        title: "实时通行数据",
        code: "traffic-trends",
      },
      /** 安全态势总览 */
      OverviewSecuritySituation: {
        title: "安全态势总览",
        code: "overview-security-situation",
      },
      /** 人员出入情况 */
      PersonnelEntrySituation: {
        title: "人员出入情况",
        code: "personnel-entry-situation",
      },
      /** 门禁通行情况 */
      AccessControlSituation: {
        title: "门禁通行情况",
        code: "access-control-situation",
      },
      /** 异常通行趋势 */
      AbnormalTrafficTrend: {
        title: "异常通行趋势",
        code: "abnormal-traffic-trend",
      },
      /** 实时环境指标趋势分析 */
      RealTimeIndicatorTrendAnalysis: {
        title: "实时环境指标趋势分析",
        code: "real-time-indicator-trend-analysis",
      },
      /** 综合能耗分布 */
      EnergyDistribution: {
        title: "综合能耗分布",
        code: "energy-distribution",
      },
      /** 报警趋势 安全组 */
      securityMonitor: {
        title: "出入口实时监控",
        code: "security-monitor",
      },
      /** 导览详情 */
      GuideDetails: {
        title: "导览",
        code: "guide-details",
      },
      /** 管廊定制设备面板 */
      FloorPipeGalleryEquipment: {
        title: "导览",
        code: "floorPipeGalleryEquipment",
      },
    },
  },
  publicSecurity: {
    name: "数智公安面板",
    cards: {
      briefIntroduction: {
        title: "园区介绍",
        code: "briefIntroduction",
      },
      appointmentsNumber: {
        title: "访客预约统计",
        code: "appointmentsNumber",
      },
      visitorVehicles: {
        title: "访客车辆数统计",
        code: "visitorVehicles",
      },
      workOrderStatistics: {
        title: "报修工单统计",
        code: "work-order-statistics",
      },
      warrantyArea: {
        title: "报修区域排行榜top5",
        code: "warranty-area",
      },
      accessOverview: {
        title: "人员异常通行趋势",
        code: "access-overview",
      },
      trafficData: {
        title: "人员实时通行数据",
        code: "traffic-data",
      },
      overviewParkingSpaces: {
        title: "车位总览",
        code: "overview-parking-spaces",
      },
      trafficFlowTrend: {
        title: "车流趋势",
        code: "traffic-flow-trend",
      },
      analysisStrandedVehicles: {
        title: "滞留车辆分析",
        code: "analysis-stranded-vehicles",
      },
    },
  },
  middleSchool: {
    name: "领川中学面板",
    cards: {
      briefIntroduction: {
        title: "校园简介",
        code: "briefIntroduction",
      },
      personnelCounting: {
        title: "人员清点",
        code: "personnelCounting",
      },
      vehicleMonitoring: {
        title: "车底监测",
        code: "vehicleMonitoring",
      },
    },
  },
  demoPanel: {
    name: "demo面板",
    cards: {
      /** 法院庭审 */
      courtTrialPanelLeft: {
        title: "法院庭审",
        code: "courtTrialPanelLeft",
      },
      /** 法院庭审 */
      courtTrialPanelRight: {
        title: "法院庭审",
        code: "courtTrialPanelRight",
      },
      /** 法院总览--院区介绍 */
      campusIntroduction: {
        title: "院区介绍",
        code: "campus-introduction",
      },
      /** 法院总览--能源碳排放 */
      energyCarbonEmissions: {
        title: "能源碳排放",
        code: "energy-carbon-emissions",
      },
      campusSecurityLeft: {
        title: "法院安防",
        code: "campus-security-left",
      },
      /** 法院安防--右侧  */
      campusSecurityRight: {
        title: "法院安防",
        code: "campus-security-right",
      },
      /** 法院--司法空间左 */
      judicialSpaceLeft: {
        title: "司法空间",
        code: "judicial-space-left",
      },
      /** 法院--司法空间右 */
      judicialSpaceRight: {
        title: "司法空间",
        code: "judicial-space-right",
      },
      /** 法治宣传 */
      legalPublicityLeft: {
        title: "法治宣传",
        code: "legalPublicityLeft",
      },
      /** 法治宣传 */
      legalPublicityRight: {
        title: "法治宣传",
        code: "legalPublicityRight",
      },
      /** 法院-司法态势-左 */
      judicialSituationOverviewLeft: {
        title: "司法态势",
        code: "judicial-situation-overview-left",
      },
      /** 法院-司法态势-右 */
      judicialSituationOverviewRight: {
        title: "司法态势",
        code: "judicial-situation-overview-right",
      },
      /** 民事态势 */
      civilSituationLeft: {
        title: "民事态势",
        code: "civilSituationLeft",
      },
      /** 民事态势 */
      civilSituationRight: {
        title: "民事态势",
        code: "civilSituationRight",
      },
      /** 来访人员 */
      visitorsLeft: {
        title: "来访人员左面板",
        code: "visitorsLeft",
      },
      /** 来访人员 */
      courtBigSecurityLeftPanel: {
        title: "法院安防左面板",
        code: "courtBigSecurityLeftPanel",
      },
      /** 来访人员 */
      visitorsRight: {
        title: "来访人员右面板",
        code: "visitorsRight",
      },
      /** 群控组实时数据 */
      groupControlPanel: {
        title: "群控组实时数据",
        code: "group-control-panel",
      },
      /** 群控组实时数据 */
      TimeControlPanel: {
        title: "时控实时数据",
        code: "TimeControlPanel",
      },
    },
  },
  assetManagement: {
    name: "资产管理面板",
    cards: {
      /** 资产概览 */
      assetOverview: {
        title: "资产概览",
        code: "asset-overview",
      },
      /** 部门资产分布情况 */
      distributionDepartmentalAssets: {
        title: "部门资产分布情况",
        code: "distribution-departmental-assets",
      },
      /** 区域资产分布情况 */
      regionalAssetDistribution: {
        title: "区域资产分布情况",
        code: "regional-asset-distribution",
      },
      /** 资产状态占比 */
      proportionAssetStatus: {
        title: "资产状态占比",
        code: "proportion-asset-status",
      },
      /** 资产分类占比 */
      proportionAssetClassification: {
        title: "资产分类占比",
        code: "proportion-asset-classification",
      },
      /** 耗材出库趋势 */
      trendConsumablesOutbound: {
        title: "耗材出库趋势",
        code: "trend-consumables-outbound",
      },
    },
  },
  universalPanel: {
    name: "设备通用面板",
    cards: {
      assetOverview: {
        title: "设备故障率",
        code: "device-offlineRate",
      },
      EquipmentStatusOverview: {
        title: "设备状态总览",
        code: "equipment-statusOverview",
      },
      equipmentStatus: {
        title: "设备状态统计",
        code: "equipment-status",
      },
      alarmLevel: {
        title: "报警级别分布",
        code: "alarm-level",
      },
      alarmEventTop5: {
        title: "事件报警Top5",
        code: "event-alarm-top5",
      },
      equipmentAlarmTop5: {
        title: "设备报警Top5",
        code: "equipment-alarm-top5",
      },
      alarmAreaTop5: {
        title: "报警区域TOP5",
        code: "command-dispatch-alarm-area-top5",
      },
      alarmStatus: {
        title: "报警处理情况",
        code: "alarm-status",
      },
      alarmRate: {
        title: "报警占比",
        code: "alarm-rate",
      },
      equipmentDetails: {
        title: "设备报警明细",
        code: "equipment-details",
      },
      equipmentRate: {
        title: "设备报警率",
        code: "equipment-rate",
      },
      equipmentRealTimeData: {
        title: "设备实时数据",
        code: "equipment-real-time-data",
      },
      equipmentTrend: {
        title: "设备报警趋势",
        code: "equipment-trend",
      },
      equipmentStatistics: {
        title: "设备异常统计",
        code: "equipment-statistics",
      },
      deviceOfflineDetails: {
        title: "离线设备明细",
        code: "device-offline-details",
      },
      publicSecurityDeviceCount: {
        title: "设备统计",
        code: "public-security-device-count",
      },
      publicDeviceDistribution: {
        title: "设备分布统计",
        code: "public-device-distribution",
      },
      floorDeviceList: {
        title: "设备数据",
        code: "floor-device-list",
      },
      pipeDeviceList: {
        title: "设备数据",
        code: "pipe-device-list",
      },
      publicDeviceClassification: {
        title: "设备分类统计",
        code: "public-device-classification",
      },
      publicOfflineRateEquipment: {
        title: "设备离线率",
        code: "public-offline-rate-equipment",
      },
      publicEquipmentProcessingTrends: {
        title: "设备处理及趋势分析",
        code: "public-equipment-processing-trends",
      },
      equipmentOverview: {
        title: "设备情况总览",
        code: "equipment-overview",
      },
      deviceOfflineSituation: {
        title: "设备离线情况",
        code: "device-offline-situation",
      },
    },
  },
  energyPanel: {
    name: "能耗通用面板",
    cards: {
      carbonEmissionRatio: {
        title: "碳排量分类占比",
        code: "carbon-emission-ratio",
      },
      carbonRankingTop10: {
        title: "区域综合能耗排名Top10",
        code: "carbon-ranking-top10",
      },
      carbonRankingTop5: {
        title: "区域综合能耗排名Top5",
        code: "carbon-ranking-top5",
      },
      carbonTrends: {
        title: "碳排量趋势图",
        code: "carbon-trends",
      },
      energyConsumptionProportion: {
        title: "综合能耗分类占比",
        code: "energy-consumption-proportion",
      },
      energyConsumptionTrend: {
        title: "能耗用能趋势图",
        code: "energy-consumption-trend",
      },
      energyOverview: {
        title: "全年能耗概览",
        code: "energy-overview",
      },
      energyRankingTop10: {
        title: "区域用能排名Top10",
        code: "energy-ranking-top10",
      },
      energyRankingTop5: {
        title: "区域用能排名Top5",
        code: "energy-ranking-top5",
      },
      energyStatistics: {
        title: "能耗用能统计",
        code: "energy-statistics",
      },
      energyAnalysis: {
        title: "用能分析",
        code: "energy-analysis",
      },
      energyTrend: {
        title: "综合能耗趋势图",
        code: "energy-trend",
      },
      rankingComprehensiveConsumptionTop10: {
        title: "区域碳排量排名Top10",
        code: "ranking-comprehensive-consumption-top10",
      },
      rankingComprehensiveConsumptionTop5: {
        title: "区域碳排量排名Top5",
        code: "ranking-comprehensive-consumption-top5",
      },
      subProportion: {
        title: "分项用能占比",
        code: "sub-proportion",
      },
      annualEnergyConsumptionTrend: {
        title: "年度用能趋势图",
        code: "annual-energy-consumption-trend",
      },
    },
  },
  electronicPatrol: {
    name: "电子巡更面板",
    cards: {
      patrolStatistics: {
        title: "今日巡更计划",
        code: "patrolStatistics",
      },
      rankingPatrolPersonnel: {
        title: "巡更人员点位排行Top10",
        code: "rankingPatrolPersonnel",
      },
      patrolRoute: {
        title: "巡更路线",
        code: "patrolRoute",
      },
      abnormalPatrolPoint: {
        title: "巡更点异常top5统计",
        code: "abnormalPatrolPoint",
      },
      rankingListPatrolPoints: {
        title: "巡更点位排行榜Top10",
        code: "rankingListPatrolPoints",
      },
      /** 巡更路线 */
      patrolRouteNew: {
        title: "巡更路线",
        code: "patrol-route-new",
      },
      /** 巡更点分布情况 */
      patrolPointDistribution: {
        title: "巡更点分布情况",
        code: "patrol-point-distribution",
      },
      /** 巡更点异常Top5 */
      patrolPointAbnormalTop5New: {
        title: "巡更点异常Top5",
        code: "patrol-point-abnormal-top5-new",
      },
      /** 任务异常记录 */
      taskAbnormalRecord: {
        title: "任务异常记录",
        code: "task-abnormal-record",
      },
      /** 任务执行情况 */
      taskExecutionStatus: {
        title: "任务执行情况",
        code: "task-execution-status",
      },
    },
  },
  estateManagement: {
    name: "物业管理面板",
    cards: {
      propertyIncomeDetails: {
        title: "物业收支明细",
        code: "property-income-details",
      },
      comparisonPropertyRevenue: {
        title: "物业收支对比",
        code: "comparison-property-revenue",
      },
      overviewPropertyRevenue: {
        title: "物业收入总览",
        code: "overview-property-revenue",
      },
      statisticsNumberEnterprises: {
        title: "企业数量统计",
        code: "statistics-number-enterprises",
      },
      summaryPropertyRevenue: {
        title: "物业收入汇总",
        code: "summary-property-revenue",
      },
      trendEnterpriseSettlement: {
        title: "企业入驻趋势",
        code: "trend-enterprise-settlement",
      },
    },
  },
  restaurant: {
    name: "餐饮管理面板",
    cards: {
      consumerStatistics: {
        title: "消费人数统计",
        code: "consumer-statistics",
      },
      displayConsumptionAmount: {
        title: "消费金额趋势图",
        code: "display-consumption-amount",
      },
      perCapitaConsumptionAmountStatistics: {
        title: "人均消费金额统计",
        code: "per-capita-consumption-amount-statistics",
      },
      proportionConsumptionAmount: {
        title: "场所消费金额占比",
        code: "proportion-consumption-amount",
      },
      topCountConsumption: {
        title: "账户消费Top10",
        code: "top-count-consumption",
      },
      trendConsumptionAmount: {
        title: "消费金额展示",
        code: "trend-consumption-amount",
      },
    },
  },
  toiletManagement: {
    name: "厕所管理面板",
    cards: {
      squattingOccupancySituation: {
        title: "蹲位占用情况",
        code: "squatting-occupancy-situation",
      },
    },
  },
  staffManagement: {
    name: "人员管理面板",
    cards: {
      listHighRiskPersonnel: {
        title: "高风险学生列表",
        code: "list-high-risk-personnel",
      },
      overviewCorrectionObject: {
        title: "学生概况",
        code: "overview-correction-object",
      },
      overviewExternalPersonnel: {
        title: "外来人员概况",
        code: "overview-external-personnel",
      },
      overviewPoliceForce: {
        title: "师生比例",
        code: "overview-police-force",
      },
      personnelInformationReleasedTimeout: {
        title: "超时未出人员信息",
        code: "personnel-information-released-timeout",
      },
      proportionRiskLevelCorrectionObject: {
        title: "学生风险等级占比",
        code: "proportion-risk-level-correction-object",
      },
      statisticsCorrectionObject: {
        title: "学生点名记录",
        code: "statistics-correction-object",
      },
      policeStatistics: {
        title: "老师进出记录",
        code: "police-statistics",
      },
      statisticsExternalPersonnel: {
        title: "外来人员统计",
        code: "statistics-external-personnel",
      },
      todayDormitoryRollCallSituation: {
        title: "今日宿舍点名情况",
        code: "today-dormitory-roll-call-situation",
      },
    },
  },
  SmallEngineeringManagement: {
    name: "小散工程管理面板",
    cards: {
      smallStatistics: { title: "小散工程统计", code: "small-statistics" },
      engineeringRectificationStatistics: { title: "工程整改统计", code: "engineering-rectification-statistics" },
      engineeringInspectionStatistics: { title: "工程巡查统计", code: "engineering-inspection-statistics" },
      abnormalStatisticsEngineeringInspection: { title: "工程巡查异常统计", code: "abnormal-statistics-engineering-inspection" },
    },
  },
  electricVehicleManagement: {
    name: "电瓶车管理面板",
    cards: {
      electricVehicleRegistrationStatistics: {
        title: "电瓶车建档统计",
        code: "electric-vehicle-registration-statistics",
      },
      electricVehiclesIllegallyEnteringElevators: {
        title: "电瓶车违规入电梯统计",
        code: "electric-vehicles-illegally-entering-elevators",
      },
      statisticsIllegalChargingElectricVehicles: {
        title: "电动车违规充电统计",
        code: "statistics-illegal-charging-electric-vehicles",
      },
      statisticsIllegalParkingElectricVehicles: {
        title: "电动车违规停放统计",
        code: "statistics-illegal-parking-electric-vehicles",
      },
      violationStatisticsElectricVehicles: {
        title: "电瓶车违规占比",
        code: "violation-statistics-electric-vehicles",
      },
      elevatorAnalysisPanel: {
        title: "电梯运行分析",
        code: "elevator-analysis-panel",
      },
    },
  },
  hospitalManagement: {
    name: "医院面板卡片集合",
    cards: {
      introductionOfHospital: {
        title: "院区介绍",
        code: "introduction-of-hospital",
      },
      callStatisticsPanel: {
        title: "呼叫统计",
        code: "call-statistics-panel",
      },
      callTrends: {
        title: "呼叫趋势",
        code: "call-trends",
      },
      distributionCallTimePeriods: {
        title: "呼叫时段分布",
        code: "distribution-call-time-periods",
      },
      visitingDataPanel: {
        title: "看诊数据",
        code: "visiting-data-panel",
      },
      receptionTrendsPanel: {
        title: "接诊趋势",
        code: "reception-trends-panel",
      },
      waitingSituationPanel: {
        title: "候诊情况",
        code: "waiting-situation-panel",
      },
      appointmentVisitDistributionPanel: {
        title: "预约就诊分布",
        code: "appointment-visit-distribution-panel",
      },
      todayGasUsage: {
        title: "今日气体使用概览",
        code: "today-gas-usage",
      },
      gasUsageSituation: {
        title: "气体用量情况",
        code: "gas-usage-situation",
      },
      gasUsageTrend: {
        title: "气体使用趋势",
        code: "gas-usage-trend",
      },
      hospitalAlarmSituation: {
        title: "报警态势",
        code: "hospital-alarm-situation",
      },
      hospitalAlarmTrend: {
        title: "报警趋势",
        code: "hospital-alarm-trend",
      },
      teachingOverview: {
        title: "示教情况总览",
        code: "teaching-overview",
      },
      teachingLiveSessions: {
        title: "示教直播场次",
        code: "teaching-live-sessions",
      },
      popularVideos: {
        title: "最受欢迎视频Top10",
        code: "popular-videos",
      },
    },
  },
  merchantManagement: {
    name: "商户管理面板卡片集合",
    cards: {
      merchantGearStats: {
        title: "商户/档位统计",
        code: "merchant-gear-stats",
      },
      merchantListCard: {
        title: "商户清单",
        code: "merchant-list-card",
      },
      areaGearCount: {
        title: "区域档位数",
        code: "area-gear-count",
      },
      questionnaireStats: {
        title: "问卷调查统计",
        code: "questionnaire-stats",
      },
      honestyProportion: {
        title: "诚信经营占比",
        code: "honesty-proportion",
      },
      honestyStats: {
        title: "诚信经营值统计",
        code: "honesty-stats",
      },
      contractStats: {
        title: "商户合同统计",
        code: "contract-stats",
      },
    },
  },
  broadcastSystem: {
    name: "广播系统面板卡片集合",
    cards: {
      recordRanking: {
        title: "广播记录排名",
        code: "broadcast-record-ranking",
      },
      recordTrend: {
        title: "广播记录趋势",
        code: "broadcast-record-trend",
      },
      latestRecords: {
        title: "最新记录明细",
        code: "broadcast-latest-records",
      },
    },
  },
  boilerSystem: {
    name: "锅炉系统面板卡片集合",
    cards: {
      dataOverview: {
        title: "数据概览",
        code: "boiler-data-overview",
      },
      temperatureTrend: {
        title: "实时温度趋势",
        code: "boiler-temperature-trend",
      },
      waterTrend: {
        title: "用水趋势",
        code: "boiler-water-trend",
      },
      energyTrend: {
        title: "用电趋势",
        code: "boiler-energy-trend",
      },
      deviceStats: {
        title: "设备统计",
        code: "boiler-device-stats",
      },
      overTemperatureStats: {
        title: "超温统计",
        code: "boiler-over-temperature-stats",
      },
      waterTreatmentRealtime: {
        title: "水处理实时数据",
        code: "water-treatment-realtime",
      },
    },
  },
  waterSystem: {
    name: "净水系统面板卡片集合",
    cards: {
      waterUsageSituation: {
        title: "净水用量情况",
        code: "water-usage-situation",
      },
      waterUsageTrend: {
        title: "净水使用趋势",
        code: "water-usage-trend",
      },
      areaUsageOverview: {
        title: "区域使用量概况",
        code: "area-usage-overview",
      },
    },
  },
  elevatorManagement: {
    name: "电梯管理面板卡片集合",
    cards: {
      liftStats: {
        title: "电梯统计",
        code: "lift-stats",
      },
      liftOperationAnalysis: {
        title: "运行分析",
        code: "lift-operation-analysis",
      },
      liftStatusMonitor: {
        title: "电梯状态监测",
        code: "lift-status-monitor",
      },
      liftAlarmLevelStats: {
        title: "报警等级统计",
        code: "lift-alarm-level-stats",
      },
      latestFiveWayCall: {
        title: "最新五方通话",
        code: "latest-five-way-call",
      },
    },
  },
  logisticsSystem: {
    name: "物流系统面板卡片集合",
    cards: {
      logisticsDeviceStatusDistribution: {
        title: "物流系统设备状态分布",
        code: "logistics-device-status-distribution",
      },
      logisticsDeviceOnlineStatus: {
        title: "设备在线情况",
        code: "logistics-device-online-status",
      },
    },
  },
  flowAnalysis: {
    name: "客流分析面板卡片集合",
    cards: {
      passengerFlowOverview: {
        title: "客流总览",
        code: "passenger-flow-overview",
      },
      passengerFlowRanking: {
        title: "各区域客流量排名",
        code: "passenger-flow-ranking",
      },
      passengerFlowAnalysis: {
        title: "客流分析图",
        code: "passenger-flow-analysis",
      },
      passengerFlowRegional: {
        title: "各个区域客流量",
        code: "passenger-flow-regional",
      },
    },
  },
  gardenSystem: {
    name: "园林系统面板卡片集合",
    cards: {
      gardenDeviceOnlineStatus: {
        title: "设备在线情况",
        code: "garden-device-online-status",
      },
    },
  },
  parkManage: {
    name: "园区管理面板卡片集合",
    cards: {
      parkSpaceUtilization: {
        title: "空间利用率",
        code: "park-space-utilization",
      },
      parkBuildingSpaceUtilization: {
        title: "楼栋空间利用率",
        code: "park-building-space-utilization",
      },
      parkEnterpriseIndustryStats: {
        title: "租赁企业行业情况统计",
        code: "park-enterprise-industry-stats",
      },
      parkLeasingOverview: {
        title: "园区租赁总情况",
        code: "park-leasing-overview",
      },
      parkLeasingTrends: {
        title: "园区租赁趋势",
        code: "park-leasing-trends",
      },
      parkFloorLeasingRatio: {
        title: "园区楼层租赁比情况",
        code: "park-floor-leasing-ratio",
      },
    },
  },
  meeting: {
    name: "会议面板卡片集合",
    cards: {
      MeetingAvailability: {
        title: "会议空闲情况",
        code: "meeting-availability",
      },
      BookingPeriodAnalysis: {
        title: "预定时段分析",
        code: "booking-period-analysis",
      },
      MeetingRoomUtilization: {
        title: "会议室利用率分析",
        code: "meeting-room-utilization",
      },
    },
  },
  emergencyPhone: {
    name: "紧急电话面板卡片集合",
    cards: {
      latestEmergencyCalls: {
        title: "最新紧急电话",
        code: "latest-emergency-calls",
      },
      callUsageTrends: {
        title: "电话使用趋势",
        code: "call-usage-trends",
      },
      callDeviceOnlineStatus: {
        title: "设备在线情况",
        code: "call-device-online-status",
      },
    },
  },
  trafficLight: {
    name: "交通灯面板卡片集合",
    cards: {
      trafficLightDeviceOnlineStatus: {
        title: "设备在线情况",
        code: "traffic-light-device-online-status",
      },
    },
  },
  trafficControl: {
    name: "交通控制面板卡片集合",
    cards: {
      trafficControlDeviceOnlineStatus: {
        title: "设备在线情况",
        code: "traffic-control-device-online-status",
      },
    },
  },
  trafficMonitoring: {
    name: "车流量监测面板卡片集合",
    cards: {
      tunnelTodayTrafficFlow: {
        title: "隧道今日车流量分析",
        code: "tunnel-today-traffic-flow",
      },
      tunnelLaneTrafficFlow: {
        title: "隧道不同车道车流量分析",
        code: "tunnel-lane-traffic-flow",
      },
      sectionRealtimeSpeed: {
        title: "断面实时平均车速分析",
        code: "section-realtime-speed",
      },
    },
  },
  emergencyResource: {
    name: "应急资源面板卡片集合",
    cards: {
      EmergencySuppliesStatus: {
        title: "当前应急物资情况统计",
        code: "emergency-supplies-status",
      },
      EmergencySuppliesStock: {
        title: "应急物资在库统计",
        code: "emergency-supplies-stock",
      },
      EmergencyFundsTrend: {
        title: "应急资金趋势统计",
        code: "emergency-funds-trend",
      },
      EmergencyPersonnelStats: {
        title: "应急人员统计",
        code: "emergency-personnel-stats",
      },
      EmergencyEquipmentStats: {
        title: "应急设备统计",
        code: "emergency-equipment-stats",
      },
      EmergencyFacilityUsage: {
        title: "应急设施使用率",
        code: "emergency-facility-usage",
      },
    },
  },
  medicalCard: {
    name: "智能卡面板卡片集合",
    cards: {
      smartCardStatusStats: {
        title: "智能卡状态统计",
        code: "smart-card-status-stats",
      },
      smartVisitorTrends: {
        title: "来访人员趋势图",
        code: "smart-visitor-trends",
      },
      smartAccessEventsTop10: {
        title: "门禁事件Top10",
        code: "smart-access-events-top10",
      },
      smartElevatorEventsTop10: {
        title: "梯控事件Top10",
        code: "smart-elevator-events-top10",
      },
      smartIntercomEventsTop10: {
        title: "可视对讲事件Top10",
        code: "smart-intercom-events-top10",
      },
    },
  },
  environmentMonitoring: {
    name: "环境监测面板卡片集合",
    cards: {
      tunnelEnvironmentRealtime: {
        title: "隧道环境指标实时监测",
        code: "tunnel-environment-realtime",
      },
      tunnelCoTrendAnalysis: {
        title: "隧道CO浓度趋势分析",
        code: "tunnel-co-trend-analysis",
      },
      realtimeEnvironmentTrendAnalysis: {
        title: "实时隧道环境指标趋势分析",
        code: "realtime-environment-trend-analysis",
      },
    },
  },
  consumptionManagement: {
    name: "消费管理面板卡片集合",
    cards: {
      transactionOverview: {
        title: "金额交易情况概览",
        code: "transaction-overview",
      },
      transactionTrend: {
        title: "金额交易趋势图",
        code: "transaction-trend",
      },
      accountConsumptionTop10: {
        title: "账户消费Top10",
        code: "account-consumption-top10",
      },
      shareTransactionOverview: {
        title: "份额交易概览",
        code: "share-transaction-overview",
      },
      shareTransactionTrend: {
        title: "份额交易趋势图",
        code: "share-transaction-trend",
      },
      accountStatusStats: {
        title: "账户实时状态统计",
        code: "account-status-stats",
      },
    },
  },
  prepaid: {
    name: "预付费面板卡片集合",
    cards: {
      electricityUsageTrend: {
        title: "电表日用能趋势图",
        code: "electricity-usage-trend",
      },
      lostElectricityMeterStats: {
        title: "失联电表实时统计",
        code: "lost-electricity-meter-stats",
      },
      arrearsElectricityMeterStats: {
        title: "欠费电表占比",
        code: "arrears-electricity-meter-stats",
      },
      waterUsageTrend: {
        title: "水表日用能趋势图",
        code: "prepaid-water-usage-trend",
      },
      lostWaterMeterStats: {
        title: "失联水表实时统计",
        code: "lost-water-meter-stats",
      },
      arrearsWaterMeterStats: {
        title: "欠费水表占比",
        code: "arrears-water-meter-stats",
      },
    },
  },
  starDelivery: {
    name: "星配送面板卡片集合",
    cards: {
      starOrderDistribution: {
        title: "订单分布统计",
        code: "star-order-distribution",
      },
      starOrderTrend: {
        title: "订单趋势统计",
        code: "star-order-trend",
      },
      starUserDistribution: {
        title: "用户分布统计",
        code: "star-user-distribution",
      },
      starUserTrend: {
        title: "用户趋势统计",
        code: "star-user-trend",
      },
      starRevenueDistribution: {
        title: "营收分布统计",
        code: "star-revenue-distribution",
      },
      starRevenueTrend: {
        title: "营收趋势统计",
        code: "star-revenue-trend",
      },
      starRealtimeEvaluation: {
        title: "实时评价",
        code: "star-realtime-evaluation",
      },
    },
  },
  porkSlide: {
    name: "猪肉滑轨面板卡片集合",
    cards: {
      meatTransactionTop5: {
        title: "白条交易大户Top5",
        code: "meat-transaction-top5",
      },
      meatSlaughterhouseSupplyTop: {
        title: "屠宰场供货TOP",
        code: "meat-slaughterhouse-supply-top",
      },
      meatTransactionInfo: {
        title: "交易信息",
        code: "meat-transaction-info",
      },
      meatSupplyInfo: {
        title: "供货信息",
        code: "meat-supply-info",
      },
      meatFoodSafetyInfo: {
        title: "食安信息",
        code: "meat-food-safety-info",
      },
      meatFoodSafetyFloor: {
        title: "来货报备",
        code: "meat-food-safety-floor",
      },
      meatBatchSuspicionRate: {
        title: "批次作弊嫌疑率",
        code: "meat-batch-suspicion-rate",
      },
      meatDeviceData: {
        title: "设备数据",
        code: "meat-device-data",
      },
      meatWhiteStripeTransactionData: {
        title: "白条交易数据",
        code: "meat-white-stripe-transaction-data",
      },
      meatTallyAuditRate: {
        title: "理货审核率",
        code: "meat-tally-audit-rate",
      },
      tianjinTransactionTop5: {
        title: "白条交易大户Top5",
        code: "tianjin-transaction-top5",
      },
      tianjinSlaughterhouseSupplyTop: {
        title: "屠宰场供货TOP",
        code: "tianjin-slaughterhouse-supply-top",
      },
      tianjinTransactionInfo: {
        title: "交易信息",
        code: "tianjin-transaction-info",
      },
      tianjinSupplyInfo: {
        title: "供货信息",
        code: "tianjin-supply-info",
      },
      tianjinFoodSafetyInfo: {
        title: "食安信息",
        code: "tianjin-food-safety-info",
      },
      tianjinFoodSafetyFloor: {
        title: "来货报备",
        code: "tianjin-food-safety-floor",
      },
      tianjinBatchSuspicionRate: {
        title: "批次作弊嫌疑率",
        code: "tianjin-batch-suspicion-rate",
      },
      tianjinDeviceData: {
        title: "设备数据",
        code: "tianjin-device-data",
      },
      tianjinWhiteStripeTransactionData: {
        title: "白条交易数据",
        code: "tianjin-white-stripe-transaction-data",
      },
      tianjinTallyData: {
        title: "理货数据",
        code: "tianjin-tally-data",
      },
    },
  },

  stopGeneralManage: {
    name: "门禁面板卡片集合",
    cards: {
      trendVehicleFlowDrivingOut: {
        title: "车流驶出趋势",
        code: "trend-vehicle-flow-driving-out",
      },
      realTimeAccessRecords: {
        title: "实时出入记录",
        code: "real-time-access-records",
      },
      entryAndExitRecords: {
        title: "出入统计",
        code: "entry-and-exit-records",
      },
      deviceRealtimeStatus: {
        title: "设备实时状态",
        code: "device-realtime-status",
      },
      abnormalEventTop5: {
        title: "异常事件top5",
        code: "abnormal-event-top5",
      },
      abnormalTrafficTrend: {
        title: "异常通行趋势",
        code: "abnormal-traffic-trend-new",
      },
      personnelTrafficTrend: {
        title: "人流通行趋势",
        code: "personnel-traffic-trend",
      },
      passageAnalysis: {
        title: "通行分析",
        code: "passage-analysis",
      },
      realTimePassageData: {
        title: "实时通行数据",
        code: "real-time-passage-data",
      },
      informationPublish: {
        title: "信息发布",
        code: "information-publish",
      },
    },
  },
  parkingManagement: {
    title: "停车管理",
    code: "parking-management",
    cards: {
      overviewParkingSpaces: {
        title: "车位总览",
        code: "overview-parking-spaces",
      },
      vehicleTrends: {
        title: "车流趋势",
        code: "vehicle-trends",
      },
      strandedVehiclesAnalysis: {
        title: "滞留车辆分析",
        code: "stranded-vehicles-analysis",
      },
      parkingCarCharge: {
        title: "收费总览",
        code: "parking-car-charge",
      },
      parkingCarChargeInterval: {
        title: "支付方式占比",
        code: "parking-car-charge-interval",
      },
      parkingCarChargeTrend: {
        title: "收费趋势",
        code: "parking-car-charge-trend",
      },
    },
  },
  // 照明管理
  lightingManagement: {
    title: "照明管理",
    cards: {
      lightingCircuitStatus: {
        title: "照明回路实况",
        code: "lighting-circuit-status",
      },
      groupControlRealtimeData: {
        title: "群控组实时数据",
        code: "group-control-realtime-data",
      },
      timeControlRealtimeData: {
        title: "时控实时数据",
        code: "time-control-realtime-data",
      },
    },
  },
  educationalSituation: {
    title: "教务态势",
    code: "educational-situation",
    cards: {
      /** 教务态势-数据总览 */
      dataOverview: {
        title: "数据总览",
        code: "edu-data-overview",
      },
      /** 教务态势-班级人数top5 */
      classNumberTop5: {
        title: "班级人数top5",
        code: "edu-class-number-top5",
      },
      /** 教务态势-班次数量统计 */
      classNumberStatistics: {
        title: "班次数量统计",
        code: "edu-class-number-statistics",
      },
      /** 教务态势-培训人数占比 */
      trainingPeopleProportion: {
        title: "培训人数占比",
        code: "edu-training-people-proportion",
      },
      /** 教务态势-项目数量统计 */
      projectNumberStatistics: {
        title: "项目数量统计",
        code: "edu-project-number-statistics",
      },
      /** 教务态势-近5年班次走势分析 */
      classTrendsAnalysis: {
        title: "近5年班次走势分析",
        code: "edu-class-trends-analysis",
      },
    },
  },
  ...pz_demo_cards,
};
