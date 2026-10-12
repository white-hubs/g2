import { defineComponent, onMounted, onUnmounted, shallowRef, watch, type PropType } from "vue";

import { CubeIcon } from "../cube-icon";
import { loadCubeIconfont } from "./iconfont-loader";
import { hasLocalSvgIcon, SvgIcon } from "./svg-icon";

import "./workbench-icon.less";

function normalizeSize(size: string | number): string {
  return typeof size === "number" ? `${size}px` : size;
}

/** 新图标库注入 symbol；工作台内置兜底是普通 SVG，需按标签类型区分来源。 */
function hasCubeIconSymbol(iconClass: string): boolean {
  if (!iconClass || typeof document === "undefined") return false;
  return document.getElementById(iconClass)?.tagName.toLowerCase() === "symbol";
}

export default defineComponent({
  name: "WorkbenchIcon",
  inheritAttrs: false,
  props: {
    iconClass: { type: String, required: true },
    size: { type: [String, Number] as PropType<string | number>, default: "1em" },
    color: { type: String, default: undefined },
  },
  setup(props, { attrs }) {
    const source = shallowRef<"pending" | "cube" | "local">("pending");
    let resolveVersion = 0;

    const resolveSource = async (): Promise<void> => {
      const version = ++resolveVersion;
      if (!props.iconClass) {
        source.value = "cube";
        return;
      }

      try {
        await loadCubeIconfont({ cacheBust: false });
      } catch {
        // 壳层图标加载失败时继续检查工作台本地 SVG，避免卡片图标空白。
      }
      if (version !== resolveVersion) return;

      if (hasCubeIconSymbol(props.iconClass)) {
        source.value = "cube";
        return;
      }
      source.value = hasLocalSvgIcon(props.iconClass) ? "local" : "cube";
    };

    onMounted(() => {
      void resolveSource();
    });
    onUnmounted(() => {
      resolveVersion += 1;
    });
    watch(
      () => props.iconClass,
      () => {
        source.value = "pending";
        void resolveSource();
      },
    );

    return () => {
      if (!props.iconClass) return null;
      const size = normalizeSize(props.size);

      if (source.value === "pending") {
        return <span class={["workbench-icon", attrs.class]} style={{ display: "inline-block", width: size, height: size }} />;
      }
      if (source.value === "local") {
        return (
          <span class={["workbench-icon", "workbench-icon--local", attrs.class]} style={{ fontSize: size, color: props.color }}>
            <SvgIcon iconName={props.iconClass} />
          </span>
        );
      }
      return <CubeIcon {...attrs} iconClass={props.iconClass} size={props.size} color={props.color} />;
    };
  },
});
