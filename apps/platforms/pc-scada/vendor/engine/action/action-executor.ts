import type { Action, DataDriver } from "../../core";
import { resolveTagName, resolveTemplateValue, templateScope } from "../shared/template";

export interface ActionRequest {
  action: Action;
  elementId: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
}

/** 动作执行时用于 `${element.*}` 模板解析（来自当前交互图元） */
export interface ActionElementContext {
  id: string;
  type: string;
  label?: string;
  deviceId?: string;
}

export interface ActionExecuteOptions {
  element?: ActionElementContext | null;
}

export interface ActionContext {
  driver?: DataDriver | null;
  navigate?: (pageId: string) => void;
  showPopup?: (config: Record<string, any>) => void;
  globals?: Record<string, unknown>;
  /**
   * 业务方授权回调。
   * 当 action.requireConfirm = true 时，先调用此回调获得授权，再执行动作。
   * 若未提供，requireConfirm 的动作仍会执行（降级行为）。
   */
  onActionRequest?: (request: ActionRequest) => Promise<ActionResult>;
}

function elementTemplateRecord(el: ActionElementContext): Record<string, unknown> {
  return {
    id: el.id,
    type: el.type,
    label: el.label ?? "",
    deviceId: el.deviceId ?? "",
  };
}

export class ActionExecutor {
  private ctx: ActionContext = {};

  setContext(ctx: ActionContext) {
    this.ctx = { ...this.ctx, ...ctx };
  }

  async execute(actions: Action[], options?: ActionExecuteOptions): Promise<void> {
    for (const action of actions) {
      await this.executeOne(action, options);
    }
  }

  private async executeOne(action: Action, options?: ActionExecuteOptions): Promise<void> {
    // requireConfirm: delegate to business system for authorization
    if (action.requireConfirm && this.ctx.onActionRequest) {
      const result = await this.ctx.onActionRequest({ action, elementId: options?.element?.id ?? "" });
      if (!result.success) {
        console.info("[ActionExecutor] Action denied by onActionRequest:", result.message);
        return;
      }
    }
    const globals = this.ctx.globals ?? {};
    const elementBlock = options?.element ? elementTemplateRecord(options.element) : {};
    const scope = templateScope(globals, elementBlock);
    const params = resolveTemplateValue(action.params, scope) as Record<string, any>;

    switch (action.type) {
      case "navigate":
        this.ctx.navigate?.(params.pageId);
        break;

      case "setTag":
        if (this.ctx.driver) {
          const tag = resolveTagName(action.params?.tag, globals);
          if (!tag) {
            console.warn("[ActionExecutor] setTag skipped because tag is empty.");
            break;
          }
          await this.ctx.driver.write(tag, params.value);
        }
        break;

      case "toggleTag":
        if (this.ctx.driver) {
          const tag = resolveTagName(action.params?.tag, globals);
          if (!tag) {
            console.warn("[ActionExecutor] toggleTag skipped because tag is empty.");
            break;
          }

          // Default to boolean true/false so transforms using `=== true` work
          // correctly for boolean signals without explicit configuration.
          const onValue = params.onValue !== undefined ? params.onValue : true;
          const offValue = params.offValue !== undefined ? params.offValue : false;
          const currentMap = await this.ctx.driver.read([tag]);
          const current = currentMap[tag]?.value;
          const next = this.isEquivalent(current, onValue) ? offValue : onValue;
          await this.ctx.driver.write(tag, next);
        }
        break;

      case "showPopup":
        this.ctx.showPopup?.(params);
        break;

      case "callApi": {
        const { url, method = "GET", body } = params;
        try {
          await fetch(url, {
            method,
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
          });
        } catch (e) {
          console.error("[ActionExecutor] callApi failed:", e);
        }
        break;
      }

      case "controlAnimation":
        // Handled externally via AnimationEngine
        break;

      default:
        console.warn(`[ActionExecutor] Unknown action type: ${action.type}`);
    }
  }

  private isEquivalent(left: unknown, right: unknown): boolean {
    if (left === right) return true;

    const leftBool = this.toBooleanLike(left);
    const rightBool = this.toBooleanLike(right);
    if (leftBool != null && rightBool != null) {
      return leftBool === rightBool;
    }

    const leftNum = this.toFiniteNumber(left);
    const rightNum = this.toFiniteNumber(right);
    if (leftNum != null && rightNum != null) {
      return leftNum === rightNum;
    }

    return String(left) === String(right);
  }

  private toFiniteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toBooleanLike(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value !== "string") return null;

    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "on") return true;
    if (normalized === "false" || normalized === "0" || normalized === "off") return false;
    return null;
  }
}
