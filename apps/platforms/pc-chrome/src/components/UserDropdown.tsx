import { type PropType, computed, defineComponent, ref } from "vue";

import { Avatar, Dropdown, Menu, MenuItem, Modal, message } from "../pc-ui-runtime";
import type { OutsideTenantOption, TenantOption } from "./top-bar-types";

import "./UserDropdown.css";

export default defineComponent({
  name: "UserDropdown",
  props: {
    userName: { type: String, required: true },
    tenants: { type: Array as PropType<TenantOption[]>, default: () => [] },
    outsideTenants: { type: Array as PropType<OutsideTenantOption[]>, default: () => [] },
    currentTenantCode: { type: String, default: "" },
    /** 多于 1 个企业时显示「组织切换」（对齐旧仓；列表由 Shell 进主应用时预拉）。 */
    showTenantSwitch: { type: Boolean, default: false },
    /** Shell 切换租户（refresh_token）；失败时 throw，由本组件 message.error。 */
    onSelectTenant: {
      type: Function as PropType<(tenant: TenantOption) => void | Promise<void>>,
      required: false,
    },
  },
  emits: ["logout", "navigatePersonManage"],
  setup(props, { emit }) {
    const open = ref(false);
    const tenantSwitchVisible = ref(false);
    const logoutConfirmVisible = ref(false);
    const switching = ref(false);

    const initial = computed(() => props.userName.trim().charAt(0) || "?");

    function handleMenuClick(info: { key: string | number }): void {
      const key = String(info.key);
      open.value = false;
      if (key === "person-manage") {
        emit("navigatePersonManage");
        return;
      }
      if (key === "tenant-switch") {
        tenantSwitchVisible.value = true;
        return;
      }
      if (key === "logout") {
        logoutConfirmVisible.value = true;
      }
    }

    function confirmLogout(): void {
      logoutConfirmVisible.value = false;
      emit("logout");
    }

    async function handleSelectTenant(item: TenantOption): Promise<void> {
      if (!item.enabled || switching.value) {
        return;
      }
      if (item.code === props.currentTenantCode && !item.webSiteUrl) {
        tenantSwitchVisible.value = false;
        return;
      }
      switching.value = true;
      try {
        await props.onSelectTenant?.(item);
        tenantSwitchVisible.value = false;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "切换企业失败");
      } finally {
        switching.value = false;
      }
    }

    function handleOutsideTenant(item: OutsideTenantOption): void {
      if (item.path) {
        window.open(item.path);
      }
      tenantSwitchVisible.value = false;
    }

    return () => (
      <div class="pc-chrome-user-dropdown">
        <Dropdown
          trigger={["click"]}
          open={open.value}
          onUpdate:open={(value: boolean) => {
            open.value = value;
          }}
          placement="bottomRight"
          v-slots={{
            overlay: () => (
              <Menu class="pc-chrome-user-dropdown-menu" data-testid="user-dropdown-menu" onClick={handleMenuClick}>
                <MenuItem key="person-manage">个人管理</MenuItem>
                {props.showTenantSwitch ? <MenuItem key="tenant-switch">组织切换</MenuItem> : null}
                <MenuItem key="logout" class="pc-chrome-user-dropdown-danger">
                  安全退出
                </MenuItem>
              </Menu>
            ),
          }}
        >
          <button type="button" class="pc-chrome-user-dropdown-trigger">
            <Avatar size="small">{initial.value}</Avatar>
            <span class="pc-chrome-user-dropdown-name">{props.userName}</span>
            <svg class="pc-chrome-user-dropdown-caret" viewBox="0 0 12 12" aria-hidden="true">
              <path fill="currentColor" d="M2.2 4.4h7.6L6 9.2z" />
            </svg>
          </button>
        </Dropdown>

        <Modal
          open={tenantSwitchVisible.value}
          onUpdate:open={(value: boolean) => {
            tenantSwitchVisible.value = value;
          }}
          title="选择企业"
          width={1000}
          footer={null}
          centered
          destroyOnClose
          class="pc-chrome-tenant-modal"
        >
          {props.tenants.length === 0 && props.outsideTenants.length === 0 ? <p data-testid="tenant-empty">暂无可用企业</p> : null}
          <div class="pc-chrome-tenant-grid" data-testid="tenant-grid">
            {props.tenants.map((item) => (
              <button
                type="button"
                key={item.id}
                class={[
                  "pc-chrome-tenant-card",
                  item.code === props.currentTenantCode ? "pc-chrome-tenant-card--selected" : "",
                  !item.enabled ? "pc-chrome-tenant-card--disabled" : "",
                ]}
                disabled={!item.enabled || switching.value}
                onClick={() => void handleSelectTenant(item)}
              >
                <span class="pc-chrome-tenant-card-name" title={item.name}>
                  {item.name}
                </span>
                <span class={item.enabled ? "pc-chrome-tenant-status--on" : "pc-chrome-tenant-status--off"}>
                  {item.enabled ? "已启用" : "已禁用"}
                </span>
              </button>
            ))}
            {props.outsideTenants.map((item) => (
              <button type="button" key={`out-${item.id}`} class="pc-chrome-tenant-card" onClick={() => handleOutsideTenant(item)}>
                <span class="pc-chrome-tenant-card-name" title={item.name}>
                  {item.name}
                </span>
                <span class="pc-chrome-tenant-status--on">已启用</span>
              </button>
            ))}
          </div>
        </Modal>

        <Modal
          open={logoutConfirmVisible.value}
          onUpdate:open={(value: boolean) => {
            logoutConfirmVisible.value = value;
          }}
          title="提示"
          width={360}
          centered
          destroyOnClose
          onOk={confirmLogout}
          onCancel={() => {
            logoutConfirmVisible.value = false;
          }}
          okText="确定"
          cancelText="取消"
        >
          <p>是否退出登录？</p>
        </Modal>
      </div>
    );
  },
});
