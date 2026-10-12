import type { SafetyCreditPublicityConfigVO } from "@g2-contract/safety-credit";
import { Button, Checkbox, Form, FormItem, Input, PageLayout, Space, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { cleanText, displayText } from "../s2/shared";
import { getSafetyCreditClient } from "@/domain-context";

import "../s2/s2.less";
import "./s4.less";

interface PublicityOptions {
  showScore: boolean;
  showGrade: boolean;
  showRank: boolean;
  showViolationCount: boolean;
}

type PublicityOptionField = keyof PublicityOptions;

interface PublicityForm extends PublicityOptions {
  parkName: string;
}

const optionItems: { field: PublicityOptionField; label: string; description: string }[] = [
  { field: "showScore", label: "展示信用分", description: "在公示内容中显示商户当前信用分。" },
  { field: "showGrade", label: "展示信用等级", description: "在公示内容中显示 A/B/C/D 信用等级。" },
  { field: "showRank", label: "展示排名", description: "在公示内容中显示商户在当前范围内的排名。" },
  { field: "showViolationCount", label: "展示近期违规数", description: "在公示内容中显示近期违规扣分记录数量。" },
];

function defaultOptions(): PublicityOptions {
  return {
    showScore: true,
    showGrade: true,
    showRank: true,
    showViolationCount: true,
  };
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseOptions(configJson?: string): PublicityOptions {
  if (configJson === undefined || configJson.trim() === "") {
    return defaultOptions();
  }
  try {
    const parsed = JSON.parse(configJson) as Record<string, unknown>;
    const defaults = defaultOptions();
    return {
      showScore: toBoolean(parsed.showScore, defaults.showScore),
      showGrade: toBoolean(parsed.showGrade, defaults.showGrade),
      showRank: toBoolean(parsed.showRank, defaults.showRank),
      showViolationCount: toBoolean(parsed.showViolationCount, defaults.showViolationCount),
    };
  } catch {
    return defaultOptions();
  }
}

function stringifyOptions(form: PublicityForm): string {
  return JSON.stringify(
    {
      showScore: form.showScore,
      showGrade: form.showGrade,
      showRank: form.showRank,
      showViolationCount: form.showViolationCount,
    },
    null,
    2,
  );
}

export const PublicityConfig = defineComponent({
  name: "PublicityConfig",
  setup: () => {
    const loading = ref(false);
    const saving = ref(false);
    const loadedConfig = ref<SafetyCreditPublicityConfigVO | null>(null);
    const form = reactive<PublicityForm>({
      parkName: "",
      ...defaultOptions(),
    });

    function applyConfig(config: SafetyCreditPublicityConfigVO): void {
      const options = parseOptions(config.configJson);
      form.parkName = config.parkName;
      form.showScore = options.showScore;
      form.showGrade = options.showGrade;
      form.showRank = options.showRank;
      form.showViolationCount = options.showViolationCount;
      loadedConfig.value = config;
    }

    async function load(): Promise<void> {
      const parkName = cleanText(form.parkName);
      if (parkName === undefined) {
        message.warning("请输入园区");
        return;
      }
      loading.value = true;
      try {
        applyConfig(await getSafetyCreditClient().getPublicityConfig(parkName));
      } finally {
        loading.value = false;
      }
    }

    async function save(): Promise<void> {
      const parkName = cleanText(form.parkName);
      if (parkName === undefined) {
        message.warning("请输入园区");
        return;
      }
      saving.value = true;
      try {
        applyConfig(
          await getSafetyCreditClient().updatePublicityConfig({
            parkName,
            configJson: stringifyOptions(form),
          }),
        );
        message.success("公示配置已保存");
      } finally {
        saving.value = false;
      }
    }

    function resetOptions(): void {
      Object.assign(form, defaultOptions());
    }

    function renderOption(item: { field: PublicityOptionField; label: string; description: string }): JSX.Element {
      return (
        <div class="s4-check-item">
          <Checkbox
            checked={form[item.field]}
            onUpdate:checked={(inputValue) => {
              const checked = inputValue as boolean;
              form[item.field] = checked;
            }}
          />
          <span>
            <strong>{item.label}</strong>
            <em>{item.description}</em>
          </span>
        </div>
      );
    }

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class="safety-credit-s2">
          <Form class="toolbar" layout="inline">
            <FormItem class="search-field wide" label="园区">
              <Input
                value={form.parkName}
                placeholder="请输入园区"
                onUpdate:value={(inputValue) => {
                  const value = inputValue as string;
                  return (form.parkName = value);
                }}
              />
            </FormItem>
            <Space>
              <Button type="primary" loading={loading.value} onClick={() => void load()}>
                读取配置
              </Button>
              <Button loading={saving.value} onClick={() => void save()}>
                保存配置
              </Button>
              <Button onClick={resetOptions}>恢复默认</Button>
            </Space>
          </Form>

          <section class="s4-config-card">
            <div class="config-meta">
              <div>
                <span>当前园区</span>
                <strong>{displayText(loadedConfig.value?.parkName ?? form.parkName)}</strong>
              </div>
              <div>
                <span>配置ID</span>
                <strong>{displayText(loadedConfig.value?.id)}</strong>
              </div>
            </div>
            <div class="s4-check-list">{optionItems.map(renderOption)}</div>
          </section>
        </div>
      ),
    };

    return (): JSX.Element => <PageLayout title="公示配置" v-slots={layoutSlots} showFooter={false} />;
  },
});
