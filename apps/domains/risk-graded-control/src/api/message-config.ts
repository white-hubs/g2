import { addMessageConfig, getMessageConfig, sceneNotificationMethod } from "./server";

/** 风险预警通知配置统一走领域 Client 暴露的公共消息 API。 */
export const riskMessageConfigService = {
  getMessageConfig,
  addMessageConfig,
  sceneNotificationMethod,
};
