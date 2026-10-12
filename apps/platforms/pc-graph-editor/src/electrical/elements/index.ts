// 导出所有元素（导入时自动注册到 X6）
export * from "./shapes";
export * from "./edges";

// 确保导入所有元素以触发注册
import "./shapes/resistor";
import "./shapes/capacitor";
import "./shapes/icon-node";
import "./shapes/icon-label-node";
import "./shapes/text-label";
import "./edges/wire";
