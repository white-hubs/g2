import { defineComponent, onMounted, ref, type PropType } from "vue";

import { DEFAULT_CUBE_ICONFONT_URL, loadCubeIconfont, whenCubeIconfontReady } from "./icon/iconfont-loader";

export interface CubeIconProps {
  /** Iconfont Symbol ID，例如 `icon-home`。 */
  iconClass: string;
  /** 图标宽高；数字按 px 处理，默认与当前文字大小一致。 */
  size?: string | number;
  /** 单色图标颜色；未指定时继承当前文字颜色。 */
  color?: string;
}

function normalizeSize(size: string | number): string {
  return typeof size === "number" ? `${size}px` : size;
}

function mergeCubeIconStyle(color: string | undefined, size: string, userStyle: unknown): Record<string, string> {
  const style: Record<string, string> = {
    display: "inline-block",
    fill: "currentColor",
    flexShrink: "0",
    height: size,
    verticalAlign: "-0.125em",
    width: size,
  };
  if (color) {
    style.color = color;
  }
  if (userStyle && typeof userStyle === "object" && !Array.isArray(userStyle)) {
    Object.assign(style, userStyle);
  }
  return style;
}

/**
 * 对齐旧仓 CubeIcon：`<svg><use href="#icon-xxx" /></svg>`。
 * 精灵由壳启动注入（public/cube-icon/iconfont.js）；此处只等待 DOM，必要时同源兜底加载。
 */
export const CubeIcon = defineComponent({
  name: "CubeIcon",
  inheritAttrs: false,
  props: {
    iconClass: {
      type: String,
      required: true,
    },
    size: {
      type: [String, Number] as PropType<string | number>,
      default: "1em",
    },
    color: {
      type: String,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    const spriteReady = ref(typeof document !== "undefined" && !!document.querySelector('svg[aria-hidden="true"] symbol'));

    onMounted(() => {
      if (spriteReady.value) {
        return;
      }
      void whenCubeIconfontReady()
        .then(async () => {
          if (!document.querySelector('svg[aria-hidden="true"] symbol')) {
            // 壳未注入时的兜底：同源壳静态路径，禁止 CDN 改写
            await loadCubeIconfont({ scriptUrl: DEFAULT_CUBE_ICONFONT_URL, cacheBust: false });
            await whenCubeIconfontReady();
          }
        })
        .then(() => {
          spriteReady.value = true;
        })
        .catch(() => {
          spriteReady.value = true;
        });
    });

    return () => {
      const { class: className, style: userStyle, "aria-hidden": ariaHidden, ...svgAttrs } = attrs;
      const size = normalizeSize(props.size);
      const explicitAriaHidden =
        ariaHidden === true || ariaHidden === "true" ? "true" : ariaHidden === false || ariaHidden === "false" ? "false" : undefined;
      const resolvedAriaHidden = explicitAriaHidden ?? (attrs["aria-label"] === undefined && attrs.role === undefined ? "true" : undefined);
      const href = props.iconClass ? `#${props.iconClass}` : "";

      return (
        <svg
          {...svgAttrs}
          class={["cube-icon", className, props.iconClass]}
          style={mergeCubeIconStyle(props.color, size, userStyle)}
          aria-hidden={resolvedAriaHidden}
        >
          {spriteReady.value && href ? <use href={href} xlinkHref={href} /> : null}
        </svg>
      );
    };
  },
});

export default CubeIcon;
