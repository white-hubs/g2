/**
 * OAuth 换票请求（前端不传 client_id / client_secret）
 */
export type AuthIssueTokenRequest = Record<string, string> & {
  grant_type: string;
};
