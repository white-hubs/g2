import type { FormExpose, FormRule as RuleObject } from "@g2-platform/pc-ui";
import { Button, Form, FormItem, Input, PageLayout as Layout, Select, Spin, message } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type Limit,
  type RulesClassesList,
  type SchedulingRule,
  schedulingRuleDetail,
  schedulingRuleInsert,
  schedulingRuleUpdate,
} from "@/api/scheduling-manage";
import { SchedulingRulesClassesSelectTable } from "@/components/business/scheduling-rules-classes-select-table/scheduling-rules-classes-select-table";
import { SchedulingRulesLimit } from "@/components/business/scheduling-rules-limit/scheduling-rules-limit";
import { VerticalLine } from "@/components/vertical-line/vertical-line";
import { KEYWORD_ALIAS } from "@/keyword-alias";
import { logger } from "@/logger";

import style from "@/assets/style.module.less";

export const SchedulingRulesForm = defineComponent({
  setup: () => {
    const router = useRouter();
    const { action, id } = useRoute().query;
    const goBack = (): void => {
      router.back();
    };

    /** 标题 */
    const title = computed(() => {
      let res = "排班规则";
      if (action === "add") {
        res += " / 新增";
      } else if (action === "edit") {
        res += " / 编辑";
      } else {
        res += " / 详情";
      }
      return res;
    });

    /** 表单实例 */
    const formRef = ref<FormExpose>();

    const formData = ref<
      SchedulingRule & { limit: Limit; classesSelect: { legalHolidaysRest: boolean; rulesClassesList: RulesClassesList[] } }
    >({
      name: "",
      continuousDays: "",
      intervalHour: "",
      legalHolidaysRest: false,
      rulesClassesList: [],
      sameShift: [],
      ways: "FIXED",
      classesSelect: {
        legalHolidaysRest: false,
        rulesClassesList: [],
      },
      limit: {
        continuousDays: null,
        intervalHour: null,
        sameShift: [{ sameShiftNumber: null, sameShiftType: null }],
      },
    });

    const validateLimit = async (): Promise<void> => {
      let error = "";
      const classes: string[] = [];
      logger.debug(formData.value.limit);
      formData.value.limit.sameShift.forEach(async (e) => {
        if (e.sameShiftNumber && e.sameShiftType?.length === 0) {
          error = "请选择限制条件中的班次";
        }
        if (!e.sameShiftNumber && e.sameShiftType?.length) {
          error = `请完善限制条件不允许一个月同一个${KEYWORD_ALIAS.staff}有超过....`;
        }
        e.sameShiftType?.forEach((ele) => {
          if (classes.includes(ele)) {
            error = "当前排班限制条件不允许班次重复";
          } else {
            classes.push(ele);
          }
        });
      });
      if (error) {
        throw new Error(error);
      }
      return;
    };

    const customValidatesRules = {
      limit: { required: false, trigger: "blur", validator: validateLimit } satisfies RuleObject,
    };

    // 保存
    const saveLoading = ref(false);
    const save = async (): Promise<void> => {
      if (saveLoading.value) {
        return;
      }
      saveLoading.value = true;
      try {
        formRef.value?.clearValidate();
        await formRef.value?.validate();

        const params: SchedulingRule = {
          name: formData.value.name,
          ways: formData.value.ways,
          continuousDays: formData.value.limit.continuousDays ? formData.value.limit.continuousDays.toString() : "",
          intervalHour: formData.value.limit.intervalHour ? formData.value.limit.intervalHour.toString() : "",
          sameShift: JSON.stringify(formData.value.limit.sameShift),
          legalHolidaysRest: formData.value.classesSelect.legalHolidaysRest,
          rulesClassesList: formData.value.classesSelect.rulesClassesList
            .map((e) => ({ id: e.id, name: e.name, week: e.week }))
            .filter((e) => e.id),
        };

        if (formData.value.ways === "FIXED") {
          // 固定班制不存在限制条件
          params.continuousDays = undefined;
          params.intervalHour = undefined;
          params.sameShift = "";
        } else {
          params.rulesClassesList = [];
        }
        if (action === "add") {
          await schedulingRuleInsert(params);
        } else {
          await schedulingRuleUpdate({ ...params, id: id as string });
        }

        message.success("操作成功");
        router.back();
      } catch (error) {
        logger.error(error);
      } finally {
        saveLoading.value = false;
      }
    };

    const init = ref(false);
    onMounted(async () => {
      try {
        if (action !== "add") {
          if (id) {
            const res = await schedulingRuleDetail({ id: id as string });
            if (res.data) {
              formData.value.name = res.data.name;
              formData.value.ways = res.data.ways;
              formData.value.classesSelect = {
                legalHolidaysRest: res.data.legalHolidaysRest,
                rulesClassesList: res.data.rulesClassesList,
              };
              formData.value.limit = {
                continuousDays: (res.data.continuousDays as unknown as number) || null,
                intervalHour: (res.data.intervalHour as unknown as number) || null,
                sameShift: res.data.sameShift ? JSON.parse(res.data.sameShift as string) : [{ sameShiftNumber: null, sameShiftType: null }],
              };
            }
          }
        }
      } catch (error) {
        logger.error(error);
        message.error("详情加载失败");
      } finally {
        init.value = true;
      }
    });

    const layoutSlots = {
      "layout-content": (): VNode | undefined => {
        if (!init.value) {
          return (
            <div style="min-height:240px;display:flex;align-items:center;justify-content:center">
              <Spin spinning />
            </div>
          );
        }
        return (
          <>
            <div class={style["attendance-group-form"]}>
              <Form
                ref={formRef}
                model={formData.value}
                rules={customValidatesRules}
                labelCol={{ style: { width: "150px" } }}
                disabled={action === "detail"}
                style={{ margin: "20px" }}
              >
                <VerticalLine title="基本信息" />
                <FormItem
                  label="排班规则名称"
                  name="name"
                  class={style["w-50"]}
                  rules={[{ required: true, message: "请输入排班规则名称" }]}
                >
                  <Input value={formData.value.name} v-model:value={formData.value.name} maxlength={30} />
                </FormItem>
                <VerticalLine title="排班规则" />
                <FormItem label="排班方式" name="ways" class={style["w-50"]} rules={[{ required: true, message: "请选择排班方式" }]}>
                  <Select
                    value={formData.value.ways}
                    v-model:value={formData.value.ways}
                    options={[
                      { label: "固定班制", value: "FIXED" },
                      { label: "倒班制", value: "SHIFTS" },
                    ]}
                  />
                </FormItem>
                {formData.value.ways === "FIXED" && (
                  <FormItem name="classesSelect" rules={[{ required: true, message: "请选择班次" }]}>
                    <SchedulingRulesClassesSelectTable
                      value={formData.value.classesSelect}
                      v-model:value={formData.value.classesSelect}
                      schedulingWay={formData.value.ways}
                      readonly={action === "detail"}
                    />
                  </FormItem>
                )}
                {formData.value.ways === "SHIFTS" && (
                  <>
                    <p>前往{KEYWORD_ALIAS.staff}排班页，选择可用班次自定义排班</p>
                    <FormItem label="限制条件" name="limit">
                      <SchedulingRulesLimit
                        value={formData.value.limit}
                        v-model:value={formData.value.limit}
                        readonly={action === "detail"}
                      />
                    </FormItem>
                  </>
                )}
              </Form>
            </div>
          </>
        );
      },
      "footer-page": (): VNode => (
        <>
          <Button onClick={goBack}>返回</Button>
          {action !== "detail" && (
            <Button type="primary" style={{ marginLeft: "10px" }} loading={saveLoading.value} onClick={save}>
              保存
            </Button>
          )}
        </>
      ),
    };
    return (): VNode => <Layout title={title.value} v-slots={layoutSlots} />;
  },
});
