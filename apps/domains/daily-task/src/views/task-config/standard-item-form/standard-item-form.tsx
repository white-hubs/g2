// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { DailyTaskTargetCategoryOptions, getCurrentDailyType } from "@g2-client/daily-task/client";
import { type Ref, computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { cubeDailyTaskService } from "@/api/server";
import { StandardItemContentTable } from "@/components/daily-task-widgets";
import type { StandardItemContent } from "@/components/daily-task-widgets";
import { Button, Col, Form, type FormExpose, FormItem, Row, Select, Textarea, message } from "@/pc-ui-runtime";
import { PageLayout } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

import styles from "./standard-item-form.module.css";

export const StandardItemForm = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const router = useRouter();
    const { type, id } = route.query as { type: string; id: string };

    const isDetails = computed(() => type === "detail");

    const formRenderRef = ref<FormExpose>();
    const standardItemContentTableRef = ref<{
      isValid: Ref<boolean>;
      dataSource: Ref<StandardItemContent[]>;
      checkData: () => Promise<StandardItemContent[]>;
      addContent: () => void;
    }>();
    const standardItems = ref<StandardItemContent[]>([]);

    const formState = reactive<{
      itemId: string | undefined;
      itemName: string | undefined;
      targetTypes: string[] | undefined;
    }>({
      itemId: undefined,
      itemName: undefined,
      targetTypes: undefined,
    });
    const modalRules = {
      itemName: [{ required: true, message: "请输入标准项名称", trigger: "blur" }],
    };
    const saveLoading = ref(false);
    const onSubmit = async (): Promise<void> => {
      try {
        if (type === "detail") {
          onCancel();
          return;
        }
        await formRenderRef.value?.validate();
        const result = await standardItemContentTableRef.value?.checkData();

        const newResult = result?.map((e) => ({
          ...e,
          mustTakePhotoResultItems: Array.isArray(e.mustTakePhotoResultItems) && e.mustTakePhotoResultItems?.join(","),
          mustRemarkResultItems: Array.isArray(e.mustRemarkResultItems) && e.mustRemarkResultItems?.join(","),
        }));
        const resultItem = newResult?.[0];
        saveLoading.value = true;
        const params = {
          dailyType: getCurrentDailyType(),
          itemName: formState.itemName || "",
          targetTypes: formState.targetTypes || [],
          itemContent: resultItem?.itemContent || "",
          operationGuide: resultItem?.operationGuide || "",
          resultId: resultItem?.resultId || "",
          defaultResultItem: resultItem?.defaultResultItem || "",
          mustTakePhotoResultItems: resultItem?.mustTakePhotoResultItems || "",
          mustRemarkResultItems: resultItem?.mustRemarkResultItems || "",
          tag: resultItem?.tag || "",
        };
        if (type === "add") {
          await cubeDailyTaskService.addStandardItem(params);
        }
        if (type === "edit") {
          const updateParams = {
            itemId: formState.itemId || "",
            ...params,
          };
          await cubeDailyTaskService.updateStandardItem(updateParams);
        }
        message.success("操作成功");
        setTimeout(() => {
          onCancel();
        }, 500);
      } catch (error) {
        const errorFields = (error as { errorFields: unknown })?.errorFields;
        const showError = !errorFields && !(error instanceof Error && error.message.includes("校验失败"));
        if (showError) {
          message.error((error as { errorMessage: string })?.errorMessage ?? "操作失败");
        }
      } finally {
        saveLoading.value = false;
      }
    };
    const getData = async (itemId: string): Promise<void> => {
      try {
        const res = await cubeDailyTaskService.getStandardItem(itemId);
        if (res) {
          formState.itemId = res?.itemId;
          formState.itemName = res?.itemName;
          formState.targetTypes = res?.targetTypes;
          standardItems.value.push({
            itemId: res?.itemId,
            itemName: res?.itemName,
            itemContent: res?.itemContent,
            operationGuide: res?.operationGuide,
            resultId: res?.resultId,
            resultName: res?.resultName,
            defaultResultItem: res?.defaultResultItem,
            mustTakePhotoResultItems: res?.mustTakePhotoResultItems?.split(","),
            mustRemarkResultItems: res?.mustRemarkResultItems?.split(","),
            tag: res?.tag,
            resultLabelList: res?.resultLabelList?.map((item) => ({
              value: String(item.value),
              label: item.label,
              errorFlag: item.errorFlag,
            })),
            source: "called",
          });
        }
      } catch {}
    };
    onMounted(() => {
      if (id) {
        getData(id);
      }
      if (type === "add") {
        standardItemContentTableRef.value?.addContent();
      }
    });
    const onCancel = (): void => {
      formRenderRef.value?.resetFields();
      router.back();
    };
    const title = computed(() => {
      const titleMap = new Map([
        ["add", "新增"],
        ["edit", "编辑"],
        ["detail", "详情"],
      ]);
      return `${titleMap.get(type) ?? ""}${pageTitle}`;
    });
    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class={styles["edit-content"]}>
          <div class={[styles.title, "g2-skin-section-title"]}>基础信息</div>
          <Form model={formState} ref={formRenderRef} rules={modalRules} label-col={{ style: { width: "100px" } }}>
            <Row gutter={[8 * 12, 12]} style={{ width: "100%" }}>
              <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                <FormItem label="标准项名称" name="itemName">
                  <Textarea
                    v-model:value={formState.itemName}
                    disabled={isDetails.value}
                    placeholder="请输入标准项名称"
                    maxlength={200}
                    autoSize
                  />
                </FormItem>
              </Col>
              <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                <FormItem label="适用对象类型" name="targetType">
                  <Select
                    v-model:value={formState.targetTypes}
                    disabled={isDetails.value}
                    mode="multiple"
                    placeholder="请选择适用对象类型"
                    options={DailyTaskTargetCategoryOptions.slice(1)}
                  />
                </FormItem>
              </Col>
            </Row>
          </Form>
          <div class={[styles.title, "g2-skin-section-title"]}>标准项内容</div>
          <StandardItemContentTable
            ref={standardItemContentTableRef}
            v-model:value={standardItems.value}
            action={type}
            showItemName={false}
          />
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <>
          <Button onClick={onCancel}>取消</Button>
          {type !== "detail" && (
            <Button type="primary" loading={saveLoading.value} onClick={onSubmit} class={styles["ml-16"]}>
              保存
            </Button>
          )}
        </>
      ),
    };
    return (): JSX.Element => <PageLayout title={`${title.value}`} v-slots={layoutSlots} />;
  },
});
