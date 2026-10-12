/**
 * 设备类型定义
 */
export const DEVICE_TYPES = {
  BREAKER: "breaker",
  SWITCH: "switch",
  TRANSFORMER: "transformer",
  GENERATOR: "generator",
  MOTOR: "motor",
  SENSOR: "sensor",
} as const;

/**
 * 设备类型选项
 */
export const deviceTypeOptions = [
  { value: DEVICE_TYPES.BREAKER, label: "断路器" },
  { value: DEVICE_TYPES.SWITCH, label: "开关" },
  { value: DEVICE_TYPES.TRANSFORMER, label: "变压器" },
  { value: DEVICE_TYPES.GENERATOR, label: "发电机" },
  { value: DEVICE_TYPES.MOTOR, label: "电机" },
  { value: DEVICE_TYPES.SENSOR, label: "传感器" },
];

/**
 * 设备参数配置
 */
export const deviceParameterSchemas: Record<string, any[]> = {
  [DEVICE_TYPES.BREAKER]: [
    { key: "ratedCurrent", label: "额定电流", type: "number", unit: "A" },
    { key: "ratedVoltage", label: "额定电压", type: "number", unit: "V" },
    { key: "breakingCapacity", label: "分断能力", type: "number", unit: "kA" },
  ],
  [DEVICE_TYPES.SWITCH]: [
    { key: "ratedCurrent", label: "额定电流", type: "number", unit: "A" },
    { key: "ratedVoltage", label: "额定电压", type: "number", unit: "V" },
    { key: "switchType", label: "开关类型", type: "select", options: ["隔离开关", "负荷开关"] },
  ],
  [DEVICE_TYPES.TRANSFORMER]: [
    { key: "ratedCapacity", label: "额定容量", type: "number", unit: "kVA" },
    { key: "primaryVoltage", label: "一次侧电压", type: "number", unit: "kV" },
    { key: "secondaryVoltage", label: "二次侧电压", type: "number", unit: "V" },
  ],
};
