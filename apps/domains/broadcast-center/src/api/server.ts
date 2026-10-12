import type {
  AddBroadcastRule,
  BroadcastPlayRecordPageParams,
  BroadcastPlayRulePageParams,
  BroadcastTemplatePageParams,
  BroadcastTemplatePayload,
} from "@g2-contract/broadcast-center";

import { getBroadcastCenterClient } from "../domain-context";
import { unwrapData, unwrapPage } from "../utils";

export const broadcastApi = {
  client: () => getBroadcastCenterClient(),

  async broadcastTemplatePage(params: BroadcastTemplatePageParams) {
    return unwrapPage(await getBroadcastCenterClient().broadcastTemplatePage(params));
  },

  async broadcastPlayRecordPage(params: BroadcastPlayRecordPageParams) {
    return unwrapPage(await getBroadcastCenterClient().broadcastPlayRecordPage(params));
  },

  async getBroadcastPlayRecordPage(params: BroadcastPlayRecordPageParams) {
    return unwrapPage(await getBroadcastCenterClient().getBroadcastPlayRecordPage(params));
  },

  async broadcastPlayRulePage(params: BroadcastPlayRulePageParams) {
    return unwrapPage(await getBroadcastCenterClient().broadcastPlayRulePage(params));
  },

  async getBroadcastRuleInfo(id: string) {
    return unwrapData(await getBroadcastCenterClient().getBroadcastRuleInfo(id)) as AddBroadcastRule;
  },

  deleteBroadcastTemplate(id: string) {
    return getBroadcastCenterClient().deleteBroadcastTemplate(id);
  },

  deleteBroadcastPlayRule(id: string) {
    return getBroadcastCenterClient().deleteBroadcastPlayRule(id);
  },

  broadcastTemplate(payload: BroadcastTemplatePayload) {
    return getBroadcastCenterClient().broadcastTemplate(payload);
  },

  editBroadcast(id: string, payload: BroadcastTemplatePayload) {
    return getBroadcastCenterClient().editBroadcast(id, payload);
  },

  addBroadcastRule(payload: AddBroadcastRule) {
    return getBroadcastCenterClient().addBroadcastRule(payload);
  },

  updateBroadcastRule(id: string, payload: AddBroadcastRule) {
    return getBroadcastCenterClient().updateBroadcastRule(id, payload);
  },

  broadcastPlayRuleEnabled(id: string, checked: boolean) {
    return getBroadcastCenterClient().broadcastPlayRuleEnabled(id, checked);
  },
};
