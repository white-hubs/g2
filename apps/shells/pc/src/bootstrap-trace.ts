import { getRuntimeCommonDiagnostics } from "@g2-runtime/common-loader";

import type { Logger } from "./library-platform-apis";

export type BootstrapStatusKind = "loading" | "waiting" | "error";

export interface BootstrapStatus {
  title: string;
  /** 次要技术细节（如阶段名），用于卡住时定位；正常加载时弱化展示。 */
  detail?: string;
  kind?: BootstrapStatusKind;
}

export interface TraceAsyncOptions {
  logger: Pick<Logger, "info" | "warn" | "error">;
  /** 超过该时间仍未完成则 warn（专门暴露「卡住但不抛错」类问题）。默认 3s。 */
  warnAfterMs?: number;
  /** 超过该时间仍未完成则 reject。默认 20s；设 0 表示不强制超时。 */
  timeoutMs?: number;
  /** 可选：把阶段状态写到页面（白屏时也能看见卡在哪）。 */
  onStatus?: (status: BootstrapStatus) => void;
  now?: () => number;
  /** 句柄类型在 DOM(`number`) / Bun·Node(`Timeout`) 间不一致，故用 unknown。 */
  schedule?: (fn: () => void, ms: number) => unknown;
  clearSchedule?: (id: unknown) => void;
}

/**
 * 给长时间 await 包一层可观测性：开始 / 慢警告 / 超时失败。
 * Vite 预打包卡住、MF remote 挂起时往往既不 error 也不 warn——靠 warnAfter 把「还在等」打出来。
 */
export async function traceAsync<T>(label: string, work: () => Promise<T>, options: TraceAsyncOptions): Promise<T> {
  const warnAfterMs = options.warnAfterMs ?? 3_000;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? setTimeout;
  const clearSchedule =
    options.clearSchedule ??
    ((id: unknown) => {
      clearTimeout(id as never);
    });
  const startedAt = now();

  options.logger.info(`start: ${label}`);
  options.onStatus?.({ title: "正在启动…", detail: label, kind: "loading" });

  let warnTimer: unknown;
  let timeoutTimer: unknown;
  let settled = false;

  const clearTimers = (): void => {
    if (warnTimer !== undefined) {
      clearSchedule(warnTimer);
    }
    if (timeoutTimer !== undefined) {
      clearSchedule(timeoutTimer);
    }
  };

  const slowWarn = new Promise<never>((_resolve, reject) => {
    if (warnAfterMs > 0) {
      warnTimer = schedule(() => {
        if (settled) {
          return;
        }
        const elapsed = now() - startedAt;
        options.logger.warn(`still pending after ${elapsed}ms: ${label} (可能是 Vite 预打包 / MF remote 卡住)`);
        options.onStatus?.({
          title: "仍在加载，请稍候…",
          detail: `${label}（已等待 ${elapsed}ms）`,
          kind: "waiting",
        });
      }, warnAfterMs);
    }
    if (timeoutMs > 0) {
      timeoutTimer = schedule(() => {
        if (settled) {
          return;
        }
        const elapsed = now() - startedAt;
        const error = new Error(`bootstrap timeout after ${elapsed}ms: ${label}`);
        options.logger.error(error.message);
        options.onStatus?.({ title: "启动超时", detail: label, kind: "error" });
        reject(error);
      }, timeoutMs);
    }
  });

  try {
    const result = await Promise.race([work(), slowWarn]);
    settled = true;
    clearTimers();
    options.logger.info(`done: ${label}`, { elapsedMs: now() - startedAt });
    return result;
  } catch (error) {
    settled = true;
    clearTimers();
    throw error;
  }
}

function normalizeStatus(status: string | BootstrapStatus): Required<Pick<BootstrapStatus, "title" | "kind">> & BootstrapStatus {
  if (typeof status === "string") {
    const kind: BootstrapStatusKind = /失败|超时|错误/.test(status) ? "error" : "loading";
    return { title: status, kind };
  }
  return {
    title: status.title,
    detail: status.detail,
    kind: status.kind ?? (/失败|超时|错误/.test(status.title) ? "error" : "loading"),
  };
}

function resolveDocument(root: HTMLElement): Document | null {
  const owner = root.ownerDocument;
  if (owner && typeof owner.createElement === "function") {
    return owner;
  }
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    return document;
  }
  return null;
}

function isVueMountedRoot(root: HTMLElement): boolean {
  // Vue 3 mount 会在根上挂 data-v-app；用它判断，避免读私有 __vue_app__。
  // 单测可能传入无完整 DOM API 的 stub root。
  if (typeof root.hasAttribute !== "function") {
    return false;
  }
  return root.hasAttribute("data-v-app") || Boolean(typeof root.querySelector === "function" && root.querySelector(".shell-pc"));
}

/** 在 `#app` 未 mount 前写入可读的启动阶段，避免「纯白屏 + 零日志」。 */
export function setBootstrapStatus(
  status: string | BootstrapStatus,
  root: HTMLElement | null = typeof document !== "undefined" ? document.querySelector("#app") : null,
): void {
  if (!root) {
    return;
  }

  const normalized = normalizeStatus(status);
  const statusKey = normalized.detail ? `${normalized.title} ${normalized.detail}` : normalized.title;
  root.dataset.bootstrapStatus = statusKey;
  root.dataset.bootstrapKind = normalized.kind;

  // 登录成功后仍会走 bootStep→onStatus；此时 #app 已归 Vue，禁止 replaceChildren（会抹掉 #workbench-container）。
  if (isVueMountedRoot(root)) {
    return;
  }

  const doc = resolveDocument(root);
  // bun:test 等无 DOM 环境：仅保留 data / 文本，便于单测观测。
  if (!doc || typeof root.querySelector !== "function" || typeof root.replaceChildren !== "function") {
    root.textContent = normalized.title;
    return;
  }

  // 复用已有节点，避免每个阶段整页重建造成闪烁。
  let panel = root.querySelector<HTMLElement>("[data-bootstrap-panel]");
  if (!panel) {
    root.replaceChildren();
    panel = doc.createElement("div");
    panel.dataset.bootstrapPanel = "";
    panel.className = "shell-pc-bootstrap";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");

    const spinner = doc.createElement("span");
    spinner.className = "shell-pc-bootstrap__spinner";
    spinner.setAttribute("aria-hidden", "true");

    const title = doc.createElement("p");
    title.className = "shell-pc-bootstrap__title";
    title.dataset.bootstrapTitle = "";

    const detail = doc.createElement("p");
    detail.className = "shell-pc-bootstrap__detail";
    detail.dataset.bootstrapDetail = "";

    panel.append(spinner, title, detail);
    root.append(panel);
  }

  panel.dataset.kind = normalized.kind;
  const titleEl = panel.querySelector<HTMLElement>("[data-bootstrap-title]");
  const detailEl = panel.querySelector<HTMLElement>("[data-bootstrap-detail]");
  if (titleEl) {
    titleEl.textContent = normalized.title;
  }
  if (detailEl) {
    // 正常加载只展示友好文案；卡住 / 失败时才露出阶段细节，便于定位。
    const showDetail = Boolean(normalized.detail) && normalized.kind !== "loading";
    detailEl.textContent = showDetail ? (normalized.detail ?? "") : "";
    detailEl.hidden = !showDetail;
  }

  const diagnostics = getRuntimeCommonDiagnostics();
  let diagnosticsPanel = panel.querySelector<HTMLDetailsElement>("[data-runtime-common-diagnostics]");
  if ((normalized.kind === "waiting" || normalized.kind === "error") && diagnostics.length) {
    if (!diagnosticsPanel) {
      diagnosticsPanel = doc.createElement("details");
      diagnosticsPanel.dataset.runtimeCommonDiagnostics = "";
      diagnosticsPanel.className = "shell-pc-bootstrap__runtime-diagnostics";
      const summary = doc.createElement("summary");
      summary.textContent = "公共模块加载状态";
      diagnosticsPanel.append(summary, doc.createElement("ul"));
      panel.append(diagnosticsPanel);
    }
    const list = diagnosticsPanel.querySelector("ul");
    if (list) {
      list.replaceChildren(
        ...diagnostics.map((item) => {
          const row = doc.createElement("li");
          const version = item.runtimeVersion ? ` · ${item.runtimeVersion} (API ${item.apiVersion ?? "—"})` : "";
          row.textContent = `${item.name}: ${item.state}${version}${item.error ? ` — ${item.error}` : ""}`;
          return row;
        }),
      );
    }
  } else {
    diagnosticsPanel?.remove();
  }
}
