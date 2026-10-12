import { createApprovalPage } from "./approval-page";
import { ApprovalRecordPage } from "./approval-record-page";
import { WORKFLOWS } from "./shared";
import { STATISTICS, StatisticsDetailPage, createStatisticsPage } from "./statistics-page";

export const RecruitApprovalPage = createApprovalPage(WORKFLOWS.recruit);
export const InductionApprovalPage = createApprovalPage(WORKFLOWS.induction);
export const AppraiseApprovalPage = createApprovalPage(WORKFLOWS.appraise);
export const RegularApprovalPage = createApprovalPage(WORKFLOWS.regular);
export const DrillApprovalPage = createApprovalPage(WORKFLOWS.drill);
export const DepartApprovalPage = createApprovalPage(WORKFLOWS.depart);
export const DepartProceduresPage = createApprovalPage(WORKFLOWS["depart-procedures"]);
export const WorkShiftApprovalPage = createApprovalPage(WORKFLOWS["work-shift"]);

export const RecruitStatisticsPage = createStatisticsPage(STATISTICS.recruit);
export const InductionStatisticsPage = createStatisticsPage(STATISTICS.induction);
export const AppraiseStatisticsPage = createStatisticsPage(STATISTICS.appraise);
export const RegularStatisticsPage = createStatisticsPage(STATISTICS.regular);
export const DepartStatisticsPage = createStatisticsPage(STATISTICS.depart);
export const WorkShiftStatisticsPage = createStatisticsPage(STATISTICS["work-shift"]);

export { ApprovalRecordPage, StatisticsDetailPage };
