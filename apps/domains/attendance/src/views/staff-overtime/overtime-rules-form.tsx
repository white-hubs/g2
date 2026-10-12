import type { FormExpose } from "@g2-platform/pc-ui";
import { Button, Form, FormItem, type FormRule, Input, PageLayout as Layout, Spin, message } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { overtimeRulesDetail, overtimeRulesPost } from "@/api/staff-overtime";
import { OvertimeConfig } from "@/components/business/overtime-config/overtime-config";
import { OvertimeConfigOther } from "@/components/business/overtime-config/overtime-config-other";
import { VerticalLine } from "@/components/vertical-line/vertical-line";
import { logger } from "@/logger";

/** 加班规则表单 */
export const OverTimeRulesForm = defineComponent({
  setup: () => {
    const router = useRouter();
    const { action, id } = useRoute().query;
    const goBack = (): void => {
      router.back();
    };

    /** 标题 */
    const title = computed(() => {
      let res = "加班规则";
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
    const workRuleRef = ref<{ formRef: FormExpose }>();
    const restRuleRef = ref<{ formRef: FormExpose }>();
    const festivalRuleRef = ref<{ formRef: FormExpose }>();

    const formData = ref({
      name: "",
      upperLimitCycle: "",
      upperLimitDuration: "",
      upperLimit: {
        upperLimitCycle: undefined as string | undefined,
        upperLimitDuration: undefined as number | undefined | null,
      },
      workRule: {
        type: "WORK",
        workCondition: "ADVANCE",
        units: "HOUR",
        method: "APPROVAL",
        afterTime: null as number | null,
        compensate: "",
        compensationMethod: "ARTIFICAL",
        proportion: 1,
      },
      restRule: {
        type: "REST",
        workCondition: "ADVANCE",
        units: "HOUR",
        method: "APPROVAL",
        afterTime: null as number | null,
        compensate: "",
        compensationMethod: "ARTIFICAL",
        proportion: 1,
      },
      festivalRule: {
        type: "FESTIVAL",
        workCondition: "ADVANCE",
        units: "HOUR",
        method: "APPROVAL",
        afterTime: null as number | null,
        compensate: "",
        compensationMethod: "ARTIFICAL",
        proportion: 1,
      },
    });

    const checkName = async (): Promise<void> => {
      if (!formData.value.name.trim()) {
        throw new Error("请填写规则名称");
      }
      if (!/^[\u4E00-\u9FA5\w\d]+$/.test(formData.value.name)) {
        throw new Error("仅支持包含中英文字符及数字");
      }
      return;
    };

    const customValidatesRules = {
      name: { required: true, trigger: "change", validator: checkName } satisfies FormRule,
    };

    // 保存
    const saveLoading = ref(false);
    const save = async (): Promise<void> => {
      if (saveLoading.value || !init.value) {
        return;
      }
      saveLoading.value = true;
      try {
        formRef.value?.clearValidate();
        await Promise.all([
          formRef.value?.validate(),
          workRuleRef.value?.formRef.validate(),
          restRuleRef.value?.formRef.validate(),
          festivalRuleRef.value?.formRef.validate(),
        ]);
        saveLoading.value = true;
        const params = {
          name: formData.value.name,
          upperLimitCycle: formData.value.upperLimit.upperLimitCycle,
          upperLimitDuration: formData.value.upperLimit.upperLimitDuration,
          ruleDetails: [{ ...formData.value.workRule }, { ...formData.value.restRule }, { ...formData.value.festivalRule }],
          id: id as string,
        };
        await overtimeRulesPost(params);
        message.success("操作成功");
        router.back();
      } catch (error) {
        logger.error(error);
        message.error("保存失败，请检查表单或稍后重试");
      } finally {
        saveLoading.value = false;
      }
    };

    const init = ref(false);
    const detailLoading = ref(true);
    onMounted(async () => {
      try {
        if (action !== "add") {
          if (id) {
            const res = await overtimeRulesDetail({ id: id as string });
            if (res.data) {
              formData.value.name = res.data.name;
              formData.value.upperLimit = {
                upperLimitCycle: res.data.upperLimitCycle || undefined,
                upperLimitDuration: res.data.upperLimitDuration,
              };
              res.data.ruleDetails.forEach((element) => {
                if (element.type === "WORK") {
                  formData.value.workRule = element;
                }
                if (element.type === "REST") {
                  formData.value.restRule = element;
                }
                if (element.type === "FESTIVAL") {
                  formData.value.festivalRule = element;
                }
              });
            }
          }
        }
        init.value = true;
      } catch (error) {
        logger.error(error);
        message.error("加载规则失败");
      } finally {
        detailLoading.value = false;
      }
    });

    const layoutSlots = {
      "layout-content": (): VNode | undefined => (
        <>
          <Spin spinning={detailLoading.value}>
            <div style="min-height:180px">
              {init.value && (
                <div style={{ margin: "20px" }}>
                  <Form
                    ref={formRef}
                    model={formData.value}
                    disabled={action === "detail"}
                    rules={customValidatesRules}
                    labelCol={{ style: { width: "150px" } }}
                  >
                    <VerticalLine title="基本信息" />
                    <FormItem label="规则名称" name="name" rules={[customValidatesRules.name]} style={{ width: "40%" }}>
                      <Input v-model:value={formData.value.name} placeholder="请输入规则名称" />
                    </FormItem>
                  </Form>
                  <VerticalLine title="加班规则" />
                  <div style="width:60%;margin-bottom:24px">
                    <OvertimeConfig
                      title="工作日加班"
                      type="WORK"
                      readonly={action === "detail"}
                      ref={workRuleRef}
                      value={formData.value.workRule}
                      onUpdate:value={(value) => {
                        formData.value.workRule = value;
                      }}
                    />
                  </div>
                  <div style="width:60%;margin-bottom:24px">
                    <OvertimeConfig
                      title="休息日加班"
                      type="REST"
                      readonly={action === "detail"}
                      ref={restRuleRef}
                      value={formData.value.restRule}
                      onUpdate:value={(value) => {
                        formData.value.restRule = value;
                      }}
                    />
                  </div>
                  <div style="width:60%;margin-bottom:24px">
                    <OvertimeConfig
                      title="节假日加班"
                      type="FESTIVAL"
                      readonly={action === "detail"}
                      ref={festivalRuleRef}
                      value={formData.value.festivalRule}
                      onUpdate:value={(value) => {
                        formData.value.festivalRule = value;
                      }}
                    />
                  </div>
                  <div style="width:70%">
                    <OvertimeConfigOther
                      title="其他设置"
                      readonly={action === "detail"}
                      value={formData.value.upperLimit}
                      onUpdate:value={(value) => {
                        formData.value.upperLimit = value;
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Spin>
        </>
      ),
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
