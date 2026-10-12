import { getAttendanceClient } from "./client";
import { deptList, getDictionaryByItem, getDictionaryItemByCode } from "./selection";

export const cubeMessageCenterService = {
  sceneNotificationMethod: async (sceneCode: string): Promise<{ value: string; label: string }[]> =>
    (await getAttendanceClient()).sceneNotificationMethod(sceneCode),
};

export const cubeDictionaryService = { getDictionaryByItem, getDictionaryItemByCode };
export const cubeOuaaService = { getDeptList: async () => (await deptList()).data };
