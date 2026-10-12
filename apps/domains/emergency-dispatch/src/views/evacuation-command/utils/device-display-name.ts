type DeviceInstanceDetail = {
  name?: string;
  baseArchivesInfo?: {
    name?: string;
    area?: { name?: string };
  };
  [key: string]: unknown;
};

export function extractDeviceDisplayName(detail: DeviceInstanceDetail, deviceId: string): string {
  const topLevelName = detail.name?.trim();
  if (topLevelName) {
    return topLevelName;
  }
  const archiveName = detail.baseArchivesInfo?.name?.trim();
  if (archiveName) {
    return archiveName;
  }
  return deviceId;
}

export function extractDeviceDisplayArea(detail: DeviceInstanceDetail): string {
  return detail.baseArchivesInfo?.area?.name?.trim() || "--";
}
