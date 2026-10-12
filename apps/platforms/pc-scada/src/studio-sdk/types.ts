import type { Ref } from "vue";

import type { PageModel } from "../../vendor/core";
import type { BindingEngine } from "../../vendor/engine";
import type { RuntimeElementEvent } from "../../vendor/runtime";

// ── 配置 ─────────────────────────────────────────────────────────────────

export interface CreateOptions {
  /** Viewer app base URL (e.g. "http://localhost:5174" for apps/studio). Default: same origin. */
  viewerBase?: string;
  /** SDK page render mode. Defaults to iframe for backward compatibility. */
  renderMode?: "iframe" | "direct";
  /** SCADA API base used only in direct mode. Default: "/scada/api". */
  apiBase?: string;
  /** Static element assets base used in direct mode for builtin-elements manifest. */
  elementAssetBase?: string;
}

export interface LoadOptions {
  /** Page ID (preferred) or page name. */
  page: string;
  /** Optional project ID to disambiguate page names. */
  project?: string;
  init?: {
    /** Initial tag values sent to the iframe after it is ready. */
    tags?: Record<string, string | number | boolean>;
    /** Global variables forwarded to the viewer as URL param. */
    vars?: Record<string, unknown>;
  };
}

// ── 事件系统 ──────────────────────────────────────────────────────────────

export type ScadaEventType = "click" | "dblclick" | "contextmenu" | "mouseenter" | "mouseleave";

export interface ScadaElementEvent {
  type: ScadaEventType;
  pageId: string;
  pageName: string;
  element: {
    id: string;
    type: string;
    name?: string;
    deviceNo?: string;
    props: Record<string, unknown>;
  };
  /** Undefined when the event originates from an iframe (DOM events are not serialisable). */
  nativeEvent?: Event;
}

export interface ScadaPopupEvent {
  title: string;
  content: string;
  /** 组态「弹出窗口」动作里配置的弹窗内容 ID，宿主据此渲染自定义 UI */
  contentId?: string;
  /** 原始动作参数，可扩展自定义字段供宿主使用 */
  raw: Record<string, unknown>;
  /** 触发弹窗的图元（点击来源） */
  sourceElement?: {
    id: string;
    type: string;
    name?: string;
    deviceNo?: string;
    props: Record<string, unknown>;
  };
  /**
   * 组态声明：是否需要运行端绑定设备后展示动态数据。
   * 缺省按 off（兼容旧画面）。
   */
  deviceBinding?: "off" | "required";
}

export type ScadaEventListener = (event: ScadaElementEvent) => void;
export type ScadaPopupListener = (event: ScadaPopupEvent) => void;
export type ScadaUnsubscribe = () => void;

// ── 页面 Tag 描述 ─────────────────────────────────────────────────────────

/**
 * Tag definition forwarded from the viewer on page ready.
 * Mirrors core TagDefinition but is self-contained (no @cube-scada/core dependency).
 */
export interface ScadaTagDefinition {
  name: string;
  type: "boolean" | "number" | "string";
  label?: string;
  description?: string;
  min?: number;
  max?: number;
}

// ── 核心接口 ──────────────────────────────────────────────────────────────

export interface ScadaPageHandle {
  readonly renderMode: "iframe" | "direct";
  readonly loading: Ref<boolean>;
  readonly error: Ref<Error | null>;
  /** Tag definitions of the loaded page. Populated after the viewer signals ready. */
  readonly pageTags: Ref<readonly ScadaTagDefinition[]>;

  /** Push a tag value into the SCADA iframe. */
  setTagValue(tag: string, value: string | number | boolean): void;

  /**
   * Page-level element event listener.
   * Returns an unsubscribe function.
   */
  on(event: "elementEvent", listener: ScadaEventListener): ScadaUnsubscribe;
  on(event: "showPopup", listener: ScadaPopupListener): ScadaUnsubscribe;

  dispose(): void;

  // ── @internal — used only by CubeScadaPage ─────────────────────────────
  readonly iframeSrc: string;
  _attachIframe(iframe: HTMLIFrameElement): void;
  _detachIframe(): void;
  _emitElementEvent(event: ScadaElementEvent): void;
  readonly directPage?: Ref<PageModel | null>;
  readonly directBindingEngine?: BindingEngine;
  _handleRuntimeEvent?(runtimeEvent: RuntimeElementEvent): Promise<void>;
}

export interface CubeScadaInstance {
  load(options: LoadOptions): ScadaPageHandle;
  /**
   * Global element event listener across all pages loaded by this instance.
   * Returns an unsubscribe function.
   */
  on(event: "elementEvent", listener: ScadaEventListener): ScadaUnsubscribe;
  on(event: "showPopup", listener: ScadaPopupListener): ScadaUnsubscribe;
}
