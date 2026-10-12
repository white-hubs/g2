import type { AccessControlClient, DoorDeviceRecord } from "@g2-contract/access-control";
import { defineComponent, inject, reactive } from "vue";

import { DOMAIN_CONTEXT_KEY } from "../../domain-context";
import { resolveControlStatus } from "../device-actions";
import { defineAsyncAccessPcUiComponent, accessPcUiMessage as message } from "../pc-ui-runtime";

import styles from "./control-modal.module.css";

export interface ControlModalExpose {
  open: (record: DoorDeviceRecord) => void;
}

export default defineComponent({
  name: "ControlModal",
  emits: ["changed"],
  setup: (_props, { emit, expose }) => {
    const ctx = inject(DOMAIN_CONTEXT_KEY);
    if (!ctx) {
      throw new Error("ControlModal requires DomainContext");
    }
    const Form = defineAsyncAccessPcUiComponent("Form");
    const FormItem = defineAsyncAccessPcUiComponent("FormItem");
    const Modal = defineAsyncAccessPcUiComponent("Modal");
    const RadioGroup = defineAsyncAccessPcUiComponent("RadioGroup");

    const state = reactive({
      open: false,
      loading: false,
      deviceStatus: 4,
      controlOption: "",
      device: null as DoorDeviceRecord | null,
    });

    const open = async (record: DoorDeviceRecord): Promise<void> => {
      state.open = true;
      state.device = record;
      state.deviceStatus = 4;
      state.controlOption = "";
      try {
        const client = await ctx.ensureClient<AccessControlClient>("accessControlClient");
        const result = await client.inspectgetStatus({ id: record.id || "" });
        state.deviceStatus = resolveControlStatus(result);
        state.controlOption = String(state.deviceStatus);
      } catch {
        state.deviceStatus = 4;
      }
    };

    const submit = async (): Promise<void> => {
      state.loading = true;
      try {
        const client = await ctx.ensureClient<AccessControlClient>("accessControlClient");
        await client.controlDoor({
          doorIndexCodes: state.device?.outBusinessId || state.device?.businessId || "",
          controlType: state.controlOption,
        });
        message.success("操作成功");
        state.open = false;
        emit("changed");
      } finally {
        state.loading = false;
      }
    };

    expose({ open });

    return () => (
      <Modal
        open={state.open}
        title={state.device?.name || "--"}
        width="640px"
        confirmLoading={state.loading}
        onCancel={() => {
          state.open = false;
        }}
        onOk={() => {
          void submit();
        }}
        onUpdate:open={(visible: boolean) => {
          state.open = visible;
        }}
      >
        <div class={styles.panelRefBox}>
          <div class={styles.panelRefBoxLeft}>
            <img
              src={
                ["0", "1"].includes(state.controlOption)
                  ? "/resource/v1/accesscontrol-migrate/btn2.png"
                  : "/resource/v1/accesscontrol-migrate/btn1.png"
              }
              alt="门禁状态"
            />
          </div>
          <div class={styles.panelRefBoxRight}>
            <Form>
              <FormItem label="启停控制">
                <RadioGroup
                  buttonStyle="solid"
                  value={state.controlOption}
                  options={[
                    { value: "1", label: "开启" },
                    { value: "2", label: "关闭" },
                  ]}
                  onUpdate:value={(value: string | number) => {
                    state.controlOption = String(value);
                  }}
                />
              </FormItem>
              <FormItem label="远程控制">
                <RadioGroup
                  buttonStyle="solid"
                  value={state.controlOption}
                  options={[
                    { value: "0", label: "常开" },
                    { value: "3", label: "常关" },
                  ]}
                  onUpdate:value={(value: string | number) => {
                    state.controlOption = String(value);
                  }}
                />
              </FormItem>
            </Form>
          </div>
        </div>
        <div class={styles.panelRefBoxBottom}>
          当前状态：{["初始状态", "开门状态", "关门状态", "离线状态", "--"][state.deviceStatus] || "--"}
        </div>
      </Modal>
    );
  },
});
