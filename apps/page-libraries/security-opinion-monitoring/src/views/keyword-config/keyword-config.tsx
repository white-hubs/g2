import type { KeywordItemVO, KeywordRuleVO, KeywordType } from "@g2-contract/security-opinion";
import { Button, Card, Empty, Form, FormItem, Input, InputNumber, Modal, Select, SelectOption, message } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent, computed, onMounted, reactive, ref } from "vue";

import { securityOpinionApi } from "../../api/security-opinion";
import { PageShell } from "../../components/page-shell/page-shell";
import { COLLECT_TIME_RANGE_OPTIONS, DEDUP_STRATEGY_OPTIONS, MATCH_STRATEGY_OPTIONS } from "../../constants";
import { usePageName } from "../../utils/page-name";

import styles from "./keyword-config.module.css";

export const KeywordConfigPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const rule = reactive<KeywordRuleVO>({
      matchStrategy: "any",
      minMatchCount: 2,
      dedupStrategy: "title",
      collectTimeRange: "6h",
    });
    const includeKeywords = ref<KeywordItemVO[]>([]);
    const excludeKeywords = ref<KeywordItemVO[]>([]);
    const includeInput = ref("");
    const excludeInput = ref("");
    const presetVisible = ref(false);
    const presetLoading = ref(false);
    const presetType = ref<KeywordType>("include");
    const presetWords = ref<string[]>([]);

    const showMinMatch = computed(() => rule.matchStrategy === "atLeastN");

    const fetchAll = async (): Promise<void> => {
      const [ruleData, include, exclude] = await Promise.all([
        securityOpinionApi.getKeywordRule(),
        securityOpinionApi.listKeywords("include"),
        securityOpinionApi.listKeywords("exclude"),
      ]);
      Object.assign(rule, ruleData);
      includeKeywords.value = include;
      excludeKeywords.value = exclude;
    };

    const saveRule = async (): Promise<void> => {
      await securityOpinionApi.updateKeywordRule({ ...rule });
      message.success("过滤规则已保存");
    };

    const addKeyword = async (type: KeywordType, word: string): Promise<void> => {
      const trimmed = word.trim();
      if (!trimmed) return;
      await securityOpinionApi.addKeyword(type, trimmed);
      await fetchAll();
    };

    const removeKeyword = async (id: string): Promise<void> => {
      await securityOpinionApi.deleteKeyword(id);
      await fetchAll();
    };

    const currentKeywords = computed(() => (presetType.value === "include" ? includeKeywords.value : excludeKeywords.value));

    const loadPresetWords = async (type: KeywordType): Promise<void> => {
      presetWords.value = await securityOpinionApi.listKeywordPresets(type);
    };

    const openPreset = async (type: KeywordType): Promise<void> => {
      presetType.value = type;
      presetVisible.value = true;
      presetLoading.value = true;
      try {
        await loadPresetWords(type);
      } catch {
        presetWords.value = [];
        message.error("预设词库加载失败");
      } finally {
        presetLoading.value = false;
      }
    };

    const applyPreset = async (word: string): Promise<void> => {
      await securityOpinionApi.addKeywordFromPreset(presetType.value, word);
      message.success("已添加关键词");
      await fetchAll();
      await loadPresetWords(presetType.value);
    };

    const applyAllPresets = async (): Promise<void> => {
      const type = presetType.value;
      const existing = new Set(currentKeywords.value.map((k) => k.keywordText));
      const toAdd = presetWords.value.filter((w) => !existing.has(w));
      if (toAdd.length === 0) {
        message.info("预设词已全部添加");
        return;
      }
      await securityOpinionApi.batchAddKeywordPresets(type);
      message.success("已批量添加预设词");
      await fetchAll();
      await loadPresetWords(type);
    };

    const onIncludeEnter = (): void => {
      void addKeyword("include", includeInput.value).then(() => {
        includeInput.value = "";
      });
    };

    const onExcludeEnter = (): void => {
      void addKeyword("exclude", excludeInput.value).then(() => {
        excludeInput.value = "";
      });
    };

    onMounted(() => {
      void fetchAll();
    });

    const renderKeywordCard = (
      type: KeywordType,
      title: string,
      keywords: KeywordItemVO[],
      inputVal: typeof includeInput,
      onEnter: () => void,
    ) => (
      <Card class={[styles.card, type === "include" ? styles.includeCard : styles.excludeCard]}>
        <div class={styles.cardHeader}>
          <span class={styles.cardTitle}>{title}</span>
          <div class={styles.cardActions}>
            <span class={styles.count}>{keywords.length} 个</span>
            <Button
              size="small"
              onClick={() => {
                void openPreset(type);
              }}
            >
              预设
            </Button>
          </div>
        </div>
        <div class={styles.tagList}>
          {keywords.map((k) => (
            <span key={k.id} class={[styles.keywordChip, type === "include" ? styles.keywordChipInclude : styles.keywordChipExclude]}>
              <span class={styles.keywordWord}>{k.keywordText}</span>
              <span
                class={styles.keywordChipClose}
                role="button"
                aria-label={`删除关键词 ${k.keywordText}`}
                onClick={() => {
                  void removeKeyword(k.id);
                }}
              >
                ×
              </span>
            </span>
          ))}
        </div>
        <Input v-model:value={inputVal.value} placeholder="输入关键词后按回车添加" class={styles.keywordInput} onPressEnter={onEnter} />
      </Card>
    );

    const addedPresetCount = computed(() => presetWords.value.filter((w) => currentKeywords.value.some((k) => k.keywordText === w)).length);

    const presetModalTitle = computed(() => (presetType.value === "include" ? "预设包含关键词" : "预设排除关键词"));

    const isIncludePreset = computed(() => presetType.value === "include");

    return () => (
      <PageShell
        title={pageTitle.value}
        showFooter={false}
        v-slots={{
          "layout-content": () => (
            <div class={styles.page}>
              <div class={styles.keywordGrid}>
                {renderKeywordCard("include", "包含关键词", includeKeywords.value, includeInput, onIncludeEnter)}
                {renderKeywordCard("exclude", "排除关键词", excludeKeywords.value, excludeInput, onExcludeEnter)}
              </div>

              <Card class={styles.ruleCard} title="过滤规则">
                <Form layout="vertical">
                  <div class={styles.ruleGrid}>
                    <FormItem label="匹配策略">
                      <Select
                        v-model:value={rule.matchStrategy}
                        onChange={() => {
                          void saveRule();
                        }}
                      >
                        {MATCH_STRATEGY_OPTIONS.map((o) => (
                          <SelectOption key={o.value} value={o.value}>
                            {o.label}
                          </SelectOption>
                        ))}
                      </Select>
                    </FormItem>
                    {showMinMatch.value && (
                      <FormItem label="最小匹配数">
                        <InputNumber
                          v-model:value={rule.minMatchCount}
                          min={1}
                          max={10}
                          onChange={() => {
                            void saveRule();
                          }}
                        />
                      </FormItem>
                    )}
                    <FormItem label="去重策略">
                      <Select
                        v-model:value={rule.dedupStrategy}
                        onChange={() => {
                          void saveRule();
                        }}
                      >
                        {DEDUP_STRATEGY_OPTIONS.map((o) => (
                          <SelectOption key={o.value} value={o.value}>
                            {o.label}
                          </SelectOption>
                        ))}
                      </Select>
                    </FormItem>
                    <FormItem label="采集时间范围">
                      <Select
                        v-model:value={rule.collectTimeRange}
                        onChange={() => {
                          void saveRule();
                        }}
                      >
                        {COLLECT_TIME_RANGE_OPTIONS.map((o) => (
                          <SelectOption key={o.value} value={o.value}>
                            {o.label}
                          </SelectOption>
                        ))}
                      </Select>
                    </FormItem>
                  </div>
                </Form>
                <p class={styles.hint}>规则将在启动采集后自动应用</p>
              </Card>

              <Modal
                open={presetVisible.value}
                title={presetModalTitle.value}
                width={680}
                footer={
                  <Button
                    onClick={() => {
                      presetVisible.value = false;
                    }}
                  >
                    关闭
                  </Button>
                }
                onCancel={() => {
                  presetVisible.value = false;
                }}
              >
                {presetLoading.value ? (
                  <div class={styles.presetEmpty}>加载中...</div>
                ) : (
                  <>
                    <div class={styles.presetHeader}>
                      <span>
                        共 {presetWords.value.length} 个预设词，已添加 {addedPresetCount.value} 个
                      </span>
                      <Button
                        type="primary"
                        disabled={presetWords.value.length === 0}
                        onClick={() => {
                          void applyAllPresets();
                        }}
                      >
                        全部添加
                      </Button>
                    </div>
                    {presetWords.value.length === 0 ? (
                      <Empty description="暂无预设词" class={styles.presetEmpty} />
                    ) : (
                      <div class={styles.presetTags}>
                        {presetWords.value.map((w) => {
                          const added = currentKeywords.value.some((k) => k.keywordText === w);
                          const chipClass = isIncludePreset.value
                            ? added
                              ? styles.presetChipIncludeAdded
                              : styles.presetChipInclude
                            : added
                              ? styles.presetChipExcludeAdded
                              : styles.presetChipExclude;
                          return (
                            <span
                              key={w}
                              class={[styles.presetChip, chipClass]}
                              onClick={() => {
                                if (!added) void applyPreset(w);
                              }}
                            >
                              {added && <span class={styles.presetCheck}>✓</span>}
                              <span class={styles.presetWord}>{w}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </Modal>
            </div>
          ),
        }}
      />
    );
  },
});
