import * as echarts from "echarts";
export type PcChartOption = echarts.EChartsCoreOption;
export declare const CHART_THEME_EVENT = "g2:theme-change";
export interface PcChartHandle {
    setOption: (option: PcChartOption) => void;
    resize: () => void;
    dispose: () => void;
    onClick: (handler: (event: {
        name: string;
        dataIndex: number;
    }) => void) => () => void;
}
/**
 * ECharts 不读取 CSS 自定义属性。渲染前将宿主主题 Token 映射到图表文字、网格、提示框与主色系列。
 * 业务告警等级等语义色保持原值，只有已有蓝色的通用主系列映射到主题主色。
 */
export declare function applyChartTheme(option: PcChartOption): PcChartOption;
/** 域侧图表句柄：封装 echarts，禁止域直依 echarts（G5）。 */
export declare function createPcChart(el: HTMLElement): PcChartHandle;
//# sourceMappingURL=chart.d.ts.map