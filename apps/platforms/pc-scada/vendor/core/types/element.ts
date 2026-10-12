export interface PropSchemaOption {
  value: string | number | boolean;
  label: string;
}

export type PropDomain = "observe" | "control";

export interface PropSchema {
  name: string;
  type: "string" | "number" | "boolean" | "color" | "select";
  label: string;
  default?: any;
  domain?: PropDomain;
  required?: boolean;
  semantic?: string;
  unit?: string;
  precision?: number;
  step?: number;
  maxLength?: number;
  pattern?: string;
  hint?: string;
  bindable?: boolean;
  controllable?: boolean;
  min?: number;
  max?: number;
  options?: PropSchemaOption[];
}

export interface PropMapping {
  prop: string;
  selector: string;
  attr: string;
  transform?: string;
}

/** A single connection port, position in percentage of element size */
export interface PortDef {
  id: string;
  /** CSS percentage string, e.g. "17.9%" */
  x: string;
  /** CSS percentage string, e.g. "0%" */
  y: string;
}

/** Per-instance port count configuration (0-4 per direction) */
export interface PortConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AnimationDef {
  id: string;
  triggerProp: string;
  triggerCondition: string;
  target: string;
  keyframes: Keyframe[];
  duration: number;
  iterations: number | "Infinity";
  easing: string;
}

export interface ElementDef {
  type: string;
  label: string;
  category: string;
  version: string;
  viewBox: string;
  defaultSize: { width: number; height: number };
  svgContent: string;
  svgBody: string;
  propsSchema: PropSchema[];
  mappings: PropMapping[];
  animations: AnimationDef[];
  /** Custom port positions; if absent the editor uses default 4-side center ports */
  ports?: PortDef[];
  /**
   * When true, `BindingEngine` subscribes to each `ElementInstance.propertyBindings[].propCode`
   * as a tag and synthesizes the `displayBody` prop for inline canvas display.
   */
  inlinePropertyPanel?: boolean;
  renderFn?: (svg: Element, props: Record<string, any>, prev: Record<string, any>) => void;
}
