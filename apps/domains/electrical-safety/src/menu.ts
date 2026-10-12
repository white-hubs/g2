export const electricalSafetyMenu = [
  {
    label: "实时检测",
    entry: "ssjc",
    children: [
      {
        label: "电气中心",
        entry: "dqzx",
        path: "/d/electrical-safety/electrical-center",
      },
      {
        label: "设备检测",
        entry: "sbjc",
        path: "/d/electrical-safety/device-monitoring",
      },
      {
        label: "深度分析",
        entry: "sdfx",
        path: "/d/electrical-safety/deep-analysis",
      },
    ],
  },
  {
    label: "资产管理",
    entry: "zcgl",
    children: [
      {
        label: "设施管理",
        entry: "ssgl",
        path: "/d/electrical-safety/facility-management",
      },
    ],
  },
  {
    label: "报警管理",
    entry: "bjgl",
    children: [
      {
        label: "设备关联",
        entry: "sbgl",
        path: "/d/electrical-safety/application-equipment",
      },
      {
        label: "报警记录",
        entry: "bjjl",
        path: "/d/electrical-safety/alarm-record",
      },
      {
        label: "告警规则",
        entry: "gjgz",
        path: "/d/electrical-safety/alarm-config",
      },
      {
        label: "消息配置",
        entry: "bjpz",
        path: "/d/electrical-safety/message-notice",
      },
    ],
  },
  {
    label: "基础配置",
    entry: "jcpz",
    children: [
      {
        label: "拓扑图配置",
        entry: "tptpz",
        path: "/d/electrical-safety/topology-editor",
      },
      {
        label: "远检配置",
        entry: "yjpz",
        path: "/d/electrical-safety/remote-inspection-config",
      },
    ],
  },
  {
    label: "远检查看",
    entry: "yjck",
    children: [
      {
        label: "远检查看",
        entry: "yjck",
        path: "/d/electrical-safety/remote-inspection-view",
      },
    ],
  },
  {
    label: "线损管理",
    entry: "xsgl",
    path: "/d/electrical-safety/line-loss",
  },
  {
    label: "线损预警",
    entry: "xsyj",
    children: [
      {
        label: "预警规则",
        entry: "yjgz",
        path: "/d/electrical-safety/line-loss-warning-config",
      },
      {
        label: "预警列表",
        entry: "yjlb",
        path: "/d/electrical-safety/line-loss-warning-list",
      },
    ],
  },
  {
    label: "业务配置",
    entry: "ywpz",
    children: [
      {
        label: "采集周期",
        entry: "cjzq",
        path: "/d/electrical-safety/collection-cycle",
      },
    ],
  },
  {
    label: "数据统计",
    entry: "sjtj",
    children: [
      {
        label: "采集记录",
        entry: "cjjl",
        path: "/d/electrical-safety/collection-record",
      },
      {
        label: "损耗统计",
        entry: "shtj",
        path: "/d/electrical-safety/loss-statistics",
      },
    ],
  },
];
