import type { RuntimeCommonDiagnostic } from "@g2-runtime/common-loader";
import { type PropType, computed, defineComponent, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import { parsePortalMicroAppName, syncLegacyApplicationForMicroApp } from "./legacy-qiankun-auth";
import { resolveSideMenuActivePath } from "./resolve-side-menu-active-path";
import RuntimeCommonDiagnostics from "./RuntimeCommonDiagnostics";
import { usePortalNavigationStore } from "./stores/portal-navigation";
import type { QiankunMountStatus } from "./stores/qiankun-mount-status";
import { syncNavFromPath } from "./sync-nav-from-path";
import type { OutsideTenantItem, TenantMineItem } from "./tenant-mine";
import { WORKBENCH_GROUP_KEY, isWorkbenchPath, resolveWorkbenchPath } from "./workbench-group";

import styles from "./App.module.css";

function reloadPage(): void {
  window.location.reload();
}

export { resolveSideMenuActivePath } from "./resolve-side-menu-active-path";

export default defineComponent({
  name: "ShellPcApp",
  props: {
    topBarSlot: { type: null as unknown as PropType<unknown>, required: false },
    sideMenuSlot: { type: null as unknown as PropType<unknown>, required: false },
    /** @deprecated 壳层不再渲染多标签栏；保留 prop 仅为兼容旧调用方，传入也会被忽略。 */
    tabsSlot: { type: null as unknown as PropType<unknown>, required: false },
    tenantName: { type: String, default: "" },
    userName: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    appLoadStatus: { type: String as PropType<QiankunMountStatus>, default: "idle" },
    onUserLogout: { type: Function as PropType<() => void>, required: false },
    onNavigatePersonManage: { type: Function as PropType<() => void>, required: false },
    /** 进入顶栏分组时按需拉 OUAA menus；已加载则立刻 resolve。 */
    ensureGroupMenus: { type: Function as PropType<(groupKey: string) => Promise<void>>, required: false },
    /** 深链 `/portal/{name}` → 分组 key，供 syncNavFromPath 只拉一个 menus（有映射时）。 */
    resolveGroupKeyForAppRef: { type: Function as PropType<(appRef: string) => string | undefined>, required: false },
    /** 顶栏分组/索引就绪后再 sync，避免空索引时过早顺序扫描。 */
    waitNavReady: { type: Function as PropType<() => Promise<void>>, required: false },
    tenants: { type: Array as PropType<TenantMineItem[]>, default: () => [] },
    outsideTenants: { type: Array as PropType<OutsideTenantItem[]>, default: () => [] },
    currentTenantCode: { type: String, default: "" },
    showTenantSwitch: { type: Boolean, default: false },
    runtimeCommonDiagnostics: { type: Array as PropType<RuntimeCommonDiagnostic[]>, default: () => [] },
    onSelectTenant: {
      type: Function as PropType<(tenant: TenantMineItem) => void | Promise<void>>,
      required: false,
    },
  },
  setup(props) {
    const navStore = usePortalNavigationStore();
    const route = useRoute();
    const router = useRouter();

    const isFullPageRoute = computed(() => route.name === "login" || route.name === "verifyAuth" || route.meta.fullPage === true);
    /** 工作台：无侧栏；且与门户容器互斥显示（避免两个 absolute 容器叠在一起）。 */
    const isWorkbenchRoute = computed(() => isWorkbenchPath(route.path));
    /** MF Domain（`/d/...`）：走 RouterView，禁止盖上空白 `#appContainer`（否则白屏）。 */
    const isMfDomainRoute = computed(() => route.path === "/d" || route.path.startsWith("/d/"));
    /** 隐藏的新增/编辑/详情路由继续高亮并展开其所属菜单。 */
    const sideMenuActivePath = computed<string>((previousMenuPath) =>
      resolveSideMenuActivePath(route.path, route.meta, {
        query: route.query,
        previousMenuPath,
        resolveRoute: (location) => {
          const resolved = router.resolve(location);
          return resolved.matched.length > 0 ? resolved : undefined;
        },
        isMenuPath: (path) => navStore.findByPath(path)?.path === path,
      }),
    );

    watch(
      [() => route.path, () => sideMenuActivePath.value],
      ([path, menuPath]) => {
        // TODO(ADR-0031): 迁完后删除——进门户路径时补齐 GH-currentApplication / GH-currentMenus（含 alias）
        const portalAppName = parsePortalMicroAppName(path);
        const syncLegacyMenus = (): void => {
          if (!portalAppName) {
            return;
          }
          syncLegacyApplicationForMicroApp(sessionStorage, portalAppName, navStore.getLegacyMenusForApp(portalAppName));
        };
        syncLegacyMenus();
        if (!props.ensureGroupMenus) {
          return;
        }
        // 等分组索引就绪后再 sync，避免空索引走顺序扫描打爆 menus；await 后再写 session。
        void (async () => {
          await props.waitNavReady?.();
          // 隐藏详情/编辑页按所属菜单路径定位应用分组，保证直接输入深链时也能切到正确侧栏。
          await syncNavFromPath(menuPath, {
            nav: navStore,
            ensureGroupMenus: props.ensureGroupMenus!,
            resolveGroupKeyForAppRef: props.resolveGroupKeyForAppRef,
          });
          syncLegacyMenus();
        })();
      },
      { immediate: true },
    );

    function navigateTo(path: string): void {
      void router.push(path);
    }

    async function handleSelectGroup(key: string): Promise<void> {
      navStore.setActiveGroup(key);
      await props.ensureGroupMenus?.(key);
      // 顶栏切换分组：进该组默认首条菜单路由（侧栏分组标题仍只展开，不在此路径）。
      if (key === WORKBENCH_GROUP_KEY) {
        navigateTo(resolveWorkbenchPath());
        return;
      }
      const path = navStore.firstPathInGroup(key);
      if (path) {
        navigateTo(path);
      }
    }

    return () => {
      const TopBar = props.topBarSlot as unknown as null | ReturnType<typeof defineComponent>;
      const SideMenu = props.sideMenuSlot as unknown as null | ReturnType<typeof defineComponent>;
      const navLoading = navStore.isNavLoading;
      const fullPage = isFullPageRoute.value;
      // 工作台已迁 MF Domain：RouterView 渲染内容；仅遗留 qiankun 工作台路径才激活 #workbench-container。
      const showWorkbenchHost = !fullPage && isWorkbenchRoute.value && !isMfDomainRoute.value;
      // qiankun 门户宿主：非工作台且非 MF 域。`/d/*` 必须 idle，否则 absolute 白底盖住 RouterView。
      const showPortalHost = !fullPage && !isWorkbenchRoute.value && !isMfDomainRoute.value;
      // MF 工作台：RouterView 长页需在 shell-pc-content 滚动（对齐旧 #workbench-container）。
      const mfWorkbenchScroll = !fullPage && isWorkbenchRoute.value && isMfDomainRoute.value;

      return (
        <div class={["shell-pc", styles.root, fullPage ? ["shell-pc--full-page", styles.fullPage] : null]}>
          {!fullPage ? (
            <a
              href="#main-content"
              data-testid="skip-to-main"
              class="tw:g2-focus-ring tw:sr-only tw:focus:not-sr-only tw:focus:fixed tw:focus:left-3 tw:focus:top-3 tw:focus:z-50 tw:focus:rounded tw:focus:bg-white tw:focus:px-3 tw:focus:py-2 tw:focus:text-sm tw:focus:text-slate-900 tw:focus:shadow"
            >
              跳到主内容
            </a>
          ) : null}
          <RuntimeCommonDiagnostics diagnostics={props.runtimeCommonDiagnostics} />
          {!fullPage && TopBar ? (
            <TopBar
              tenantName={/^\d+$/u.test(props.tenantName) || !props.tenantName ? "华威集团-ghy" : props.tenantName}
              userName={props.userName || "用户"}
              logoUrl={props.logoUrl || undefined}
              displayGroups={navStore.applicationEntryGroups}
              activeGroupKey={navStore.activeGroupKey}
              menuTree={navStore.menuTree}
              onNavigate={navigateTo}
              onSelectGroup={(key: string) => void handleSelectGroup(key)}
              onLogout={() => props.onUserLogout?.()}
              onNavigatePersonManage={() => props.onNavigatePersonManage?.()}
              tenants={props.tenants}
              outsideTenants={props.outsideTenants}
              currentTenantCode={props.currentTenantCode}
              showTenantSwitch={props.showTenantSwitch}
              onSelectTenant={props.onSelectTenant}
            />
          ) : null}
          <div class={["shell-pc-body", fullPage ? styles.fullPageBody : styles.body]}>
            {!fullPage && SideMenu && !isWorkbenchRoute.value ? (
              <aside class={["shell-pc-side", styles.side]}>
                <SideMenu
                  menuTree={navStore.activeMenuTree}
                  activePath={sideMenuActivePath.value}
                  currentPath={route.fullPath}
                  onNavigate={navigateTo}
                />
              </aside>
            ) : null}
            <div
              id="main-content"
              tabindex={-1}
              class={[
                "shell-pc-content",
                styles.content,
                fullPage ? styles.fullPageContent : null,
                mfWorkbenchScroll ? styles.contentScroll : null,
                "tw:outline-none",
              ]}
            >
              <RouterView />
              {/* 两容器始终挂在同一父节点（qiankun LOADING 同步查 DOM）；登录全页也不可拆掉。 */}
              <div id="appContainer" class={[styles.hostContainer, showPortalHost ? styles.hostActive : styles.hostIdle]} />
              <div id="workbench-container" class={[styles.hostContainer, showWorkbenchHost ? styles.hostActive : styles.hostIdle]} />
              {!fullPage && !isMfDomainRoute.value && props.appLoadStatus === "loading" ? (
                <div id="appContainerLoading" class={["shell-pc-app-status", styles.appStatus]}>
                  <span class={["shell-pc-spinner", styles.spinner]} aria-hidden="true" />
                  <span>应用加载中...</span>
                </div>
              ) : null}
              {!fullPage && !isMfDomainRoute.value && props.appLoadStatus === "error" ? (
                <div id="appContainerError" class={["shell-pc-app-status", styles.appStatus]}>
                  <span>应用加载失败，请刷新重试或联系运维人员处理</span>
                  <button type="button" class={["shell-pc-app-error-reload", styles.errorReload]} onClick={reloadPage}>
                    刷新
                  </button>
                </div>
              ) : null}
            </div>
            {!fullPage && navLoading ? (
              <div data-testid="nav-loading" class={["shell-pc-nav-loading", styles.navLoading]}>
                <span class={["shell-pc-spinner", styles.spinner]} aria-hidden="true" />
                <span>{navStore.isGroupsLoading ? "分组加载中..." : "菜单加载中..."}</span>
              </div>
            ) : null}
          </div>
        </div>
      );
    };
  },
});
