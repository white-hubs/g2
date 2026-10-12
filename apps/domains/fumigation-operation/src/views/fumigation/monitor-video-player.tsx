import { CubePlayer } from "@g2-platform/pc-player";
import { Button } from "@g2-platform/pc-ui";
import { defineComponent, ref } from "vue";

/** 监护看板视频播放：deviceId 传设备中心 ID，CubePlayer 内部会查 thirdPartyId */
export const MonitorVideoPlayer = defineComponent({
  name: "MonitorVideoPlayer",
  props: {
    deviceId: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    const playerError = ref(false);
    const refreshLoading = ref(false);
    const playerKey = ref(0);

    const handleRefresh = (): void => {
      if (refreshLoading.value || props.deviceId === "") {
        return;
      }
      refreshLoading.value = true;
      playerError.value = false;
      playerKey.value += 1;
      window.setTimeout(() => {
        refreshLoading.value = false;
      }, 800);
    };

    return (): JSX.Element => {
      if (props.deviceId === "") {
        return <div class="fumigation-video fumigation-video-empty">暂无监控</div>;
      }
      return (
        <div class="fumigation-video">
          <CubePlayer
            key={`${props.deviceId}-${playerKey.value}`}
            deviceId={props.deviceId}
            control={true}
            isShowDeviceDetails={false}
            isReconnect={true}
            onError={() => {
              playerError.value = true;
            }}
          />
          {playerError.value ? (
            <div class="fumigation-video-error">
              <div class="fumigation-video-error-text">加载失败</div>
              <Button size="small" loading={refreshLoading.value} onClick={handleRefresh}>
                刷新
              </Button>
            </div>
          ) : null}
        </div>
      );
    };
  },
});
