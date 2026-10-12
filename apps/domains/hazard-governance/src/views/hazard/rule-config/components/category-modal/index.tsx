import { defineComponent, reactive, shallowRef } from "vue";

import { useAuthRequest } from "@/api/request";
import { createHazardCategory, updateHazardCategory } from "@/api/server";
import { usePcModal } from "@/pc-ui-runtime";
import { Input, message } from "@/pc-ui-runtime";

type CategoryLevel = 1 | 2;
type CategoryModalMode = "create" | "update";

export interface CategoryModalOpenOptions {
  mode: CategoryModalMode;
  level: CategoryLevel;
  id?: string;
  parentId: string;
  parentName?: string | undefined;
  sortNo: number;
  name?: string;
}

export interface CategoryModalSavedPayload {
  level: CategoryLevel;
  id: string;
  parentId: string;
  mode: CategoryModalMode;
}

export const CategoryModal = defineComponent({
  name: "CategoryModal",
  emits: ["saved"],
  setup: (_, { emit, expose }) => {
    const modalTitle = shallowRef("品类信息");
    const form = reactive({
      mode: "create" as CategoryModalMode,
      level: 1 as CategoryLevel,
      id: "",
      parentId: "0",
      parentName: "",
      sortNo: 0,
      name: "",
    });

    const openModal = (options: CategoryModalOpenOptions): void => {
      modalTitle.value =
        options.mode === "create"
          ? options.level === 1
            ? "新增一级品类"
            : "新增二级品类"
          : options.level === 1
            ? "编辑一级品类"
            : "编辑二级品类";
      form.mode = options.mode;
      form.level = options.level;
      form.id = options.id ?? "";
      form.parentId = options.parentId;
      form.parentName = options.parentName ?? "";
      form.sortNo = options.sortNo;
      form.name = options.name ?? "";
      modalApi.setState({ title: modalTitle.value });
      modalApi.open();
    };

    const submit = async (): Promise<void> => {
      const nextName = form.name.trim();
      if (!nextName) {
        message.warning("请输入品类名称");
        return;
      }
      try {
        if (form.mode === "create") {
          const nextId = await useAuthRequest(() =>
            createHazardCategory({
              name: nextName,
              parentId: form.parentId,
            }),
          );
          emit("saved", { level: form.level, id: String(nextId), parentId: form.parentId, mode: form.mode } as CategoryModalSavedPayload);
        } else {
          await useAuthRequest(() =>
            updateHazardCategory(form.id, {
              name: nextName,
            }),
          );
          emit("saved", { level: form.level, id: form.id, parentId: form.parentId, mode: form.mode } as CategoryModalSavedPayload);
        }
        modalApi.close();
      } catch {
        message.error(form.mode === "create" ? "新增品类失败" : "品类名称保存失败");
      }
    };

    const [PcModal, modalApi] = usePcModal({
      title: modalTitle.value,
      width: "520px",
      onConfirm: () => {
        void submit();
      },
      onCancel: () => modalApi.close(),
    });

    expose({ openModal });

    const slots = {
      default: (): JSX.Element => (
        <div class="hazard-category-modal">
          <div class="hazard-category-field">
            <span>品类层级</span>
            <strong>{form.level === 1 ? "一级品类" : "二级品类"}</strong>
          </div>
          {form.level === 2 ? (
            <div class="hazard-category-field">
              <span>上级品类</span>
              <strong>{form.parentName || "-"}</strong>
            </div>
          ) : null}
          <div class="hazard-category-field">
            <span>品类名称</span>
            <Input v-model:value={form.name} placeholder="请输入品类名称" maxlength={100} />
          </div>
        </div>
      ),
    };

    return (): JSX.Element => <PcModal v-slots={slots} />;
  },
});
