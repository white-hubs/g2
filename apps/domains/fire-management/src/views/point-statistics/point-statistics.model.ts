export interface PointStatisticsRecord {
  id: string;
  pointName: string;
  location: string;
  alarmCount: number;
  faultCount: number;
  totalCount: number;
  lastTriggered: string;
}
export interface PointStatisticsFilters {
  startDate: string;
  endDate: string;
  area: string;
}
export const DEFAULT_POINT_STATISTICS_FILTERS: PointStatisticsFilters = { startDate: "", endDate: "", area: "" };
