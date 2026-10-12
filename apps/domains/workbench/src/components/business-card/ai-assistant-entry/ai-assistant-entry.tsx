import {
  AlertOutlined,
  AppstoreOutlined,
  CameraOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FireOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons-vue";
import type { AssistantSkillOption } from "@g2-contract/workbench";
import { computed, defineComponent, h, nextTick, onMounted, onUnmounted, shallowRef, watch, type Component } from "vue";

import AiAssistantRobot from "./ai-assistant-robot";
import { fetchAssistantSkills } from "@/api/server";
import WorkbenchIcon from "@/components/icon/workbench-icon";
import { Textarea, Tooltip, message, Button } from "@/pc-ui-runtime";
import { navigateToApplication } from "@/utils/navigate";
import { SpeechInputController, type SpeechInputStatus } from "@/utils/speech-input";

import "./ai-assistant-entry.less";

/** MF remote 用静态 import.meta.url，避免打成壳根路径 `/assets/*.png`。 */
const robotImage = new URL("../../../assets/images/robot.png", import.meta.url).href;

const WORKBENCH_ASSISTANT_DRAFT_STORAGE_KEY = "cube-ai-application:workbench-assistant-draft";
const SKILL_AUTO_SCROLL_SPEED = 25;
const SKILL_SCROLLBAR_HIDE_DELAY = 450;
const TYPING_THINK_DELAY_MS = 750;

/** 对齐图2：技能胶囊左侧图标（按文案关键词映射，无后端 icon 字段时兜底）。 */
const SKILL_ICON_RULES: Array<{ match: RegExp; icon: Component }> = [
  { match: /法规|问答|制度|规范/u, icon: FileTextOutlined },
  { match: /对标|依据/u, icon: SafetyCertificateOutlined },
  { match: /传图|识图|识别|拍照/u, icon: CameraOutlined },
  { match: /重大|事故|判定|隐患/u, icon: AlertOutlined },
  { match: /检查|速查|要点/u, icon: FileSearchOutlined },
  { match: /火灾|消防|燃/u, icon: FireOutlined },
  { match: /报告|生成|分析/u, icon: ThunderboltOutlined },
];

function resolveSkillIcon(label: string): Component {
  for (const rule of SKILL_ICON_RULES) {
    if (rule.match.test(label)) return rule.icon;
  }
  return AppstoreOutlined;
}

export default defineComponent({
  name: "AiAssistantEntry",
  setup() {
    const question = shallowRef("");
    const voiceStatus = shallowRef<SpeechInputStatus>("idle");
    const inputFocused = shallowRef(false);
    const typingActive = shallowRef(false);
    const submitting = shallowRef(false);
    const skills = shallowRef<AssistantSkillOption[]>([]);
    const skillLoading = shallowRef(false);
    const selectedSkillIds = shallowRef<string[]>([]);
    const suggestionsViewportRef = shallowRef<HTMLDivElement | null>(null);
    const suggestionsRef = shallowRef<HTMLDivElement | null>(null);
    const scrollbarTrackRef = shallowRef<HTMLDivElement | null>(null);
    const scrollbarThumbRef = shallowRef<HTMLDivElement | null>(null);
    let typingThinkTimer: ReturnType<typeof setTimeout> | undefined;

    const clearTypingThinkTimer = (): void => {
      if (typingThinkTimer) {
        clearTimeout(typingThinkTimer);
        typingThinkTimer = undefined;
      }
    };

    const markTypingActivity = (): void => {
      typingActive.value = true;
      clearTypingThinkTimer();
      typingThinkTimer = setTimeout(() => {
        typingActive.value = false;
        typingThinkTimer = undefined;
      }, TYPING_THINK_DELAY_MS);
    };

    watch(question, () => {
      if (!inputFocused.value && question.value.trim().length === 0) {
        typingActive.value = false;
        clearTypingThinkTimer();
        return;
      }
      markTypingActivity();
    });

    const robotMood = computed(() => {
      if (submitting.value || voiceStatus.value === "transcribing" || voiceStatus.value === "starting") {
        return "thinking" as const;
      }
      if (voiceStatus.value === "recording") {
        return "listening" as const;
      }
      const asking = inputFocused.value || question.value.trim().length > 0;
      if (asking) {
        // Actively typing → recognizing face; brief pause → thinking dots.
        return typingActive.value || (inputFocused.value && question.value.trim().length === 0)
          ? ("recognizing" as const)
          : ("thinking" as const);
      }
      if (selectedSkillIds.value.length > 0) {
        return "ready" as const;
      }
      return "idle" as const;
    });
    let skillResizeObserver: ResizeObserver | undefined;
    let skillAutoScrollFrame: number | undefined;
    let skillLastAutoScrollAt = 0;
    let skillAutoScrollPosition = 0;
    let isAutoScrolling = false;
    let skillAutoScrollDirection = 1;
    let skillAutoScrollPaused = false;
    let skillMaxScrollLeft = 0;
    let skillScrollbarHideTimer: ReturnType<typeof setTimeout> | undefined;
    let skillScrollbarDragging = false;
    let skillViewportHovered = false;
    let skillDragStartX = 0;
    let skillDragStartScrollLeft = 0;

    const updateSkillViewportState = (): void => {
      const container = suggestionsRef.value;
      const viewport = suggestionsViewportRef.value;
      const track = scrollbarTrackRef.value;
      const thumb = scrollbarThumbRef.value;
      if (!container || !viewport || !track || !thumb) return;

      skillMaxScrollLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
      const hasOverflow = skillMaxScrollLeft > 1;
      viewport.classList.toggle("ai-assistant-entry__suggestions--fade-start", hasOverflow && container.scrollLeft > 1);
      viewport.classList.toggle("ai-assistant-entry__suggestions--fade-end", hasOverflow && container.scrollLeft < skillMaxScrollLeft - 1);

      const visibleRatio = container.scrollWidth > 0 ? container.clientWidth / container.scrollWidth : 1;
      const thumbWidth = Math.max(4, Math.min(100, visibleRatio * 100));
      const thumbLeft = hasOverflow ? (container.scrollLeft / skillMaxScrollLeft) * (100 - thumbWidth) : 0;
      thumb.style.width = `${thumbWidth}%`;
      thumb.style.left = `${thumbLeft}%`;
      thumb.setAttribute("aria-valuenow", String(Math.round(thumbLeft)));
    };

    const handleSkillScroll = (): void => {
      if (!isAutoScrolling) {
        skillAutoScrollPosition = suggestionsRef.value?.scrollLeft ?? 0;
      }
      updateSkillViewportState();
    };

    const stopSkillAutoScroll = (): void => {
      if (skillAutoScrollFrame !== undefined) {
        window.cancelAnimationFrame(skillAutoScrollFrame);
        skillAutoScrollFrame = undefined;
      }
      skillLastAutoScrollAt = 0;
    };

    const runSkillAutoScroll = (timestamp: number): void => {
      const container = suggestionsRef.value;
      if (!container || skillAutoScrollPaused || document.hidden || skillMaxScrollLeft <= 1) {
        stopSkillAutoScroll();
        return;
      }

      const elapsed = skillLastAutoScrollAt ? timestamp - skillLastAutoScrollAt : 0;
      skillLastAutoScrollAt = timestamp;
      const nextScrollLeft = skillAutoScrollPosition + (skillAutoScrollDirection * (SKILL_AUTO_SCROLL_SPEED * elapsed)) / 1000;
      if (nextScrollLeft >= skillMaxScrollLeft) {
        skillAutoScrollPosition = skillMaxScrollLeft;
        skillAutoScrollDirection = -1;
      } else if (nextScrollLeft <= 0) {
        skillAutoScrollPosition = 0;
        skillAutoScrollDirection = 1;
      } else {
        skillAutoScrollPosition = nextScrollLeft;
      }
      isAutoScrolling = true;
      container.scrollLeft = Math.round(skillAutoScrollPosition);
      isAutoScrolling = false;
      updateSkillViewportState();
      skillAutoScrollFrame = window.requestAnimationFrame(runSkillAutoScroll);
    };

    const startSkillAutoScroll = (): void => {
      if (skillAutoScrollPaused || skillAutoScrollFrame !== undefined || skillMaxScrollLeft <= 1 || document.hidden) return;
      skillAutoScrollFrame = window.requestAnimationFrame(runSkillAutoScroll);
    };

    const refreshSkillViewport = (): void => {
      updateSkillViewportState();
      if (skillAutoScrollFrame === undefined) {
        skillAutoScrollPosition = suggestionsRef.value?.scrollLeft ?? 0;
      }
      if (skillMaxScrollLeft <= 1) {
        stopSkillAutoScroll();
        return;
      }
      if (skillViewportHovered) {
        scrollbarTrackRef.value?.classList.add("ai-assistant-entry__scrollbar--visible");
      }
      startSkillAutoScroll();
    };

    const clearSkillScrollbarHideTimer = (): void => {
      if (skillScrollbarHideTimer) {
        clearTimeout(skillScrollbarHideTimer);
        skillScrollbarHideTimer = undefined;
      }
    };

    const revealSkillScrollbar = (): void => {
      clearSkillScrollbarHideTimer();
      scrollbarTrackRef.value?.classList.toggle("ai-assistant-entry__scrollbar--visible", skillMaxScrollLeft > 1);
    };

    const hideSkillScrollbar = (): void => {
      clearSkillScrollbarHideTimer();
      skillScrollbarHideTimer = setTimeout(() => {
        scrollbarTrackRef.value?.classList.remove("ai-assistant-entry__scrollbar--visible");
      }, SKILL_SCROLLBAR_HIDE_DELAY);
    };

    const pauseSkillAutoScroll = (): void => {
      skillAutoScrollPaused = true;
      stopSkillAutoScroll();
    };

    const resumeSkillAutoScroll = (): void => {
      skillAutoScrollPaused = false;
      startSkillAutoScroll();
    };

    const handleSkillViewportEnter = (): void => {
      skillViewportHovered = true;
      revealSkillScrollbar();
      pauseSkillAutoScroll();
    };

    const handleSkillViewportLeave = (): void => {
      skillViewportHovered = false;
      if (skillScrollbarDragging) return;
      hideSkillScrollbar();
      resumeSkillAutoScroll();
    };

    const setSkillScrollFromTrackPosition = (clientX: number): void => {
      const container = suggestionsRef.value;
      const track = scrollbarTrackRef.value;
      if (!container || !track || skillMaxScrollLeft <= 1) return;

      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      const thumbWidth = Number.parseFloat(scrollbarThumbRef.value?.style.width ?? "100") || 100;
      const thumbTravelRatio = Math.max(1 - thumbWidth / 100, 0.01);
      const pointerRatio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      const scrollRatio = Math.min(Math.max((pointerRatio - thumbWidth / 200) / thumbTravelRatio, 0), 1);
      container.scrollLeft = scrollRatio * skillMaxScrollLeft;
      handleSkillScroll();
    };

    const handleScrollbarTrackPointerDown = (event: PointerEvent): void => {
      event.preventDefault();
      revealSkillScrollbar();
      setSkillScrollFromTrackPosition(event.clientX);
    };

    const endSkillScrollbarDrag = (): void => {
      if (!skillScrollbarDragging) return;
      skillScrollbarDragging = false;
      window.removeEventListener("pointermove", handleSkillScrollbarPointerMove);
      window.removeEventListener("pointerup", endSkillScrollbarDrag);

      if (skillViewportHovered) return;
      hideSkillScrollbar();
      resumeSkillAutoScroll();
    };

    const handleSkillScrollbarPointerMove = (event: PointerEvent): void => {
      const container = suggestionsRef.value;
      const track = scrollbarTrackRef.value;
      if (!container || !track || !skillScrollbarDragging || skillMaxScrollLeft <= 1) return;

      const thumbWidth = Number.parseFloat(scrollbarThumbRef.value?.style.width ?? "100") || 100;
      const thumbTravel = track.clientWidth * Math.max(1 - thumbWidth / 100, 0.01);
      container.scrollLeft = Math.min(
        Math.max(skillDragStartScrollLeft + ((event.clientX - skillDragStartX) / thumbTravel) * skillMaxScrollLeft, 0),
        skillMaxScrollLeft,
      );
      handleSkillScroll();
    };

    const handleScrollbarThumbPointerDown = (event: PointerEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      skillScrollbarDragging = true;
      skillDragStartX = event.clientX;
      skillDragStartScrollLeft = suggestionsRef.value?.scrollLeft ?? 0;
      revealSkillScrollbar();
      pauseSkillAutoScroll();
      window.addEventListener("pointermove", handleSkillScrollbarPointerMove);
      window.addEventListener("pointerup", endSkillScrollbarDrag);
    };

    const handleScrollbarThumbKeydown = (event: KeyboardEvent): void => {
      const container = suggestionsRef.value;
      if (!container || skillMaxScrollLeft <= 1) return;

      const step = Math.min(container.clientWidth * 0.35, 120);
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        container.scrollLeft = Math.max(container.scrollLeft - step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        container.scrollLeft = Math.min(container.scrollLeft + step, skillMaxScrollLeft);
      } else {
        return;
      }
      handleSkillScroll();
    };

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        stopSkillAutoScroll();
        return;
      }
      refreshSkillViewport();
    };
    const speechController = new SpeechInputController({
      onStateChange: ({ status }) => {
        voiceStatus.value = status;
      },
      onTranscribed: (text) => {
        const normalized = text.trim();
        if (!normalized) return;
        question.value = question.value.trim() ? `${question.value.trim()} ${normalized}` : normalized;
      },
      onError: (error) => {
        message.error(error instanceof Error ? error.message : "语音识别失败");
      },
    });

    const loadSkills = async (): Promise<void> => {
      skillLoading.value = true;
      try {
        skills.value = await fetchAssistantSkills();
        await nextTick();
        refreshSkillViewport();
      } catch {
        skills.value = [];
        await nextTick();
        refreshSkillViewport();
      } finally {
        skillLoading.value = false;
      }
    };

    const toggleSkill = (skillId: string): void => {
      selectedSkillIds.value = selectedSkillIds.value.includes(skillId)
        ? selectedSkillIds.value.filter((id) => id !== skillId)
        : [...selectedSkillIds.value, skillId];
    };

    const goAssistant = async (): Promise<void> => {
      if (submitting.value) return;
      submitting.value = true;
      try {
        sessionStorage.setItem(
          WORKBENCH_ASSISTANT_DRAFT_STORAGE_KEY,
          JSON.stringify({
            question: question.value.trim(),
            skillIds: selectedSkillIds.value,
            createdAt: Date.now(),
          }),
        );
      } catch {
        submitting.value = false;
        message.error("暂无法保存 AI 草稿，请稍后重试");
        return;
      }

      // Brief thinking pose so submit feedback is visible before navigation.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 420);
      });

      const search = new URLSearchParams({ hideMenu: "1", fromWorkbench: "1" });
      const path = `/portal/ai-application/assistant?${search.toString()}`;
      navigateToApplication({ code: "AI_APPLICATION_CENTE", path });
      submitting.value = false;
    };

    const toggleSpeechInput = async (): Promise<void> => {
      if (voiceStatus.value === "starting" || voiceStatus.value === "transcribing") return;
      await speechController.handleClick();
    };

    onUnmounted(() => {
      endSkillScrollbarDrag();
      stopSkillAutoScroll();
      clearSkillScrollbarHideTimer();
      clearTypingThinkTimer();
      skillResizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void speechController.dispose();
    });

    onMounted(() => {
      skillResizeObserver = new ResizeObserver(refreshSkillViewport);
      if (suggestionsRef.value) {
        skillResizeObserver.observe(suggestionsRef.value);
      }
      document.addEventListener("visibilitychange", handleVisibilityChange);
      void loadSkills();
    });

    return () => (
      <section class="ai-assistant-entry">
        <AiAssistantRobot src={robotImage} mood={robotMood.value} />
        <div class="ai-assistant-entry__body">
          <h2>您好，欢迎使用安全生产管理助手</h2>
          <p>您可以选择安全专家、智能助手、智能应用等业务场景进行提问</p>
          <div
            ref={suggestionsViewportRef}
            class="ai-assistant-entry__suggestions-viewport"
            onMouseenter={handleSkillViewportEnter}
            onMouseleave={handleSkillViewportLeave}
          >
            <div ref={suggestionsRef} class="ai-assistant-entry__suggestions" onScroll={handleSkillScroll}>
              <div class="ai-assistant-entry__suggestions-content">
                {skills.value.map((skill) => (
                  <button
                    class={selectedSkillIds.value.includes(skill.id) && "ai-assistant-entry__suggestion--selected"}
                    type="button"
                    aria-pressed={selectedSkillIds.value.includes(skill.id)}
                    onClick={() => toggleSkill(skill.id)}
                  >
                    {h(resolveSkillIcon(skill.label), { class: "ai-assistant-entry__suggestion-icon" })}
                    <span>{skill.label}</span>
                  </button>
                ))}
                {!skillLoading.value && skills.value.length === 0 && (
                  <span class="ai-assistant-entry__suggestions-empty">暂无可用技能</span>
                )}
              </div>
            </div>
            <div ref={scrollbarTrackRef} class="ai-assistant-entry__scrollbar" onPointerdown={handleScrollbarTrackPointerDown}>
              <div
                ref={scrollbarThumbRef}
                class="ai-assistant-entry__scrollbar-thumb"
                role="slider"
                tabindex={0}
                aria-label="Skills 列表滚动位置"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={0}
                onPointerdown={handleScrollbarThumbPointerDown}
                onKeydown={handleScrollbarThumbKeydown}
              />
            </div>
          </div>
          <div class="ai-assistant-entry__input">
            <Textarea
              class="ai-assistant-entry__input-control"
              v-model:value={question.value}
              placeholder="请输入您的问题"
              autoSize={{ minRows: 3, maxRows: 6 }}
              showCount={false}
              bordered={false}
              allowClear={false}
              onFocus={() => {
                inputFocused.value = true;
                markTypingActivity();
              }}
              onBlur={() => {
                inputFocused.value = false;
                if (question.value.trim().length === 0) {
                  typingActive.value = false;
                  clearTypingThinkTimer();
                }
              }}
            />
            <Tooltip
              title={
                voiceStatus.value === "recording"
                  ? "正在录音，点击结束"
                  : voiceStatus.value === "transcribing"
                    ? "正在识别语音"
                    : "语音输入"
              }
            >
              <span
                class={[
                  "ai-assistant-entry__voice",
                  voiceStatus.value === "recording" && "ai-assistant-entry__voice--recording",
                  voiceStatus.value === "starting" && "ai-assistant-entry__voice--pending",
                ]}
                role="button"
                tabindex={0}
                aria-label="语音输入"
                onClick={() => void toggleSpeechInput()}
                onKeydown={(event: KeyboardEvent) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void toggleSpeechInput();
                  }
                }}
              >
                <WorkbenchIcon iconClass="icon-yuyin" />
              </span>
            </Tooltip>
            <Button type="primary" loading={submitting.value} onClick={() => void goAssistant()}>
              <WorkbenchIcon iconClass="icon-a-submitbutton" />
            </Button>
          </div>
        </div>
      </section>
    );
  },
});
