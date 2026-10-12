// 首先导入所有节点模块，确保它们被注册到 X6
import "./base";
import "./breaker";
import "./switch";

// 然后导出节点定义供外部使用
export { BaseElectricalNode, registerBaseNode } from "./base";
export { BreakerNode, registerBreakerNode } from "./breaker";
export { SwitchNode, registerSwitchNode } from "./switch";

/**
 * 注册所有电气节点
 * 注意：X6 节点通过 Node.define 定义时就已经自动注册了
 * 导入这些节点模块时，它们就会被注册到 X6 中
 */
export function registerAllElectricalNodes() {
  // 这个函数主要用于确保所有节点模块被导入
  // 实际的注册已经在各个节点文件的顶层通过 Node.define 完成了
}
