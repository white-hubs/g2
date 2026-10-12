import { Get, type BaseAPIResult, Post } from "@ghcloud/ghcloud-business-request";
const baseUrl = "/videogw";

export const getVideoUrl = async (
  deviceId: string,
  params?: {
    streamType?: number;
    protocol?: string;
    transportMode?: string;
    streamFormat?: string;
  },
): Promise<BaseAPIResult> => {
  return Get(`${baseUrl}/videogw/video/${deviceId}/preview-url`, { params });
};
export const setVideoControl = async (
  deviceId: string,
  params?: {
    action: string;
    command: string;
    speed: number;
  },
): Promise<BaseAPIResult> => {
  return Post(`${baseUrl}/videogw/video/${deviceId}/ptz/control`, { ...params });
};
