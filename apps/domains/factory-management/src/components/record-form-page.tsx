import type { ParkFile, ParkPayload, SelectRecord } from "@g2-contract/factory-management";
import {
  Button,
  Cascader,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  PageLayout,
  Select,
  Space,
  Textarea,
  message,
} from "@g2-platform/pc-ui";
import { type Ref, computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { type CascaderOption, type SelectOption, errorMessage, text } from "../shared";
import { ParkFileUpload } from "./file-upload";

import styles from "../styles.module.less";

export type FormMode = "add" | "edit" | "detail";

interface FormField {
  key: string;
  label: string;
  kind?: "input" | "textarea" | "select" | "multi-select" | "cascader" | "date" | "number" | "files";
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  suffix?: string;
  detailKey?: string;
  options?: Ref<SelectOption[] | CascaderOption[]>;
  editableModes?: FormMode[];
  pattern?: RegExp;
  patternMessage?: string;
}

interface RecordFormConfig<Row extends ParkPayload> {
  subject: string;
  fields: FormField[];
  initial: ParkPayload;
  loadReferences?: () => Promise<void>;
  get(id: string): Promise<Row>;
  create(body: ParkPayload): Promise<unknown>;
  update(id: string, body: ParkPayload): Promise<unknown>;
  fromRecord?: (record: Row) => ParkPayload;
  toPayload?: (model: ParkPayload, mode: FormMode) => ParkPayload;
}

export function createRecordFormPage<Row extends ParkPayload>(factory: () => RecordFormConfig<Row>) {
  return defineComponent({
    name: "FactoryManagementRecordFormPage",
    setup() {
      const config = factory();
      const route = useRoute();
      const router = useRouter();
      const mode = computed<FormMode>(() => (route.query.type === "detail" ? "detail" : route.query.type === "edit" ? "edit" : "add"));
      const id = computed(() => String(route.query.id ?? ""));
      const title = computed(() => `${config.subject}-${mode.value === "add" ? "新增" : mode.value === "edit" ? "编辑" : "详情"}`);
      const model = reactive<ParkPayload>({ ...config.initial });
      const formRef = ref<{ validate(): Promise<void> }>();
      const saving = ref(false);
      const loading = ref(false);

      const editable = (field: FormField): boolean =>
        mode.value !== "detail" && (!field.editableModes || field.editableModes.includes(mode.value));

      const detailValue = (field: FormField): string => {
        const value = model[field.detailKey ?? field.key];
        if (field.kind === "multi-select" && Array.isArray(value)) {
          return value.join("、") || "--";
        }
        return `${text(value)}${value !== undefined && value !== null && value !== "" && field.suffix ? field.suffix : ""}`;
      };

      const update = (key: string, value: unknown): void => {
        model[key] = value;
      };

      const control = (field: FormField) => {
        const value = model[field.key];
        const placeholder = field.placeholder ?? `请输入${field.label}`;
        if (field.kind === "textarea") {
          return (
            <Textarea
              value={typeof value === "string" || typeof value === "number" ? value : undefined}
              placeholder={placeholder}
              allowClear
              maxlength={field.maxLength ?? 200}
              showCount
              autoSize={{ minRows: 3, maxRows: 6 }}
              onUpdate:value={(next) => update(field.key, next)}
            />
          );
        }
        if (field.kind === "select") {
          return (
            <Select
              value={typeof value === "string" || typeof value === "number" ? value : undefined}
              placeholder={placeholder}
              allowClear
              options={field.options?.value ?? []}
              showSearch
              optionFilterProp="label"
              onUpdate:value={(next) => update(field.key, next)}
            />
          );
        }
        if (field.kind === "multi-select") {
          return (
            <Select
              value={Array.isArray(value) ? value.map(String) : []}
              placeholder={placeholder}
              allowClear
              mode="multiple"
              options={field.options?.value ?? []}
              showSearch
              optionFilterProp="label"
              onUpdate:value={(next) => update(field.key, next)}
            />
          );
        }
        if (field.kind === "cascader") {
          return (
            <Cascader
              value={Array.isArray(value) ? value.map(String) : undefined}
              placeholder={placeholder}
              allowClear
              options={field.options?.value ?? []}
              showSearch
              changeOnSelect
              onUpdate:value={(next) => update(field.key, next)}
            />
          );
        }
        if (field.kind === "date") {
          return (
            <DatePicker
              value={typeof value === "string" ? value : undefined}
              placeholder={placeholder}
              allowClear
              showTime
              valueFormat="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm"
              onUpdate:value={(next) => update(field.key, next)}
            />
          );
        }
        if (field.kind === "number") {
          return (
            <InputNumber
              value={typeof value === "number" || typeof value === "string" ? value : undefined}
              placeholder={placeholder}
              min={0}
              style={{ width: "100%" }}
              addonAfter={field.suffix}
              onUpdate:value={(next) => update(field.key, next)}
            />
          );
        }
        if (field.kind === "files") {
          return (
            <ParkFileUpload
              value={(Array.isArray(value) ? value : []) as ParkFile[]}
              onUpdate:value={(files: ParkFile[]) => update(field.key, files)}
            />
          );
        }
        return (
          <Input
            value={typeof value === "string" || typeof value === "number" ? value : undefined}
            placeholder={placeholder}
            allowClear
            maxlength={field.maxLength ?? 100}
            addonAfter={field.suffix}
            onUpdate:value={(next) => update(field.key, next)}
          />
        );
      };

      const load = async (): Promise<void> => {
        if (mode.value === "add" || !id.value) {
          return;
        }
        loading.value = true;
        try {
          const record = await config.get(id.value);
          Object.assign(model, config.fromRecord ? config.fromRecord(record) : record);
        } catch (error) {
          message.error(errorMessage(error, `${config.subject}详情加载失败`));
        } finally {
          loading.value = false;
        }
      };

      const save = async (): Promise<void> => {
        await formRef.value?.validate();
        saving.value = true;
        try {
          const body = config.toPayload ? config.toPayload({ ...model }, mode.value) : { ...model };
          if (mode.value === "edit") {
            await config.update(id.value, body);
          } else {
            await config.create(body);
          }
          message.success("保存成功");
          await router.back();
        } catch (error) {
          message.error(errorMessage(error, "保存失败"));
        } finally {
          saving.value = false;
        }
      };

      onMounted(async () => {
        try {
          await config.loadReferences?.();
        } catch (error) {
          message.error(errorMessage(error, "选项数据加载失败"));
        }
        await load();
      });

      return () => (
        <PageLayout
          title={title.value}
          v-slots={{
            "layout-content": () => (
              <div class={styles.formPage} aria-busy={loading.value}>
                <div class={styles.sectionTitle}>{config.subject}</div>
                <Form ref={formRef} model={model} layout="vertical" class={styles.detailFormGrid}>
                  {config.fields.map((field) => (
                    <FormItem
                      key={field.key}
                      label={field.label}
                      name={field.key}
                      rules={
                        editable(field)
                          ? [
                              ...(field.required
                                ? [
                                    {
                                      required: true,
                                      message: `${field.kind?.includes("select") || field.kind === "date" || field.kind === "cascader" ? "请选择" : "请输入"}${field.label}`,
                                    },
                                  ]
                                : []),
                              ...(field.pattern
                                ? [{ pattern: field.pattern, message: field.patternMessage ?? `${field.label}格式不正确` }]
                                : []),
                            ]
                          : undefined
                      }
                      class={field.kind === "textarea" || field.kind === "files" ? styles.formFull : undefined}
                    >
                      {editable(field) ? (
                        control(field)
                      ) : field.kind === "files" ? (
                        <ParkFileUpload value={(Array.isArray(model[field.key]) ? model[field.key] : []) as ParkFile[]} readonly />
                      ) : (
                        <span class={styles.detailText}>{detailValue(field)}</span>
                      )}
                    </FormItem>
                  ))}
                </Form>
              </div>
            ),
            "footer-page": () => (
              <Space>
                <Button onClick={() => router.back()}>返回</Button>
                {mode.value !== "detail" ? (
                  <Button type="primary" loading={saving.value} onClick={() => void save()}>
                    保存
                  </Button>
                ) : null}
              </Space>
            ),
          }}
        />
      );
    },
  });
}

export function selectRecords(rows: SelectRecord[]): SelectOption[] {
  return rows.map((item) => ({
    label: String(item.label ?? item.name ?? "未命名"),
    value: String(item.value ?? item.id ?? item.code ?? ""),
  }));
}
