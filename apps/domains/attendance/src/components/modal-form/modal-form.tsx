import { Form, FormItem, Modal } from "@g2-platform/pc-ui";
import { type Component, type PropType, type VNode, defineComponent, h, ref, watch } from "vue";

type FormSource = { value: string | number; label: string; component: Component; props?: Record<string, unknown> }[];
interface Props {
  formSource: FormSource;
  formState: Record<string, string | number | []>;
  rules: NonNullable<InstanceType<typeof Form>["$props"]["rules"]>;
  title: string;
  show: boolean;
  submitLoading?: boolean;
  labelWidth?: string;
}

export const ModalForm = defineComponent({
  props: {
    title: {
      type: String,
      default: "",
    },
    show: {
      type: Boolean,
      default: false,
    },
    submitLoading: {
      type: Boolean,
      default: false,
    },
    labelWidth: {
      type: String,
      default: "80px",
    },
    formState: {
      type: Object,
      default: () => ({}),
    },
    rules: {
      type: Object,
      default: () => ({}),
    },
    formSource: {
      type: Array as PropType<FormSource>,
      default: () => [],
    },
  },
  emits: ["update:show", "ok", "update:formState"],
  setup: (props: Props, { emit }) => {
    const cancel = (): void => {
      emit("update:show", false);
    };
    const ok = (): void => {
      emit("ok", false);
    };
    const modalFormRef = ref();
    const formState = ref<Record<string | number, string | number | []>>(props.formState ?? {});
    watch(
      () => props.show,
      () => {
        formState.value = props.formState ?? {};
      },
    );
    return (): VNode => (
      <Modal
        open={props.show}
        okText="确定"
        cancelText="取消"
        title={props.title}
        confirmLoading={props.submitLoading ?? false}
        destroyOnClose
        onCancel={cancel}
        onOk={ok}
      >
        <Form ref={modalFormRef} model={formState.value} rules={props.rules} labelCol={{ style: { width: props.labelWidth } }}>
          {props.formSource.map((e, i) => (
            <FormItem label={e?.label} name={e?.value.toString()} key={i}>
              {h(e.component, {
                ...e.props,
                value: formState.value[e.value],
                "onUpdate:value": (value: string | number | unknown[] | undefined) => {
                  formState.value[e.value] = value as string;
                  emit("update:formState", formState.value);
                },
              })}
            </FormItem>
          ))}
        </Form>
      </Modal>
    );
  },
});
