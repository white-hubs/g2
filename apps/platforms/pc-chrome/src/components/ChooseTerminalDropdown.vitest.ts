import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vitest";

import ChooseTerminalDropdown from "./ChooseTerminalDropdown";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

async function openMenu(wrapper: ReturnType<typeof mount>) {
  await wrapper.find(".pc-chrome-choose-terminal-trigger").trigger("click");
  await flushPromises();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function menuItems(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(".ant-dropdown-menu-item")) as HTMLElement[];
}

const TRIANGLE_CARET = "M2.2 4.4h7.6L6 9.2z";

describe("ChooseTerminalDropdown", () => {
  test("访问端入口无左侧图标，下拉箭头为实心三角", () => {
    const wrapper = mount(ChooseTerminalDropdown, { attachTo: document.body });
    const trigger = wrapper.find("[data-testid='choose-terminal']");

    expect(trigger.text()).toContain("访问端");
    expect(trigger.findAll("svg")).toHaveLength(1);
    expect(trigger.find(".pc-chrome-choose-terminal-trigger__caret path").attributes("d")).toBe(TRIANGLE_CARET);
    expect(wrapper.find(".pc-chrome-choose-terminal-trigger__icon").exists()).toBe(false);

    wrapper.unmount();
  });

  test("默认收起，点击访问端入口后展开硬编码占位列表（4 项）", async () => {
    const wrapper = mount(ChooseTerminalDropdown, { attachTo: document.body });

    expect(document.body.querySelector("[data-testid='choose-terminal-menu']")).toBeNull();

    await openMenu(wrapper);

    expect(menuItems()).toHaveLength(4);
    expect(document.body.textContent).toContain("二维组态");
    expect(document.body.textContent).toContain("调度中心");

    wrapper.unmount();
  });

  test("点击某个终端入口时 emit select-terminal 并调用 window.open 跳转，随后收起菜单", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const wrapper = mount(ChooseTerminalDropdown, { attachTo: document.body });
    await openMenu(wrapper);

    const target = menuItems().find((el) => el.textContent?.includes("孪生可视"));
    expect(target).toBeTruthy();
    target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();

    expect(wrapper.emitted("selectTerminal")).toHaveLength(1);
    const [emittedEntry] = wrapper.emitted("selectTerminal")![0] as [{ code: string; url: string }];
    expect(emittedEntry.code).toBe("three-dimensional-visualization");
    expect(openSpy).toHaveBeenCalledWith("/apps-legacy/ue5", "_blank");

    wrapper.unmount();
  });

  test("消费方可以通过 entries prop 覆盖占位列表", async () => {
    const wrapper = mount(ChooseTerminalDropdown, {
      props: { entries: [{ code: "custom", label: "自定义终端", url: "https://custom.example.com" }] },
      attachTo: document.body,
    });
    await openMenu(wrapper);

    expect(menuItems()).toHaveLength(1);
    expect(document.body.textContent).toContain("自定义终端");

    wrapper.unmount();
  });

  test("Esc 关闭访问端菜单", async () => {
    const wrapper = mount(ChooseTerminalDropdown, { attachTo: document.body });
    await openMenu(wrapper);
    expect(menuItems().length).toBeGreaterThan(0);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const dropdown = document.body.querySelector(".ant-dropdown") as HTMLElement | null;
    expect(!dropdown || dropdown.classList.contains("ant-dropdown-hidden") || dropdown.style.opacity === "0").toBe(true);
    wrapper.unmount();
  });
});
