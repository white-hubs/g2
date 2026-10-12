import type { ConferenceDevice, ConferenceRoom, RoomScreenConfig } from "@g2-contract/meet-room";
import {
  Button,
  Form,
  type FormInstance,
  FormItem,
  InputNumber,
  Modal,
  PageLayout,
  PopConfirm,
  Select,
  Space,
  Switch,
  Textarea,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { DevicePickerModal } from "../components/device-picker-modal";
import { getMeetRoomClient } from "../domain-context";
import { errorMessage, text } from "../shared";

import styles from "../styles.module.css";

const ScreenEditor = defineComponent({
  emits: ["saved"],
  setup(_, { emit, expose }) {
    const open = ref(false);
    const saving = ref(false);
    const formRef = ref<FormInstance>();
    const picker = ref<{ openModal(rows?: ConferenceDevice[]): void }>();
    const rooms = ref<ConferenceRoom[]>([]);
    const device = ref<ConferenceDevice>();
    const form = reactive({
      conferenceId: undefined as string | undefined,
      cronExpression: undefined as number | undefined,
      programUrl: "",
      authInfo: "",
    });
    const openModal = async (): Promise<void> => {
      Object.assign(form, { conferenceId: undefined, cronExpression: undefined, programUrl: "", authInfo: "" });
      device.value = undefined;
      try {
        rooms.value = await getMeetRoomClient().listConferenceRooms();
        open.value = true;
      } catch (error) {
        message.error(errorMessage(error, "会议室列表加载失败"));
      }
    };
    expose({ openModal });
    const save = async (): Promise<void> => {
      try {
        await formRef.value?.validate();
      } catch {
        return;
      }
      if (!device.value) {
        message.warning("请选择设备");
        return;
      }
      saving.value = true;
      try {
        await getMeetRoomClient().saveRoomScreenConfig({
          conferenceId: form.conferenceId,
          deviceName: device.value.deviceName ?? device.value.name ?? "",
          deviceCode: device.value.deviceCode ?? device.value.code ?? "",
          cronExpression: form.cronExpression ?? null,
          programUrl: form.programUrl.trim() || null,
          authInfo: form.authInfo.trim(),
        });
        message.success("保存成功");
        open.value = false;
        emit("saved");
      } catch (error) {
        message.error(errorMessage(error, "保存失败"));
      } finally {
        saving.value = false;
      }
    };
    return () => (
      <>
        <Modal
          open={open.value}
          title="新增设置"
          width="620px"
          confirmLoading={saving.value}
          onCancel={() => (open.value = false)}
          onOk={() => void save()}
        >
          <Form ref={formRef} model={form} labelCol={{ style: { width: "120px" } }}>
            <FormItem label="选择设备" required>
              <div class={styles.inlinePicker}>
                <Select
                  value={device.value ? [device.value.deviceId] : []}
                  mode="multiple"
                  open={false}
                  options={
                    device.value
                      ? [{ value: device.value.deviceId, label: device.value.deviceName ?? device.value.name ?? device.value.deviceId }]
                      : []
                  }
                  placeholder="请选择会议屏设备"
                />
                <Button type="primary" onClick={() => picker.value?.openModal(device.value ? [device.value] : [])}>
                  选择设备
                </Button>
              </div>
            </FormItem>
            <FormItem label="选择会议室" name="conferenceId" rules={[{ required: true, message: "请选择会议室", trigger: "change" }]}>
              <Select
                v-model:value={form.conferenceId}
                options={rooms.value.map((item) => ({ label: item.name, value: item.id }))}
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="请选择会议室"
              />
            </FormItem>
            <FormItem label="自动刷新时间">
              <div class={styles.inlinePicker}>
                <InputNumber v-model:value={form.cronExpression} min={1} style={{ width: "100%" }} placeholder="请输入刷新间隔" />
                <span>秒</span>
              </div>
            </FormItem>
            <FormItem label="节目接口地址">
              <Textarea v-model:value={form.programUrl} rows={3} placeholder="请输入节目接口地址" />
            </FormItem>
            <FormItem label="鉴权信息">
              <Textarea v-model:value={form.authInfo} rows={3} placeholder="请输入鉴权信息" />
            </FormItem>
          </Form>
        </Modal>
        <DevicePickerModal ref={picker} multiple={false} onSelected={(rows: ConferenceDevice[]) => (device.value = rows[0])} />
      </>
    );
  },
});

export const ScreenSettingsPage = defineComponent({
  name: "ScreenSettingsPage",
  setup() {
    const query = reactive({ keyword: "" });
    const editor = ref<{ openModal(): void }>();
    const updateStatus = async (record: RoomScreenConfig, checked: boolean): Promise<void> => {
      try {
        await getMeetRoomClient().openRoomScreenConfig({ ...record, displayStatus: checked ? "OPEN" : "CLOSE" });
        record.displayStatus = checked ? "OPEN" : "CLOSE";
        message.success("操作成功");
      } catch (error) {
        message.error(errorMessage(error, "状态更新失败"));
        tableApi.query();
      }
    };
    const remove = async (record: RoomScreenConfig): Promise<void> => {
      try {
        await getMeetRoomClient().deleteRoomScreenConfig(record.id);
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(errorMessage(error, "删除失败"));
      }
    };
    const copy = async (record: RoomScreenConfig): Promise<void> => {
      const url = `${location.origin}/apps/@ghcloud/cube-meet-room-data-viz#/entry?id=${encodeURIComponent(record.conferenceId ?? "")}`;
      try {
        await navigator.clipboard.writeText(url);
        message.success("复制成功");
      } catch {
        message.error("复制失败，请检查浏览器剪贴板权限");
      }
    };
    const [PcTable, tableApi] = usePcTable({
      tableCode: "MEET_ROOM_SCREEN_SETTINGS",
      rowKey: "id",
      pagination: false,
      columns: [
        { title: "设备编号", dataIndex: "deviceCode", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "设备名称", dataIndex: "deviceName", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "关联会议室", dataIndex: "conferenceName", ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "发送节目状态",
          dataIndex: "displayStatus",
          width: 150,
          customRender: ({ record }: { record: RoomScreenConfig }) => (
            <Switch
              checked={record.displayStatus === "OPEN"}
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={(checked) => void updateStatus(record, Boolean(checked))}
            />
          ),
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 170,
          fixed: "right",
          customRender: ({ record }: { record: RoomScreenConfig }) => (
            <Space size={4}>
              <Button type="link" size="small" onClick={() => void copy(record)}>
                复制链接
              </Button>
              <PopConfirm title="确认删除该项？" onConfirm={() => void remove(record)}>
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </PopConfirm>
            </Space>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const records = await getMeetRoomClient().listRoomScreenConfigs({ keyword: query.keyword || undefined });
          return { records, total: records.length, pages: 1 };
        } catch (error) {
          message.error(errorMessage(error, "会议屏设置加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "设备名称",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入设备名称" },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        tableApi.query();
      },
      handleReset() {
        query.keyword = "";
        tableApi.query();
      },
    });
    return () => (
      <PageLayout
        title="会议屏展示设置"
        showFooter={false}
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => editor.value?.openModal()}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.pageContent}>
              <PcForm />
              <PcTable />
              <ScreenEditor ref={editor} onSaved={() => tableApi.query()} />
            </div>
          ),
        }}
      />
    );
  },
});
