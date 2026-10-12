// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { computed, defineComponent } from "vue";

import type { EvacuationRouteState } from "../../composables/use-evacuation-route-state";

import "./index.less";

export const FloorPlanUpload = defineComponent({
  name: "FloorPlanUpload",
  props: {
    state: { type: Object as () => EvacuationRouteState, required: true },
  },
  setup(props) {
    const countLabel = computed(() => `${props.state.uploadedImages.value.length}张图片`);

    return (): JSX.Element => (
      <div class="floor-plan-upload">
        <div class="floor-plan-upload__head">
          <span class="floor-plan-upload__title">📁 平面图管理</span>
          <span class="floor-plan-upload__count">{countLabel.value}</span>
        </div>
        <div class="floor-plan-upload__zone" onClick={() => props.state.addSampleFloorPlan()}>
          <div class="floor-plan-upload__icon">📤</div>
          <div class="floor-plan-upload__title">点击此处上传平面图</div>
          <div class="floor-plan-upload__hint">平面图将叠加在GIS地图上，点击即模拟上传</div>
        </div>
      </div>
    );
  },
});
