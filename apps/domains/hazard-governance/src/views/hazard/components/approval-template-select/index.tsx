import type { HazardApprovalTemplateVO } from "@g2-contract/hazard-governance";
import { computed, defineComponent, onMounted, ref, shallowRef, type PropType } from "vue";

import { useAuthRequest } from "@/api/request";
import { listHazardApprovalTemplates } from "@/api/server";
import { Select, message } from "@/pc-ui-runtime";

interface ApprovalTemplateOption {
  label: string;
  value: string;
}

const toOption = (template: HazardApprovalTemplateVO): ApprovalTemplateOption => ({
  label: template.name,
  value: String(template.id),
});

export const ApprovalTemplateSelect = defineComponent({
  name: "ApprovalTemplateSelect",
  props: {
    value: {
      type: String,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: "请选择审批链模板",
    },
    allowClear: {
      type: Boolean,
      default: false,
    },
    style: {
      type: [String, Object] as PropType<string | Record<string, string>>,
      default: undefined,
    },
  },
  emits: ["update:value", "change", "loaded"],
  setup: (props, { emit }) => {
    const loading = shallowRef(false);
    const templates = ref<HazardApprovalTemplateVO[]>([]);

    const options = computed(() => templates.value.map((template) => toOption(template)));
    const selectDisabled = computed(() => props.disabled || loading.value || options.value.length === 0);

    const loadTemplates = async (): Promise<void> => {
      loading.value = true;
      try {
        const records = await useAuthRequest(() => listHazardApprovalTemplates({ pageNumber: 1, pageSize: 1000 }));
        templates.value = records;
        emit("loaded", options.value);
      } catch {
        templates.value = [];
        message.error("审批链模板加载失败");
      } finally {
        loading.value = false;
      }
    };

    const updateValue = (value?: string): void => {
      emit("update:value", value);
      emit("change", value);
    };

    onMounted(() => {
      void loadTemplates();
    });

    return (): JSX.Element => (
      <Select
        value={props.value}
        options={options.value}
        loading={loading.value}
        disabled={selectDisabled.value}
        placeholder={options.value.length === 0 ? "请先新增审批链模板" : props.placeholder}
        allowClear={props.allowClear}
        style={props.style}
        onUpdate:value={(value) => updateValue(value === undefined ? undefined : String(value))}
      />
    );
  },
});
