import type { MessageClient } from "@g2-contract/message";

import { getSafetyDutyContext } from "../domain-context";
async function client(): Promise<MessageClient> {
  return getSafetyDutyContext().ensureClient<MessageClient>("messageClient");
}
export const dutyMessageService = {
  getMessageConfig: async (...args: Parameters<MessageClient["getMessageConfig"]>) => (await client()).getMessageConfig(...args),
  addMessageConfig: async (...args: Parameters<MessageClient["addMessageConfig"]>) => (await client()).addMessageConfig(...args),
  sceneNotificationMethod: async (...args: Parameters<MessageClient["sceneNotificationMethod"]>) =>
    (await client()).sceneNotificationMethod(...args),
};
