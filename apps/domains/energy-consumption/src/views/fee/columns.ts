import { timeFormat } from "@/utils/common";

export const totalFeeColumns = [
  {
    title: "日期",
    dataIndex: "statDate",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => timeFormat(text, false),
  },
  {
    title: "总费用（元）",
    dataIndex: "totalCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "电费（元）",
    dataIndex: "electricityCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "水费（元）",
    dataIndex: "waterCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "燃气费（元）",
    dataIndex: "gasCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
];

export const electricColumns = [
  {
    title: "日期",
    dataIndex: "statDate",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => timeFormat(text, false),
  },
  {
    title: "区域",
    dataIndex: "areaName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "电费（元）",
    dataIndex: "totalCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "峰电费（元）",
    dataIndex: "fvCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "平电费（元）",
    dataIndex: "pvCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "谷电费（元）",
    dataIndex: "gvCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "尖电费（元）",
    dataIndex: "jvCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
];

export const waterColumns = [
  {
    title: "日期",
    dataIndex: "statDate",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => timeFormat(text, false),
  },
  {
    title: "区域",
    dataIndex: "areaName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "水费（元）",
    dataIndex: "totalCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
];

export const gasColumns = [
  {
    title: "日期",
    dataIndex: "statDate",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => timeFormat(text, false),
  },
  {
    title: "区域",
    dataIndex: "areaName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "燃气费（元）",
    dataIndex: "totalCost",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
];
