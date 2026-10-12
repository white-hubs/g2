export const safetyCreditMenu = [
  {
    label: "商户管理",
    entry: "creditShgl",
    path: "/d/safety-credit/merchants",
  },
  {
    label: "评分模型",
    entry: "creditPfmx",
    children: [
      {
        label: "数据源配置",
        entry: "creditSjypz",
        path: "/d/safety-credit/data-sources",
      },
      {
        label: "评分权重配置",
        entry: "creditQzpz",
        path: "/d/safety-credit/score-models",
      },
      {
        label: "模型版本管理",
        entry: "greditBbgl",
        path: "/d/safety-credit/score-models/versions",
      },
      {
        label: "评分日志",
        entry: "creditPfrz",
        path: "/d/safety-credit/score-logs",
      },
    ],
  },
  {
    label: "行为采集",
    entry: "creditXwcj",
    children: [
      {
        label: "行为记录",
        entry: "creditXwjl",
        path: "/d/safety-credit/behaviors",
      },
      {
        label: "行为审核",
        entry: "creditXwsh",
        path: "/d/safety-credit/behavior-audits",
      },
    ],
  },
  {
    label: "自查管理",
    entry: "creditZcgl",
    children: [
      {
        label: "自查清单",
        entry: "creditZcqd",
        path: "/d/safety-credit/checklists",
      },
      {
        label: "自查处理",
        entry: "creditZccl",
        path: "/d/safety-credit/check-processing",
      },
      {
        label: "自查质检",
        entry: "creditZczj",
        path: "/d/safety-credit/check-quality",
      },
      {
        label: "自查统计",
        entry: "creditZcxt",
        path: "/d/safety-credit/check-statistics",
      },
    ],
  },
  {
    label: "评分公示",
    entry: "greditBfgs",
    children: [
      {
        label: "评分排名看板",
        entry: "creditPmkb",
        path: "/d/safety-credit/rankings",
      },
      {
        label: "公示配置",
        entry: "creditGspz",
        path: "/d/safety-credit/publicity-config",
      },
    ],
  },
  {
    label: "权益联动",
    entry: "creditQyld",
    children: [
      {
        label: "权益规则配置",
        entry: "creditQygzpz",
        path: "/d/safety-credit/benefit-rules",
      },
      {
        label: "权益生效记录",
        entry: "credotQysxjl",
        path: "/d/safety-credit/benefit-records",
      },
    ],
  },
  {
    label: "信用档案",
    entry: "creditXyda",
    path: "/d/safety-credit/archives",
  },
];
