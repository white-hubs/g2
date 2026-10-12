import dayjs from "@/compat/dayjs";

export const modalColumns = [
  {
    title: "工程编号",
    align: "center",
    dataIndex: "projectNum",
  },
  {
    title: "小散工程名称",
    dataIndex: "projectName",
    align: "center",
  },
  {
    title: "乙方",
    dataIndex: "partyB",
    align: "center",
  },
  {
    title: "完成时限",
    dataIndex: "completionTime",
    align: "center",
    customRender: ({ text }: { text: string }): string => dayjs(text).format("YYYY-MM-DD"),
  },
  {
    title: "监管部门",
    dataIndex: "depName",
    align: "center",
  },
  {
    title: "监管负责人",
    dataIndex: "superviseUserName",
    align: "center",
  },
  {
    title: "工程状态",
    dataIndex: "status",
    align: "center",
  },
  {
    title: "完成进度情况",
    dataIndex: "schedule",
    align: "center",
  },
];
