import type { MessageClient } from "@g2-client/message/client";

import { getMessageClient } from "@/domain-context";

export const cubeMessageCenterService = {
  async getMessageConfig(...args: Parameters<MessageClient["getMessageConfig"]>) {
    return (await getMessageClient()).getMessageConfig(...args);
  },
  async addMessageConfig(...args: Parameters<MessageClient["addMessageConfig"]>) {
    return (await getMessageClient()).addMessageConfig(...args);
  },
};
