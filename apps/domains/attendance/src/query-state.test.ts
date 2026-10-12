import { usePcQueryState } from "@g2-platform/pc-ui";
import { describe, expect, test } from "bun:test";
import { createSSRApp, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { renderToString } from "vue/server-renderer";

async function finishNavigation(router: Router, action: () => void): Promise<void> {
  await new Promise<void>((resolve) => {
    const stop = router.afterEach(() => {
      stop();
      resolve();
    });
    action();
  });
}

describe("考勤接入公共查询状态", () => {
  test("日期、长 ID 和分页在查询、详情往返及重置后保持正确，业务深链参数不丢失", async () => {
    const defaults = { staffId: undefined as string | undefined, period: [] as string[], pageNumber: 1, pageSize: 10 };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/list", component: { render: () => null } },
        { path: "/detail", component: { render: () => null } },
      ],
    });
    await router.push("/list?staffId=1701796472990040066&period=2026-09-01,2026-09-30&pageNumber=3&pageSize=20&title=考勤明细");
    let query: ReturnType<typeof usePcQueryState<typeof defaults>> | undefined;
    const Root = defineComponent({
      setup() {
        query = usePcQueryState({
          initialState: defaults,
          storage: "url",
          resolveValue: (field, raw) => {
            if (field === "pageNumber" || field === "pageSize") {
              return Number(raw);
            }
            if (field === "period") {
              return String(raw).split(",");
            }
            return raw;
          },
        });
        return () => h("div");
      },
    });
    const renderQuery = async (): Promise<void> => {
      const app = createSSRApp(Root);
      app.use(router);
      await renderToString(app);
    };
    await renderQuery();
    if (!query) {
      throw new Error("查询状态未初始化");
    }
    expect(query.getSnapshot()).toEqual({
      staffId: "1701796472990040066",
      period: ["2026-09-01", "2026-09-30"],
      pageNumber: 3,
      pageSize: 20,
    });
    const state = query;
    await finishNavigation(router, () => state.update({ period: ["2026-08-01", "2026-08-31"], pageNumber: 1 }));
    await finishNavigation(router, () => state.setPage(2, 20));
    const listUrl = router.currentRoute.value.fullPath;
    await router.push("/detail");
    await finishNavigation(router, () => router.back());
    await renderQuery();
    expect(router.currentRoute.value.fullPath).toBe(listUrl);
    expect(query.getSnapshot()).toEqual({
      staffId: "1701796472990040066",
      period: ["2026-08-01", "2026-08-31"],
      pageNumber: 2,
      pageSize: 20,
    });
    await finishNavigation(router, () => query?.update(defaults));
    expect(query.getSnapshot()).toEqual(defaults);
    expect(router.currentRoute.value.query.title).toBe("考勤明细");
    expect(router.currentRoute.value.query.staffId).toBeUndefined();
    await renderQuery();
    expect(query.getSnapshot()).toEqual(defaults);
  });

  test("汇总统计的逗号日期区间保持字符串，详情 Tab 的长 ID 保持精度", async () => {
    const defaults = { period: "", activeKey: undefined as string | undefined, pageNumber: 1, pageSize: 10 };
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/detail", component: { render: () => null } }] });
    await router.push(
      "/detail?period=2026-09-01,2026-09-30&activeKey=1701796472990040066&pageNumber=4&pageSize=50&staffId=1701796472990040099",
    );
    let snapshot: typeof defaults | undefined;
    const app = createSSRApp(
      defineComponent({
        setup() {
          snapshot = usePcQueryState({
            initialState: defaults,
            storage: "url",
            resolveValue: (field, raw) => (field === "pageNumber" || field === "pageSize" ? Number(raw) : raw),
          }).getSnapshot();
          return () => h("div");
        },
      }),
    );
    app.use(router);
    await renderToString(app);
    expect(snapshot).toEqual({ period: "2026-09-01,2026-09-30", activeKey: "1701796472990040066", pageNumber: 4, pageSize: 50 });
    expect(router.currentRoute.value.query.staffId).toBe("1701796472990040099");
  });
});
