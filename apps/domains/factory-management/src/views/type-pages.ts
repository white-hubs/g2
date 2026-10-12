import { createTypePage } from "../components/type-page";

export const IndustryTypePage = createTypePage({
  title: "行业类型",
  columnTitle: "企业行业",
  tag: "INDUSTRY",
  tableCode: "FACTORY_MANAGEMENT_INDUSTRY_TYPE",
});

export const RoomTypePage = createTypePage({
  title: "房间类型",
  columnTitle: "房间类型",
  tag: "ROOM",
  tableCode: "FACTORY_MANAGEMENT_ROOM_TYPE",
});

export const DemandsTypePage = createTypePage({
  title: "诉求类型",
  columnTitle: "诉求类型",
  tag: "APPEAL",
  tableCode: "FACTORY_MANAGEMENT_APPEAL_TYPE",
});

export const VisitTypePage = createTypePage({
  title: "走访类型",
  columnTitle: "走访类型",
  tag: "INTERVIEW",
  tableCode: "FACTORY_MANAGEMENT_INTERVIEW_TYPE",
});
