import { setRuntimeCommonDiagnosticsProvider } from "@g2-runtime/common-loader";
import { describe, expect, test } from "vitest";

import { setBootstrapStatus } from "./bootstrap-trace";

describe("setBootstrapStatus (jsdom)", () => {
  test("loading 态渲染 spinner + 标题，隐藏技术细节", () => {
    const root = document.createElement("div");
    setBootstrapStatus({ title: "正在启动…", detail: "runPlatformInstalls", kind: "loading" }, root);

    const panel = root.querySelector("[data-bootstrap-panel]");
    expect(panel).toBeTruthy();
    expect(panel?.classList.contains("shell-pc-bootstrap")).toBe(true);
    expect(panel?.getAttribute("role")).toBe("status");
    expect(root.querySelector(".shell-pc-bootstrap__spinner")).toBeTruthy();
    expect(root.querySelector("[data-bootstrap-title]")?.textContent).toBe("正在启动…");

    const detail = root.querySelector<HTMLElement>("[data-bootstrap-detail]");
    expect(detail?.hidden).toBe(true);
    expect(root.dataset.bootstrapStatus).toBe("正在启动… runPlatformInstalls");
  });

  test("waiting/error 态露出细节；复用面板不重建", () => {
    const root = document.createElement("div");
    setBootstrapStatus({ title: "正在启动…", detail: "compose", kind: "loading" }, root);
    const panel = root.querySelector("[data-bootstrap-panel]");

    setBootstrapStatus({ title: "仍在加载，请稍候…", detail: "compose（已等待 3000ms）", kind: "waiting" }, root);
    expect(root.querySelector("[data-bootstrap-panel]")).toBe(panel);
    expect(root.querySelector("[data-bootstrap-title]")?.textContent).toBe("仍在加载，请稍候…");
    expect(root.querySelector<HTMLElement>("[data-bootstrap-detail]")?.hidden).toBe(false);
    expect(root.querySelector("[data-bootstrap-detail]")?.textContent).toContain("compose");

    setBootstrapStatus({ title: "启动失败", detail: "boom", kind: "error" }, root);
    expect((panel as HTMLElement | null)?.dataset.kind).toBe("error");
    expect(root.querySelector("[data-bootstrap-title]")?.textContent).toBe("启动失败");
    expect(root.querySelector("[data-bootstrap-detail]")?.textContent).toBe("boom");
  });

  test("Runtime Common 等待/失败时在未挂载 Vue 前显示远程版本和错误", () => {
    setRuntimeCommonDiagnosticsProvider(() => [
      { name: "pcUi", state: "ready", runtimeVersion: "2026.09.28.1", apiVersion: "1.4.0" },
      { name: "pcMap", state: "failed", error: "manifest unavailable" },
    ]);
    const root = document.createElement("div");

    setBootstrapStatus({ title: "仍在加载，请稍候…", detail: "composeFromProfile", kind: "waiting" }, root);

    const diagnostics = root.querySelector("[data-runtime-common-diagnostics]");
    expect(diagnostics?.textContent).toContain("2026.09.28.1");
    expect(diagnostics?.textContent).toContain("pcMap: failed — manifest unavailable");

    setRuntimeCommonDiagnosticsProvider(() => []);
  });

  test("Vue 已 mount 后不得 replaceChildren（登录后 ensureAuthenticatedShell 会再打 bootStep，否则会抹掉 #workbench-container）", () => {
    const root = document.createElement("div");
    root.id = "app";
    const host = document.createElement("div");
    host.id = "workbench-container";
    root.append(host);
    // Vue 3 mount 会在根节点挂 data-v-app
    root.setAttribute("data-v-app", "");

    setBootstrapStatus({ title: "正在启动…", detail: "runPlatformInstalls(authenticated)", kind: "loading" }, root);

    expect(root.querySelector("#workbench-container")).toBe(host);
    expect(root.querySelector("[data-bootstrap-panel]")).toBeNull();
    expect(root.dataset.bootstrapStatus).toBe("正在启动… runPlatformInstalls(authenticated)");
  });
});
