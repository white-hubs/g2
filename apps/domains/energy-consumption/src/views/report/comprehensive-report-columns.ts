import { timeFormat } from "@/utils/common";

export const classifyColumns = [
  {
    title: "日期",
    dataIndex: "statDate",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => timeFormat(text, false),
  },
  {
    title: "能源分类",
    dataIndex: "instrumentTypeName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "综合能耗tce",
    dataIndex: "zhValue",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
];

export const subItemColumns = [
  {
    title: "日期",
    dataIndex: "statDate",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => timeFormat(text, false),
  },
  {
    title: "分项名称",
    dataIndex: "projectName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "能源分类",
    dataIndex: "instrumentTypeName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "综合能耗",
    dataIndex: "zhValue",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => text,
  },
];

export const areaColumns = [
  {
    title: "日期",
    dataIndex: "statDate",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => timeFormat(text, false),
  },
  {
    title: "区域名称",
    dataIndex: "projectName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "能源分类",
    dataIndex: "instrumentTypeName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "综合能耗",
    dataIndex: "zhValue",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => text,
  },
];
