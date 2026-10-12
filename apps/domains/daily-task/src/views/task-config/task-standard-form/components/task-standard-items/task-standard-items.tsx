// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { StandardItemModel } from "@g2-client/daily-task/client";
import { type PropType, type Ref, computed, defineComponent, ref } from "vue";

import { StandardItemContentTable, StandardItemModalTable } from "@/components/daily-task-widgets";
import type { StandardItemContent } from "@/components/daily-task-widgets";
import { Button } from "@/pc-ui-runtime";

export const TaskStandardItems = defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<StandardItemModel[]>,
      required: true,
    },
    type: {
      type: String as PropType<"add" | "edit" | "detail">,
      default: "detail",
    },
  },
  emits: ["update:modelValue"],
  setup(props, { expose }) {
    const disabled = computed(() => props.type === "detail");

    const standardItem = ref<StandardItemContent[]>([]);

    const standardItemModalTableRef = ref<{ openModal: (record?: unknown) => void }>();
    const standardItemContentTableRef = ref<{
      isValid: Ref<boolean>;
      dataSource: Ref<StandardItemContent[]>;
      checkData: () => Promise<StandardItemContent[]>;
      addContent: () => void;
      initContent: (data?: unknown) => void;
    }>();

    props.modelValue.forEach((e) => {
      standardItem.value.push({
        itemId: e?.itemId,
        itemName: e?.itemName,
        itemContent: e?.itemContent,
        operationGuide: e?.operationGuide,
        resultId: e?.resultId,
        resultName: e?.resultName,
        defaultResultItem: e?.defaultResultItem,
        mustTakePhotoResultItems: e?.mustTakePhotoResultItems?.split(","),
        mustRemarkResultItems: e?.mustRemarkResultItems?.split(","),
        tag: e?.tag,
        resultLabelList: e?.resultLabelList,
        source: "called",
      });
    });

    const openModel = (): void => {
      standardItemModalTableRef.value?.openModal();
    };

    const handleModalEnter = (record: StandardItemModel[]): void => {
      const tableIds = standardItem.value.map((e) => e.itemId);
      record.forEach((e) => {
        if (!tableIds.includes(e.itemId)) {
          standardItem.value.push({
            ...(e as unknown as StandardItemContent),
            operationGuide: e?.operationGuide,
            mustTakePhotoResultItems: e?.mustTakePhotoResultItems?.split(","),
            mustRemarkResultItems: e?.mustRemarkResultItems?.split(","),
            source: "called",
          });
        }
      });
      standardItemContentTableRef.value?.initContent(standardItem.value);
    };

    const validData = async (): Promise<Record<string, unknown>[]> => {
      const result = await standardItemContentTableRef.value?.checkData();
      const newResult =
        result?.map((e) => ({
          ...e,
          itemName: e?.itemName || e.itemContent,
          mustTakePhotoResultItems: Array.isArray(e.mustTakePhotoResultItems) && e.mustTakePhotoResultItems?.join(","),
          mustRemarkResultItems: Array.isArray(e.mustRemarkResultItems) && e.mustRemarkResultItems?.join(","),
        })) || [];
      return newResult;
    };

    expose({ validData });

    return (): JSX.Element => (
      <div>
        <div class="resultItemName">
          <StandardItemContentTable
            ref={standardItemContentTableRef}
            v-model:value={standardItem.value}
            showAdd={!disabled.value}
            action={props.type}
            editContentPolicy={"new"}
            showItemName={true}
          >
            <Button type="primary" onClick={openModel} disabled={disabled.value} style="margin-left: 10px;">
              调用
            </Button>
          </StandardItemContentTable>
        </div>
        <StandardItemModalTable title="调用标准项" ref={standardItemModalTableRef} onEnter={handleModalEnter} />
      </div>
    );
  },
});
