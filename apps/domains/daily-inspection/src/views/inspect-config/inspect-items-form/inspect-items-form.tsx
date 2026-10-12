// @ts-nocheck -- 对齐 cube InspectItemsForm + InspectItemContentTable。
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { computed, defineComponent, onMounted, reactive, ref, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { CubeLayout } from "@/compat/app-design";
import { InspectBusinessType, targetCategoryOptions } from "@/compat/constants";
import { InspectItemContentTable } from "@/components/inspect-item-content-table/inspect-item-content-table";
import type { InspectItemContent } from "@/components/inspect-item-content-table/type";
import { getDailyInspectionClient } from "@/domain-context";
import { Button, Col, Form, FormItem, Input, Row, Select, Space, Switch, message, type FormExpose } from "@/pc-ui-runtime";

import styles from "./inspect-items-form.module.css";

interface Items {
  id?: string | undefined;
  imageFlag?: boolean | undefined;
  name?: string | undefined;
  resultId?: string | null | undefined;
  resultItemValue?: string | null | undefined;
  itemTag?: string | null | undefined;
  imageResult?: string | boolean | null | undefined;
  remarkResult?: string | boolean | null | undefined;
  businessType?: string | undefined;
}

type InspectItemRow = InspectItemContent & { imageFlag?: boolean | undefined; businessType?: string | undefined };

const parseMultiResult = (value: string | boolean | undefined): string[] => {
  if (typeof value === "boolean") return [];
  return value ? String(value).split(",") : [];
};

const parseBooleanResult = (value: string | boolean | undefined): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const mapContentRow = (source: InspectionRecord, isResultItem: boolean): InspectItemContent => ({
  id: source?.id ? String(source.id) : undefined,
  name: source?.name != null ? String(source.name) : undefined,
  resultId: source?.resultId != null ? String(source.resultId) : undefined,
  resultItemValue: source?.resultItemValue != null ? String(source.resultItemValue) : undefined,
  imageResult: isResultItem
    ? parseMultiResult(source?.imageResult as string | boolean | undefined)
    : parseBooleanResult(source?.imageResult as string | boolean | undefined),
  remarkResult: isResultItem
    ? parseMultiResult(source?.remarkResult as string | boolean | undefined)
    : parseBooleanResult(source?.remarkResult as string | boolean | undefined),
  itemTag: source?.itemTag != null ? String(source.itemTag) : undefined,
  isResultItem,
  options: ((source?.resultVO?.options as unknown[]) || source?.options || [])?.map((e) => {
    const opt = e as { itemName?: string; itemValue?: string; errorFlag?: boolean };
    return {
      itemName: opt?.itemName,
      itemValue: opt?.itemValue,
      errorFlag: opt?.errorFlag,
    };
  }),
});

export const InspectItemsForm = defineComponent({
  name: "InspectItemsForm",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const type = computed(() => String(route.query.type ?? "add"));
    const id = computed(() => String(route.query.id ?? ""));

    const formRenderRef = ref<FormExpose>();
    const inspectItemContentTableRef = ref<{
      isValid: Ref<boolean>;
      dataSource: Ref<InspectItemContent[]>;
      checkData: () => Promise<InspectItemContent[]>;
      addContent: () => void;
    }>();
    const inspectItems = ref<InspectItemContent[]>([]);

    const formState = reactive<{
      id: string | undefined;
      alias: string | undefined;
      referType: string | undefined;
      isResultItem: boolean;
    }>({
      id: undefined,
      alias: undefined,
      referType: undefined,
      isResultItem: true,
    });
    const modalRules = {
      alias: [{ required: true, message: "请输入巡检项名称", trigger: "blur" }],
      referType: [{ required: true, message: "请选择适用对象", trigger: "blur" }],
    };
    const saveLoading = ref(false);

    const onCancel = (): void => {
      formRenderRef.value?.resetFields();
      router.back();
    };

    const onSubmit = async (): Promise<void> => {
      try {
        if (type.value === "detail") {
          onCancel();
          return;
        }
        await formRenderRef.value?.validate();
        const result = (await inspectItemContentTableRef.value?.checkData()) as unknown as InspectItemRow[];

        const newResult = result?.map((e): Items => {
          if (formState.isResultItem) {
            return {
              id: e.id,
              imageFlag: e.imageFlag,
              name: e.name,
              businessType: e.businessType,
              resultId: e.resultId ?? null,
              resultItemValue: e.resultItemValue ?? null,
              itemTag: e.itemTag ?? null,
              imageResult: Array.isArray(e.imageResult) && e.imageResult.length ? e.imageResult.join(",") : null,
              remarkResult: Array.isArray(e.remarkResult) && e.remarkResult.length ? e.remarkResult.join(",") : null,
            };
          }
          return {
            id: e.id,
            imageFlag: e.imageFlag,
            name: e.name,
            businessType: e.businessType,
            resultId: null,
            resultItemValue: null,
            itemTag: null,
            imageResult: e.imageResult === true,
            remarkResult: e.remarkResult === true,
          };
        });
        saveLoading.value = true;
        const params: InspectionRecord = {
          alias: formState.alias,
          items: newResult as unknown as Items[],
          referType: formState.referType,
          isResultItem: formState.isResultItem,
        };
        if (type.value === "add") {
          await getDailyInspectionClient().createConfig("item", params);
        }
        if (type.value === "edit" && id.value) {
          await getDailyInspectionClient().updateConfig("item", id.value, params);
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
        const res = await getDailyInspectionClient().getConfig("item", itemId);
        if (!res) return;
        formState.alias = res?.alias != null ? String(res.alias) : undefined;
        formState.referType = res?.referType != null ? String(res.referType) : undefined;
        formState.isResultItem = res?.isResultItem ?? true;

        const hasFlatContent =
          res?.name != null ||
          res?.resultId != null ||
          res?.resultItemValue != null ||
          res?.itemTag != null ||
          res?.imageResult != null ||
          res?.remarkResult != null;

        const detailItems = Array.isArray(res.items) ? res.items : [];
        if (hasFlatContent || !detailItems.length) {
          // 对齐 cube：从 detail VO 展平为单行；items[] 仅作兜底
          inspectItems.value = [mapContentRow(res, formState.isResultItem)];
        } else {
          inspectItems.value = detailItems.map((item: InspectionRecord) => mapContentRow(item, formState.isResultItem));
        }
      } catch {
        message.error("巡检项详情加载失败");
      }
    };

    onMounted(() => {
      if (id.value) {
        void getData(id.value);
      }
      if (type.value === "add") {
        inspectItemContentTableRef.value?.addContent();
      }
    });

    const title = computed(() => {
      const titleMap = new Map([
        ["add", "新增"],
        ["edit", "编辑"],
        ["detail", "详情"],
      ]);
      return `${titleMap.get(type.value) ?? ""}${route.meta?.title ?? "巡检项"}`;
    });

    const layoutSlots = {
      "layout-content": (): JSX.Element => {
        return (
          <div class={styles["edit-content"]}>
            <div class={styles.title}>基础信息</div>
            <Form
              model={formState}
              ref={formRenderRef}
              rules={modalRules}
              labelCol={{ style: { width: "100px" } }}
              disabled={type.value === "detail"}
            >
              <Row gutter={[8 * 12, 12]} style={{ width: "100%" }}>
                <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                  <FormItem label="巡检项名称" name="alias">
                    <Input v-model:value={formState.alias} placeholder="请输入巡检项名称" maxlength={20} showCount />
                  </FormItem>
                </Col>
                <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                  <FormItem label="适用对象" name="referType">
                    <Select v-model:value={formState.referType} placeholder="请选择适用对象" options={targetCategoryOptions.slice(1)} />
                  </FormItem>
                </Col>
                <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                  <FormItem label="结果巡检项" name="isResultItem">
                    <Switch v-model:checked={formState.isResultItem} checkedChildren="开启" unCheckedChildren="关闭" />
                  </FormItem>
                </Col>
              </Row>
            </Form>
            <div class={styles.title}>巡检项内容</div>
            <InspectItemContentTable
              ref={inspectItemContentTableRef}
              value={inspectItems.value}
              onUpdate:value={(value: InspectItemContent[]) => {
                inspectItems.value = value;
              }}
              businessType={InspectBusinessType.DAILY_INSPECTION}
              action={type.value}
              isResultItem={formState.isResultItem}
            />
          </div>
        );
      },
      "footer-page": (): JSX.Element => {
        return (
          <Space>
            <Button onClick={onCancel}>取消</Button>
            {type.value !== "detail" && (
              <Button type="primary" loading={saveLoading.value} onClick={() => void onSubmit()} class={styles["ml-8"]}>
                保存
              </Button>
            )}
          </Space>
        );
      },
    };
    return (): JSX.Element => <CubeLayout title={`${title.value}`} v-slots={layoutSlots} />;
  },
});
