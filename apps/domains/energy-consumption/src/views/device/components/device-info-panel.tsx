import { defineComponent, type PropType } from "vue";

import { DeviceControl } from "./device-control";

import "./device-info.less";

/** 设备基础信息 + IoT 属性读写控制面板 */
export const DeviceInfoPanel = defineComponent({
  name: "DeviceInfoPanel",
  props: {
    deviceData: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    model: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    return () => {
      const fileVOS = (props.model.fileVOS as Array<{ path: string }> | undefined) || [];
      const deviceId = String(props.deviceData.deviceId || "");
      const instrumentType = String(props.deviceData.instrumentType || "");
      return (
        <div class="wrapper">
          <div class="basic">
            {fileVOS[0] ? <img src={fileVOS[0].path} alt="" class="device-img" width={200} height={200} /> : null}
            {props.deviceData ? (
              <>
                <div class="device-info">
                  <div class="item">
                    <div class="label">设备编号:</div>
                    <div class="value">{String(props.deviceData.deviceCode || "--")}</div>
                  </div>
                  <div class="item">
                    <div class="label">设备型号:</div>
                    <div class="value">{String(props.deviceData.modelName || "--")}</div>
                  </div>
                  <div class="item">
                    <div class="label">所属品牌:</div>
                    <div class="value">{String(props.deviceData.brandName || "--")}</div>
                  </div>
                </div>
                <div class="device-info">
                  <div class="item">
                    <div class="label">所属区域:</div>
                    <div class="value">{String(props.deviceData.deviceArea || "--")}</div>
                  </div>
                  <div class="item">
                    <div class="label">设备状态:</div>
                    <div class="value">{props.deviceData.deviceStatus ? "在线" : "离线"}</div>
                  </div>
                </div>
                <div class="device-info">
                  <div class="item">
                    <div class="label">初始读数:</div>
                    <div class="value">{props.deviceData.initValue ?? "--"}</div>
                  </div>
                  <div class="item">
                    <div class="label">实时读数:</div>
                    <div class="value">{props.deviceData.readeValue ?? "--"}</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
          {deviceId ? <DeviceControl show deviceId={deviceId} instrumentType={instrumentType} /> : null}
        </div>
      );
    };
  },
});
