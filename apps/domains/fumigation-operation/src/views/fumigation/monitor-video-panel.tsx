import { Select } from "@g2-platform/pc-ui";
import { computed, defineComponent, shallowRef, watch, type PropType } from "vue";

import { InfoItem } from "./components";
import { MonitorVideoPlayer } from "./monitor-video-player";
import { DEVICE_PROPERTY_CODES, type CameraOption, type DeviceProperty } from "./state";
import { getFumigationDeviceProperties } from "@/api/fumigation-client";

const AI_PROPERTY_CODES = [DEVICE_PROPERTY_CODES.aiPeople, DEVICE_PROPERTY_CODES.aiMask, DEVICE_PROPERTY_CODES.aiProtection] as const;

const findProperty = (properties: DeviceProperty[], code: string): DeviceProperty | undefined =>
  properties.find((item) => item.code === code);

const formatAiCount = (properties: DeviceProperty[], code: (typeof AI_PROPERTY_CODES)[number]): string => {
  const item = findProperty(properties, code);
  if (item == null || item.value == null || !Number.isFinite(Number(item.value))) {
    return "--";
  }
  const unit = item.unit?.trim() ?? "人";
  return `${item.value} ${unit}`;
};

/** 视频监护 + 当前摄像头 AI 属性（均使用设备中心 ID） */
export const MonitorVideoPanel = defineComponent({
  name: "MonitorVideoPanel",
  props: {
    cameras: {
      type: Array as PropType<CameraOption[]>,
      default: () => [],
    },
    selectedCameraId: {
      type: String,
      default: "",
    },
  },
  emits: ["update:selectedCameraId"],
  setup(props, { emit }) {
    const cameraProperties = shallowRef<DeviceProperty[]>([]);

    const selectedCamera = computed(() => {
      const cameras = props.cameras;
      if (cameras.length === 0) {
        return undefined;
      }
      return cameras.find((item) => item.id === props.selectedCameraId) ?? cameras[0];
    });

    const loadCameraProperties = (cameraDeviceId: string): void => {
      if (cameraDeviceId === "") {
        cameraProperties.value = [];
        return;
      }
      void getFumigationDeviceProperties(cameraDeviceId, [...AI_PROPERTY_CODES])
        .then((properties) => {
          cameraProperties.value = properties as DeviceProperty[];
        })
        .catch(() => {
          cameraProperties.value = [];
        });
    };

    watch(
      () => selectedCamera.value?.id,
      (deviceId) => {
        loadCameraProperties(deviceId ?? "");
      },
      { immediate: true },
    );

    return (): JSX.Element => {
      const cameras = props.cameras;
      const camera = selectedCamera.value;
      const cameraDeviceId = camera?.id ?? "";
      return (
        <div class="fumigation-video-panel">
          {cameras.length > 1 ? (
            <div class="fumigation-video-panel-toolbar">
              <Select
                value={cameraDeviceId || undefined}
                placeholder="选择摄像头"
                options={cameras.map((item) => ({ label: item.name, value: item.id }))}
                style={{ width: "100%" }}
                onChange={(value: unknown) => {
                  emit("update:selectedCameraId", String(value ?? ""));
                }}
              />
            </div>
          ) : null}
          <MonitorVideoPlayer deviceId={cameraDeviceId} />
          <div class="fumigation-video-ai">
            <InfoItem label="AI 人数" value={formatAiCount(cameraProperties.value, DEVICE_PROPERTY_CODES.aiPeople)} />
            <InfoItem label="面具识别" value={formatAiCount(cameraProperties.value, DEVICE_PROPERTY_CODES.aiMask)} />
            <InfoItem label="防护识别" value={formatAiCount(cameraProperties.value, DEVICE_PROPERTY_CODES.aiProtection)} />
          </div>
        </div>
      );
    };
  },
});
