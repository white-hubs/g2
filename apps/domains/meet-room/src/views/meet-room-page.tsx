import type { ConferenceDevice, ConferenceRoom, FieldConfiguration, NamedOption, PersonScopeType } from "@g2-contract/meet-room";
import {
  Button,
  Cascader,
  Form,
  type FormInstance,
  FormItem,
  type FormRule,
  Input,
  InputNumber,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Select,
  Space,
  Spin,
  Switch,
  TimePicker,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { DevicePickerModal } from "../components/device-picker-modal";
import { PersonScopePicker, type PersonScopeValue } from "../components/person-scope-picker";
import { getMdataClient, getMeetRoomClient, getOuaaClient } from "../domain-context";
import { type AreaCascaderOption, cascaderData, errorMessage, optionTree, text } from "../shared";

import styles from "../styles.module.css";

interface RoomFormState {
  id: string;
  name: string;
  status: boolean;
  areaPath: string[];
  capacity?: number;
  administrators: string[];
  period: string[] | null;
  bookPerson: PersonScopeValue;
  conferenceRoomTypeId?: string;
  devices: ConferenceDevice[];
}

const TimeRangePicker = TimePicker.TimeRangePicker;

const RoomEditor = defineComponent({
  name: "MeetRoomEditor",
  emits: ["saved"],
  setup(_, { emit, expose }) {
    const open = ref(false);
    const optionsLoading = ref(false);
    const saving = ref(false);
    const formRef = ref<FormInstance>();
    const devicePicker = ref<{ openModal(rows?: ConferenceDevice[]): void }>();
    const areas = ref<AreaCascaderOption[]>([]);
    const areaRows = ref<NamedOption[]>([]);
    const userOptions = ref<{ label: string; value: string }[]>([]);
    const roomTypeOptions = ref<{ label: string; value: string }[]>([]);
    const fields = ref<FieldConfiguration[]>([]);
    const form = reactive<RoomFormState>({
      id: "",
      name: "",
      status: true,
      areaPath: [],
      capacity: undefined,
      administrators: [],
      period: null,
      bookPerson: { type: "DEPARTMENT", ids: [] },
      conferenceRoomTypeId: undefined,
      devices: [],
    });
    const field = (code: string): FieldConfiguration | undefined => fields.value.find((item) => item.fieldCode === code);
    const visible = (code: string): boolean => !field(code)?.hidden;
    const required = (code: string): boolean => Boolean(field(code)?.required);
    const findAreaNames = (ids: string[], rows = areaRows.value): string[] => {
      const names: string[] = [];
      let level = rows;
      for (const id of ids) {
        const node = level.find((item) => item.id === id);
        if (!node) {
          break;
        }
        names.push(node.name);
        level = node.children ?? [];
      }
      return names;
    };
    const reset = (): void => {
      Object.assign(form, {
        id: "",
        name: "",
        status: true,
        areaPath: [],
        capacity: undefined,
        administrators: [],
        period: null,
        bookPerson: { type: "DEPARTMENT", ids: [] },
        conferenceRoomTypeId: undefined,
        devices: [],
      });
    };
    const loadOptions = async (): Promise<void> => {
      const [areaResult, users, roomTypes, fieldResult] = await Promise.all([
        (await getMdataClient()).getAreaTree(),
        (await getOuaaClient()).listUsers({ enabled: true, pageNumber: 1, pageSize: 1000 }),
        getMeetRoomClient().listRoomTypes({ status: true }),
        getMeetRoomClient().listFieldConfigurations({ pageNumber: 1, pageSize: 1000 }),
      ]);
      areaRows.value = optionTree(areaResult);
      areas.value = cascaderData(areaRows.value);
      userOptions.value = users.records.map((item) => ({ label: item.name || item.username, value: String(item.id) }));
      roomTypeOptions.value = roomTypes.map((item) => ({ label: item.name, value: item.id }));
      fields.value = fieldResult.records;
    };
    let optionsPromise: Promise<void> | undefined;
    let openSequence = 0;
    const ensureOptions = (): Promise<void> => {
      optionsPromise ??= loadOptions().catch((error: unknown) => {
        optionsPromise = undefined;
        throw error;
      });
      return optionsPromise;
    };
    onMounted(() => {
      void ensureOptions().catch(() => undefined);
    });
    const openModal = async (record?: ConferenceRoom): Promise<void> => {
      const sequence = ++openSequence;
      reset();
      open.value = true;
      optionsLoading.value = true;
      try {
        await ensureOptions();
        if (sequence !== openSequence || !open.value) {
          return;
        }
        if (record?.id) {
          const detail = await getMeetRoomClient().getConferenceRoom(record.id);
          if (sequence !== openSequence || !open.value) {
            return;
          }
          const periods = detail.period?.split(",") ?? [];
          const names = detail.areaName?.split("/").filter(Boolean) ?? [];
          const ids: string[] = [];
          let level = areaRows.value;
          for (const name of names) {
            const node = level.find((item) => item.name === name);
            if (!node) {
              break;
            }
            ids.push(node.id);
            level = node.children ?? [];
          }
          Object.assign(form, {
            id: detail.id,
            name: detail.name ?? "",
            status: !detail.status,
            areaPath: ids,
            capacity: detail.capacity ?? undefined,
            administrators: detail.administrators?.split(",").filter(Boolean) ?? [],
            period: periods.length >= 2 ? periods.slice(0, 2) : null,
            bookPerson: {
              type: (detail.bookPersonType ?? "DEPARTMENT") as PersonScopeType,
              ids: detail.bookPersonList?.map((item) => item.id) ?? detail.bookPerson?.split(",").filter(Boolean) ?? [],
            },
            conferenceRoomTypeId: detail.conferenceRoomTypeId ?? undefined,
            devices: detail.devicesVos ?? [],
          });
        }
      } catch (error) {
        if (sequence === openSequence) {
          message.error(errorMessage(error, "会议室信息加载失败"));
        }
      } finally {
        if (sequence === openSequence) {
          optionsLoading.value = false;
        }
      }
    };
    expose({ openModal });
    const save = async (): Promise<void> => {
      try {
        await formRef.value?.validate();
      } catch {
        return;
      }
      if (required("participantIds") && form.bookPerson.ids.length === 0) {
        message.warning("请选择可预约人员");
        return;
      }
      saving.value = true;
      try {
        const names = findAreaNames(form.areaPath);
        const payload = {
          ...(form.id ? { id: form.id } : {}),
          name: visible("name") ? form.name.trim() || null : null,
          areaId: form.areaPath.at(-1) ?? null,
          areaName: visible("areaName") ? names.join("/") || null : null,
          capacity: visible("capacity") ? (form.capacity ?? null) : null,
          administrators: visible("administrators") ? form.administrators.join(",") || null : null,
          period: visible("period") && Array.isArray(form.period) ? form.period.join(",") || null : null,
          status: form.status ? 0 : 1,
          devices: form.devices.map((item) => ({ deviceId: String(item.deviceId), name: item.deviceName ?? item.name ?? "" })),
          bookPersonType: visible("participantIds") ? form.bookPerson.type : null,
          bookPerson: visible("participantIds") ? form.bookPerson.ids.join(",") || null : null,
          conferenceRoomTypeId: visible("conferenceType") ? (form.conferenceRoomTypeId ?? null) : null,
        };
        if (form.id) {
          await getMeetRoomClient().updateConferenceRoom({ ...payload, id: form.id });
        } else {
          await getMeetRoomClient().createConferenceRoom(payload);
        }
        message.success("保存成功");
        open.value = false;
        emit("saved");
      } catch (error) {
        message.error(errorMessage(error, "保存失败"));
      } finally {
        saving.value = false;
      }
    };
    const rules = (code: string, messageText: string): FormRule[] =>
      required(code) ? [{ required: true, message: messageText, trigger: "change" }] : [];
    return () => (
      <>
        <Modal
          open={open.value}
          title={`${form.id ? "编辑" : "新增"}会议室`}
          width="760px"
          confirmLoading={saving.value}
          okButtonProps={{ disabled: optionsLoading.value }}
          onCancel={() => {
            openSequence += 1;
            optionsLoading.value = false;
            open.value = false;
          }}
          onOk={() => void save()}
        >
          <Spin class={styles.modalSpin} spinning={optionsLoading.value} tip="正在加载会议室配置...">
            <Form ref={formRef} model={form} labelCol={{ style: { width: "120px" } }}>
              <div class={styles.modalGrid}>
                {visible("name") && (
                  <FormItem label="会议室名称" name="name" rules={rules("name", "请输入会议室名称")}>
                    <Input v-model:value={form.name} maxlength={50} placeholder="请输入会议室名称" />
                  </FormItem>
                )}
                {visible("conferenceType") && (
                  <FormItem label="会议室类型" name="conferenceRoomTypeId" rules={rules("conferenceType", "请选择会议室类型")}>
                    <Select
                      v-model:value={form.conferenceRoomTypeId}
                      options={roomTypeOptions.value}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="请选择会议室类型"
                    />
                  </FormItem>
                )}
                {visible("areaName") && (
                  <FormItem label="所属区域" name="areaPath" rules={rules("areaName", "请选择所属区域")}>
                    <Cascader
                      v-model:value={form.areaPath}
                      options={areas.value}
                      fieldNames={{ label: "name", value: "id", children: "children" }}
                      changeOnSelect
                      allowClear
                      placeholder="请选择所属区域"
                    />
                  </FormItem>
                )}
                {visible("capacity") && (
                  <FormItem label="可容纳人数" name="capacity" rules={rules("capacity", "请输入可容纳人数")}>
                    <InputNumber v-model:value={form.capacity} min={1} max={999} style={{ width: "100%" }} placeholder="请输入1-999" />
                  </FormItem>
                )}
                {visible("administrators") && (
                  <FormItem class={styles.modalFull} label="管理员" name="administrators" rules={rules("administrators", "请选择管理员")}>
                    <Select
                      v-model:value={form.administrators}
                      mode="multiple"
                      options={userOptions.value}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      maxTagCount={4}
                      placeholder="请选择管理员"
                    />
                  </FormItem>
                )}
                {visible("period") && (
                  <FormItem class={styles.modalFull} label="可预约时间段" name="period" rules={rules("period", "请选择可预约时间段")}>
                    <TimeRangePicker
                      class={styles.timeRangePicker}
                      v-model:value={form.period}
                      format="HH:mm"
                      valueFormat="HH:mm"
                      placeholder={["开始时间", "结束时间"]}
                      allowClear
                    />
                  </FormItem>
                )}
                {visible("participantIds") && (
                  <FormItem class={styles.modalFull} label="可预约人员" required={required("participantIds")}>
                    <PersonScopePicker v-model:value={form.bookPerson} />
                  </FormItem>
                )}
                <FormItem label="使用状态">
                  <Switch v-model:checked={form.status} checkedChildren="启用" unCheckedChildren="停用" />
                </FormItem>
                <FormItem class={styles.modalFull} label="会议室设备">
                  <div class={styles.inlinePicker}>
                    <Select
                      value={form.devices.map((item) => item.deviceId)}
                      mode="multiple"
                      open={false}
                      options={form.devices.map((item) => ({ value: item.deviceId, label: item.deviceName ?? item.name ?? item.deviceId }))}
                      maxTagCount={4}
                      placeholder="请选择会议室设备"
                    />
                    <Button type="primary" onClick={() => devicePicker.value?.openModal(form.devices)}>
                      选择设备
                    </Button>
                  </div>
                </FormItem>
              </div>
            </Form>
          </Spin>
        </Modal>
        <DevicePickerModal ref={devicePicker} multiple onSelected={(rows: ConferenceDevice[]) => (form.devices = rows)} />
      </>
    );
  },
});

export const MeetRoomPage = defineComponent({
  name: "MeetRoomPage",
  setup() {
    const query = reactive({ areaName: "", name: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const editor = ref<{ openModal(record?: ConferenceRoom): void }>();
    const areaOptions = ref<{ children?: unknown[]; label: string; value: string }[]>([]);
    const remove = async (record: ConferenceRoom): Promise<void> => {
      try {
        await getMeetRoomClient().deleteConferenceRoom(record.id);
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(errorMessage(error, "删除失败"));
      }
    };
    const changeStatus = async (record: ConferenceRoom, checked: boolean): Promise<void> => {
      try {
        await getMeetRoomClient().setConferenceRoomStatus(record.id, checked ? 0 : 1);
        record.status = checked ? 0 : 1;
        message.success("操作成功");
      } catch (error) {
        message.error(errorMessage(error, "状态更新失败"));
        tableApi.query();
      }
    };
    const [PcTable, tableApi] = usePcTable({
      tableCode: "MEET_ROOM_LIST",
      rowKey: "id",
      columns: [
        {
          title: "会议室名称",
          dataIndex: "name",
          width: 180,
          fixed: "left",
          ellipsis: true,
          customRender: ({ text: value }) => text(value),
        },
        { title: "所属区域", dataIndex: "areaName", width: 220, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "可容纳人数", dataIndex: "capacity", width: 130, customRender: ({ text: value }) => text(value) },
        { title: "管理员", dataIndex: "administratorsName", width: 200, ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "会议设备数",
          dataIndex: "devicesVos",
          width: 130,
          customRender: ({ record }: { record: ConferenceRoom }) => record.devicesVos?.length ?? 0,
        },
        {
          title: "使用状态",
          dataIndex: "status",
          width: 130,
          customRender: ({ record }: { record: ConferenceRoom }) => (
            <Switch
              checked={!record.status}
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={(checked) => void changeStatus(record, Boolean(checked))}
            />
          ),
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 150,
          fixed: "right",
          customRender: ({ record }: { record: ConferenceRoom }) => (
            <Space size={4}>
              <Button type="link" size="small" onClick={() => editor.value?.openModal(record)}>
                编辑
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
          const result = await getMeetRoomClient().pageConferenceRooms({
            name: query.name || undefined,
            areaName: query.areaName || undefined,
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
          });
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "会议室列表加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Cascader",
          fieldName: "areaName",
          label: "所属区域",
          defaultValue: undefined,
          componentProps: {
            options: areaOptions,
            fieldNames: { label: "label", value: "label", children: "children" },
            changeOnSelect: true,
            allowClear: true,
            placeholder: "请选择所属区域",
          },
        },
        {
          component: "Input",
          fieldName: "name",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入会议室名称" },
        },
      ],
      handleSubmit(values) {
        query.name = String(values.name ?? "").trim();
        query.areaName = Array.isArray(values.areaName) ? values.areaName.map(String).join("/") : "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.name = "";
        query.areaName = "";
        page.pageNumber = 1;
        tableApi.query();
      },
    });
    onMounted(async () => {
      try {
        const rows = optionTree(await (await getMdataClient()).getAreaTree());
        const map = (nodes: NamedOption[]): { children?: unknown[]; label: string; value: string }[] =>
          nodes.map((node) => ({ label: node.name, value: node.name, ...(node.children?.length ? { children: map(node.children) } : {}) }));
        areaOptions.value = map(rows);
        formApi.updateFieldSchema({
          component: "Cascader",
          fieldName: "areaName",
          label: "所属区域",
          componentProps: {
            options: areaOptions.value,
            fieldNames: { label: "label", value: "value", children: "children" },
            changeOnSelect: true,
            allowClear: true,
            placeholder: "请选择所属区域",
          },
        });
      } catch (error) {
        message.error(errorMessage(error, "区域数据加载失败"));
      }
    });
    return () => (
      <PageLayout
        title="会议室"
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
              <RoomEditor ref={editor} onSaved={() => tableApi.query()} />
            </div>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(pageNumber, pageSize) => {
                page.pageNumber = pageNumber;
                page.pageSize = pageSize;
                tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
