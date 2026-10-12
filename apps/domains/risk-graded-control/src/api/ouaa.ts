import type { OuaaClient } from "@g2-client/ouaa/client";

import { getOuaaClient } from "../domain-context";

/**
 * OUAA Client 经 DomainContext 异步取得；此处包装为领域侧同步风格的 API，
 * 与 riskGradedControlService 一样避免页面各自 await ensureClient。
 */
export const getOrganizationTree = async (...args: Parameters<OuaaClient["getOrganizationTree"]>) =>
  (await getOuaaClient()).getOrganizationTree(...args);

export const listUsers = async (...args: Parameters<OuaaClient["listUsers"]>) => (await getOuaaClient()).listUsers(...args);

export const getUsersByIds = async (...args: Parameters<OuaaClient["getUsersByIds"]>) => (await getOuaaClient()).getUsersByIds(...args);
