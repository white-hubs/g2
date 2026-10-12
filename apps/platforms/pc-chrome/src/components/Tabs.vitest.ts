import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";

import Tabs, { type TabItem } from "./Tabs";

function buildTabs(): TabItem[] {
  return [
    { id: "tab-1", label: "首页" },
    { id: "tab-2", label: "工单管理" },
    { id: "tab-3", label: "报表中心" },
  ];
}

describe("Tabs", () => {
  test("渲染所有 tab 的 label", () => {
    const wrapper = mount(Tabs, { props: { tabs: buildTabs(), activeId: "tab-1" }, attachTo: document.body });
    expect(wrapper.text()).toContain("首页");
    expect(wrapper.text()).toContain("工单管理");
    expect(wrapper.text()).toContain("报表中心");
    wrapper.unmount();
  });

  test("点击非激活 tab 触发 activate，携带正确 id", async () => {
    const wrapper = mount(Tabs, { props: { tabs: buildTabs(), activeId: "tab-1" }, attachTo: document.body });
    const tabNodes = wrapper.findAll(".ant-tabs-tab");
    const targetTab = tabNodes.find((node) => node.text().includes("工单管理"));
    expect(targetTab).toBeTruthy();
    await targetTab?.trigger("click");
    expect(wrapper.emitted("activate")).toEqual([["tab-2"]]);
    wrapper.unmount();
  });

  test("多个 tab 时展示关闭按钮，点击关闭按钮触发 close，携带正确 id", async () => {
    const wrapper = mount(Tabs, { props: { tabs: buildTabs(), activeId: "tab-1" }, attachTo: document.body });
    const removeButtons = wrapper.findAll(".ant-tabs-tab-remove");
    expect(removeButtons.length).toBe(3);

    const secondTabNode = wrapper.findAll(".ant-tabs-tab").find((node) => node.text().includes("工单管理"));
    const removeButton = secondTabNode?.find(".ant-tabs-tab-remove");
    await removeButton?.trigger("click");

    expect(wrapper.emitted("close")).toEqual([["tab-2"]]);
    wrapper.unmount();
  });

  test("只剩最后一个 tab 时不展示关闭按钮（对齐旧仓 tabPanes.length > 1 才可关闭的逻辑）", () => {
    const wrapper = mount(Tabs, {
      props: { tabs: [{ id: "only", label: "唯一标签" }], activeId: "only" },
      attachTo: document.body,
    });
    expect(wrapper.findAll(".ant-tabs-tab-remove").length).toBe(0);
    wrapper.unmount();
  });

  test("保留现有 activate/close emit 行为：不触发 closeOthers/closeToRight", async () => {
    const wrapper = mount(Tabs, { props: { tabs: buildTabs(), activeId: "tab-1" }, attachTo: document.body });
    const tabNodes = wrapper.findAll(".ant-tabs-tab");
    await tabNodes[1]?.trigger("click");
    expect(wrapper.emitted("closeOthers")).toBeUndefined();
    expect(wrapper.emitted("closeToRight")).toBeUndefined();
    wrapper.unmount();
  });

  test("下拉菜单「关闭其他」触发 closeOthers，参数为当前 activeId", async () => {
    const wrapper = mount(Tabs, { props: { tabs: buildTabs(), activeId: "tab-2" }, attachTo: document.body });
    await wrapper.find(".pc-chrome-tabs-more-trigger").trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const closeOthersItem = document.body.querySelectorAll(".ant-dropdown-menu-item");
    const target = Array.from(closeOthersItem).find((el) => el.textContent === "关闭其他") as HTMLElement | undefined;
    expect(target).toBeTruthy();
    target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(wrapper.emitted("closeOthers")).toEqual([["tab-2"]]);
    wrapper.unmount();
  });

  test("下拉菜单「关闭到右侧」触发 closeToRight，参数为当前 activeId", async () => {
    const wrapper = mount(Tabs, { props: { tabs: buildTabs(), activeId: "tab-3" }, attachTo: document.body });
    await wrapper.find(".pc-chrome-tabs-more-trigger").trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const items = document.body.querySelectorAll(".ant-dropdown-menu-item");
    const target = Array.from(items).find((el) => el.textContent === "关闭到右侧") as HTMLElement | undefined;
    expect(target).toBeTruthy();
    target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(wrapper.emitted("closeToRight")).toEqual([["tab-3"]]);
    wrapper.unmount();
  });
});
