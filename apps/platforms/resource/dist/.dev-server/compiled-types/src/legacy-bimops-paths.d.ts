/**
 * 旧仓 bimops 静态资源相对路径（始终以 `/resource` 开头）。
 * 运行时经 `resolveStaticResourceUrl` 按注册表 `staticResourceBase` 改写到 CDN，勿在业务代码里拼 CDN 域名。
 */
export declare const BIMOPS_FE_WEB_MIGRATE_RESOURCE_ROOT = "/resource/v1/bimops-fe-web-migrate";
export declare const BIMOPS_ICON_SEARCH = "/resource/v1/bimops-fe-web-migrate/icons/image/icon-search.png";
export declare const BIMOPS_ICON_SKIN = "/resource/v1/bimops-fe-web-migrate/icons/image/icon-skin.png";
export declare const BIMOPS_AI_ENTRY_ICON = "/resource/v1/bimops-fe-web-migrate/components/NavTopLink/components/ai-agent-entry/entry-png.png";
/** 顶栏默认品牌标（无租户 logo 时），对齐旧仓 tenant-logo.vue 的 CubeIcon。 */
export declare const BIMOPS_CUBE_ICON = "/resource/v1/bimops-fe-web-migrate/icons/svgs/cube-icon.svg";
/** 应用图标：`/resource/app-icons/{应用名}/main.png`（对齐旧仓 menuList `item.icon`）。 */
export declare function bimopsAppIconPath(appFolderName: string, fileName?: string): string;
//# sourceMappingURL=legacy-bimops-paths.d.ts.map