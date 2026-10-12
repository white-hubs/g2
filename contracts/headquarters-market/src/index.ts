/** 总部市场接入配置（跨市场报警弹窗等）。HTTP 可仍打遗留 dataintegrate 路径。 */
export type HeadquartersMarketConfig = {
  marketName?: string;
  url?: string;
  account?: string;
  password?: string;
  [key: string]: unknown;
};

export type HeadquartersMarketClient = {
  /** 按市场 id 取接入配置。遗留 path: `/api/dataintegrate/market-config/:id` */
  getMarketConfig: (id: string) => Promise<HeadquartersMarketConfig>;
};
