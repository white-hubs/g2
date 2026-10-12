import { type PropType, computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { Dropdown, Menu, MenuItem } from "../pc-ui-runtime";
import { computeVisibleTabCount } from "./application-entry-overflow";
import type { ApplicationEntryGroup } from "./top-bar-types";

import "./ApplicationEntry.css";

export default defineComponent({
  name: "ApplicationEntry",
  props: {
    groups: { type: Array as PropType<ApplicationEntryGroup[]>, default: () => [] },
    activeKey: { type: String, default: "" },
  },
  emits: ["selectGroup"],
  setup(props, { emit }) {
    const sortedGroups = computed(() => props.groups.toSorted((a, b) => a.order - b.order));
    const rootRef = ref<HTMLElement | null>(null);
    const measureRef = ref<HTMLElement | null>(null);
    const visibleCount = ref(Number.MAX_SAFE_INTEGER);
    const moreOpen = ref(false);

    const visibleGroups = computed(() => sortedGroups.value.slice(0, visibleCount.value));
    const overflowGroups = computed(() => sortedGroups.value.slice(visibleCount.value));
    const activeInOverflow = computed(() => overflowGroups.value.some((group) => group.key === props.activeKey));

    /** 顶栏切换分组：只发 selectGroup；首条默认路由由 Shell 在拉齐菜单后 navigate。 */
    function handleSelect(group: ApplicationEntryGroup): void {
      moreOpen.value = false;
      emit("selectGroup", group.key);
    }

    function handleMoreMenuClick(info: { key: string | number }): void {
      const group = overflowGroups.value.find((item) => item.key === String(info.key));
      if (group) {
        handleSelect(group);
      }
    }

    function recomputeVisible(): void {
      const root = rootRef.value;
      const measure = measureRef.value;
      if (!root || !measure) {
        return;
      }
      const tabEls = [...measure.querySelectorAll<HTMLElement>("[data-measure-tab]")];
      const widths = tabEls.map((el) => el.offsetWidth);
      const moreWidth = measure.querySelector<HTMLElement>("[data-measure-more]")?.offsetWidth ?? 40;
      visibleCount.value = computeVisibleTabCount(widths, root.clientWidth, moreWidth);
    }

    let resizeObserver: ResizeObserver | undefined;

    onMounted(() => {
      void nextTick(() => {
        recomputeVisible();
        if (rootRef.value && typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => {
            recomputeVisible();
          });
          resizeObserver.observe(rootRef.value);
        }
      });
    });

    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
    });

    watch(
      () => sortedGroups.value.map((group) => `${group.key}:${group.label}`).join("|"),
      () => {
        void nextTick(() => {
          recomputeVisible();
        });
      },
    );

    function renderTab(group: ApplicationEntryGroup, options?: { measure?: boolean }) {
      return (
        <button
          type="button"
          role={options?.measure ? undefined : "tab"}
          class={[
            "pc-chrome-application-entry__tab",
            !options?.measure && group.key === props.activeKey ? "pc-chrome-application-entry__tab--active" : "",
          ]}
          data-testid={options?.measure ? undefined : `app-group-${group.key}`}
          data-measure-tab={options?.measure ? "" : undefined}
          aria-selected={options?.measure ? undefined : group.key === props.activeKey}
          tabindex={options?.measure ? -1 : undefined}
          onClick={options?.measure ? undefined : () => handleSelect(group)}
        >
          {group.label}
        </button>
      );
    }

    return () => (
      <div ref={rootRef} class="pc-chrome-application-entry" data-testid="application-entry">
        {sortedGroups.value.length === 0 ? (
          <div class="pc-chrome-application-entry__empty">暂无应用分组</div>
        ) : (
          <>
            {/* 离屏测量条：量真实 Tab / more 宽度，避免横向滚动条 */}
            <div ref={measureRef} class="pc-chrome-application-entry__measure" aria-hidden="true">
              {sortedGroups.value.map((group) => (
                <span key={group.key}>{renderTab(group, { measure: true })}</span>
              ))}
              <button type="button" class="pc-chrome-application-entry__more" data-measure-more tabindex={-1}>
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path fill="currentColor" d="M2.2 4.2 6 8l3.8-3.8.9.9L6 9.8 1.3 5.1l.9-.9z" />
                </svg>
              </button>
            </div>

            <ul class="pc-chrome-application-entry__tabs" role="tablist">
              {visibleGroups.value.map((group) => (
                <li key={group.key} role="presentation">
                  {renderTab(group)}
                </li>
              ))}
              {overflowGroups.value.length > 0 ? (
                <li class="pc-chrome-application-entry__more-wrap" role="presentation">
                  <Dropdown
                    trigger={["click"]}
                    open={moreOpen.value}
                    onUpdate:open={(value: boolean) => {
                      moreOpen.value = value;
                    }}
                    placement="bottomRight"
                    v-slots={{
                      overlay: () => (
                        <Menu
                          class="pc-chrome-application-entry__more-menu"
                          data-testid="app-group-more-menu"
                          onClick={handleMoreMenuClick}
                        >
                          {overflowGroups.value.map((group) => (
                            <MenuItem
                              key={group.key}
                              class={group.key === props.activeKey ? "is-active" : undefined}
                              data-testid={`app-group-more-${group.key}`}
                            >
                              {group.label}
                            </MenuItem>
                          ))}
                        </Menu>
                      ),
                    }}
                  >
                    <button
                      type="button"
                      class={[
                        "pc-chrome-application-entry__more",
                        activeInOverflow.value ? "pc-chrome-application-entry__more--active" : "",
                      ]}
                      data-testid="app-group-more"
                      aria-label="更多应用分组"
                      aria-expanded={moreOpen.value}
                    >
                      <svg viewBox="0 0 12 12" aria-hidden="true">
                        <path fill="currentColor" d="M2.2 4.2 6 8l3.8-3.8.9.9L6 9.8 1.3 5.1l.9-.9z" />
                      </svg>
                    </button>
                  </Dropdown>
                </li>
              ) : null}
            </ul>
          </>
        )}
      </div>
    );
  },
});
