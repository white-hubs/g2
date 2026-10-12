import { CubeDictionaryService } from "@ghcloud/cube-dictionary-service";
import { CubeDeviceCenterService } from "@ghcloud/cube-iot-center-service";
import type { DeviceInstanceDetail } from "@ghcloud/cube-iot-center-service";
import { CubeMdataService } from "@ghcloud/cube-mdata-service";
import { CubeSecurityManagementService } from "@ghcloud/cube-security-management-service";
import { ref, type Ref } from "vue";

import { authStore } from "../api/auth-store";

export type VideoType = "h5s" | "hikvision-isc" | "ghy" | "dahua" | "unisinsight" | "unknown";
export interface H5sParams {
  protocol: string;
  session: string;
  host: string;
  token: string;
}

export function isMobile(): boolean {
  if (
    window.navigator.userAgent.match(
      /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Windows Phone|uni)/i,
    )
  ) {
    return true; // 移动端
  } else {
    return false; // PC端
  }
}

let CUBE_LAYER_VIDEO_TYPE: VideoType | null = null;

export function normalizeVideoType(type: string): VideoType | "" {
  const videoTypeMap: Record<string, VideoType> = {
    H5S: "h5s",
    HIKVISION_ISC: "hikvision-isc",
    HIKVISIONISC: "hikvision-isc",
    GHY: "ghy",
    DAHUA: "dahua",
    UNISINSIGHT: "unisinsight",
    UNIS_INSIGHT: "unisinsight",
    UNKNOWN: "unknown",
  };
  const normalizedType = type.trim().replace(/-/g, "_").toUpperCase();
  return videoTypeMap[normalizedType] ?? "";
}

export const getVideoType = async (): Promise<VideoType> => {
  if (CUBE_LAYER_VIDEO_TYPE) {
    return CUBE_LAYER_VIDEO_TYPE;
  }
  let videoType = "";
  const cubeDictionaryService = new CubeDictionaryService(authStore);
  await cubeDictionaryService
    .getDictionaryByItem({
      itemCode: "SUBSYSTEM_ENDPOINT_CONFIG",
      code: "videoServer",
    })
    .then((res) => {
      if (res.length) {
        const variable = JSON.parse(res[0].variable);
        videoType = normalizeVideoType((variable as { manufacturer: string }).manufacturer) || "unknown";
      } else {
        videoType = "h5s";
      }
      CUBE_LAYER_VIDEO_TYPE = videoType as VideoType;
    });
  return videoType as VideoType;
};

interface UsePlayer {
  videoType: Ref<VideoType | "">;
  videoUrl: Ref<string | undefined>;
  relatedDevices: Ref<{ id: string; name: string }[]>;
  deviceDetail: Ref<DeviceInstanceDetail | undefined>;
  bootstrap: () => Promise<void>;
  getDeviceInstanceDetail: (deviceId: string) => Promise<DeviceInstanceDetail>;
  getVideoFormatUrl: (deviceId: string, protocol?: string) => Promise<string>;
  getVideoUrl: (deviceId: string) => Promise<string>;
  guid: () => string;
  getH5sParams: (deviceId: string) => Promise<H5sParams>;
}

export const usePlayer = (): UsePlayer => {
  const videoType = ref<VideoType | "">("");
  const videoUrl = ref<string | undefined>(undefined);
  const relatedDevices = ref<{ id: string; name: string }[]>([]);
  const deviceDetail = ref<DeviceInstanceDetail | undefined>(undefined);

  return {
    videoType,
    videoUrl,
    relatedDevices,
    deviceDetail,
    bootstrap,
    getVideoFormatUrl,
    getVideoUrl,
    guid,
    getH5sParams,
    getDeviceInstanceDetail,
  };

  async function bootstrap(): Promise<void> {
    videoType.value = await getVideoType();
  }

  async function getVideoFormatUrl(deviceId: string, protocol?: string): Promise<string> {
    const cubeSecurityManagementService = new CubeSecurityManagementService(authStore);
    try {
      return await cubeSecurityManagementService.getVideoGatewayPlayUrl(deviceId, protocol ?? "HLS_S");
    } catch {
      return "";
    }
  }

  async function getVideoUrl(deviceId: string): Promise<string> {
    const cubeSecurityManagementService = new CubeSecurityManagementService(authStore);
    try {
      const protocol = videoType.value === "dahua" ? "RTSP" : window.location.protocol === "http:" ? "WS" : "WSS";
      videoUrl.value = await cubeSecurityManagementService.getVideoGatewayPlayUrl(deviceId, protocol);
    } catch {
      videoUrl.value = "";
    }
    return videoUrl.value;
  }

  function guid(): string {
    return "cube-uuid-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async function getDeviceInstanceDetail(deviceId: string): Promise<DeviceInstanceDetail> {
    const cubeDeviceCenterService = new CubeDeviceCenterService(authStore);
    const res = await cubeDeviceCenterService.getDeviceInstanceDetail({ deviceId });
    deviceDetail.value = res;
    if (res.slaveDeviceList?.length) {
      relatedDevices.value = [{ id: deviceId, name: "主设备" }, ...res.slaveDeviceList];
    }
    return res;
  }

  async function getH5sParams(deviceId: string): Promise<H5sParams> {
    const h5sParams: H5sParams = {
      protocol: "",
      session: "",
      host: "",
      token: "",
    };
    const cubeMdataService = new CubeMdataService(authStore);
    const cubeDeviceCenterService = new CubeDeviceCenterService(authStore);
    await cubeMdataService.getCurrentStreamMediaConfig().then((res) => {
      const protocol = window.location.protocol;
      const address = res.ipAddress;
      h5sParams.protocol = address ? address.split("//")[0] : protocol;
      h5sParams.host = address ? address.split("//")[1] : "";
    });
    await cubeMdataService.getVideoPtzSession().then((res) => {
      h5sParams.session = res.session;
    });
    await cubeDeviceCenterService.getDeviceInstanceDetail({ deviceId }).then((res) => {
      deviceDetail.value = res;
      h5sParams.token = res.baseArchivesInfo.thirdPartyId;
      if (res.slaveDeviceList?.length) {
        relatedDevices.value = [{ id: deviceId, name: "主设备" }, ...res.slaveDeviceList];
      }
    });
    return h5sParams;
  }
};
