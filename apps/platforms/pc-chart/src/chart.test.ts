import { describe, expect, mock, test } from "bun:test";

const setOption = mock(() => undefined);
const resize = mock(() => undefined);
const dispose = mock(() => undefined);
const on = mock((_name: string, _callback: (event: { name: string; dataIndex: number }) => void) => undefined);
const off = mock((_name: string, _callback: (event: { name: string; dataIndex: number }) => void) => undefined);
const init = mock(() => ({ setOption, resize, dispose, on, off }));

mock.module("echarts", () => ({
  init,
}));

describe("@g2-platform/pc-chart", () => {
  test("主题不以 undefined 覆盖默认调色板和动画参数", async () => {
    const { applyChartTheme } = await import("./chart");
    const option = applyChartTheme({ series: [{ type: "pie", data: [{ name: "闲置", value: 172 }] }] });
    expect(option).not.toHaveProperty("color");
    expect(option).not.toHaveProperty("animation");
    expect(option.series).toEqual([expect.objectContaining({ type: "pie", data: [{ name: "闲置", value: 172 }] })]);
    expect((option.series as Record<string, unknown>[])[0]).not.toHaveProperty("color");
    expect((option.series as Record<string, unknown>[])[0]).not.toHaveProperty("itemStyle");
  });
  test("click subscriptions expose a typed drilldown event and remove the exact listener", async () => {
    const { createPcChart } = await import("./chart");
    const handler = mock((_event: { name: string; dataIndex: number }) => undefined);
    const unsubscribe = createPcChart({} as HTMLElement).onClick(handler);
    const listener = on.mock.calls.at(-1)![1];
    listener({ name: "部门一", dataIndex: 2 });
    expect(handler).toHaveBeenCalledWith({ name: "部门一", dataIndex: 2 });
    unsubscribe();
    expect(off).toHaveBeenCalledWith("click", listener);
  });
  test("createPcChart wraps echarts init/setOption/resize/dispose", async () => {
    const { createPcChart } = await import("./chart");
    const el = {} as HTMLElement;
    const chart = createPcChart(el);

    expect(init).toHaveBeenCalledWith(el);
    chart.setOption({ series: [{ type: "line", data: [1] }] });
    chart.resize();
    chart.dispose();

    expect(setOption).toHaveBeenCalled();
    expect(resize).toHaveBeenCalled();
    expect(dispose).toHaveBeenCalled();
  });

  test("barrel does not re-export echarts", async () => {
    const mod = await import("./index");
    expect(typeof mod.createPcChart).toBe("function");
    expect("echarts" in mod).toBe(false);
  });

  test("主题包装保留业务数据，并在无 DOM 时使用稳定的亮色回退", async () => {
    const { applyChartTheme } = await import("./chart");
    const option = applyChartTheme({
      title: { text: "趋势" },
      xAxis: { type: "category", data: ["今天"] },
      yAxis: { type: "value" },
      series: [{ type: "bar", color: "#1890ff", label: { show: true }, labelLine: { show: true }, data: [1] }],
    });
    expect(option.backgroundColor).toBe("transparent");
    expect((option.series as { color?: string }[])[0]?.color).toBe("#1890ff");
    expect((option.xAxis as { axisLabel?: { color?: string } }).axisLabel?.color).toBe("#8c8c8c");
    expect((option.title as { textStyle?: { color?: string } }).textStyle?.color).toBe("#1d2129");
    expect((option.series as { label?: { color?: string }; labelLine?: { lineStyle?: { color?: string } } }[])[0]?.label?.color).toBe(
      "#1d2129",
    );
    expect((option.series as { labelLine?: { lineStyle?: { color?: string } } }[])[0]?.labelLine?.lineStyle?.color).toBe("#d9d9d9");
  });
});
