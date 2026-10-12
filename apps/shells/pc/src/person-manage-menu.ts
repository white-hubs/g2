import type { MenuContributionNode } from "@g2-composition/contract";

/**
 * 迁移自旧仓 `src/routes/person-manage-menus.ts` 的 `personManageMenus`。
 * 旧仓侧栏以应用名「个人管理」为一级 SubMenu，其下 4 个子菜单；icon 挂在应用级。
 *
 * 注册为 `domainName: "person-manage"` 的 menuContribution（ADR-0036）。
 * 不进顶栏横向分组（见 `HIDDEN_TOP_BAR_DOMAINS`）；从用户下拉进入后由
 * `syncNavFromPath` 把 `activeGroupKey` 切到本域，侧栏才展示这棵树。
 */
export const PERSON_MANAGE_DOMAIN = "person-manage";

const PERSON_MANAGE_ICON = "/resource/app-icons/人事管理/main.png";

export const PERSON_MANAGE_MENU_CONTRIBUTION: MenuContributionNode[] = [
  {
    label: "个人管理",
    icon: PERSON_MANAGE_ICON,
    children: [
      { label: "个人资料", path: "/portal/legacy-personal/info" },
      { label: "修改密码", path: "/portal/legacy-personal/modify-password" },
      { label: "我的企业", path: "/portal/legacy-personal/my-tenant" },
      { label: "消息免打扰", path: "/portal/legacy-personal/not-disturb" },
    ],
  },
];

/** 用户下拉 / PERSON-MANAGE intent 默认进入的首条子菜单。 */
export const PERSON_MANAGE_FIRST_PATH = PERSON_MANAGE_MENU_CONTRIBUTION[0]?.children?.[0]?.path ?? "/portal/legacy-personal/info";
