// 首先导入所有节点和元素，确保它们被注册到 X6
import "./nodes";
import "./elements";

// 组件
export { ElectricalEditor, ElectricalNodeTree, ElectricalElementLib, ElectricalPropertyPanel } from "./components";

export type { ElectricalElementLibItem } from "./components";

// 节点
export { BaseElectricalNode, BreakerNode, SwitchNode, registerAllElectricalNodes } from "./nodes";

// 元素
export { ResistorNode, CapacitorNode } from "./elements/shapes";
export { WireEdge, ArrowWireEdge } from "./elements/edges";

// 转换
export {
  transformToGraph,
  transformFromGraph,
  generateGraphFromNodeTree,
  loadElectricalDataToGraph,
  exportElectricalDataAsJSON,
  importElectricalDataFromJSON,
} from "./transforms";

// 配置
export { DEVICE_TYPES, deviceTypeOptions, deviceParameterSchemas } from "./config/device-binding";

// 类型
export type { ElectricalNode, ElectricalNodeType, ElectricalData, DeviceBinding } from "./types";

export { replaceData } from "./utils/utils";
