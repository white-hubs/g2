import type { SecureEduUpstreamPath } from "@g2-contract/secure-edu";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getSecureEduClient } from "../domain-context";
import { AntDatePicker, Button, Col, Form, FormItem, Input, InputNumber, Row, Select, Switch, Textarea, message } from "../pc-ui-runtime";
import { PageFrame } from "./page-frame";
import { displayValue, errorText, pageResult } from "./page-utils";

type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "dateTime";
export interface EditorField {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: { label: string; value: string }[];
  remote?: {
    endpoint: SecureEduUpstreamPath;
    query?: Record<string, unknown>;
    labelKey?: string;
    valueKey?: string;
  };
  placeholder?: string;
}
export interface RecordEditorOptions {
  title: string;
  endpoint: SecureEduUpstreamPath;
  fields: EditorField[];
  /** 总部任务实体详情路径与写入路径相同；复杂数组字段在高级 JSON 中保留。 */
  detailPath?: (id: string) => SecureEduUpstreamPath;
  createPath?: SecureEduUpstreamPath;
  updatePath?: (id: string) => SecureEduUpstreamPath;
}

function asObject(text: string): Record<string, unknown> {
  if (!text.trim()) {
    return {};
  }
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("高级数据必须是 JSON 对象");
  }
  return value as Record<string, unknown>;
}

export function createRecordEditorPage(options: RecordEditorOptions) {
  return defineComponent({
    name: `${options.title}Editor`,
    setup() {
      const client = getSecureEduClient();
      const router = useRouter();
      const route = useRoute();
      const id = computed(() => (typeof route.query.id === "string" ? route.query.id : ""));
      const action = computed(() => (typeof route.query.action === "string" ? route.query.action : "add"));
      const readOnly = computed(() => action.value === "detail");
      const form = reactive<Record<string, unknown>>({});
      const advancedJson = ref("{}");
      const loading = ref(false);
      const saving = ref(false);
      const selectOptions = reactive<Record<string, { label: string; value: string }[]>>({});
      const selectLoading = reactive<Record<string, boolean>>({});

      const loadSelectOptions = async (field: EditorField): Promise<void> => {
        if (!field.remote) {
          return;
        }
        selectLoading[field.key] = true;
        try {
          const value = await client.get<unknown>(field.remote.endpoint, field.remote.query);
          const records = Array.isArray(value)
            ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
            : pageResult(value).records;
          const labelKey = field.remote.labelKey ?? "name";
          const valueKey = field.remote.valueKey ?? "id";
          selectOptions[field.key] = records
            .map((record) => ({ label: displayValue(record[labelKey]), value: String(record[valueKey] ?? "") }))
            .filter((item) => item.label !== "--" && item.value);
        } catch {
          selectOptions[field.key] = [];
        } finally {
          selectLoading[field.key] = false;
        }
      };

      const load = async (): Promise<void> => {
        if (!id.value) {
          return;
        }
        loading.value = true;
        try {
          const detail = await client.get<Record<string, unknown>>(
            options.detailPath?.(id.value) ?? (`${options.endpoint}/${encodeURIComponent(id.value)}` as SecureEduUpstreamPath),
          );
          options.fields.forEach((field) => {
            form[field.key] = detail[field.key];
          });
          advancedJson.value = JSON.stringify(detail, null, 2);
        } catch (error) {
          void message.error(errorText(error, "读取详情失败，请重试"));
        } finally {
          loading.value = false;
        }
      };
      const save = async (): Promise<void> => {
        for (const field of options.fields) {
          if (field.required && (form[field.key] === undefined || form[field.key] === null || form[field.key] === "")) {
            void message.warning(`请填写${field.label}`);
            return;
          }
        }
        saving.value = true;
        try {
          const payload = { ...asObject(advancedJson.value), ...form };
          if (id.value) {
            await client.put(
              options.updatePath?.(id.value) ?? (`${options.endpoint}/${encodeURIComponent(id.value)}` as SecureEduUpstreamPath),
              { ...payload, id: id.value },
            );
          } else {
            await client.post(options.createPath ?? options.endpoint, payload);
          }
          void message.success("保存成功");
          void router.back();
        } catch (error) {
          void message.error(errorText(error, "保存失败，请检查数据后重试"));
        } finally {
          saving.value = false;
        }
      };
      onMounted(() => {
        for (const field of options.fields) {
          void loadSelectOptions(field);
        }
        void load();
      });
      return () => (
        <PageFrame title={`${options.title}${action.value === "add" ? " / 新增" : action.value === "edit" ? " / 编辑" : " / 详情"}`}>
          {{
            default: () => (
              <Form
                style="margin:20px"
                labelCol={{ style: { width: "150px" } }}
                wrapperCol={{ style: { flex: 1 } }}
                disabled={readOnly.value || loading.value}
              >
                <Row gutter={24}>
                  {options.fields.map((field) => (
                    <Col key={field.key} xs={24} xl={12}>
                      <FormItem label={field.label} required={field.required}>
                        {field.type === "textarea" ? (
                          <Textarea
                            value={String(form[field.key] ?? "")}
                            placeholder={field.placeholder ?? `请输入${field.label}`}
                            autoSize={{ minRows: 3, maxRows: 8 }}
                            onUpdate:value={(value) => {
                              form[field.key] = value;
                            }}
                          />
                        ) : field.type === "number" ? (
                          <InputNumber
                            value={form[field.key] as number | undefined}
                            style="width:100%"
                            min={0}
                            placeholder={field.placeholder ?? `请输入${field.label}`}
                            onUpdate:value={(value) => {
                              form[field.key] = value;
                            }}
                          />
                        ) : field.type === "dateTime" ? (
                          <AntDatePicker
                            value={form[field.key] as string | undefined}
                            valueFormat="YYYY-MM-DD HH:mm"
                            format="YYYY-MM-DD HH:mm"
                            showTime={{ format: "HH:mm" }}
                            placeholder={field.placeholder ?? `请选择${field.label}`}
                            style="width:100%"
                            onUpdate:value={(value: unknown) => {
                              form[field.key] = value;
                            }}
                          />
                        ) : field.type === "boolean" ? (
                          <Switch
                            checked={Boolean(form[field.key])}
                            checkedChildren="开启"
                            unCheckedChildren="关闭"
                            onUpdate:checked={(value) => {
                              form[field.key] = value;
                            }}
                          />
                        ) : field.type === "select" ? (
                          <Select
                            value={form[field.key] as string | undefined}
                            options={field.options ?? selectOptions[field.key] ?? []}
                            loading={selectLoading[field.key]}
                            allowClear
                            placeholder={field.placeholder ?? `请选择${field.label}`}
                            onUpdate:value={(value) => {
                              form[field.key] = value;
                            }}
                          />
                        ) : (
                          <Input
                            value={String(form[field.key] ?? "")}
                            placeholder={field.placeholder ?? `请输入${field.label}`}
                            onUpdate:value={(value) => {
                              form[field.key] = value;
                            }}
                          />
                        )}
                      </FormItem>
                    </Col>
                  ))}
                </Row>
              </Form>
            ),
            footer: () => (
              <>
                <Button onClick={() => void router.back()}>返回</Button>
                {readOnly.value ? null : (
                  <Button type="primary" loading={saving.value} style="margin-left:8px" onClick={() => void save()}>
                    保存
                  </Button>
                )}
              </>
            ),
          }}
        </PageFrame>
      );
    },
  });
}
