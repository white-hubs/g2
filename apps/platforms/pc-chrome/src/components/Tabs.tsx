import { type PropType, defineComponent } from "vue";

import { Tabs as AntTabs, Dropdown, Menu, MenuItem, TabPane } from "../pc-ui-runtime";

import "./Tabs.css";

export interface TabItem {
  id: string;
  label: string;
}

export default defineComponent({
  name: "PcChromeTabs",
  props: {
    tabs: { type: Array as PropType<TabItem[]>, required: true },
    activeId: { type: String, required: true },
  },
  emits: ["activate", "close", "closeOthers", "closeToRight"],
  setup(props, { emit }) {
    function handleChange(key: string | number): void {
      emit("activate", String(key));
    }

    function handleEdit(targetKey: string | number | MouseEvent | KeyboardEvent, action: "add" | "remove"): void {
      if (action === "remove" && (typeof targetKey === "string" || typeof targetKey === "number")) {
        emit("close", String(targetKey));
      }
    }

    function handleMoreMenuClick(info: { key: string | number }): void {
      const baseId = props.activeId;
      if (!baseId) {
        return;
      }
      if (info.key === "closeOthers") {
        emit("closeOthers", baseId);
      } else if (info.key === "closeToRight") {
        emit("closeToRight", baseId);
      }
    }

    return () => (
      <div class="pc-chrome-tabs">
        <AntTabs
          class="pc-chrome-tabs-nav"
          activeKey={props.activeId}
          type="editable-card"
          hideAdd
          size="small"
          onChange={handleChange}
          onEdit={handleEdit}
        >
          {props.tabs.map((tab) => (
            <TabPane key={tab.id} closable={props.tabs.length > 1} v-slots={{ tab: () => tab.label }} />
          ))}
        </AntTabs>
        <Dropdown
          class="pc-chrome-tabs-more"
          trigger={["click"]}
          v-slots={{
            overlay: () => (
              <Menu class="pc-chrome-tabs-more-menu" onClick={handleMoreMenuClick}>
                <MenuItem key="closeOthers">关闭其他</MenuItem>
                <MenuItem key="closeToRight">关闭到右侧</MenuItem>
              </Menu>
            ),
          }}
        >
          <button type="button" class="pc-chrome-tabs-more-trigger" aria-label="标签页操作">
            ⋯
          </button>
        </Dropdown>
      </div>
    );
  },
});
