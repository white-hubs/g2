import {
  BellOutlined,
  BulbOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SettingOutlined,
  StopOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  VideoCameraOutlined,
  WarningOutlined,
} from "@ant-design/icons-vue";
import type { VNode } from "vue";

/** 控制按钮 / 配置项图标：优先 Ant Design 图标，保留 Font Awesome class 兜底。 */
export function renderControlButtonIcon(action: { icon: string; label: string; methodCode: string }): VNode {
  if (/^fas\s+fa-/u.test(action.icon)) {
    return <i class={action.icon} aria-hidden="true" />;
  }

  const descriptor = `${action.icon}${action.label}${action.methodCode}`.toLowerCase();
  if (/停止|stop/u.test(descriptor)) {
    return <StopOutlined />;
  }
  if (/启动|start/u.test(descriptor)) {
    return <PlayCircleOutlined />;
  }
  if (/报警|alarm|广播|broadcast/u.test(descriptor)) {
    return <BellOutlined />;
  }
  if (/风机|fan/u.test(descriptor)) {
    return <RocketOutlined />;
  }
  if (/水泵|pump/u.test(descriptor)) {
    return <ThunderboltOutlined />;
  }
  if (/照明|亮度|light|bright/u.test(descriptor)) {
    return <BulbOutlined />;
  }
  if (/推流|直播|stream|live|video/u.test(descriptor)) {
    return <VideoCameraOutlined />;
  }
  if (/复位|reset|自检|test/u.test(descriptor)) {
    return <ToolOutlined />;
  }
  if (/事件|event|警告|warn/u.test(descriptor)) {
    return <WarningOutlined />;
  }
  if (/记录|log|history/u.test(descriptor)) {
    return <HistoryOutlined />;
  }
  return <SettingOutlined />;
}
