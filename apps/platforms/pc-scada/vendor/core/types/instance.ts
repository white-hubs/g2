export interface Binding {
  productProperty?: ElementPropertyBinding;
  id: string;
  propName: string;
  tagName: string;
  transform?: string;
}

export type ActionType = "navigate" | "setTag" | "toggleTag" | "showPopup" | "callApi" | "controlAnimation";

export interface Action {
  type: ActionType;
  params: Record<string, any>;
  requireConfirm?: boolean;
}

export interface EventHandler {
  id?: string;
  event: string;
  actions: Action[];
}

/** 运行端是否在 Demo/业务中绑定设备后再展示弹窗内动态数据；组态不连接真实设备 */
export type DeviceBindingMode = "off" | "required";

export interface ElementPropertyBinding {
  propCode: string;
  propName: string;
  unitName?: string;
  dataType?: string;
  prodId?: string;
  prodName?: string;
}

export interface ElementInstance {
  id: string;
  type: string;
  /** 工程师自定义的设备标签，例如 P-101 */
  label?: string;
  /** 可选备注（非运行端绑定依据；真实绑定在 Demo/业务中完成） */
  deviceId?: string;
  /** 是否需要运行端为该图元绑定设备以展示弹窗动态数据；默认 off */
  deviceBinding?: DeviceBindingMode;
  /**
   * 运行端配置「产品与属性绑定」时用于识别本图元的名称（可与画布 label 不同）。
   * 建议在 Studio 勾选「需要运行端绑定设备」时填写并在画面内保持可读、尽量唯一。
   */
  propertyBindName?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  props: Record<string, any>;
  bindings: Binding[];
  eventHandlers: EventHandler[];
  /** Runtime product properties shown when this element is clicked. */
  propertyBindings?: ElementPropertyBinding[];
  /** Per-instance configurable port counts (0-4 per direction) */
  portConfig?: import("./element").PortConfig;
}
