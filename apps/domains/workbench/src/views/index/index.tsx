import type { WorkbenchCard as Card } from "@g2-contract/workbench";
import { defineComponent, reactive, onMounted, h } from "vue";
import { useRouter } from "vue-router";

import AiAssistantEntry from "../../components/business-card/ai-assistant-entry/ai-assistant-entry";
import QuickEntry from "../../components/business-card/quick-entry/quick-entry";
import UserWelcome from "../../components/business-card/user-welcome/user-welcome";
import { resolveWorkbenchCard } from "../../components/resolve-workbench-card";
import * as WorkbenchCards from "../../components/workbench-cards";
import { cubeWorkbenchService } from "@/api/server";
import { ZhConfigProvider } from "@/pc-ui-runtime";

import styles from "./index.module.less";
interface WorkbenchState {
  list: Card[];
}

export default defineComponent({
  name: "Workbench",
  components: {
    ...WorkbenchCards,
  },
  setup() {
    const router = useRouter();
    const state = reactive<WorkbenchState>({
      list: [],
    });
    const getHomeData = async (): Promise<void> => {
      const res = await cubeWorkbenchService.getCards();
      state.list = res;
    };
    const resetScrollPosition = (): void => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      let container = document.querySelector<HTMLElement>(".shell-pc-content");
      while (container) {
        container.scrollTop = 0;
        container = container.parentElement;
      }
    };

    const goWorkbench = async (): Promise<void> => {
      resetScrollPosition();
      await router.replace({ path: "/d/workbench/config" });
      requestAnimationFrame(() => {
        resetScrollPosition();
        requestAnimationFrame(resetScrollPosition);
      });
    };
    onMounted(() => {
      getHomeData();
    });

    return () => (
      <ZhConfigProvider>
        <div class={styles["workbench-container"]}>
          <div class={styles["workbench-draggable"]}>
            <div class={styles["top-section"]}>
              <div class={styles["top-section__main"]}>
                <UserWelcome />
                <AiAssistantEntry />
              </div>
              <QuickEntry />
            </div>
            <div class={styles["section-title"]}>
              <div class={styles["span-title"]}>
                <div class={styles["title-padding"]}>个人业务看板</div>
              </div>
              <span>汇总个人待办、任务、文档、公告信息</span>
            </div>
            <div class={styles["draggable-list"]}>
              {state.list.map((element) => (
                <div key={element.id} class={[styles["item"], styles[element.cardSize] || styles["flex1"]]}>
                  {(() => {
                    const card = resolveWorkbenchCard(element.code);
                    return card ? h(card) : null;
                  })()}
                </div>
              ))}
              <button class={[styles["item"], styles["flex1"], styles["extension-slot"]]} type="button" onClick={goWorkbench}>
                <span class={styles["extension-slot__icon"]}>+</span>
                <span>卡片配置</span>
              </button>
            </div>
          </div>
        </div>
      </ZhConfigProvider>
    );
  },
});
