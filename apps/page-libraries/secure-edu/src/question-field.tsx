import type { QuestionOption } from "@g2-contract/secure-edu";
import { type PropType, defineComponent } from "vue";

import { loadUi } from "./context";
import { defaultOptions, text } from "./model";

import styles from "./styles.module.css";
const { Button, Checkbox, Input, Radio } = await loadUi();
export const QuestionField = defineComponent({
  props: {
    value: { type: Array as PropType<QuestionOption[]>, required: true },
    type: { type: String, required: true },
    disabled: Boolean,
  },
  emits: { change: (_value: QuestionOption[]) => true },
  setup(props, { emit }) {
    const update = (list: QuestionOption[]) =>
      emit(
        "change",
        list.map((item, i) => ({ ...item, sort: i + 1, optionID: String.fromCodePoint(65 + i), isCheck: false })),
      );
    const move = (i: number, delta: number) => {
      const list = [...props.value];
      [list[i], list[i + delta]] = [list[i + delta], list[i]];
      update(list);
    };
    const choose = (i: number, checked: boolean) =>
      update(
        props.value.map((item, j) => ({
          ...item,
          isRight: props.type === "MULTIPLE_CHOICE" ? (j === i ? checked : item.isRight) : j === i,
        })),
      );
    return () => (
      <div class={styles.section}>
        <div class={styles.sectionHeader}>
          <strong>题目选项（勾选正确答案）</strong>
          {props.type !== "JUDGE" && !props.disabled && (
            <Button
              size="small"
              onClick={() => update([...props.value, { ...defaultOptions("JUDGE")[0], optionTitle: "", isRight: false }])}
            >
              添加选项
            </Button>
          )}
        </div>
        {props.value.map((item, i) => (
          <div class={styles.choice} key={i}>
            {props.type === "MULTIPLE_CHOICE" ? (
              <Checkbox disabled={props.disabled} checked={item.isRight} onUpdate:checked={(v: boolean) => choose(i, v)} />
            ) : (
              <Radio disabled={props.disabled} checked={item.isRight} onChange={() => choose(i, true)} />
            )}
            <strong>{item.optionID}.</strong>
            {props.disabled || props.type === "JUDGE" ? (
              <span style={{ flex: 1 }}>{text(item.optionTitle)}</span>
            ) : (
              <Input
                value={item.optionTitle}
                placeholder="请输入选项内容"
                onUpdate:value={(v: string) => update(props.value.map((entry, j) => (j === i ? { ...entry, optionTitle: v } : entry)))}
              />
            )}{" "}
            {!props.disabled && props.type !== "JUDGE" && (
              <>
                <Button size="small" disabled={i === 0} onClick={() => move(i, -1)}>
                  上移
                </Button>
                <Button size="small" disabled={i === props.value.length - 1} onClick={() => move(i, 1)}>
                  下移
                </Button>
                <Button
                  size="small"
                  danger
                  disabled={props.value.length <= 2}
                  onClick={() => update(props.value.filter((_, j) => i !== j))}
                >
                  删除
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    );
  },
});
