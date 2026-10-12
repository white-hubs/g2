import { type Component, type PropType, defineComponent, h } from "vue";

import { topBarActionsRegistry } from "../top-bar-actions-registry";
import ApplicationEntry from "./ApplicationEntry";
import ChangeSkinModal from "./ChangeSkinModal";
import ChooseTerminalDropdown from "./ChooseTerminalDropdown";
import SearchApplication from "./SearchApplication";
import TenantLogo from "./TenantLogo";
import type { ApplicationEntryGroup, NavigationMenuNode, OutsideTenantOption, TenantOption, TerminalEntry } from "./top-bar-types";
import UserDropdown from "./UserDropdown";

import "./TopBar.css";

export default defineComponent({
  name: "TopBar",
  props: {
    tenantName: { type: String, required: true },
    userName: { type: String, required: true },
    logoUrl: { type: String, required: false },
    displayGroups: { type: Array as PropType<ApplicationEntryGroup[]>, default: () => [] },
    activeGroupKey: { type: String, default: "" },
    menuTree: { type: Array as PropType<NavigationMenuNode[]>, default: () => [] },
    terminalEntries: { type: Array as PropType<TerminalEntry[]>, required: false },
    tenants: { type: Array as PropType<TenantOption[]>, default: () => [] },
    outsideTenants: { type: Array as PropType<OutsideTenantOption[]>, default: () => [] },
    currentTenantCode: { type: String, default: "" },
    showTenantSwitch: { type: Boolean, default: false },
    onSelectTenant: {
      type: Function as PropType<(tenant: TenantOption) => void | Promise<void>>,
      required: false,
    },
  },
  emits: ["logout", "navigatePersonManage", "navigate", "selectGroup", "skinChange", "selectTerminal"],
  setup(props, { emit }) {
    return () => {
      // 每次渲染读 registry，便于 ADR-0053 占位→真入口同 id 替换后立刻生效。
      const actions = topBarActionsRegistry.list();
      return (
        <div class="pc-chrome-top-bar">
          <div class="pc-chrome-top-bar-left">
            <TenantLogo tenantName={props.tenantName} logoUrl={props.logoUrl} />
            <ApplicationEntry
              groups={props.displayGroups}
              activeKey={props.activeGroupKey}
              onSelectGroup={(key: string) => emit("selectGroup", key)}
            />
          </div>
          <div class="pc-chrome-top-bar-right">
            {actions.map((action) => h(action.component as Component, { key: action.id }))}
            <SearchApplication menuTree={props.menuTree} onNavigate={(path: string) => emit("navigate", path)} />
            <ChangeSkinModal onSkinChange={(key: string) => emit("skinChange", key)} />
            <span class="pc-chrome-top-bar-divider"></span>
            <ChooseTerminalDropdown
              entries={props.terminalEntries}
              onSelectTerminal={(entry: TerminalEntry) => emit("selectTerminal", entry)}
            />
            <span class="pc-chrome-top-bar-divider"></span>
            <UserDropdown
              userName={props.userName}
              tenants={props.tenants}
              outsideTenants={props.outsideTenants}
              currentTenantCode={props.currentTenantCode}
              showTenantSwitch={props.showTenantSwitch}
              onSelectTenant={props.onSelectTenant}
              onLogout={() => emit("logout")}
              onNavigatePersonManage={() => emit("navigatePersonManage")}
            />
          </div>
        </div>
      );
    };
  },
});
