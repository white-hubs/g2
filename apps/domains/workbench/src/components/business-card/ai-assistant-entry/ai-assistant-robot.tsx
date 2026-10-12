import { defineComponent, onMounted, onUnmounted, shallowRef, watch, type PropType } from "vue";

export type AssistantRobotMood = "idle" | "ready" | "recognizing" | "listening" | "thinking";

/** Keep gaze subtle so pupils stay inside the original PNG eye sockets. */
const GAZE_MAX_X = 1.6;
const GAZE_MAX_Y = 1.0;
const BLINK_MIN_MS = 2800;
const BLINK_MAX_MS = 5600;
const BLINK_DURATION_MS = 120;

export default defineComponent({
  name: "AiAssistantRobot",
  props: {
    src: { type: String, required: true },
    mood: { type: String as PropType<AssistantRobotMood>, default: "idle" },
  },
  setup(props) {
    const rootRef = shallowRef<HTMLDivElement | null>(null);
    const blinking = shallowRef(false);
    const reducedMotion = shallowRef(false);

    let gazeRaf = 0;
    let pendingGazeX = 0;
    let pendingGazeY = 0;
    let blinkTimer: ReturnType<typeof setTimeout> | undefined;
    let blinkClearTimer: ReturnType<typeof setTimeout> | undefined;
    let motionQuery: MediaQueryList | undefined;

    const applyGaze = (): void => {
      gazeRaf = 0;
      const root = rootRef.value;
      if (!root) return;
      root.style.setProperty("--robot-gaze-x", `${pendingGazeX.toFixed(2)}px`);
      root.style.setProperty("--robot-gaze-y", `${pendingGazeY.toFixed(2)}px`);
    };

    const scheduleGaze = (x: number, y: number): void => {
      pendingGazeX = x;
      pendingGazeY = y;
      if (gazeRaf) return;
      gazeRaf = window.requestAnimationFrame(applyGaze);
    };

    const handlePointerMove = (event: MouseEvent): void => {
      if (reducedMotion.value || props.mood === "thinking") return;
      const root = rootRef.value;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const faceX = rect.left + rect.width * 0.47;
      const faceY = rect.top + rect.height * 0.4;
      let nx = Math.max(-1, Math.min(1, (event.clientX - faceX) / (rect.width * 0.8)));
      let ny = Math.max(-1, Math.min(1, (event.clientY - faceY) / (rect.height * 0.8)));

      if (props.mood === "recognizing") {
        nx = Math.max(-0.15, Math.min(1, nx * 0.5 + 0.55));
        ny = Math.max(-0.25, Math.min(0.4, ny * 0.5 + 0.12));
      }

      scheduleGaze(nx * GAZE_MAX_X, ny * GAZE_MAX_Y);
    };

    const handlePointerLeaveWindow = (): void => {
      if (props.mood === "recognizing") {
        scheduleGaze(GAZE_MAX_X * 0.55, GAZE_MAX_Y * 0.12);
        return;
      }
      scheduleGaze(0, 0);
    };

    const clearBlinkTimers = (): void => {
      if (blinkTimer) {
        clearTimeout(blinkTimer);
        blinkTimer = undefined;
      }
      if (blinkClearTimer) {
        clearTimeout(blinkClearTimer);
        blinkClearTimer = undefined;
      }
    };

    const scheduleBlink = (): void => {
      clearBlinkTimers();
      if (reducedMotion.value || document.hidden || props.mood === "thinking") return;
      const delay = BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
      blinkTimer = setTimeout(() => {
        blinking.value = true;
        blinkClearTimer = setTimeout(() => {
          blinking.value = false;
          scheduleBlink();
        }, BLINK_DURATION_MS);
      }, delay);
    };

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        clearBlinkTimers();
        blinking.value = false;
        return;
      }
      scheduleBlink();
    };

    const handleMotionChange = (): void => {
      reducedMotion.value = Boolean(motionQuery?.matches);
      if (reducedMotion.value) {
        clearBlinkTimers();
        blinking.value = false;
        scheduleGaze(0, 0);
        return;
      }
      scheduleBlink();
    };

    watch(
      () => props.mood,
      (mood) => {
        if (mood === "thinking") {
          clearBlinkTimers();
          blinking.value = false;
          scheduleGaze(0, 0);
          return;
        }
        if (mood === "recognizing") {
          scheduleGaze(GAZE_MAX_X * 0.55, GAZE_MAX_Y * 0.12);
        }
        scheduleBlink();
      },
    );

    onMounted(() => {
      motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      reducedMotion.value = motionQuery.matches;
      motionQuery.addEventListener("change", handleMotionChange);
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("mousemove", handlePointerMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", handlePointerLeaveWindow);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      if (props.mood === "recognizing") {
        scheduleGaze(GAZE_MAX_X * 0.55, GAZE_MAX_Y * 0.12);
      }
      scheduleBlink();
    });

    onUnmounted(() => {
      motionQuery?.removeEventListener("change", handleMotionChange);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousemove", handlePointerMove);
      document.documentElement.removeEventListener("mouseleave", handlePointerLeaveWindow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearBlinkTimers();
      if (gazeRaf) window.cancelAnimationFrame(gazeRaf);
    });

    return () => (
      <div
        ref={rootRef}
        class={[
          "ai-assistant-robot",
          `ai-assistant-robot--${props.mood}`,
          blinking.value && "ai-assistant-robot--blink",
          reducedMotion.value && "ai-assistant-robot--reduced-motion",
        ]}
        aria-hidden="true"
      >
        <div class="ai-assistant-robot__float">
          <img src={props.src} class="ai-assistant-robot__image" alt="" draggable={false} />
          {/* Cover only original pupil pixels — keep PNG visor/face untouched. */}
          <span class="ai-assistant-robot__eye ai-assistant-robot__eye--left">
            <span class="ai-assistant-robot__pupil" />
          </span>
          <span class="ai-assistant-robot__eye ai-assistant-robot__eye--right">
            <span class="ai-assistant-robot__pupil" />
          </span>
          <span class="ai-assistant-robot__think" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
        <span class="ai-assistant-robot__shadow" />
      </div>
    );
  },
});
