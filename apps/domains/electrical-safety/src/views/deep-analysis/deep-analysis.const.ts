import type { DiagnosisRecord } from "@/types/electrical";

export const DIAGNOSIS_RECORDS: DiagnosisRecord[] = [
  {
    id: "diagnosis-1",
    deviceName: "1号高压进线柜",
    problemName: "母线温度持续偏高",
    facilityName: "1号配电房",
    diagnosedAt: "2026-07-16 14:30",
    severity: "critical",
    status: "pending",
    description: "母线温度连续3小时超过65℃，并呈持续上升趋势，存在接头过热风险。",
    evidence: ["14:30 母线温度 72.6℃", "近3小时平均升温 2.4℃/h", "A相电流较七日均值上升18%"],
    causes: [
      { name: "母排连接点松动导致接触电阻增大", probability: 78 },
      { name: "负载持续偏高", probability: 15 },
      { name: "温度传感器偏移", probability: 7 },
    ],
    suggestions: ["安排电工红外复测母排连接点", "停电窗口检查并紧固接头", "整改后连续监测24小时"],
  },
  {
    id: "diagnosis-2",
    deviceName: "2号变压器",
    problemName: "负载率波动异常",
    facilityName: "2号配电房",
    diagnosedAt: "2026-07-15 10:20",
    severity: "warning",
    status: "processing",
    description: "工作日10:00至11:00负载率多次超过85%，峰谷波动大于历史同时间段。",
    evidence: ["10:18 峰值负载率 91%", "三相不平衡度 8.2%", "同时间段历史均值 72%"],
    causes: [
      { name: "临时生产负荷集中投入", probability: 62 },
      { name: "支路负荷分配不均", probability: 28 },
      { name: "采集点位抖动", probability: 10 },
    ],
    suggestions: ["核对生产计划与大功率设备启停记录", "检查三相负荷分配", "评估错峰启停方案"],
  },
  {
    id: "diagnosis-3",
    deviceName: "办公楼低压进线柜",
    problemName: "功率因数偏低",
    facilityName: "办公楼配电间",
    diagnosedAt: "2026-07-14 18:05",
    severity: "notice",
    status: "resolved",
    description: "非办公时段功率因数下降至0.82，低于建议运行值0.90。",
    evidence: ["18:05 功率因数 0.82", "无功功率 42kVar", "持续时间 46分钟"],
    causes: [
      { name: "轻载时补偿容量未及时切除", probability: 84 },
      { name: "电容补偿柜控制策略不合理", probability: 16 },
    ],
    suggestions: ["优化补偿柜投切阈值", "复核电容器组容量配置"],
  },
  {
    id: "diagnosis-4",
    deviceName: "2号配电房水浸探测器",
    problemName: "设备长时间离线",
    facilityName: "2号配电房",
    diagnosedAt: "2026-07-12 09:12",
    severity: "warning",
    status: "pending",
    description: "水浸探测器离线超过24小时，无法提供配电房积水预警。",
    evidence: ["最后心跳 2026-07-11 08:55", "连续重连 12 次失败", "同网关其他设备在线"],
    causes: [
      { name: "设备供电异常", probability: 55 },
      { name: "通信线缆松动", probability: 35 },
      { name: "终端硬件故障", probability: 10 },
    ],
    suggestions: ["现场检查设备供电与指示灯", "复插通信端子", "无法恢复时更换备用设备"],
  },
];

export const SEVERITY_META = {
  critical: { label: "紧急", color: "red" },
  warning: { label: "重要", color: "orange" },
  notice: { label: "提示", color: "blue" },
} as const;

export const STATUS_META = {
  pending: { label: "待处理", color: "red" },
  processing: { label: "处理中", color: "orange" },
  resolved: { label: "已完成", color: "green" },
} as const;
