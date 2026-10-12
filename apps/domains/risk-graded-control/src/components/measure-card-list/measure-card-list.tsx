import { defineComponent, ref, watch } from "vue";

import { PersonPickerModal } from "@/components/person-picker-modal/person-picker-modal";
import { CONTROL_LEVELS, CONTROL_TYPES } from "@/constants";
import { Button, Card, Col, Form, FormItem, PopConfirm, Row, Select, SelectOption, Space, Textarea } from "@/pc-ui-runtime";
import type { OrgUserVO } from "@/types/risk";

import styles from "./measure-card-list.module.less";
import formStyles from "@/styles/form-page.module.less";

export interface MeasureFormItem {
  id: string;
  controlType: string;
  content: string;
  controlLevel: string;
  executor: string;
  executorName?: string;
}

export const MeasureCardList = defineComponent({
  props: {
    modelValue: { type: Array as () => MeasureFormItem[], default: () => [] },
    showAiGenerate: { type: Boolean, default: false },
    aiGenerateLoading: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "aiGenerate"],
  setup(props, { emit }) {
    const pickerVisible = ref(false);
    const editingIndex = ref(-1);
    let idSeq = 1;

    const list = ref<MeasureFormItem[]>([...props.modelValue]);

    const sync = (): void => emit("update:modelValue", [...list.value]);

    watch(
      () => props.modelValue,
      (value) => {
        list.value = [...value];
      },
      { deep: true },
    );

    const addItem = (): void => {
      list.value.push({ id: `m-${idSeq++}`, controlType: "", content: "", controlLevel: "", executor: "" });
      sync();
    };

    const removeItem = (idx: number): void => {
      list.value.splice(idx, 1);
      sync();
    };

    const selectedExecutor = (): OrgUserVO[] => {
      const item = list.value[editingIndex.value];
      if (!item?.executor) return [];
      return [
        {
          id: item.executor,
          name: item.executorName || item.executor,
          department: "",
        },
      ];
    };

    return (): JSX.Element => (
      <Space direction="vertical" style={{ width: "100%" }}>
        {list.value.map((item, idx) => (
          <Card
            key={item.id}
            size="small"
            title={`措施 ${idx + 1}`}
            extra={
              <PopConfirm title="确认删除该措施？" onConfirm={() => removeItem(idx)}>
                <Button type="link" danger size="small">
                  删除
                </Button>
              </PopConfirm>
            }
          >
            <Form layout="vertical">
              <Row gutter={[16, 0]}>
                <Col span={12}>
                  <FormItem label="管控类型" required>
                    <Select v-model:value={item.controlType} style={{ width: "100%" }} placeholder="请选择管控类型" onChange={sync}>
                      {CONTROL_TYPES.map((t) => (
                        <SelectOption key={t} value={t}>
                          {t}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormItem>
                </Col>
                <Col span={12}>
                  <FormItem label="管控层级" required>
                    <Select v-model:value={item.controlLevel} style={{ width: "100%" }} placeholder="请选择管控层级" onChange={sync}>
                      {CONTROL_LEVELS.map((t) => (
                        <SelectOption key={t} value={t}>
                          {t}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormItem>
                </Col>
                <Col span={24}>
                  <FormItem label="措施内容" required>
                    <Textarea v-model:value={item.content} rows={3} placeholder="请输入措施内容" maxlength={200} onChange={sync} />
                  </FormItem>
                </Col>
                <Col span={12}>
                  <FormItem label="执行人" required>
                    <div class={formStyles.managerField}>
                      <span class={item.executor ? formStyles.managerName : formStyles.managerPlaceholder}>
                        {item.executorName || item.executor || "请选择执行人"}
                      </span>
                      <Button
                        onClick={() => {
                          editingIndex.value = idx;
                          pickerVisible.value = true;
                        }}
                      >
                        选择人员
                      </Button>
                      {item.executor && (
                        <Button
                          type="link"
                          onClick={() => {
                            item.executor = "";
                            item.executorName = undefined;
                            sync();
                          }}
                        >
                          清除
                        </Button>
                      )}
                    </div>
                  </FormItem>
                </Col>
              </Row>
            </Form>
          </Card>
        ))}
        <div class={styles.measureActions}>
          {props.showAiGenerate ? (
            <div class={styles.aiAction}>
              <div class={styles.aiActionText}>
                <span class={styles.aiBadge}>AI</span>
                <span class={styles.aiTitle}>智能生成管控措施</span>
                <span class={styles.aiDesc}>根据当前风险对象生成措施草稿，可继续人工调整</span>
              </div>
              <Button
                type="primary"
                class={styles.aiButton}
                loading={props.aiGenerateLoading}
                onClick={() => {
                  emit("aiGenerate");
                }}
              >
                AI生成措施
              </Button>
            </div>
          ) : (
            <span />
          )}
          <Button type="dashed" class={styles.addButton} onClick={addItem}>
            添加措施
          </Button>
        </div>
        <PersonPickerModal
          visible={pickerVisible.value}
          title="选择执行人"
          initialSelected={selectedExecutor()}
          onUpdate:visible={(v: boolean) => {
            pickerVisible.value = v;
          }}
          onConfirm={(user: { id: string; name: string }) => {
            if (editingIndex.value >= 0 && list.value[editingIndex.value]) {
              list.value[editingIndex.value].executor = user.id;
              list.value[editingIndex.value].executorName = user.name;
              sync();
            }
          }}
        />
      </Space>
    );
  },
});
