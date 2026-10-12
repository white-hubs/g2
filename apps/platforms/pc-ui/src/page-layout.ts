import { defineComponent, h, mergeProps } from "vue";

import { ZhConfigProvider } from "./zh-config-provider";

import styles from "./page-layout.module.css";

/** 领域页可能仍传入的已删除 prop；从 attrs 剔除，避免落到 DOM。 */
const IGNORED_ATTR_KEYS = new Set(["showTableXScroll", "show-table-x-scroll"]);

function layoutFallthroughAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (IGNORED_ATTR_KEYS.has(key)) continue;
    next[key] = value;
  }
  return next;
}

/**
 * 旧 CubeLayout → PageLayout。slots: layout-header / layout-content / footer-btn / footer-page / default
 *
 * 横向滚动统一由表格 body（AliasTable scroll.x / scroll.y）承担。
 * 已删除 `showTableXScroll`：组件不声明、不处理；旧页面若仍传入会被忽略且不写入 DOM。
 */
export const PageLayout = defineComponent({
  name: "PageLayout",
  inheritAttrs: false,
  props: {
    title: { type: String, default: "" },
    showFooter: { type: Boolean, default: true },
    showHeader: { type: Boolean, default: true },
  },
  setup(props, { slots, attrs }) {
    return () =>
      h(ZhConfigProvider, null, () =>
        h(
          "div",
          mergeProps(
            { id: "pc-layout-container", class: styles.layoutContainer },
            layoutFallthroughAttrs(attrs as Record<string, unknown>),
          ),
          [
            props.showHeader
              ? h("div", { class: styles.layoutHeader }, [
                  h("span", { class: styles.verticalLine }, props.title),
                  slots["layout-header"]?.(),
                ])
              : null,
            h(
              "div",
              {
                id: "pc-layout-content",
                class: [styles.layoutContent, !props.showFooter ? styles.noFooter : ""],
              },
              [slots["layout-content"]?.()],
            ),
            props.showFooter
              ? h("div", { class: styles.layoutFooter }, [
                  h("div", { class: styles.footerBtn }, slots["footer-btn"]?.()),
                  h("div", { class: styles.footerPage }, slots["footer-page"]?.()),
                ])
              : null,
            slots.default?.(),
          ],
        ),
      );
  },
});
