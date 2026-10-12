import {
  LeftOutlined,
  DownOutlined,
  UpOutlined,
  RightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons-vue";
import { CubeSecurityManagementService } from "@ghcloud/cube-security-management-service";
import axios from "axios";
import { defineComponent, ref, type PropType } from "vue";

import { authStore } from "../api/auth-store";
import type { VideoType } from "../hook/use-player";

import styles from "./player-control.module.less";

//speed:
// 大华。转动速度（1-8的整数） ，越大代表越快
// 海康  云台速度，取值范围为1-100，默认50
// wvp。速度(0~255) 默认值: 129
// h5s 0-1
export const PlayerControl = defineComponent({
  props: {
    videoType: {
      type: String as PropType<VideoType>,
      default: "",
    },
    extraParams: {
      type: Object,
      default: () => ({}),
    },
    deviceId: {
      type: String,
      default: "",
    },
  },
  emits: ["fullscreen"],
  setup(props, { emit }) {
    const fullscreen = ref(false);

    const clickFull = (): void => {
      fullscreen.value = !fullscreen.value;
      emit("fullscreen", fullscreen.value);
    };

    const setVideoStop = (actionType: "left" | "right" | "down" | "up" | "zoomin" | "zoomout"): void => {
      if (props.videoType === "h5s") {
        h5sControl("stop");
      } else if (props.videoType === "ghy" || props.videoType === "unisinsight") {
        videoControl(actionType, 129, true);
      } else if (props.videoType === "dahua") {
        videoControl(actionType, 4, true);
      } else {
        videoControl(actionType, 50, true);
      }
    };
    const setVideoArrow = (actionType: "left" | "right" | "down" | "up" | "zoomin" | "zoomout"): void => {
      if (props.videoType === "h5s") {
        h5sControl(actionType);
      } else if (props.videoType === "ghy" || props.videoType === "unisinsight") {
        videoControl(actionType, 129);
      } else if (props.videoType === "dahua") {
        videoControl(actionType, 4);
      } else {
        videoControl(actionType, 50);
      }
    };

    return (): JSX.Element => (
      <div class={`${styles["player-control"]} cube-player-control`}>
        <LeftOutlined
          onMouseup={() => {
            setVideoStop("left");
          }}
          onMousedown={() => {
            setVideoArrow("left");
          }}
        />
        <DownOutlined
          onMouseup={() => {
            setVideoStop("right");
          }}
          onMousedown={() => {
            setVideoArrow("down");
          }}
        />
        <UpOutlined
          onMouseup={() => {
            setVideoStop("up");
          }}
          onMousedown={() => {
            setVideoArrow("up");
          }}
        />
        <RightOutlined
          onMouseup={() => {
            setVideoStop("right");
          }}
          onMousedown={() => {
            setVideoArrow("right");
          }}
        />
        <ZoomInOutlined
          onMouseup={() => {
            setVideoStop("zoomin");
          }}
          onMousedown={() => {
            setVideoArrow("zoomin");
          }}
        />
        <ZoomOutOutlined
          onMouseup={() => {
            setVideoStop("zoomout");
          }}
          onMousedown={() => {
            setVideoArrow("zoomout");
          }}
        />
        {!fullscreen.value ? <FullscreenOutlined onClick={clickFull} /> : <FullscreenExitOutlined onClick={clickFull} />}
      </div>
    );

    function h5sControl(actionType: string): void {
      const serveIp = window.location.protocol;
      if (window.videoUrl) {
        axios.get(serveIp + "//" + window.videoUrl + "/api/v1/Ptz", {
          params: {
            token: props.extraParams?.token,
            action: actionType,
            speed: actionType !== "stop" ? 0.4 : undefined,
            session: props.extraParams?.session,
          },
        });
      }
    }

    function videoControl(actionType: string, speed: number, isStop = false): void {
      let command = actionType.toUpperCase();
      if (command === "ZOOMIN") {
        command = "ZOOM_IN";
      }
      if (command === "ZOOMOUT") {
        command = "ZOOM_OUT";
      }
      const cubeSecurityManagementService = new CubeSecurityManagementService(authStore);
      cubeSecurityManagementService.videoControl(props.deviceId, { action: isStop ? "STOP" : "START", command, speed: 0.4 });
    }
  },
});
