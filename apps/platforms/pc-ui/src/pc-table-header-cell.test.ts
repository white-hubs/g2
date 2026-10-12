import { expect, test } from "bun:test";
import { isVNode, createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { renderPcTableHeader } from "./alias-table";

test("自定义日历表头保留日期两行与列设置按钮", async () => {
  const rendered = renderPcTableHeader(
    { column: { key: "calendar-09-01", title: "星期二" }, title: "星期二" },
    {
      headerCell: ({ title }) => h("div", [h("span", "09-01"), h("span", String(title))]),
      showSettings: true,
      onOpen: () => {},
    },
  );
  if (!isVNode(rendered)) throw new Error("自定义表头必须返回 VNode");
  const html = await renderToString(createSSRApp({ render: () => h("section", [rendered]) }));
  expect(html).toContain("09-01");
  expect(html).toContain("星期二");
  expect(html).toContain("自定义列");
  expect(html).not.toContain("[object Object]");
});

test("未声明自定义表头时保留既有标题", () => {
  expect(renderPcTableHeader({ column: { title: "名称" }, title: "名称" }, { onOpen: () => {} })).toBe("名称");
});
