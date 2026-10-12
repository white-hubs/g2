import type { NavigationMenuNode } from "@g2-shell/pc/stores/portal-navigation";
import { type PropType, computed, defineComponent, ref, watch } from "vue";

import { Menu, MenuItem, SubMenu } from "../pc-ui-runtime";
import { resolveStaticResourceUrl } from "../resource-api";
import { nextAccordionOpenKeys } from "./side-menu-open-keys";
import SideMenu from "./SideMenu";

import "./SideMenu.css";

/**
 * 纯函数：判断 node 自身或其任意子孙节点的 path 是否等于 activePath。
 */
export function isAncestorActive(node: NavigationMenuNode, activePath: string): boolean {
  if (!activePath) {
    return false;
  }
  if (node.path === activePath) {
    return true;
  }
  return (node.children ?? []).some((child) => isAncestorActive(child, activePath));
}

export default defineComponent({
  name: "SideMenu",
  props: {
    menuTree: { type: Array as PropType<NavigationMenuNode[]>, required: true },
    activePath: { type: String, required: true },
    /** 当前真实路由；隐藏详情页的 activePath 可能与列表页相同，仍需据此重新同步展开链。 */
    currentPath: { type: String, default: "" },
    depth: { type: Number, default: 0 },
    keyPrefix: { type: String, default: "" },
    collapsed: { type: Boolean, default: false },
  },
  emits: ["navigate", "collapsedChange"],
  setup(props, { emit }) {
    const collapsedState = ref(false);

    function handleNavigate(path: string | undefined): void {
      if (path) {
        emit("navigate", path);
      }
    }

    function nodeKey(node: NavigationMenuNode): string {
      return `${props.keyPrefix}${node.domainName}:${node.path ?? node.label}`;
    }

    function collectActiveGroupKeys(nodes: NavigationMenuNode[], activePath: string, keyPrefix: string): string[] {
      const keys: string[] = [];
      for (const node of nodes) {
        if (!node.children?.length) {
          continue;
        }
        const key = `${keyPrefix}${node.domainName}:${node.path ?? node.label}`;
        if (isAncestorActive(node, activePath)) {
          keys.push(key, ...collectActiveGroupKeys(node.children, activePath, `${key}/`));
        }
      }
      return keys;
    }

    const selectedKeys = computed(() => (props.activePath ? [props.activePath] : []));
    const openKeysState = ref<string[]>(collectActiveGroupKeys(props.menuTree, props.activePath, props.keyPrefix));
    const isCollapsed = computed(() => (props.depth === 0 ? collapsedState.value : props.collapsed));

    watch(
      [() => props.activePath, () => props.currentPath, () => props.menuTree],
      ([path]) => {
        if (isCollapsed.value) {
          return;
        }
        // 真实路由或异步菜单树变化时，都按 activePath 恢复完整祖先链。
        // 详情页和列表页可共享 activePath，不能只监听 activePath 本身。
        openKeysState.value = collectActiveGroupKeys(props.menuTree, path, props.keyPrefix);
      },
      { deep: true, immediate: true },
    );

    function handleOpenKeysUpdate(keys: (string | number)[]): void {
      openKeysState.value = nextAccordionOpenKeys(openKeysState.value, keys.map(String));
    }

    function toggleCollapsed(): void {
      collapsedState.value = !collapsedState.value;
      if (collapsedState.value) {
        openKeysState.value = [];
      } else {
        openKeysState.value = collectActiveGroupKeys(props.menuTree, props.activePath, props.keyPrefix);
      }
      emit("collapsedChange", collapsedState.value);
    }

    /**
     * 对齐原系统 menuList：仅一级应用入口展示 icon；二级及以下纯文案。
     * 无 icon URL 时不画色块占位（原系统也是「有图才显示」）。
     */
    function renderIcon(node: NavigationMenuNode) {
      if (props.depth !== 1 || !node.icon) {
        return null;
      }
      return (
        <img
          class="pc-chrome-side-menu-icon pc-chrome-side-menu-icon--image"
          src={resolveStaticResourceUrl(node.icon)}
          alt=""
          aria-hidden="true"
        />
      );
    }

    function renderTitle(node: NavigationMenuNode) {
      return (
        <span class="pc-chrome-side-menu-title">
          {renderIcon(node)}
          {props.collapsed ? null : <span class="pc-chrome-side-menu-label">{node.label}</span>}
        </span>
      );
    }

    return () => {
      if (props.depth === 0) {
        return (
          <div class={["pc-chrome-side-menu-shell", collapsedState.value ? "pc-chrome-side-menu-shell--collapsed" : ""]}>
            <Menu
              class="pc-chrome-side-menu"
              mode="inline"
              inlineCollapsed={collapsedState.value}
              selectedKeys={selectedKeys.value}
              openKeys={collapsedState.value ? [] : openKeysState.value}
              onUpdate:openKeys={handleOpenKeysUpdate}
            >
              <SideMenu
                menuTree={props.menuTree}
                activePath={props.activePath}
                keyPrefix={props.keyPrefix}
                depth={1}
                collapsed={collapsedState.value}
                onNavigate={handleNavigate}
              />
            </Menu>
            <button
              type="button"
              class={["pc-chrome-side-menu-fold", collapsedState.value ? "pc-chrome-side-menu-fold--collapsed" : ""]}
              data-testid="side-menu-fold"
              aria-label={collapsedState.value ? "展开侧栏" : "折叠侧栏"}
              aria-pressed={collapsedState.value}
              onClick={toggleCollapsed}
            >
              <svg class="pc-chrome-side-menu-fold__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H11V5h10v14zM3 5h6v14H3V5z"
                />
              </svg>
            </button>
          </div>
        );
      }

      const nodes = props.depth > 0 ? props.menuTree : [];

      return (
        <>
          {nodes.map((node) =>
            node.children?.length ? (
              <SubMenu
                key={nodeKey(node)}
                class={["pc-chrome-side-menu-group", isAncestorActive(node, props.activePath) ? "pc-chrome-side-menu-group--active" : ""]}
                v-slots={{
                  title: () => renderTitle(node),
                }}
              >
                <SideMenu
                  menuTree={node.children}
                  activePath={props.activePath}
                  keyPrefix={`${nodeKey(node)}/`}
                  depth={props.depth + 1}
                  collapsed={props.collapsed}
                  onNavigate={handleNavigate}
                />
              </SubMenu>
            ) : (
              <MenuItem
                key={nodeKey(node)}
                class={["pc-chrome-side-menu-item", props.activePath === node.path ? "pc-chrome-side-menu-item--active" : ""]}
                onClick={() => handleNavigate(node.path)}
                title={node.label}
              >
                {renderTitle(node)}
              </MenuItem>
            ),
          )}
        </>
      );
    };
  },
});
