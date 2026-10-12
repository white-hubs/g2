import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vitest";

import UserDropdown from "./UserDropdown";

afterEach(() => {
  document.body.innerHTML = "";
});

async function openMenu(wrapper: ReturnType<typeof mount>) {
  await wrapper.find(".pc-chrome-user-dropdown-trigger").trigger("click");
  await flushPromises();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function menuItems(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(".ant-dropdown-menu-item")) as HTMLElement[];
}

function findMenuItem(label: string): HTMLElement | undefined {
  return menuItems().find((el) => el.textContent?.replace(/\s+/gu, "") === label);
}

const TRIANGLE_CARET = "M2.2 4.4h7.6L6 9.2z";

describe("UserDropdown", () => {
  test("渲染用户名与首字头像，菜单默认收起", () => {
    const wrapper = mount(UserDropdown, { props: { userName: "张三" }, attachTo: document.body });

    expect(wrapper.text()).toContain("张三");
    expect(document.body.querySelector("[data-testid='user-dropdown-menu']")).toBeNull();

    wrapper.unmount();
  });

  test("用户名旁下拉箭头为实心三角", () => {
    const wrapper = mount(UserDropdown, { props: { userName: "张三" }, attachTo: document.body });

    expect(wrapper.find(".pc-chrome-user-dropdown-caret path").attributes("d")).toBe(TRIANGLE_CARET);

    wrapper.unmount();
  });

  test("多企业时菜单含组织切换；单企业时不含", async () => {
    const single = mount(UserDropdown, { props: { userName: "张三" }, attachTo: document.body });
    await openMenu(single);
    expect(menuItems().map((el) => el.textContent?.replace(/\s+/gu, "") ?? "")).toEqual(["个人管理", "安全退出"]);
    single.unmount();

    const multi = mount(UserDropdown, {
      props: {
        userName: "张三",
        showTenantSwitch: true,
        tenants: [
          { id: "1", code: "a", name: "企业A", enabled: true },
          { id: "2", code: "b", name: "企业B", enabled: true },
        ],
        currentTenantCode: "a",
      },
      attachTo: document.body,
    });
    await openMenu(multi);
    expect(menuItems().map((el) => el.textContent?.replace(/\s+/gu, "") ?? "")).toEqual(["个人管理", "组织切换", "安全退出"]);
    multi.unmount();
  });

  test("点击个人管理 emit navigate-person-manage 并收起菜单", async () => {
    const wrapper = mount(UserDropdown, { props: { userName: "张三" }, attachTo: document.body });
    await openMenu(wrapper);

    findMenuItem("个人管理")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();

    expect(wrapper.emitted("navigatePersonManage")).toHaveLength(1);

    wrapper.unmount();
  });

  test("点击安全退出先弹出二次确认，确认后才真正 emit logout", async () => {
    const wrapper = mount(UserDropdown, { props: { userName: "张三" }, attachTo: document.body });
    await openMenu(wrapper);

    findMenuItem("安全退出")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();

    expect(wrapper.emitted("logout")).toBeUndefined();
    expect(document.body.textContent).toContain("是否退出登录？");

    const confirmButton = Array.from(document.body.querySelectorAll("button")).find(
      (btn) => btn.textContent?.replace(/\s+/gu, "") === "确定",
    );
    expect(confirmButton).toBeTruthy();
    await new DOMWrapper(confirmButton!).trigger("click");
    await flushPromises();

    expect(wrapper.emitted("logout")).toHaveLength(1);

    wrapper.unmount();
  });

  test("组织切换展示企业网格并回调 onSelectTenant", async () => {
    const onSelectTenant = vi.fn(async () => undefined);
    const wrapper = mount(UserDropdown, {
      props: {
        userName: "张三",
        showTenantSwitch: true,
        currentTenantCode: "a",
        tenants: [
          { id: "1", code: "a", name: "企业A", enabled: true },
          { id: "2", code: "b", name: "企业B", enabled: true },
        ],
        onSelectTenant,
      },
      attachTo: document.body,
    });
    await openMenu(wrapper);

    findMenuItem("组织切换")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();

    expect(document.body.textContent).toContain("选择企业");
    expect(document.body.textContent).toContain("企业A");
    expect(document.body.textContent).toContain("企业B");

    const cardB = Array.from(document.body.querySelectorAll(".pc-chrome-tenant-card")).find((el) => el.textContent?.includes("企业B"));
    expect(cardB).toBeTruthy();
    await new DOMWrapper(cardB!).trigger("click");
    await flushPromises();

    expect(onSelectTenant).toHaveBeenCalledWith(expect.objectContaining({ code: "b", name: "企业B" }));

    wrapper.unmount();
  });

  test("Esc 关闭已展开的用户菜单", async () => {
    const wrapper = mount(UserDropdown, { props: { userName: "张三" }, attachTo: document.body });
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
