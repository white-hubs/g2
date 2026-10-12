import type { FormExpose } from "@g2-platform/pc-ui";
import { Button, Form, FormItem, Input, InputNumber, PageLayout as Layout, RadioGroup, Spin, message } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { offDutyRulesDetail, offDutyRulesInsert, offDutyRulesUpdate } from "@/api/staff-off-duty";
import { VerticalLine } from "@/components/vertical-line/vertical-line";
import { logger } from "@/logger";

/** 离岗规则表单 */
export const OffDutyRulesForm = defineComponent({
  setup: () => {
    const router = useRouter();
    const { action, id } = useRoute().query;
    const goBack = (): void => {
      router.back();
    };

    /** 标题 */
    const title = computed(() => {
      let res = "离岗规则";
      if (action === "add") {
        res += " / 新增";
      } else if (action === "edit") {
        res += " / 编辑";
      } else {
        res += " / 详情";
      }
      return res;
    });

    const typeOptions = [
      { label: "离岗前发起审批", value: true },
      { label: "无限制", value: false },
    ];
    const typeOptions1 = [
      { label: "按工作日计算离岗时长", value: "WORKING_DAY" },
      { label: "按自然日计算离岗时长", value: "CALENDAR_DAY" },
    ];
    const supplementNumComp = (): VNode => (
      <div style="display:flex;align-items:center">
        按
        <div style="width:120px;margin:0 15px">
          <InputNumber min={0} max={99} v-model:value={formData.value.minAskUnit} />
        </div>
        小时离岗
        <span style="margin-left:20px;color:#00000073">以x小时为最小单位计算，不足x小时的不能离岗</span>
      </div>
    );

    /** 表单实例 */
    const formRef = ref<FormExpose>();
    const formData = ref({
      name: "",
      minAskUnit: 1,
      calculationWay: "WORKING_DAY",
      beforeApply: true,
    });

    const customValidatesRules = {};

    // 保存
    const saveLoading = ref(false);
    const save = async (): Promise<void> => {
      if (saveLoading.value || !init.value) {
        return;
      }
      saveLoading.value = true;
      try {
        formRef.value?.clearValidate();
        await formRef.value?.validate();
        saveLoading.value = true;
        const params = {
          ...formData.value,
        };
        if (action === "add") {
          await offDutyRulesInsert(params);
        } else {
          await offDutyRulesUpdate({ ...params, id: id as string });
        }
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
            const res = await offDutyRulesDetail({ id: id as string });
            if (res.data) {
              formData.value.name = res.data.name;
              formData.value.minAskUnit = res.data.minAskUnit;
              formData.value.calculationWay = res.data.calculationWay;
              formData.value.beforeApply = res.data.beforeApply;
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
                <Form
                  ref={formRef}
                  model={formData.value}
                  disabled={action === "detail"}
                  rules={customValidatesRules}
                  labelCol={{ style: { width: "150px" } }}
                  style={{ margin: "20px" }}
                >
                  <VerticalLine title="基本信息" />
                  <FormItem label="规则名称" name="name" rules={[{ required: true, message: "请完善规则名称" }]} style={{ width: "40%" }}>
                    <Input v-model:value={formData.value.name} placeholder="请输入规则名称" />
                  </FormItem>
                  <VerticalLine title="离岗规则" />
                  <FormItem
                    label="离岗审批条件"
                    name="beforeApply"
                    rules={[{ required: true, message: "请完善离岗审批条件" }]}
                    style={{ width: "100%" }}
                  >
                    <RadioGroup options={typeOptions} v-model:value={formData.value.beforeApply} />
                  </FormItem>
                  <FormItem
                    label="最小离岗单位"
                    name="minAskUnit"
                    rules={[{ required: true, message: "请完善最小离岗单位" }]}
                    style={{ width: "100%" }}
                  >
                    {supplementNumComp()}
                  </FormItem>
                  <FormItem
                    label="离岗时长核算"
                    name="calculationWay"
                    rules={[{ required: true, message: "请完善离岗时长核算" }]}
                    style={{ width: "100%" }}
                  >
                    <RadioGroup options={typeOptions1} v-model:value={formData.value.calculationWay} />
                  </FormItem>
                </Form>
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
