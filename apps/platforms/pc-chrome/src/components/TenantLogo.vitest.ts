import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vitest";

import { configureStaticResourceBase } from "../resource-api";
import TenantLogo from "./TenantLogo";

afterEach(() => {
  configureStaticResourceBase(undefined);
});

describe("TenantLogo", () => {
  test("未提供 logoUrl 时使用旧仓默认 cube-icon（经静态资源前缀）", () => {
    configureStaticResourceBase("https://r.kaiheai.com");
    const wrapper = mount(TenantLogo, { props: { tenantName: "汉云科技" } });

    expect(wrapper.text()).toContain("汉云科技");
    const img = wrapper.find("img.pc-chrome-tenant-logo-img");
    expect(img.attributes("src")).toBe("https://r.kaiheai.com/v1/bimops-fe-web-migrate/icons/svgs/cube-icon.svg");
    expect(img.attributes("alt")).toBe("");

    wrapper.unmount();
  });

  test("提供 logoUrl 时优先渲染；/resource 路径按静态资源前缀解析", () => {
    configureStaticResourceBase("https://r.kaiheai.com");
    const wrapper = mount(TenantLogo, {
      props: { tenantName: "汉云科技", logoUrl: "/resource/v1/tenant/logo.png" },
    });
    expect(wrapper.find("img").attributes("src")).toBe("https://r.kaiheai.com/v1/tenant/logo.png");
    wrapper.unmount();
  });

  test("提供绝对 URL logoUrl 时不改写", () => {
    const wrapper = mount(TenantLogo, { props: { tenantName: "汉云科技", logoUrl: "https://example.com/logo.png" } });
    expect(wrapper.find("img").attributes("src")).toBe("https://example.com/logo.png");
    wrapper.unmount();
  });
});
