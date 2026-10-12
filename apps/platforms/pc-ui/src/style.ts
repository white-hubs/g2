/// <reference types="vite/client" />
/**
 * ant-design-vue 4.x 用 `reset.css` 取代 2.x 时代的 `antd.less`（已核实 4.2.6 包内
 * `dist/reset.css` 确实存在，见 README「样式接入方式」一节）。这里只做一次副作用 import，
 * 不导出任何值——本文件本身就是消费方要 import 的「样式入口」。
 */
import "ant-design-vue/dist/reset.css";
