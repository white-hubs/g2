import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";

export interface GemMessageConfigClient {
  getAlarmNoticeConfig: (businessType: string) => Promise<unknown>;
  saveAlarmNoticeConfig: (payload: unknown) => Promise<unknown>;
  getNoticeMethods: (sceneCode: string) => Promise<unknown>;
}

import type { GemCapabilityCodes } from "../capability";
import type { NavigatePage } from "../page-nav";

export interface GemPageProps {
  codes: GemCapabilityCodes;
  functionCodes: ReadonlySet<string> | readonly string[];
  onNavigatePage: NavigatePage;
  title?: string;
  getAlarmClient?: () => Promise<AlarmCenterClient>;
  getDeviceClient?: () => Promise<DeviceCenterClient>;
  getOuaaClient?: () => Promise<OuaaClient>;
  getFileClient?: () => Promise<FileClient>;
  getDictionaryClient?: () => Promise<DictionaryClient>;
  getMessageConfigClient?: () => Promise<GemMessageConfigClient>;
  applicationCode?: string;
}
