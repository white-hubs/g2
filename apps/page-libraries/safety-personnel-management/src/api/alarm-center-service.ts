import { services, unwrapResponse } from "./safety-personnel";
export const cubeAlarmCenterService = {
  async getTrendAnalysis(params: {
    applicationCode: string;
    period: string;
  }): Promise<{ alarmTrendStatisticsVOS?: { period: string; alarmNum?: number }[] }> {
    return unwrapResponse(await (await services().alarm()).getAlarmTrendAnalysis(params));
  },
  async getAreaAnalysis(params: {
    applicationCode: string;
    period: string;
  }): Promise<{ alarmCurrencyStatisticsVOS?: { name: string; totalNum?: number }[] }> {
    return unwrapResponse(await (await services().alarm()).getAlarmAreaAnalysis(params));
  },
};
