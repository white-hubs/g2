import { defineComponent } from "vue";

import { GVerticalLine } from "./g-vertical-line";
import { ZhConfigProvider } from "@/pc-ui-runtime";

import "./g-layout.less";

/** 能耗域页面主布局：对齐旧仓 gLayout；外层灰底留白 + 内层白卡片，避免撑出大块空底。 */
export const GLayout = defineComponent({
  name: "GLayout",
  inheritAttrs: false,
  props: {
    title: { type: String, default: "" },
    showFooter: { type: Boolean, default: false },
    showSearch: { type: Boolean, default: false },
    contentTableScrollable: { type: Boolean, default: false },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const hasContentData = Boolean(slots["content-data"]);
      const hasContentTable = Boolean(slots["content-table"]);
      const hasContentLeft = Boolean(slots["content-left"]);
      const hasStatistic = Boolean(slots["statistic-data"]);

      return (
        <div class={["energy-page-shell", props.contentTableScrollable ? "energy-page-shell--scrollable" : null]}>
          <ZhConfigProvider>
            <div
              class={["energy-layout-container", "layout-container", attrs.class]}
              style={attrs.style as string | Record<string, string> | undefined}
            >
              {props.title ? (
                <div class="energy-layout-header layout-header">
                  <div class="energy-layout-header-name header-name">
                    <GVerticalLine title={props.title} />
                  </div>
                  <div class="energy-layout-header-btn header-btn">{slots["header-btn"]?.()}</div>
                </div>
              ) : null}
              <div
                class={[
                  "energy-layout-content",
                  "layout-content",
                  props.showFooter ? "energy-layout-content--with-footer" : "energy-layout-content--no-footer",
                ]}
              >
                {hasContentLeft ? <div class="energy-layout-content-left content-left">{slots["content-left"]!()}</div> : null}
                <div class="energy-layout-content-right content-right">
                  {hasContentData ? <div class="energy-layout-content-data content-data">{slots["content-data"]!()}</div> : null}
                  {props.showSearch ? <div class="energy-layout-content-search content-search">{slots["content-search"]?.()}</div> : null}
                  {hasStatistic ? <div class="energy-layout-statistic-data statistic-data">{slots["statistic-data"]!()}</div> : null}
                  {hasContentTable ? (
                    <div
                      class={[
                        "energy-layout-content-table",
                        "content-table",
                        props.contentTableScrollable ? "energy-layout-content-table--scrollable content-table--scrollable" : "",
                      ]}
                    >
                      {slots["content-table"]!()}
                    </div>
                  ) : null}
                </div>
              </div>
              {props.showFooter ? (
                <div class="energy-layout-footer layout-footer">
                  <div class="energy-layout-footer-btn footer-btn">{slots["footer-btn"]?.()}</div>
                  <div class="energy-layout-footer-page footer-page">{slots["footer-page"]?.()}</div>
                </div>
              ) : null}
              {slots.default?.()}
            </div>
          </ZhConfigProvider>
        </div>
      );
    };
  },
});

export default GLayout;
