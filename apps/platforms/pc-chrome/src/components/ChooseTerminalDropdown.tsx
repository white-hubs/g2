import { type PropType, defineComponent, ref } from "vue";

import { Dropdown, Menu, MenuItem } from "../pc-ui-runtime";
import type { TerminalEntry } from "./top-bar-types";

import "./ChooseTerminalDropdown.css";

const defaultEntries: TerminalEntry[] = [
  { code: "two-dimensional-configuration", label: "二维组态", url: "/apps-legacy/two-dimensional-configuration" },
  { code: "command-dispatch-app", label: "调度中心", url: "/command-dispatch" },
  { code: "inspection-command-screen-app", label: "智慧巡检指挥", url: "/inspection-command-screen" },
  { code: "three-dimensional-visualization", label: "孪生可视", url: "/apps-legacy/ue5" },
];

export default defineComponent({
  name: "ChooseTerminalDropdown",
  props: {
    entries: { type: Array as PropType<TerminalEntry[]>, default: () => defaultEntries },
  },
  emits: ["selectTerminal"],
  setup(props, { emit }) {
    const open = ref(false);

    function handleMenuClick(info: { key: string | number }): void {
      const entry = props.entries.find((item) => item.code === String(info.key));
      if (!entry) {
        return;
      }
      emit("selectTerminal", entry);
      window.open(entry.url, "_blank");
      open.value = false;
    }

    return () => (
      <div class="pc-chrome-choose-terminal">
        <Dropdown
          trigger={["click"]}
          open={open.value}
          onUpdate:open={(value: boolean) => {
            open.value = value;
          }}
          placement="bottomRight"
          v-slots={{
            overlay: () => (
              <Menu class="pc-chrome-choose-terminal-menu" data-testid="choose-terminal-menu" onClick={handleMenuClick}>
                {props.entries.map((entry) => (
                  <MenuItem key={entry.code}>{entry.label}</MenuItem>
                ))}
              </Menu>
            ),
          }}
        >
          <button type="button" class="pc-chrome-choose-terminal-trigger" data-testid="choose-terminal">
            <span>访问端</span>
            <svg class="pc-chrome-choose-terminal-trigger__caret" viewBox="0 0 12 12" aria-hidden="true">
              <path fill="currentColor" d="M2.2 4.4h7.6L6 9.2z" />
            </svg>
          </button>
        </Dropdown>
      </div>
    );
  },
});
