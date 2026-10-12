import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import { Empty, Form, FormItem, Input, Modal, Select } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";

import {
  buildAlarmHandlePayload,
  buildHandleDictionaryQuery,
  mapAlarmReasons,
  parseHandleUploadConfig,
  type AlarmHandleFormState,
  type ReasonOption,
} from "../alarm-handle.model";
import { ALARM_RESULT_OPTIONS } from "../alarm-record.model";
import { ALARM_RECORD_HANDLER_SCENE } from "../alarm-scene-codes";
import AlarmSceneUpload from "./alarm-scene-upload";

export type AlarmHandlePayload = Record<string, unknown>;

export default defineComponent({
  name: "GemAlarmHandleModal",
  props: {
    batchMode: { type: Boolean, default: false },
    applicationCode: { type: String, default: "" },
    getAlarmClient: { type: Function as PropType<() => Promise<AlarmCenterClient>>, default: undefined },
    getFileClient: { type: Function as PropType<() => Promise<FileClient>>, default: undefined },
    getDictionaryClient: { type: Function as PropType<() => Promise<DictionaryClient>>, default: undefined },
  },
  emits: {
    ok: (_payload: AlarmHandlePayload) => true,
  },
  setup(props, { emit, expose }) {
    const visible = ref(false);
    const loadingConfig = ref(false);
    const reasonOptions = ref<ReasonOption[]>([]);
    const searchText = ref("");
    const requirePic = ref(false);
    const watermark = ref("");
    const form = reactive<AlarmHandleFormState>({
      alarmHandlerResult: "ALARM_IMPRACTICAL",
      alarmHandlerResultRemark: "",
      alarmReasonValue: "",
      fileVOS: [],
    });

    async function loadReasonOptions(): Promise<void> {
      if (!props.getAlarmClient || props.batchMode) {
        reasonOptions.value = [];
        return;
      }
      try {
        const client = await props.getAlarmClient();
        reasonOptions.value = mapAlarmReasons(await client.getAlarmReasons());
      } catch {
        reasonOptions.value = [];
      }
    }

    async function loadHandleConfig(): Promise<void> {
      if (props.batchMode || !props.getDictionaryClient || !props.applicationCode.trim()) {
        requirePic.value = false;
        watermark.value = "";
        return;
      }
      loadingConfig.value = true;
      try {
        const client = await props.getDictionaryClient();
        const raw = await client.getDataDictionaryByItem(buildHandleDictionaryQuery(props.applicationCode));
        const config = parseHandleUploadConfig(raw);
        requirePic.value = config.requirePic;
        const parts: string[] = [];
        if (config.watermarkParts.includes("location")) {
          const locationText = await resolveLocationWatermark();
          if (locationText) parts.push(locationText);
        }
        if (config.watermarkParts.includes("timestamp")) {
          parts.push(new Date().toISOString().slice(0, 19).replace("T", " "));
        }
        watermark.value = parts.join(" ");
      } catch {
        requirePic.value = false;
        watermark.value = "";
      } finally {
        loadingConfig.value = false;
      }
    }

    async function resolveLocationWatermark(): Promise<string> {
      if (typeof navigator === "undefined" || !navigator.geolocation) return "";
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 3000,
            maximumAge: 60_000,
          });
        });
        const { latitude, longitude } = pos.coords;
        return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
      } catch {
        return "";
      }
    }

    const resetForm = () => {
      form.alarmHandlerResult = "ALARM_IMPRACTICAL";
      form.alarmHandlerResultRemark = "";
      form.alarmReasonValue = "";
      form.fileVOS = [];
      searchText.value = "";
    };

    const open = () => {
      resetForm();
      visible.value = true;
      void loadReasonOptions();
      void loadHandleConfig();
    };

    const cancel = () => {
      visible.value = false;
      resetForm();
    };

    watch(
      () => props.applicationCode,
      () => {
        if (visible.value) {
          void loadHandleConfig();
        }
      },
    );

    onMounted(() => {
      void loadReasonOptions();
    });

    const addReasonOption = () => {
      const label = searchText.value.trim();
      if (!label) {
        return;
      }
      const value = Date.now();
      reasonOptions.value = [...reasonOptions.value, { label, value, isNew: true }];
      form.alarmReasonValue = value;
    };

    const handleOk = () => {
      if (!form.alarmHandlerResult) {
        return;
      }
      if (!props.batchMode && (form.alarmReasonValue == null || form.alarmReasonValue === "")) {
        return;
      }
      if (!props.batchMode && requirePic.value && !form.fileVOS.length) {
        return;
      }
      if (props.batchMode) {
        emit("ok", {
          alarmHandlerResult: form.alarmHandlerResult,
          alarmHandlerResultRemark: form.alarmHandlerResultRemark,
        });
      } else {
        emit("ok", buildAlarmHandlePayload(form, reasonOptions.value));
      }
      cancel();
    };

    expose({ open });

    const reasonSelectOptions = reasonOptions.value.map((item) => ({
      label: item.label,
      value: item.value,
    }));

    return () => (
      <Modal
        title={props.batchMode ? "批量处理" : "处理"}
        open={visible.value}
        confirmLoading={loadingConfig.value}
        onOk={handleOk}
        onCancel={cancel}
        width={560}
      >
        <Form labelCol={{ span: 5 }} wrapperCol={{ span: 18 }}>
          <FormItem label="处理结果" required>
            <Select
              style={{ width: "100%" }}
              value={form.alarmHandlerResult}
              options={[...ALARM_RESULT_OPTIONS]}
              onUpdate:value={(v: string) => {
                form.alarmHandlerResult = v;
              }}
            />
          </FormItem>
          {props.batchMode ? null : (
            <FormItem label="报警原因" required>
              <Select
                style={{ width: "100%" }}
                showSearch
                value={form.alarmReasonValue}
                options={reasonSelectOptions}
                filterOption={(input: string, option?: { label?: string }) => String(option?.label || "").includes(input)}
                onSearch={(value: string) => {
                  searchText.value = value;
                }}
                onUpdate:value={(v: string | number) => {
                  form.alarmReasonValue = v;
                }}
                notFoundContent={
                  <Empty description="">
                    {{
                      description: () => (
                        <div>
                          暂无数据
                          {searchText.value ? (
                            <div style={{ marginTop: 4 }}>
                              <a
                                style={{ cursor: "pointer" }}
                                onMousedown={(e: MouseEvent) => e.preventDefault()}
                                onClick={addReasonOption}
                              >
                                添加 {searchText.value}
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ),
                    }}
                  </Empty>
                }
              />
            </FormItem>
          )}
          <FormItem label="描述信息">
            <Input.TextArea
              value={form.alarmHandlerResultRemark}
              placeholder="请输入描述信息"
              maxlength={props.batchMode ? 200 : undefined}
              showCount={props.batchMode}
              allowClear
              onUpdate:value={(v: string) => {
                form.alarmHandlerResultRemark = v;
              }}
            />
          </FormItem>
          {props.batchMode ? null : (
            <FormItem label="图片" required={requirePic.value}>
              <AlarmSceneUpload
                sceneCode={ALARM_RECORD_HANDLER_SCENE}
                businessKey="alarm"
                max={3}
                watermark={watermark.value}
                getFileClient={props.getFileClient}
                modelValue={form.fileVOS}
                onUpdate:modelValue={(files) => {
                  form.fileVOS = files;
                }}
              />
            </FormItem>
          )}
        </Form>
      </Modal>
    );
  },
});
