export interface OverviewClient {
  passedTodayNum: (params?: unknown) => Promise<unknown>;
  getDoorRanking: (params?: unknown) => Promise<unknown>;
  getDoorEvents: (params?: unknown) => Promise<unknown>;
}

export interface TrendClient {
  getDoorTend: (params?: unknown) => Promise<unknown>;
}

export interface OverviewData {
  todayCount: number;
  ranking: unknown[];
  events: unknown[];
}

export async function loadOverview(client: OverviewClient): Promise<OverviewData> {
  const [todayCount, ranking, events] = await Promise.all([client.passedTodayNum({}), client.getDoorRanking({}), client.getDoorEvents({})]);
  return {
    todayCount: Number(todayCount || 0),
    ranking: (ranking as unknown[]) || [],
    events: (events as unknown[]) || [],
  };
}

export async function loadTrend(client: TrendClient, timeFlag: string): Promise<Array<{ timeValue?: string; num?: number }>> {
  const trend = await client.getDoorTend({ timeFlag });
  return (trend as Array<{ timeValue?: string; num?: number }>) || [];
}
