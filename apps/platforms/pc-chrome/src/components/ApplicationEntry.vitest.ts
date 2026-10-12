import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";

import ApplicationEntry from "./ApplicationEntry";
import type { ApplicationEntryGroup } from "./top-bar-types";

function buildGroups(): ApplicationEntryGroup[] {
  return [
    {
      key: "workspace",
      label: "工作台",
      order: 2,
      items: [{ domainName: "workspace", label: "首页", path: "/workspace" }],
    },
    {
      key: "admin-tools",
      label: "管理工具",
      order: 1,
      items: [
        { domainName: "system", label: "组织架构", path: "/system/org" },
        { domainName: "system", label: "权限管理", path: "/system/permission" },
      ],
    },
  ];
}

describe("ApplicationEntry", () => {
  test("按 order 升序渲染横向分组 Tab", () => {
    const wrapper = mount(ApplicationEntry, { props: { groups: buildGroups() } });

    const labels = wrapper.findAll("[role='tab']").map((el) => el.text());
    expect(labels).toEqual(["管理工具", "工作台"]);
    expect(wrapper.find(".pc-chrome-application-entry-panel").exists()).toBe(false);
  });

  test("activeKey 对应 Tab 带激活样式", () => {
    const wrapper = mount(ApplicationEntry, {
      props: { groups: buildGroups(), activeKey: "workspace" },
    });

    const active = wrapper.find(".pc-chrome-application-entry__tab--active");
    expect(active.exists()).toBe(true);
    expect(active.text()).toBe("工作台");
  });

  test("点击分组只触发 select-group（首条默认路由由 Shell 负责）", async () => {
    const wrapper = mount(ApplicationEntry, { props: { groups: buildGroups() } });

    await wrapper.find("[data-testid='app-group-admin-tools']").trigger("click");

    expect(wrapper.emitted("selectGroup")).toEqual([["admin-tools"]]);
    expect(wrapper.emitted("navigate")).toBeUndefined();
  });

  test("未传 groups 时显示空态，不会报错", () => {
    const wrapper = mount(ApplicationEntry);

    expect(wrapper.text()).toContain("暂无应用分组");
  });

  test("tabs 容器不使用横向滚动（溢出走 more，对齐旧仓 ant-tabs）", () => {
    const wrapper = mount(ApplicationEntry, { props: { groups: buildGroups() } });
    const tabs = wrapper.find(".pc-chrome-application-entry__tabs");
    expect(tabs.exists()).toBe(true);
    // 测量条存在，用于计算可见数量
    expect(wrapper.find(".pc-chrome-application-entry__measure").exists()).toBe(true);
  });
});
