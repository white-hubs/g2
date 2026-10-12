import { PlusOutlined } from "@ant-design/icons-vue";
import type { WorkbenchCard as Card } from "@g2-contract/workbench";
import { defineComponent, reactive, onMounted, h, shallowRef } from "vue";
import { useRouter } from "vue-router";
import VueDraggable from "vuedraggable-es";

import { resolveWorkbenchCard } from "../../components/resolve-workbench-card";
import * as WorkbenchCards from "../../components/workbench-cards";
import { cubeWorkbenchService } from "@/api/server";
import { Input, Button, Empty, Space, message, ZhConfigProvider } from "@/pc-ui-runtime";

import styles from "./work-bench.module.less";

interface WorkbenchState {
  list: Card[];
  cards: Card[];
  searchValue: string | null;
  hasPendingChanges: boolean;
  saving: boolean;
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
      cards: [],
      searchValue: null,
      hasPendingChanges: false,
      saving: false,
    });
    const removedCardCodes = new Set<string>();
    const locallyRemovedCards = new Map<string, Card>();
    const serverAvailableCards = shallowRef<Card[]>([]);

    const isCardAvailable = (item: Card): boolean => !item.defaultCard && !state.list.some((card) => card.code === item.code);

    const matchesKeyword = (item: Card): boolean => {
      const keyword = (state.searchValue ?? "").trim();
      return keyword === "" || item.name.includes(keyword);
    };

    const syncAvailableCards = (): void => {
      const candidates = new Map<string, Card>();
      serverAvailableCards.value.forEach((item) => candidates.set(item.code, item));
      locallyRemovedCards.forEach((item, code) => candidates.set(code, item));
      state.cards = [...candidates.values()].filter(isCardAvailable).filter(matchesKeyword);
    };

    const loadServerAvailableCards = async (): Promise<void> => {
      const res = await cubeWorkbenchService.getNoUseCards({ keyword: "" });
      serverAvailableCards.value = res.filter((item) => !item.defaultCard);
      syncAvailableCards();
    };

    const searchAvailableCards = (): void => {
      syncAvailableCards();
    };

    const getHomeData = async (): Promise<void> => {
      const res = await cubeWorkbenchService.getCards();
      state.list = res;
    };

    const onEnd = (): void => {
      state.hasPendingChanges = true;
    };

    const handleSize = (item: Card, size: string): void => {
      if (item.cardSize === size) return;
      item.cardSize = size;
      state.hasPendingChanges = true;
    };

    const handleClose = (item: Card): void => {
      if (item.defaultCard) return;
      state.list = state.list.filter((card) => card.code !== item.code);
      removedCardCodes.add(item.code);
      locallyRemovedCards.set(item.code, { ...item });
      syncAvailableCards();
      state.hasPendingChanges = true;
    };

    const handleAdd = (item: Card): void => {
      if (!isCardAvailable(item)) return;
      state.list.push({ ...item, cardSize: item.cardSize || "flex1" });
      removedCardCodes.delete(item.code);
      locallyRemovedCards.delete(item.code);
      syncAvailableCards();
      state.hasPendingChanges = true;
    };

    const createSavePayload = (): Record<string, unknown>[] =>
      state.list.map((item, index) => ({
        id: item.id,
        applicationCode: item.applicationCode,
        applicationId: item.applicationId,
        cardSize: item.cardSize || "flex1",
        cardCode: item.code,
        cardId: item.id,
        sort: index,
      }));

    const saveCards = async (): Promise<void> => {
      if (!state.hasPendingChanges || state.saving) return;
      state.saving = true;
      try {
        for (const code of removedCardCodes) {
          await cubeWorkbenchService.deleteHomeCard(code);
          removedCardCodes.delete(code);
        }
        await cubeWorkbenchService.saveHomeCard(createSavePayload());
        locallyRemovedCards.clear();
        state.hasPendingChanges = false;
        message.success("卡片配置已保存");
        await getHomeData();
        await loadServerAvailableCards();
      } catch {
        message.error("卡片配置保存失败，请稍后重试");
      } finally {
        state.saving = false;
      }
    };

    const loadInitialData = async (): Promise<void> => {
      await getHomeData();
      await loadServerAvailableCards();
    };

    const goBack = (): void => {
      // 禁止 history.pushState 绕过壳层路由（旧仓易踩坑）；改走 vue-router。
      void router.replace({ path: "/d/workbench" });
    };

    onMounted(() => {
      void loadInitialData();
    });

    const renderSizeButton = (element: Card, size: string, label: string) => (
      <div
        onClick={() => {
          handleSize(element, size);
        }}
        class={styles[element.cardSize === size ? "primary-color" : ""]}
      >
        {label}
      </div>
    );

    return () => (
      <ZhConfigProvider>
        <div class={styles["workbench-container"]}>
          <div class={styles["workbench-list"]}>
            <div class={styles["list-header"]}>
              <span class={styles["primary-color"]} />
              <span class={styles["header-title"]}>点击添加或者拖动卡片排序</span>
              <span class={styles["header-subtitle"]}></span>
            </div>
            <div class={styles["list-search"]}>
              <div class={styles["search-input"]}>
                <Input v-model:value={state.searchValue} placeholder="卡片名称" />
              </div>
              <Button type="primary" onClick={searchAvailableCards}>
                查询
              </Button>
            </div>
            <div class={styles["list-content"]}>
              {state.cards.map((item) => (
                <div class={styles["list-item"]} key={item.code}>
                  <div class={styles["item-title"]}>
                    <span>{item.name}</span>
                    {/* <Button shape='circle' size='small' onClick={async () => addCards(item)}>
                    {{
                      icon: () => <PlusOutlined />
                    }}
                  </Button> */}
                    <PlusOutlined onClick={() => handleAdd(item)} />
                  </div>
                </div>
              ))}
              {state.cards.length === 0 && <Empty description="暂无数据" />}
            </div>
          </div>
          <div class={styles["workbench-draggable"]}>
            {state.list.length > 0 ? (
              <VueDraggable
                list={state.list}
                // @ts-ignore
                ghostClass="ghost"
                chosenClass="chosenClass"
                class={styles["draggable-list"]}
                animation={300}
                onEnd={onEnd}
                itemKey="code"
              >
                {{
                  item: ({ element }: { element: Card }) => (
                    <div key={element.code} class={[styles["item"], styles[element.cardSize] || styles["flex1"]]}>
                      <div class={styles["item-size"]}>
                        {renderSizeButton(element, "flex1", "小")}
                        {renderSizeButton(element, "flex2", "中")}
                        {renderSizeButton(element, "flex3", "大")}
                      </div>
                      {(() => {
                        const card = resolveWorkbenchCard(element.code);
                        return card ? h(card, element.defaultCard ? { closable: false } : { onClose: () => handleClose(element) }) : null;
                      })()}
                    </div>
                  ),
                }}
              </VueDraggable>
            ) : (
              <div class={styles["workbench-empty"]}>
                <Empty description="请点击左侧添加按钮，添加卡片" />
              </div>
            )}
          </div>
          <div class={styles["workbench-footer"]}>
            <Space>
              <Button onClick={goBack}>返回</Button>
              <Button type="primary" loading={state.saving} disabled={!state.hasPendingChanges} onClick={() => void saveCards()}>
                保存
              </Button>
            </Space>
          </div>
        </div>
      </ZhConfigProvider>
    );
  },
});
