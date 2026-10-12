import { describe, expect, test } from "bun:test";

import { PERSON_MANAGE_FIRST_PATH, PERSON_MANAGE_MENU_CONTRIBUTION } from "./person-manage-menu";

describe("PERSON_MANAGE_MENU_CONTRIBUTION", () => {
  test("对齐旧仓：一级「个人管理」+ 4 个子菜单 path", () => {
    expect(PERSON_MANAGE_MENU_CONTRIBUTION).toEqual([
      {
        label: "个人管理",
        icon: "/resource/app-icons/人事管理/main.png",
        children: [
          { label: "个人资料", path: "/portal/legacy-personal/info" },
          { label: "修改密码", path: "/portal/legacy-personal/modify-password" },
          { label: "我的企业", path: "/portal/legacy-personal/my-tenant" },
          { label: "消息免打扰", path: "/portal/legacy-personal/not-disturb" },
        ],
      },
    ]);
    expect(PERSON_MANAGE_FIRST_PATH).toBe("/portal/legacy-personal/info");
  });
});
