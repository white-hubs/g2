/**
 * message 服务面契约：DTO + 服务 Client 门面类型（纯类型，非 remote；ADR-0057）。
 */

/** 分页/筛选参数原样透传；字段列表随后端演进，前端不杜撰。 */
export type MessageListParams = Record<string, unknown>;

/** `@g2-client/message` 经 `ensureClient` 返回的业务 API。 */
export interface MessageClient {
  /** `GET /api/message2/msg-records` */
  getMessageList: (params: MessageListParams) => Promise<unknown>;
  /** `GET /api/message2/msg-record/un-read/total/{channelType?}` */
  getUnreadCount: (channelType?: string) => Promise<unknown>;
  /** `PUT /api/message2/msg-record/read-all/CHANNEL_SITE` */
  markAllAsRead: () => Promise<unknown>;
  /** `PUT /api/message2/msg-record/read-batch?ids=…` */
  markAsRead: (ids: string[]) => Promise<unknown>;
}

export interface MessageSceneConfig {
  label?: string;
  sceneCode?: string;
  value?: string | number;
  noticeWays?: { noticeWay?: string | null }[] | null;
}
export interface MessageClient {
  getMessageConfig: (params: { businessType: string; label?: string }) => Promise<MessageSceneConfig[]>;
  addMessageConfig: (payload: Record<string, unknown>) => Promise<string>;
  sceneNotificationMethod: (sceneCode: string) => Promise<{ label: string; value: string }[]>;
}
