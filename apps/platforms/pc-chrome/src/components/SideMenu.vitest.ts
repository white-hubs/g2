import type { NavigationMenuNode } from "@g2-shell/pc/stores/portal-navigation";
import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";

import SideMenu, { isAncestorActive } from "./SideMenu";

function buildDeepMenuTree(): NavigationMenuNode[] {
  return [
    {
      domainName: "workspace",
      label: "工作台",
      path: "/workspace",
    },
    {
      domainName: "system",
      label: "系统管理",
      children: [
        {
          domainName: "system",
          label: "组织架构",
          children: [
            {
              domainName: "system",
              label: "部门管理",
              children: [
                { domainName: "system", label: "部门列表", path: "/system/org/dept/list" },
                { domainName: "system", label: "部门第四层节点", path: "/system/org/dept/level4" },
              ],
            },
          ],
        },
      ],
    },
  ];
}

describe("SideMenu", () => {
  test("4 层深度的菜单树能被完整渲染，深层节点文本不会被截断", () => {
    const wrapper = mount(SideMenu, {
      props: { menuTree: buildDeepMenuTree(), activePath: "/system/org/dept/level4" },
      attachTo: document.body,
    });

    expect(wrapper.text()).toContain("工作台");
    expect(wrapper.text()).toContain("系统管理");
    expect(wrapper.text()).toContain("组织架构");
    expect(wrapper.text()).toContain("部门管理");
    expect(wrapper.text()).toContain("部门列表");
    expect(wrapper.text()).toContain("部门第四层节点");

    wrapper.unmount();
  });

  test("一级菜单无 icon URL 时不渲染色块占位（对齐原系统：无图则无图标）", () => {
    const wrapper = mount(SideMenu, {
      props: {
        menuTree: [{ domainName: "ops", label: "隐患配置", path: "/ops/hazard/config", iconKey: "config" }],
        activePath: "",
      },
      attachTo: document.body,
    });

    expect(wrapper.find(".pc-chrome-side-menu-icon").exists()).toBe(false);
    expect(wrapper.text()).toContain("隐患配置");

    wrapper.unmount();
  });

  test("一级菜单有 icon URL 时渲染图片（经静态资源前缀解析）", async () => {
    const { configureStaticResourceBase } = await import("../resource-api");
    configureStaticResourceBase("https://r.kaiheai.com");
    const wrapper = mount(SideMenu, {
      props: {
        menuTree: [
          {
            domainName: "ops",
            label: "故障报修",
            path: "/ops/repair",
            icon: "/resource/app-icons/故障报修/main.png",
          },
        ],
        activePath: "",
      },
      attachTo: document.body,
    });

    const icon = wrapper.find("img.pc-chrome-side-menu-icon");
    expect(icon.exists()).toBe(true);
    expect(icon.attributes("src")).toBe("https://r.kaiheai.com/app-icons/故障报修/main.png");

    configureStaticResourceBase(undefined);
    wrapper.unmount();
  });

  test("二级及以下菜单不渲染图标（即使节点带了 icon）", () => {
    const wrapper = mount(SideMenu, {
      props: {
        menuTree: [
          {
            domainName: "ops",
            label: "隐患排查",
            path: "/ops/hazard",
            icon: "/resource/app-icons/隐患排查/main.png",
            children: [
              {
                domainName: "ops",
                label: "隐患单",
                path: "/ops/hazard/list",
                icon: "/resource/app-icons/隐患排查/main.png",
                iconKey: "hazard",
              },
            ],
          },
        ],
        activePath: "/ops/hazard/list",
      },
      attachTo: document.body,
    });

    const icons = wrapper.findAll(".pc-chrome-side-menu-icon");
    // 仅一级「隐患排查」有图标；二级「隐患单」无
    expect(icons).toHaveLength(1);
    expect(icons[0]!.element.tagName.toLowerCase()).toBe("img");
    expect(wrapper.text()).toContain("隐患单");

    wrapper.unmount();
  });

  test("底栏折叠按钮可切换折叠态：收起后壳层变窄并隐藏文案", async () => {
    const wrapper = mount(SideMenu, {
      props: {
        menuTree: [{ domainName: "ops", label: "隐患排查", path: "/ops/hazard", iconKey: "hazard" }],
        activePath: "",
      },
      attachTo: document.body,
    });

    const foldBtn = wrapper.find("[data-testid='side-menu-fold']");
    expect(foldBtn.exists()).toBe(true);
    expect(wrapper.find(".pc-chrome-side-menu-shell--collapsed").exists()).toBe(false);
    expect(wrapper.find(".pc-chrome-side-menu-label").exists()).toBe(true);

    await foldBtn.trigger("click");
    expect(wrapper.find(".pc-chrome-side-menu-shell--collapsed").exists()).toBe(true);
    expect(wrapper.find(".pc-chrome-side-menu-label").exists()).toBe(false);
    expect(wrapper.emitted("collapsedChange")).toEqual([[true]]);
    expect(foldBtn.attributes("aria-pressed")).toBe("true");

    await foldBtn.trigger("click");
    expect(wrapper.find(".pc-chrome-side-menu-shell--collapsed").exists()).toBe(false);
    expect(wrapper.find(".pc-chrome-side-menu-label").exists()).toBe(true);
    expect(wrapper.emitted("collapsedChange")).toEqual([[true], [false]]);
    expect(foldBtn.attributes("aria-pressed")).toBe("false");

    wrapper.unmount();
  });

  test("点击第四层叶子节点触发 navigate，携带正确的 path", async () => {
    const wrapper = mount(SideMenu, {
      props: { menuTree: buildDeepMenuTree(), activePath: "" },
      attachTo: document.body,
    });

    const leafItem = wrapper.findAll(".pc-chrome-side-menu-item").find((item) => item.text() === "部门第四层节点");
    expect(leafItem).toBeTruthy();
    await leafItem?.trigger("click");

    expect(wrapper.emitted("navigate")).toEqual([["/system/org/dept/level4"]]);

    wrapper.unmount();
  });

  test("点击分组标题只展开/收起，不 navigate", async () => {
    const wrapper = mount(SideMenu, {
      props: {
        menuTree: [
          {
            domainName: "system",
            label: "系统管理",
            path: "/system",
            children: [{ domainName: "system", label: "组织架构", path: "/system/org" }],
          },
        ],
        activePath: "",
      },
      attachTo: document.body,
    });

    const title = wrapper.find(".ant-menu-submenu-title");
    expect(title.exists()).toBe(true);
    await title.trigger("click");

    expect(wrapper.emitted("navigate")).toBeUndefined();
    wrapper.unmount();
  });

  test("隐藏详情路由变化时，即使 activePath 未变也重新展开所属菜单", async () => {
    const wrapper = mount(SideMenu, {
      props: {
        menuTree: buildDeepMenuTree(),
        activePath: "/system/org/dept/level4",
        currentPath: "/system/org/dept/level4",
      },
      attachTo: document.body,
    });

    const firstGroup = wrapper.find(".ant-menu-submenu-title");
    expect(firstGroup.attributes("aria-expanded")).toBe("true");
    await firstGroup.trigger("click");
    expect(firstGroup.attributes("aria-expanded")).toBe("false");

    await wrapper.setProps({ currentPath: "/system/org/dept/level4/edit" });
    expect(firstGroup.attributes("aria-expanded")).toBe("true");

    wrapper.unmount();
  });

  test("激活第四层叶子节点时，第一层/第二层/第三层祖先分组节点都带上激活态 class", () => {
    const wrapper = mount(SideMenu, {
      props: { menuTree: buildDeepMenuTree(), activePath: "/system/org/dept/level4" },
      attachTo: document.body,
    });

    const activeGroups = wrapper.findAll(".pc-chrome-side-menu-group--active");
    // 系统管理 / 组织架构 / 部门管理 三层分组节点都应该处于激活祖先态
    expect(activeGroups.length).toBe(3);
    const activeGroupLabels = activeGroups.map((el) => el.text()).join(",");
    expect(activeGroupLabels).toContain("系统管理");
    expect(activeGroupLabels).toContain("组织架构");
    expect(activeGroupLabels).toContain("部门管理");

    wrapper.unmount();
  });
});

describe("isAncestorActive（纯函数，不绑定 DOM）", () => {
  const leaf4: NavigationMenuNode = { domainName: "d", label: "leaf4", path: "/a/b/c/d" };
  const level3: NavigationMenuNode = { domainName: "d", label: "level3", children: [leaf4] };
  const level2: NavigationMenuNode = { domainName: "d", label: "level2", children: [level3] };
  const level1: NavigationMenuNode = { domainName: "d", label: "level1", children: [level2] };

  test("activePath 命中自身 path 时返回 true", () => {
    expect(isAncestorActive(leaf4, "/a/b/c/d")).toBe(true);
  });

  test("activePath 命中任意深度的子孙节点时，所有祖先都返回 true", () => {
    expect(isAncestorActive(level1, "/a/b/c/d")).toBe(true);
    expect(isAncestorActive(level2, "/a/b/c/d")).toBe(true);
    expect(isAncestorActive(level3, "/a/b/c/d")).toBe(true);
  });

  test("activePath 不命中任何节点时返回 false", () => {
    expect(isAncestorActive(level1, "/not/matched")).toBe(false);
  });

  test("activePath 为空字符串时返回 false", () => {
    expect(isAncestorActive(level1, "")).toBe(false);
  });

  test("没有 children 的叶子节点，activePath 不匹配自身时返回 false", () => {
    expect(isAncestorActive(leaf4, "/other")).toBe(false);
  });
});
