import { Alert, Button, CheckboxGroup, Form, FormItem, PageLayout, Spin, Switch, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, type PropType } from "vue";

import { ALARM_HANDLER_SUBMIT_CONFIG_SUFFIX, ALARM_HANDLER_UPLOAD_PIC_CONFIG_CODE } from "./alarm-scene-codes";
import type { GemPageProps } from "./page-props";

type ConfigState = { id?: string; requirePic: boolean; watermark: string[]; uploadMethod: string[] };
const emptyState = (): ConfigState => ({ requirePic: false, watermark: [], uploadMethod: [] });

function unwrapList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (!value || typeof value !== "object") return [];
  const root = value as Record<string, unknown>;
  return Array.isArray(root.data)
    ? (root.data as Record<string, unknown>[])
    : Array.isArray(root.records)
      ? (root.records as Record<string, unknown>[])
      : [];
}

export default defineComponent({
  name: "GemAlarmHandlerSubmitConfigPage",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getDictionaryClient: { type: Function as PropType<GemPageProps["getDictionaryClient"]>, required: true },
    applicationCode: { type: String, default: "" },
    title: { type: String, default: "报警处理提交配置" },
  },
  setup(props) {
    const loading = ref(true);
    const saving = ref(false);
    const state = reactive<ConfigState>(emptyState());
    const itemCode = () => `${props.applicationCode}${ALARM_HANDLER_SUBMIT_CONFIG_SUFFIX}`;
    const load = async () => {
      try {
        const client = await props.getDictionaryClient!();
        await client.getOrCreateDictionaryItem({ code: itemCode(), remarks: "报警处理提交配置" });
        const rows = unwrapList(await client.getDataDictionaryByItem({ itemCode: itemCode(), code: ALARM_HANDLER_UPLOAD_PIC_CONFIG_CODE }));
        const row = rows[0];
        if (row) {
          state.id = String(row.id ?? "") || undefined;
          const parsed = typeof row.variable === "string" ? (JSON.parse(row.variable) as Record<string, unknown>) : undefined;
          if (parsed) {
            state.requirePic = parsed.requirePic === true;
            state.watermark = Array.isArray(parsed.watermark) ? parsed.watermark.map(String) : [];
            state.uploadMethod = Array.isArray(parsed.uploadMethod) ? parsed.uploadMethod.map(String) : [];
          }
        }
      } catch {
        message.error("加载报警处理提交配置失败");
      } finally {
        loading.value = false;
      }
    };
    const save = async () => {
      saving.value = true;
      try {
        const client = await props.getDictionaryClient!();
        const payload = {
          itemCode: itemCode(),
          code: ALARM_HANDLER_UPLOAD_PIC_CONFIG_CODE,
          variable: JSON.stringify({ requirePic: state.requirePic, watermark: state.watermark, uploadMethod: state.uploadMethod }),
        };
        if (state.id) await client.updateDataDictionary({ ...payload, id: state.id });
        else await client.createDataDictionary(payload);
        message.success("保存成功");
        await load();
      } catch {
        message.error("保存失败");
      } finally {
        saving.value = false;
      }
    };
    onMounted(() => void load());
    return () => (
      <PageLayout
        title={props.title}
        v-slots={{
          "layout-content": () =>
            loading.value ? (
              <Spin />
            ) : (
              <div style={{ padding: 16 }}>
                <Alert type="info" message="用于对报警处理的图片进行配置，以约束用户的处理行为" />
                <Form style={{ marginTop: 20 }} labelCol={{ span: 5 }} wrapperCol={{ span: 12 }}>
                  <FormItem label="强制上传图片">
                    <Switch
                      checked={state.requirePic}
                      onUpdate:checked={(value: unknown) => {
                        state.requirePic = value === true;
                      }}
                    />
                  </FormItem>
                  <FormItem label="图片上传方式">
                    <CheckboxGroup
                      value={state.uploadMethod}
                      options={[
                        { label: "拍照", value: "camera" },
                        { label: "相册", value: "album" },
                      ]}
                      onUpdate:value={(value: unknown) => {
                        state.uploadMethod = Array.isArray(value) ? value.map(String) : [];
                      }}
                    />
                  </FormItem>
                  <FormItem label="图片水印添加">
                    <CheckboxGroup
                      value={state.watermark}
                      options={[
                        { label: "上传地点", value: "location" },
                        { label: "上传时间", value: "timestamp" },
                      ]}
                      onUpdate:value={(value: unknown) => {
                        state.watermark = Array.isArray(value) ? value.map(String) : [];
                      }}
                    />
                  </FormItem>
                </Form>
              </div>
            ),
          "footer-btn": () => (
            <Button type="primary" loading={saving.value} onClick={() => void save()}>
              保存
            </Button>
          ),
        }}
      />
    );
  },
});
