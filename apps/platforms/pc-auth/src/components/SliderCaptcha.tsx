import type { PlatformContext } from "@g2-composition/contract";
import type { OuaaClient } from "@g2-contract/ouaa";
import { type PropType, Teleport, type VNode, computed, defineComponent, onBeforeUnmount, ref } from "vue";

import { checkCaptchaSlide, fetchCaptchaChallenge } from "../slider-captcha";

import "./SliderCaptcha.css";

interface DragPointerEvent {
  clientX: number;
  pointerId?: number;
  currentTarget?: EventTarget | null;
}

export default defineComponent({
  name: "SliderCaptcha",
  props: {
    ctx: { type: Object as PropType<PlatformContext>, required: true },
    imgWidth: { type: Number, default: 330 },
    imgHeight: { type: Number, default: 155 },
    sliderSize: { type: Number, default: 50 },
  },
  emits: ["success", "fail", "close"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const loading = ref(false);
    const backgroundSrc = ref("");
    const puzzleSrc = ref("");
    const token = ref("");
    const secretKey = ref("");
    const sliderX = ref(0);
    const matched = ref(false);
    const failed = ref(false);
    const tipWords = ref("");
    const checking = ref(false);

    let dragging = false;
    let dragStartClientX = 0;
    let dragStartSliderX = 0;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    const maxSliderX = computed(() => Math.max(0, props.imgWidth - props.sliderSize));
    const trackStyle = computed(() => ({ width: `${props.imgWidth}px`, height: `${props.imgHeight}px` }));
    const puzzleStyle = computed(() => ({
      left: `${sliderX.value}px`,
      width: `${Math.floor((props.imgWidth * 47) / 310)}px`,
      height: `${props.imgHeight}px`,
    }));
    const sliderStyle = computed(() => ({
      transform: `translateX(${sliderX.value}px)`,
      width: `${props.sliderSize}px`,
    }));
    const tipClass = computed(() => (matched.value ? "pc-auth-slider-captcha__tip--ok" : "pc-auth-slider-captcha__tip--err"));

    function clamp(value: number, min: number, max: number): number {
      return Math.min(Math.max(value, min), max);
    }

    async function loadChallenge(options?: { keepFailTip?: boolean }): Promise<void> {
      loading.value = true;
      if (!options?.keepFailTip) {
        tipWords.value = "";
        failed.value = false;
      }
      matched.value = false;
      sliderX.value = 0;
      try {
        const ouaa = await props.ctx.ensureClient<OuaaClient>("ouaaClient");
        const data = await fetchCaptchaChallenge(ouaa);
        backgroundSrc.value = `data:image/png;base64,${data.originalImageBase64}`;
        puzzleSrc.value = `data:image/png;base64,${data.jigsawImageBase64}`;
        token.value = data.token;
        secretKey.value = data.secretKey ?? "";
      } catch {
        tipWords.value = "获取验证码失败";
        backgroundSrc.value = "";
        puzzleSrc.value = "";
      } finally {
        loading.value = false;
      }
    }

    async function show(): Promise<void> {
      open.value = true;
      await loadChallenge();
    }

    function close(): void {
      open.value = false;
      emit("close");
    }

    async function refresh(options?: { keepFailTip?: boolean }): Promise<void> {
      if (checking.value) {
        return;
      }
      await loadChallenge(options);
    }

    function reset(): void {
      matched.value = false;
      failed.value = false;
      sliderX.value = 0;
      tipWords.value = "";
      open.value = false;
    }

    function handlePointerDown(event: DragPointerEvent): void {
      if (matched.value || checking.value || loading.value) {
        return;
      }
      dragging = true;
      dragStartClientX = event.clientX;
      dragStartSliderX = sliderX.value;
      failed.value = false;
      tipWords.value = "";
      if (event.currentTarget instanceof HTMLElement && typeof event.pointerId === "number") {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
    }

    function handlePointerMove(event: DragPointerEvent): void {
      if (!dragging) {
        return;
      }
      const delta = event.clientX - dragStartClientX;
      sliderX.value = clamp(dragStartSliderX + delta, 0, maxSliderX.value);
    }

    async function handlePointerUp(): Promise<void> {
      if (!dragging) {
        return;
      }
      dragging = false;
      if (sliderX.value <= 0 || checking.value) {
        return;
      }
      checking.value = true;
      try {
        const ouaa = await props.ctx.ensureClient<OuaaClient>("ouaaClient");
        const result = await checkCaptchaSlide(ouaa, {
          token: token.value,
          secretKey: secretKey.value,
          moveLeftPx: sliderX.value,
          imgWidthPx: props.imgWidth,
        });
        if (result.ok) {
          matched.value = true;
          failed.value = false;
          tipWords.value = "验证成功";
          emit("success", { captchaVerification: result.captchaVerification });
          resetTimer = setTimeout(() => {
            open.value = false;
            matched.value = false;
            sliderX.value = 0;
            tipWords.value = "";
          }, 600);
          return;
        }
        failed.value = true;
        tipWords.value = "验证失败，已更换题目";
        emit("fail");
        resetTimer = setTimeout(() => {
          void refresh({ keepFailTip: true });
        }, 800);
      } catch {
        failed.value = true;
        tipWords.value = "验证失败，请重试";
        emit("fail");
        resetTimer = setTimeout(() => {
          void refresh({ keepFailTip: true });
        }, 800);
      } finally {
        checking.value = false;
      }
    }

    function completeForTest(captchaVerification = "test-captcha-verification"): void {
      matched.value = true;
      open.value = false;
      emit("success", { captchaVerification });
    }

    onBeforeUnmount(() => {
      if (resetTimer !== undefined) {
        clearTimeout(resetTimer);
      }
    });

    expose({
      show,
      close,
      reset,
      refresh,
      completeForTest,
      open,
      matched,
      failed,
      sliderX,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
    });

    return {
      show,
      close,
      reset,
      refresh,
      completeForTest,
      open,
      loading,
      backgroundSrc,
      puzzleSrc,
      trackStyle,
      puzzleStyle,
      sliderStyle,
      tipClass,
      tipWords,
      matched,
      failed,
      sliderX,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      imgWidth: props.imgWidth,
      sliderSize: props.sliderSize,
    };
  },
  render(): VNode {
    return (
      <Teleport to="body">
        {this.open ? (
          <div
            class="pc-auth-verify-mask"
            data-testid="captcha-mask"
            onClick={(e: MouseEvent) => e.target === e.currentTarget && this.close()}
          >
            <div class="pc-auth-verify-box" data-testid="captcha-box">
              <div class="pc-auth-verify-box__top">
                <span>请完成安全验证</span>
                <button type="button" class="pc-auth-verify-box__close" data-testid="captcha-close" aria-label="关闭" onClick={this.close}>
                  ×
                </button>
              </div>
              <div class="pc-auth-verify-box__body">
                {this.loading ? (
                  <div class="pc-auth-verify-box__loading">加载中…</div>
                ) : (
                  <>
                    <div class="pc-auth-slider-captcha__track" style={this.trackStyle} data-testid="captcha-track">
                      {this.backgroundSrc ? (
                        <img class="pc-auth-slider-captcha__bg" src={this.backgroundSrc} alt="" draggable={false} />
                      ) : null}
                      <div class="pc-auth-slider-captcha__puzzle" style={this.puzzleStyle} data-testid="captcha-puzzle">
                        {this.puzzleSrc ? <img src={this.puzzleSrc} alt="" draggable={false} /> : null}
                      </div>
                      {this.tipWords ? (
                        <p class={["pc-auth-slider-captcha__tip", this.tipClass]} data-testid="captcha-tip">
                          {this.tipWords}
                        </p>
                      ) : null}
                    </div>
                    <div class="pc-auth-slider-captcha__rail" style={{ width: `${this.imgWidth}px` }} data-testid="captcha-rail">
                      <div class="pc-auth-slider-captcha__rail-track" />
                      <div class="pc-auth-slider-captcha__rail-fill" style={{ width: `${this.sliderX + this.sliderSize}px` }} />
                      <div
                        class={[
                          "pc-auth-slider-captcha__slider",
                          "pc-auth-slider-captcha__slider--round",
                          {
                            "pc-auth-slider-captcha__slider--matched": this.matched,
                            "pc-auth-slider-captcha__slider--failed": this.failed,
                          },
                        ]}
                        style={this.sliderStyle}
                        data-testid="captcha-slider"
                        onPointerdown={this.handlePointerDown}
                        onPointermove={this.handlePointerMove}
                        onPointerup={this.handlePointerUp}
                        onPointercancel={this.handlePointerUp}
                      >
                        {this.matched ? (
                          "✓"
                        ) : this.failed ? (
                          "×"
                        ) : (
                          <span class="pc-auth-slider-captcha__slider-bars" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      class="pc-auth-verify-box__refresh"
                      data-testid="captcha-refresh"
                      aria-label="刷新"
                      onClick={() => {
                        void this.refresh();
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 13.65-6.65z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Teleport>
    );
  },
});
