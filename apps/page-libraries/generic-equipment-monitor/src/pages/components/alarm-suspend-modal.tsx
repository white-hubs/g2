import type { FileClient } from "@g2-client/file/client";
import { DatePicker, Form, FormItem, Input, Modal, message } from "@g2-platform/pc-ui";
import { defineComponent, ref, type PropType } from "vue";

import { ALARM_RECORD_SUSPEND_SCENE } from "../alarm-scene-codes";
import AlarmSceneUpload from "./alarm-scene-upload";

export type AlarmSuspendPayload = {
  remark: string;
  estimatedProcessTime: string;
  fileVOS: unknown[];
};

export default defineComponent({
  name: "GemAlarmSuspendModal",
  props: {
    getFileClient: { type: Function as PropType<() => Promise<FileClient>>, default: undefined },
  },
  emits: {
    ok: (_payload: AlarmSuspendPayload) => true,
  },
  setup(props, { emit, expose }) {
    const visible = ref(false);
    const remark = ref("");
    const estimatedProcessTime = ref<string | undefined>(undefined);
    const fileVOS = ref<unknown[]>([]);

    const open = () => {
      remark.value = "";
      estimatedProcessTime.value = undefined;
      fileVOS.value = [];
      visible.value = true;
    };

    const cancel = () => {
      visible.value = false;
    };

    expose({ open });

    return () => (
      <Modal
        title="挂起"
        open={visible.value}
        width={560}
        onOk={() => {
          if (!estimatedProcessTime.value) {
            message.warning("请选择预计处理时间");
            return;
          }
          emit("ok", {
            remark: remark.value,
            estimatedProcessTime: String(estimatedProcessTime.value),
            fileVOS: fileVOS.value,
          });
          cancel();
        }}
        onCancel={cancel}
      >
        <Form labelCol={{ span: 5 }} wrapperCol={{ span: 18 }}>
          <FormItem label="预计处理时间" required>
            <DatePicker
              showTime
              style={{ width: "100%" }}
              value={estimatedProcessTime.value as never}
              format="YYYY-MM-DD HH:mm"
              valueFormat="YYYY-MM-DD HH:mm"
              onUpdate:value={(v: string) => {
                estimatedProcessTime.value = v;
              }}
            />
          </FormItem>
          <FormItem label="挂起原因">
            <Input.TextArea
              value={remark.value}
              placeholder="请输入挂起原因"
              allowClear
              onUpdate:value={(v: string) => {
                remark.value = v;
              }}
            />
          </FormItem>
          <FormItem label="图片">
            <AlarmSceneUpload
              sceneCode={ALARM_RECORD_SUSPEND_SCENE}
              max={3}
              getFileClient={props.getFileClient}
              modelValue={fileVOS.value as never[]}
              onUpdate:modelValue={(files) => {
                fileVOS.value = files;
              }}
            />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});
