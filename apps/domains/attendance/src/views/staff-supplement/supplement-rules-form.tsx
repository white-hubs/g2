import type { FormExpose } from "@g2-platform/pc-ui";
import { Button, CheckboxGroup, Form, FormItem, Input, InputNumber, PageLayout as Layout, Spin, message } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { supplementRulesDetail, supplementRulesPost } from "@/api/staff-supplement";
import { VerticalLine } from "@/components/vertical-line/vertical-line";
import { logger } from "@/logger";

/** 补卡规则表单 */
export const SupplementRulesForm = defineComponent({
  setup: () => {
    const router = useRouter();
    const { action, id } = useRoute().query;
    const goBack = (): void => {
      router.back();
    };

    /** 标题 */
    const title = computed(() => {
      let res = "补卡规则";
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
      { label: "缺卡", value: "LACK_CHECKED" },
      { label: "迟到", value: "LATE_CHECKED" },
      { label: "早退", value: "EARLY_CHECKED" },
    ];
    const supplementNumComp = (): VNode => (
      <div style="display:flex;align-items:center">
        每月允许补卡
        <div style="width:120px;margin:0 15px">
          <InputNumber min={0} max={99} v-model:value={formData.value.times} />
        </div>
        次
      </div>
    );

    const supplementDaysComp = (): VNode => (
      <div style="display:flex;align-items:center">
        <div style="width:120px;margin-right:15px">
          <InputNumber min={0} max={99} v-model:value={formData.value.days} />
        </div>
        日内允许补卡
      </div>
    );

    /** 表单实例 */
    const formRef = ref<FormExpose>();
    const formData = ref({
      name: "",
      times: null as number | null,
      days: null as number | null,
      types: [] as string[],
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
          id,
        };
        await supplementRulesPost({ ...params });
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
            const res = await supplementRulesDetail({ id: id as string });
            if (res.data) {
              formData.value.name = res.data.name;
              formData.value.times = res.data.times;
              formData.value.days = res.data.days;
              formData.value.types = res.data.types;
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
                  <VerticalLine title="补卡规则" />
                  <FormItem
                    label="允许补卡类型"
                    name="types"
                    rules={[{ required: true, message: "请完善允许补卡类型" }]}
                    style={{ width: "100%" }}
                  >
                    <CheckboxGroup options={typeOptions} v-model:value={formData.value.types} />
                  </FormItem>
                  <FormItem
                    label="允许补卡次数"
                    name="times"
                    rules={[{ required: true, message: "请完善允许补卡次数" }]}
                    style={{ width: "100%" }}
                  >
                    {supplementNumComp()}
                  </FormItem>
                  <FormItem
                    label="允许补卡时限"
                    name="days"
                    rules={[{ required: true, message: "请完善允许补卡时限" }]}
                    style={{ width: "100%" }}
                  >
                    {supplementDaysComp()}
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
