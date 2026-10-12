import { message } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { computed, defineComponent } from "vue";

import { linkPersons } from "../../../api/safety-personnel";
import { PersonPickerModal } from "../../../components/person-picker-modal/person-picker-modal";
import { PERSON_CATEGORY_TYPE_CODE, type PersonCategoryTab } from "../../../constants";
import { useAuthRequest } from "../../../hooks/use-auth-request";
import type { PoolPersonUI } from "../../../types/ui";
import { showApiError } from "../../../utils/api-error";

export const PersonAddModal = defineComponent({
  props: {
    open: { type: Boolean, default: false },
    activeTab: { type: String as () => PersonCategoryTab, default: "safety" },
  },
  emits: ["update:open", "success"],
  setup(props, { emit }) {
    const typeCode = computed(() => {
      const code = PERSON_CATEGORY_TYPE_CODE[props.activeTab];
      return code === "ALL" ? undefined : code;
    });

    const onConfirm = async (rows: PoolPersonUI[]): Promise<void> => {
      const userIds = rows.map((r) => r.personId);
      const linkCode = PERSON_CATEGORY_TYPE_CODE[props.activeTab];
      if (!linkCode || linkCode === "ALL") {
        message.warning("请在具体人员分类 Tab 下关联人员");
        return;
      }
      try {
        await useAuthRequest(() => linkPersons({ userIds, typeCode: linkCode }));
        message.success("关联成功");
        emit("success");
        emit("update:open", false);
      } catch (e) {
        showApiError(e, "关联失败");
      }
    };

    return () => (
      <PersonPickerModal
        open={props.open}
        typeCode={typeCode.value}
        source="person-pool"
        okText="确认关联"
        onUpdate:open={(v: boolean) => {
          emit("update:open", v);
        }}
        onConfirm={(rows: PoolPersonUI[]) => {
          void onConfirm(rows);
        }}
      />
    );
  },
});
