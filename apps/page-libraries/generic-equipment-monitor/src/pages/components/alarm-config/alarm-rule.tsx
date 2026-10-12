import type { DeviceCenterClient } from "@g2-client/device-center/client";
import { Button, FormItem, Select, Space } from "@g2-platform/pc-ui";
import { defineComponent, ref, watch, type PropType } from "vue";

import { MONTH_DAY_OPTIONS, PERIOD_OPTIONS, WEEK_OPTIONS, createGuid, emptyRuleGroup } from "./alarm-config.model";
import AlarmRuleAttr from "./alarm-rule-attr";
import type { RuleDataType, RuleGroupType } from "./types";

function emptyCondition(): RuleDataType {
  return {
    id: createGuid(),
    deviceProdCategoryCodeConcat: "",
    deviceProdId: undefined,
    conditionType: null,
    deviceEventCode: undefined,
    deviceEventName: "",
    deviceEventType: "",
    deviceProdCategoryName: "",
    deviceProdName: "",
    emergencyRuleConditionExps: [
      {
        id: createGuid(),
        propCode: "",
        op: null,
        oprand: "",
        delayTime: 0,
        propName: "",
        propUnit: "",
        emergencyRuleConditionId: "",
        emergencyRuleId: "",
        startDelayTime: 0,
        endDelayTime: 0,
      },
    ],
  };
}

function parseMulti(timeConditions: string): string[] {
  if (!timeConditions) return [];
  try {
    const parsed = JSON.parse(timeConditions) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default defineComponent({
  name: "GemAlarmRule",
  props: {
    info: { type: Array as PropType<RuleGroupType[]>, default: () => [] },
    readonly: { type: Boolean, default: false },
    getDeviceClient: { type: Function as PropType<() => Promise<DeviceCenterClient>>, default: undefined },
  },
  setup(props, { expose }) {
    const ruleData = ref<RuleGroupType[]>([emptyRuleGroup()]);

    watch(
      () => props.info,
      (info) => {
        if (info?.length) {
          ruleData.value = JSON.parse(JSON.stringify(info)) as RuleGroupType[];
        }
      },
      { immediate: true, deep: true },
    );

    const getValue = (): RuleGroupType[] => ruleData.value;

    const addRuleGroup = (): void => {
      ruleData.value = [...ruleData.value, emptyRuleGroup()];
    };

    const deleteGroup = (index: number): void => {
      if (index === 0) return;
      ruleData.value = ruleData.value.filter((_, i) => i !== index);
    };

    const setGroup = (index: number, group: RuleGroupType): void => {
      ruleData.value = ruleData.value.map((g, i) => (i === index ? group : g));
    };

    const addCondition = (groupIndex: number): void => {
      const group = ruleData.value[groupIndex]!;
      setGroup(groupIndex, {
        ...group,
        emergencyRuleConditions: [...group.emergencyRuleConditions, emptyCondition()],
      });
    };

    const updateTimeType = (groupIndex: number, timeType: RuleGroupType["emergencyRuleTime"]["timeType"]): void => {
      const group = ruleData.value[groupIndex]!;
      const timeList =
        timeType === "TIME"
          ? [{ beginTime: "00:00:00", endTime: "23:59:59" }]
          : Array.isArray(group.emergencyRuleTime.timeList)
            ? group.emergencyRuleTime.timeList
            : [{ beginTime: "", endTime: "" }];
      setGroup(groupIndex, {
        ...group,
        emergencyRuleTime: {
          timeType,
          timeConditions: timeType === "ALL" ? "" : timeType === "TIME" ? JSON.stringify(timeList) : "",
          timeList,
        },
      });
    };

    expose({ getValue, addRuleGroup });

    return () => (
      <div class="alarm-container">
        {ruleData.value.map((group, groupIndex) => (
          <div
            key={group.id || String(groupIndex)}
            style={{ border: "1px solid #e8e8e8", padding: "12px 16px", marginTop: 12, position: "relative", borderRadius: 6 }}
          >
            <div style={{ fontWeight: 600, marginBottom: 12 }}>条件组 {groupIndex + 1}</div>
            {groupIndex !== 0 && !props.readonly ? (
              <Button type="link" danger style={{ position: "absolute", right: 8, top: 8 }} onClick={() => deleteGroup(groupIndex)}>
                删除条件组
              </Button>
            ) : null}

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span>触发条件</span>
              {props.readonly ? null : (
                <Button type="primary" size="small" onClick={() => addCondition(groupIndex)}>
                  添加
                </Button>
              )}
            </div>

            {group.emergencyRuleConditions.map((cond, condIndex) => (
              <AlarmRuleAttr
                key={cond.id || String(condIndex)}
                value={cond}
                readonly={props.readonly}
                canDelete={condIndex !== 0}
                getDeviceClient={props.getDeviceClient}
                onUpdate:value={(v) => {
                  const emergencyRuleConditions = group.emergencyRuleConditions.map((c, i) => (i === condIndex ? v : c));
                  setGroup(groupIndex, { ...group, emergencyRuleConditions });
                }}
                onDelete={() => {
                  setGroup(groupIndex, {
                    ...group,
                    emergencyRuleConditions: group.emergencyRuleConditions.filter((_, i) => i !== condIndex),
                  });
                }}
              />
            ))}

            <div style={{ fontWeight: 600, margin: "20px 0 12px" }}>报警时段</div>
            <FormItem label="时段类型">
              <Space wrap>
                <Select
                  style={{ width: 160 }}
                  disabled={props.readonly}
                  options={[...PERIOD_OPTIONS]}
                  value={group.emergencyRuleTime.timeType}
                  onUpdate:value={(v: RuleGroupType["emergencyRuleTime"]["timeType"]) => updateTimeType(groupIndex, v)}
                />
                {group.emergencyRuleTime.timeType === "WEEK" ? (
                  <Select
                    mode="multiple"
                    style={{ minWidth: 220 }}
                    disabled={props.readonly}
                    options={[...WEEK_OPTIONS]}
                    value={parseMulti(group.emergencyRuleTime.timeConditions)}
                    placeholder="请选择星期"
                    onUpdate:value={(v: string[]) =>
                      setGroup(groupIndex, {
                        ...group,
                        emergencyRuleTime: { ...group.emergencyRuleTime, timeConditions: JSON.stringify(v || []) },
                      })
                    }
                  />
                ) : null}
                {group.emergencyRuleTime.timeType === "MONTH" ? (
                  <Select
                    mode="multiple"
                    style={{ minWidth: 220 }}
                    disabled={props.readonly}
                    options={MONTH_DAY_OPTIONS}
                    value={parseMulti(group.emergencyRuleTime.timeConditions)}
                    placeholder="请选择日期"
                    onUpdate:value={(v: string[]) =>
                      setGroup(groupIndex, {
                        ...group,
                        emergencyRuleTime: { ...group.emergencyRuleTime, timeConditions: JSON.stringify(v || []) },
                      })
                    }
                  />
                ) : null}
                {group.emergencyRuleTime.timeType === "TIME"
                  ? (Array.isArray(group.emergencyRuleTime.timeList) ? group.emergencyRuleTime.timeList : []).map((slot, slotIndex) => (
                      <Space key={String(slotIndex)}>
                        <input
                          type="time"
                          step={1}
                          disabled={props.readonly}
                          value={(slot.beginTime || "00:00:00").slice(0, 8)}
                          onChange={(e) => {
                            const timeList = [...(group.emergencyRuleTime.timeList as { beginTime: string; endTime: string }[])];
                            const begin = (e.target as HTMLInputElement).value;
                            timeList[slotIndex] = {
                              ...timeList[slotIndex]!,
                              beginTime: begin.length === 5 ? `${begin}:00` : begin,
                            };
                            setGroup(groupIndex, {
                              ...group,
                              emergencyRuleTime: {
                                ...group.emergencyRuleTime,
                                timeList,
                                timeConditions: JSON.stringify(timeList),
                              },
                            });
                          }}
                        />
                        <span>~</span>
                        <input
                          type="time"
                          step={1}
                          disabled={props.readonly}
                          value={(slot.endTime || "23:59:59").slice(0, 8)}
                          onChange={(e) => {
                            const timeList = [...(group.emergencyRuleTime.timeList as { beginTime: string; endTime: string }[])];
                            const end = (e.target as HTMLInputElement).value;
                            timeList[slotIndex] = {
                              ...timeList[slotIndex]!,
                              endTime: end.length === 5 ? `${end}:00` : end,
                            };
                            setGroup(groupIndex, {
                              ...group,
                              emergencyRuleTime: {
                                ...group.emergencyRuleTime,
                                timeList,
                                timeConditions: JSON.stringify(timeList),
                              },
                            });
                          }}
                        />
                        {props.readonly ? null : slotIndex === 0 ? (
                          <Button
                            type="primary"
                            size="small"
                            shape="circle"
                            onClick={() => {
                              const timeList = [
                                ...(group.emergencyRuleTime.timeList as { beginTime: string; endTime: string }[]),
                                { beginTime: "00:00:00", endTime: "23:59:59" },
                              ];
                              setGroup(groupIndex, {
                                ...group,
                                emergencyRuleTime: {
                                  ...group.emergencyRuleTime,
                                  timeList,
                                  timeConditions: JSON.stringify(timeList),
                                },
                              });
                            }}
                          >
                            +
                          </Button>
                        ) : (
                          <Button
                            danger
                            type="primary"
                            size="small"
                            shape="circle"
                            onClick={() => {
                              const timeList = (group.emergencyRuleTime.timeList as { beginTime: string; endTime: string }[]).filter(
                                (_, i) => i !== slotIndex,
                              );
                              setGroup(groupIndex, {
                                ...group,
                                emergencyRuleTime: {
                                  ...group.emergencyRuleTime,
                                  timeList,
                                  timeConditions: JSON.stringify(timeList),
                                },
                              });
                            }}
                          >
                            -
                          </Button>
                        )}
                      </Space>
                    ))
                  : null}
              </Space>
            </FormItem>
          </div>
        ))}
      </div>
    );
  },
});
