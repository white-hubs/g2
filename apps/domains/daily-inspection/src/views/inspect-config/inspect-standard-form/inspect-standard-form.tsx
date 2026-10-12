// @ts-nocheck — 对齐 cube inspect-standard-form：基础信息 + 关联对象树 + 巡检项内容表。
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { computed, defineComponent, onMounted, reactive, ref, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AssocType, AssociationTabs, type AssociationItem } from "./components/association-tabs/association-tabs";
import { CubeLayout } from "@/compat/app-design";
import { InspectBusinessType } from "@/compat/constants";
import { InspectItemContentTable } from "@/components/inspect-item-content-table/inspect-item-content-table";
import type { InspectItemContent } from "@/components/inspect-item-content-table/type";
import { getDailyInspectionClient } from "@/domain-context";
import { Button, Form, FormItem, Input, Modal, Select, Space, TabPane, Tabs, Textarea, message } from "@/pc-ui-runtime";

import styles from "./inspect-standard-form.module.css";

const isResultItemEnabled = (value: unknown): boolean => {
  return value !== false && value !== "false" && value !== 0 && value !== "0";
};

const mapStandardItem = (raw: InspectionRecord): InspectItemContent => {
  const isResultItem = isResultItemEnabled(raw?.isResultItem);
  const imageResult = raw?.imageResult;
  const remarkResult = raw?.remarkResult;
  return {
    id: raw.id ? String(raw.id) : undefined,
    name: raw.name != null ? String(raw.name) : raw.itemName != null ? String(raw.itemName) : undefined,
    resultId: raw.resultId != null ? String(raw.resultId) : undefined,
    resultItemValue: raw.resultItemValue != null ? String(raw.resultItemValue) : undefined,
    itemTag: raw.itemTag != null ? String(raw.itemTag) : undefined,
    isResultItem,
    imageResult: isResultItem
      ? typeof imageResult === "string" && imageResult
        ? imageResult.split(",")
        : Array.isArray(imageResult)
          ? imageResult
          : undefined
      : imageResult === true || imageResult === "true",
    remarkResult: isResultItem
      ? typeof remarkResult === "string" && remarkResult
        ? remarkResult.split(",")
        : Array.isArray(remarkResult)
          ? remarkResult
          : undefined
      : remarkResult === true || remarkResult === "true",
    options: ((raw?.resultVO?.options as unknown[]) || raw?.options || []).map((opt) => {
      const row = opt as { itemName?: string; itemValue?: string; errorFlag?: boolean };
      return { itemName: row.itemName, itemValue: row.itemValue, errorFlag: row.errorFlag };
    }),
  };
};

export const InspectStandardForm = defineComponent({
  name: "InspectStandardForm",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const type = computed(() => String(route.query.type ?? "add") as "add" | "edit" | "detail");
    const id = computed(() => String(route.query.id ?? ""));
    const readonly = computed(() => type.value === "detail");
    const saving = ref(false);
    const activeTab = ref("base");
    const associationActiveKey = ref(AssocType.DEVICE);
    const associations = ref<AssociationItem[]>([]);
    const callOpen = ref(false);
    const callLoading = ref(false);
    const callOptions = ref<InspectionRecord[]>([]);
    const selectedCallIds = ref<string[]>([]);
    const formState = reactive({
      name: "",
      remark: "",
      safetyTips: "",
      enable: true,
    });
    const inspectItems = ref<InspectItemContent[]>([]);
    const inspectItemContentTableRef = ref<{
      checkData: () => Promise<InspectItemContent[]>;
      addContent: () => void;
      initContent: (data: InspectItemContent[]) => void;
      dataSource: Ref<InspectItemContent[]>;
    }>();

    const title = computed(() => {
      const map = { add: "新增", edit: "编辑", detail: "详情" };
      return `${map[type.value] ?? ""}${route.meta?.title ?? "巡检标准"}`;
    });

    onMounted(async () => {
      if (!id.value) return;
      try {
        const detail = await getDailyInspectionClient().getConfig("standard", id.value);
        formState.name = String(detail.name ?? detail.standardName ?? "");
        formState.remark = String(detail.remark ?? "");
        formState.safetyTips = String(detail.safetyTips ?? "");
        formState.enable = detail.enable !== false;
        associations.value = (Array.isArray(detail.standardTypeRefers) ? detail.standardTypeRefers : []).flatMap((item: InspectionRecord) =>
          (Array.isArray(item.targetTypes) ? item.targetTypes : []).map((targetTypeId: string) => ({
            type: String(item.targetCategory ?? AssocType.DEVICE),
            targetTypeId: String(targetTypeId),
          })),
        );
        inspectItems.value = (Array.isArray(detail.standardItems) ? detail.standardItems : []).map((item: InspectionRecord) =>
          mapStandardItem(item),
        );
      } catch {
        message.error("巡检标准详情加载失败");
      }
    });

    const openCallModal = async (): Promise<void> => {
      callOpen.value = true;
      callLoading.value = true;
      selectedCallIds.value = [];
      try {
        const page = await getDailyInspectionClient().listConfig("item", { pageNumber: 1, pageSize: 200 });
        callOptions.value = page.records;
      } catch {
        callOptions.value = [];
        message.error("巡检项列表加载失败");
      } finally {
        callLoading.value = false;
      }
    };

    const confirmCall = (): void => {
      const selected = callOptions.value.filter((item) => selectedCallIds.value.includes(String(item.id ?? "")));
      const existing = new Set(inspectItems.value.map((item) => item.id).filter(Boolean));
      selected.forEach((item) => {
        const itemId = String(item.id ?? "");
        if (itemId && existing.has(itemId)) return;
        inspectItems.value.push(mapStandardItem(item));
      });
      inspectItemContentTableRef.value?.initContent?.(inspectItems.value);
      callOpen.value = false;
      activeTab.value = "items";
    };

    const onSubmit = async (): Promise<void> => {
      if (readonly.value) {
        router.back();
        return;
      }
      if (!formState.name.trim()) {
        activeTab.value = "base";
        message.warning("请输入标准名称");
        return;
      }
      if (!associations.value.length) {
        activeTab.value = "base";
        message.warning("请添加关联项");
        return;
      }
      try {
        const rows = await inspectItemContentTableRef.value?.checkData();
        if (!rows?.length) {
          activeTab.value = "items";
          message.warning("请至少配置一条巡检项");
          return;
        }
        const standardItems = rows.map((e) => {
          const isResultItem = isResultItemEnabled(e.isResultItem);
          const base = {
            id: e.id,
            name: e.name,
            resultId: e.resultId ?? null,
            resultItemValue: e.resultItemValue ?? null,
            itemTag: e.itemTag ?? null,
            isResultItem,
            referType: InspectBusinessType.DAILY_INSPECTION,
          };
          if (!isResultItem) {
            return {
              ...base,
              resultId: null,
              resultItemValue: null,
              itemTag: null,
              imageResult: e.imageResult === true,
              remarkResult: e.remarkResult === true,
            };
          }
          return {
            ...base,
            imageResult: Array.isArray(e.imageResult) ? e.imageResult.join(",") : undefined,
            remarkResult: Array.isArray(e.remarkResult) ? e.remarkResult.join(",") : undefined,
          };
        });
        const standardTypeRefers = Object.values(AssocType)
          .map((targetCategory) => {
            const targetTypes = associations.value.filter((item) => item.type === targetCategory).map((item) => item.targetTypeId);
            return { targetCategory, targetTypes };
          })
          .filter((item) => item.targetTypes.length);
        saving.value = true;
        const payload: InspectionRecord = {
          name: formState.name.trim(),
          remark: formState.remark,
          safetyTips: formState.safetyTips,
          enable: formState.enable,
          standardItems,
          standardTypeRefers,
          businessType: InspectBusinessType.DAILY_INSPECTION,
        };
        if (type.value === "edit" && id.value) {
          await getDailyInspectionClient().updateConfig("standard", id.value, payload);
        } else {
          await getDailyInspectionClient().createConfig("standard", payload);
        }
        message.success("操作成功");
        router.back();
      } catch (error) {
        if (error instanceof Error && error.message.includes("校验失败")) {
          activeTab.value = "items";
          return;
        }
        message.error("保存失败，请稍后重试");
      } finally {
        saving.value = false;
      }
    };

    const slots = {
      "layout-content": () => (
        <div class={styles["edit-content"]}>
          <Tabs v-model:activeKey={activeTab.value}>
            <TabPane key="base" tab="基础信息">
              <Form labelCol={{ style: { width: "110px" } }} disabled={readonly.value}>
                <div class={styles["form-grid"]}>
                  <FormItem label="标准名称" required>
                    <Input v-model:value={formState.name} maxlength={100} placeholder="请输入标准名称" />
                  </FormItem>
                  <FormItem label="标准说明" class={styles["form-wide"]}>
                    <Textarea v-model:value={formState.remark} rows={3} maxlength={200} showCount placeholder="请输入标准说明" />
                  </FormItem>
                  <FormItem label="安全提示" class={styles["form-wide"]}>
                    <Textarea v-model:value={formState.safetyTips} rows={3} placeholder="请输入安全提示" />
                  </FormItem>
                </div>
              </Form>
              <div class={styles.title}>关联对象</div>
              <AssociationTabs
                v-model:activeKey={associationActiveKey.value}
                v-model:modelValue={associations.value}
                disabled={readonly.value}
              />
            </TabPane>
            <TabPane key="items" tab="巡检项">
              <InspectItemContentTable
                ref={inspectItemContentTableRef}
                value={inspectItems.value}
                businessType={InspectBusinessType.DAILY_INSPECTION}
                showAdd={!readonly.value}
                action={type.value}
                readonly={readonly.value}
                onUpdate:value={(value: InspectItemContent[]) => {
                  inspectItems.value = value;
                }}
              >
                {!readonly.value ? (
                  <Button type="primary" class={styles["ml-16"]} onClick={() => void openCallModal()}>
                    调用巡检项
                  </Button>
                ) : null}
              </InspectItemContentTable>
            </TabPane>
          </Tabs>
          <Modal
            open={callOpen.value}
            title="调用巡检项"
            confirmLoading={callLoading.value}
            onOk={confirmCall}
            onCancel={() => {
              callOpen.value = false;
            }}
          >
            <Select
              mode="multiple"
              value={selectedCallIds.value}
              options={callOptions.value.map((item) => ({
                label: String(item.alias ?? item.name ?? item.id ?? "--"),
                value: String(item.id ?? ""),
              }))}
              style={{ width: "100%" }}
              placeholder="请选择巡检项"
              onUpdate:value={(value: string[]) => {
                selectedCallIds.value = value;
              }}
            />
          </Modal>
        </div>
      ),
      "footer-page": () => (
        <Space>
          <Button onClick={() => router.back()}>取消</Button>
          {!readonly.value ? (
            <Button type="primary" loading={saving.value} class={styles["ml-16"]} onClick={() => void onSubmit()}>
              保存
            </Button>
          ) : null}
        </Space>
      ),
    };

    return () => <CubeLayout title={title.value} v-slots={slots} />;
  },
});
