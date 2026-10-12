import type { FormInstance } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref, watch } from "vue";

import { getClient } from "./domain-context";
import { errorText } from "./model";
import { useOptions } from "./options";
import { type Person, PersonPicker } from "./person-picker";
import { loadPcUi } from "./runtime-modules";
const { Alert, Form, FormItem, Input, Modal, RangePicker, Select, message } = await loadPcUi();
export const ConsumableCheckEditor = defineComponent({
  props: { open: Boolean },
  emits: { close: () => true, saved: () => true },
  setup(props, { emit }) {
    const draft = reactive({
      name: "",
      checkerId: "",
      storeId: undefined as string | undefined,
      previousCheckDate: [] as string[],
      presentCheckDate: [] as string[],
    });
    const people = ref<Person[]>([]);
    const form = ref<FormInstance>();
    const saving = ref(false);
    const choices = useOptions();
    watch(
      () => props.open,
      (open) => {
        if (!open) {
          return;
        }
        Object.assign(draft, { name: "", checkerId: "", storeId: undefined, previousCheckDate: [], presentCheckDate: [] });
        people.value = [];
        form.value?.clearValidate();
        void choices.load(["warehouses"]).catch((error: unknown) => message.error(errorText(error)));
      },
    );
    const save = async () => {
      if (saving.value) {
        return;
      }
      try {
        await form.value?.validate();
      } catch {
        return;
      }
      saving.value = true;
      try {
        await getClient().createConsumableCheck({
          ...draft,
          name: draft.name.trim(),
          previousCheckDate: draft.previousCheckDate.join(","),
          presentCheckDate: draft.presentCheckDate.join(","),
        });
        emit("close");
        emit("saved");
        message.success("创建成功");
      } catch (error) {
        message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    };
    return () => (
      <Modal
        okText="确定"
        cancelText="取消"
        title="新增耗材盘点"
        open={props.open}
        width={620}
        confirmLoading={saving.value}
        onCancel={() => emit("close")}
        onOk={() => void save()}
      >
        <Alert message="盘点期间仓库将冻结，完成盘点后解除冻结。" type="info" showIcon style={{ marginBottom: "20px" }} />
        <Form ref={form} model={draft} layout="vertical">
          <FormItem label="盘点单名称" name="name" rules={[{ required: true, message: "请输入盘点单名称" }]}>
            <Input
              value={draft.name}
              maxlength={20}
              onChange={(event) => {
                draft.name = event.target.value ?? "";
              }}
            />
          </FormItem>
          <FormItem label="盘点仓库" name="storeId" rules={[{ required: true, message: "请选择仓库" }]}>
            <Select
              value={draft.storeId}
              options={choices.select("warehouses")}
              allowClear
              onChange={(value) => {
                draft.storeId = value === undefined ? undefined : String(value);
              }}
            />
          </FormItem>
          <FormItem label="盘点管理员" name="checkerId" rules={[{ required: true, message: "请选择管理员" }]}>
            <PersonPicker
              value={people.value}
              onChange={(value) => {
                people.value = value;
                draft.checkerId = value[0]?.id ?? "";
              }}
            />
          </FormItem>
          <FormItem label="上次盘点时间">
            <RangePicker
              value={draft.previousCheckDate.length === 2 ? [draft.previousCheckDate[0], draft.previousCheckDate[1]] : undefined}
              valueFormat="YYYY-MM-DD"
              style={{ width: "100%" }}
              onChange={(_dates, values) => {
                draft.previousCheckDate = values;
              }}
            />
          </FormItem>
          <FormItem label="本次盘点时间">
            <RangePicker
              value={draft.presentCheckDate.length === 2 ? [draft.presentCheckDate[0], draft.presentCheckDate[1]] : undefined}
              valueFormat="YYYY-MM-DD"
              style={{ width: "100%" }}
              onChange={(_dates, values) => {
                draft.presentCheckDate = values;
              }}
            />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});
