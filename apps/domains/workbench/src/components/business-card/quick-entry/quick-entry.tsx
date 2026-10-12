import { AppstoreOutlined } from "@ant-design/icons-vue";
import { defineComponent, onBeforeUnmount, onMounted, reactive } from "vue";

import { cubeAppService, cubeOuaaService } from "@/api/server";
import { buildApplicationIconMap, resolveFrequentMenuIcon, type ApplicationIconMap } from "@/context/application-icons";
import { Empty, Spin, message } from "@/pc-ui-runtime";
import { navigateToApplication } from "@/utils/navigate";
import { resolveStaticResourceUrl } from "@/utils/resource";

import "./quick-entry.less";

type FrequentMenu = {
  id?: string | number;
  applicationCode?: string;
  applicationName?: string;
  path?: string;
  name?: string;
  icon?: string;
  [k: string]: unknown;
};

function menuKey(menu: FrequentMenu): string {
  return String(menu.id ?? menu.path ?? menu.name ?? "");
}

export default defineComponent({
  name: "QuickEntry",
  setup() {
    let navigationUnlockTimer: ReturnType<typeof setTimeout> | undefined;
    const state = reactive({
      list: [] as FrequentMenu[],
      applicationIcons: {} as ApplicationIconMap,
      loading: false,
      navigatingMenuId: null as FrequentMenu["id"] | null,
      /** 图标 URL 加载失败时回退到主题色 AppstoreOutlined，避免裂图。 */
      failedIconKeys: {} as Record<string, true>,
    });

    const getData = async (): Promise<void> => {
      state.loading = true;
      try {
        const [menus, applicationGroups] = await Promise.all([
          cubeOuaaService.getFrequentMenus() as Promise<FrequentMenu[]>,
          cubeAppService.getApplicationGroups(),
        ]);
        const applicationIcons = buildApplicationIconMap(applicationGroups);
        state.list = (Array.isArray(menus) ? menus : []).map((menu) => ({
          ...menu,
          icon: menu.icon ? resolveStaticResourceUrl(String(menu.icon)) : menu.icon,
        }));
        state.applicationIcons = Object.fromEntries(
          Object.entries(applicationIcons).map(([code, icon]) => [code, resolveStaticResourceUrl(icon)]),
        );
        state.failedIconKeys = {};
      } catch {
        state.list = [];
        state.applicationIcons = {};
        message.error("快捷入口加载失败，请稍后重试");
      } finally {
        state.loading = false;
      }
    };

    const goPage = (menu: FrequentMenu): void => {
      if (state.navigatingMenuId !== null) return;

      state.navigatingMenuId = menu.id;
      navigateToApplication({
        code: menu.applicationCode,
        path: menu.path,
      });
      navigationUnlockTimer = setTimeout(() => {
        state.navigatingMenuId = null;
      }, 1000);
    };

    const markIconFailed = (menu: FrequentMenu): void => {
      state.failedIconKeys[menuKey(menu)] = true;
    };

    const shouldUseFallback = (menu: FrequentMenu): boolean => {
      return !menu.icon || !!state.failedIconKeys[menuKey(menu)];
    };

    onMounted(() => {
      void getData();
    });

    onBeforeUnmount(() => {
      if (navigationUnlockTimer) {
        clearTimeout(navigationUnlockTimer);
      }
    });

    return () => (
      <aside class="quick-entry">
        <h2>业务快捷入口</h2>
        <div class="quick-entry__content">
          {state.loading ? (
            <div class="quick-entry__state">
              <Spin tip="快捷入口加载中" />
            </div>
          ) : state.list.length > 0 ? (
            <div class={["quick-entry__list", { "quick-entry__list--full": state.list.length === 6 }]}>
              {state.list.map((menu) => {
                const icon = resolveFrequentMenuIcon(menu, state.applicationIcons);
                const useFallback = !icon || shouldUseFallback({ ...menu, icon });
                return (
                  <button
                    key={menu.id}
                    class="quick-entry__item"
                    type="button"
                    title={`${menu.name}${menu.applicationName ? ` · ${menu.applicationName}` : ""}`}
                    disabled={state.navigatingMenuId !== null}
                    onClick={() => goPage(menu)}
                  >
                    <span class={["quick-entry__icon", { "quick-entry__icon--fallback": useFallback }]}>
                      {useFallback ? (
                        <AppstoreOutlined />
                      ) : (
                        <img
                          src={icon}
                          alt=""
                          onError={() => {
                            markIconFailed(menu);
                          }}
                        />
                      )}
                    </span>
                    <span class="quick-entry__label">
                      <strong>{menu.name}</strong>
                      <small>{menu.applicationName}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div class="quick-entry__state">
              <Empty description="暂无快捷入口" />
            </div>
          )}
        </div>
      </aside>
    );
  },
});
