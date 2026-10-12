import { message, ZhConfigProvider } from "@g2-platform/pc-ui";
import { type VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type Component, nextTick, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

import {
  CertConfigPage,
  CertificatesPage,
  CommitteePage,
  KeyPersonnelPage,
  OrgConfigPage,
  PersonnelPage,
  installSafetyPersonnelPages,
} from "../src";
import { PersonPickerModal } from "../src/components/person-picker-modal/person-picker-modal";
import { createFixture, pool } from "./fixtures";

let wrapper: VueWrapper | undefined;
let fixture = createFixture();
const settle = async () => {
  await flushPromises();
  await nextTick();
  await flushPromises();
};
async function open(component: Component, title: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component, meta: { title } }] });
  await router.push("/");
  await router.isReady();
  wrapper = mount(
    { render: () => h(ZhConfigProvider, null, { default: () => h(component) }) },
    { attachTo: document.body, global: { plugins: [router] } },
  );
  await settle();
  return wrapper;
}
async function click(text: string, within: ParentNode = document) {
  const button = [...within.querySelectorAll("button")].find((item) => item.textContent?.replace(/\s/g, "") === text);
  expect(button, `button ${text}`).toBeTruthy();
  button!.click();
  await settle();
}
const bodyText = () => document.body.textContent?.replace(/\s+/g, " ") || "";
beforeEach(() => {
  fixture = createFixture();
  vi.spyOn(console, "error");
  vi.spyOn(console, "warn");
  installSafetyPersonnelPages(fixture.client, fixture.dependencies);
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  message.destroy();
  document.body.innerHTML = "";
  const errors = vi.mocked(console.error).mock.calls.map((args) => String(args[0]));
  const warnings = vi.mocked(console.warn).mock.calls.map((args) => String(args[0]));
  vi.restoreAllMocks();
  expect(errors).toEqual([]);
  expect(warnings).toEqual([]);
});

describe("migrated legacy workflows", () => {
  test("personnel default category, category switching, search and add picker", async () => {
    await open(PersonnelPage, "人员管理");
    expect(bodyText()).toContain("张安全");
    expect(fixture.calls.find((call) => call.method === "pagePersons")?.args[0]).toMatchObject({ typeCode: "SAFETY", pageNumber: 1 });
    const tab = [...document.querySelectorAll('[role="tab"]')].find((item) => item.textContent === "特种作业人员") as HTMLElement;
    tab.click();
    await settle();
    expect(fixture.calls.filter((call) => call.method === "pagePersons").at(-1)?.args[0]).toMatchObject({ typeCode: "SPECIAL" });
    const search = wrapper!.find("input");
    await search.setValue(" 张安全 ");
    await click("查询");
    expect(fixture.calls.filter((call) => call.method === "pagePersons").at(-1)?.args[0]).toMatchObject({
      keyword: "张安全",
      typeCode: "SPECIAL",
    });
    await click("新增人员");
    expect(bodyText()).toContain("候选人员1");
    expect(fixture.calls.find((call) => call.method === "pagePersonPool")?.args[0]).toMatchObject({ typeCode: "SPECIAL" });
    const checkbox = document.querySelector('.ant-modal tbody input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    await settle();
    await click("确认关联", document.querySelector(".ant-modal")!);
    expect(fixture.calls.find((call) => call.method === "linkPersons")?.args[0]).toEqual({ userIds: ["u1"], typeCode: "SPECIAL" });
  });
  test("safety resume opens by personnel id and loads profile, certificates and timeline", async () => {
    await open(PersonnelPage, "人员管理");
    await click("安全履历");
    expect(bodyText()).toContain("安全履历 · 张安全");
    expect(bodyText()).toContain("注册安全工程师");
    for (const method of ["getPersonProfile", "getPersonCertificates", "getPersonResumeTimeline"]) {
      expect(fixture.calls.find((call) => call.method === method)?.args[0]).toBe("person-1");
    }
  });
  test("committee edit retains selected members and saves original ids", async () => {
    await open(CommitteePage, "安委会管理");
    await click("编辑");
    expect(bodyText()).toContain("张安全");
    await click("保存");
    expect(fixture.calls.find((call) => call.method === "updateCommittee")?.args).toEqual([
      "committee-1",
      expect.objectContaining({ committeeName: "安全生产委员会", deptId: "dept-1", userIds: ["u1"] }),
    ]);
  });
  test("certificate edit keeps dates, selected holder and review status", async () => {
    await open(CertificatesPage, "证书管理");
    await click("编辑");
    expect(bodyText()).toContain("编辑证书");
    expect([...document.querySelectorAll("input")].map((input) => input.value)).toContain("2026-01-01");
    await click("保存");
    expect(fixture.calls.find((call) => call.method === "updateCertificate")?.args).toEqual([
      "cert-1",
      expect.objectContaining({ userId: "u1", typeId: "type-1", issueDate: "2026-01-01", validEnd: "2026-12-31", reviewStatus: "已复审" }),
    ]);
  });
  test.each([
    [CertConfigPage, "证书配置", "职业资格"],
    [OrgConfigPage, "组织配置", "安全部"],
    [KeyPersonnelPage, "重点人员信息管理", "李重点"],
  ] as const)("%s renders legacy data", async (component, title, label) => {
    await open(component, title);
    expect(bodyText()).toContain(label);
  });
  test("person picker carries selection across pages", async () => {
    fixture.replies.pagePersonPool = { records: [pool[0]], total: 20 };
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: PersonPickerModal }] });
    await router.push("/");
    await router.isReady();
    wrapper = mount(PersonPickerModal, { props: { open: false }, attachTo: document.body, global: { plugins: [router] } });
    await wrapper.setProps({ open: true });
    await settle();
    const first = document.querySelector('.ant-modal tbody input[type="checkbox"]') as HTMLInputElement;
    first.click();
    await settle();
    fixture.replies.pagePersonPool = { records: [pool[1]], total: 20 };
    (document.querySelector('.ant-modal .ant-pagination-item[title="2"]') as HTMLElement).click();
    await settle();
    expect(fixture.calls.filter((call) => call.method === "pagePersonPool").at(-1)?.args[0]).toMatchObject({ pageNumber: 2 });
    (document.querySelector('.ant-modal tbody input[type="checkbox"]') as HTMLInputElement).click();
    await settle();
    await click("确定", document.querySelector(".ant-modal")!);
    expect(wrapper.emitted("confirm")?.[0]?.[0]).toMatchObject([
      { personId: "u1", name: "候选人员1" },
      { personId: "u2", name: "候选人员2" },
    ]);
  });
  test("key personnel details and report submission retain person id and content", async () => {
    await open(KeyPersonnelPage, "重点人员信息管理");
    await click("详情");
    expect(bodyText()).toContain("人员档案详情");
    expect(bodyText()).toContain("巡查正常");
    expect(fixture.calls.find((call) => call.method === "getKeyPersonDetail")?.args).toEqual([8]);
    (document.querySelector(".ant-drawer-close") as HTMLButtonElement).click();
    await settle();
    await click("上报");
    const textarea = document.querySelector(".ant-modal textarea") as HTMLTextAreaElement;
    textarea.value = "  回归测试监管记录  ";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    await click("确定", document.querySelector(".ant-modal")!);
    expect(fixture.calls.find((call) => call.method === "createKeyPersonReport")?.args).toEqual([
      8,
      { content: "回归测试监管记录", reportAttachmentFileIds: [] },
    ]);
  });
  test("organization creation submits name and refreshes the tree", async () => {
    await open(OrgConfigPage, "组织配置");
    await click("新增");
    const input = document.querySelector(".ant-modal input") as HTMLInputElement;
    input.value = "测试班组";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    await click("确定", document.querySelector(".ant-modal")!);
    expect(fixture.calls.find((call) => call.method === "createOrgNode")?.args).toEqual([{ name: "测试班组" }]);
    expect(fixture.calls.filter((call) => call.method === "getOrgTree").length).toBe(2);
  });
  test("personnel export downloads a Blob using current category filters", async () => {
    const createUrl = vi.fn(() => "blob:test-export"),
      revokeUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeUrl });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await open(PersonnelPage, "人员管理");
    await click("导出");
    expect(fixture.calls.find((call) => call.method === "exportPersons")?.args[0]).toMatchObject({
      typeCode: "SAFETY",
      pageNumber: 1,
      pageSize: 10000,
    });
    expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeUrl).toHaveBeenCalledWith("blob:test-export");
  });
});
