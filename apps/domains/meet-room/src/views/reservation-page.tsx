import type {
  AppointmentRoom,
  AppointmentSlot,
  BookRoomDetail,
  ConferenceGoods,
  ConferenceType,
  FieldConfiguration,
} from "@g2-contract/meet-room";
import {
  Button,
  CheckboxGroup,
  Form,
  type FormInstance,
  FormItem,
  type FormRule,
  Input,
  InputNumber,
  Modal,
  Page,
  PageLayout,
  type PcTableColumn,
  PopConfirm,
  Select,
  Space,
  Textarea,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { PersonScopePicker, type PersonScopeValue } from "../components/person-scope-picker";
import { getMeetRoomClient } from "../domain-context";
import { errorMessage, generateTimes, text } from "../shared";

import styles from "../styles.module.css";

interface SelectedSlot {
  room: AppointmentRoom;
  slot: AppointmentSlot;
  time: string;
}
const today = (): string => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const statusInfo = {
  RESERVABLE: { label: "空闲中", className: styles.slotReservable },
  RESERVED: { label: "已预约", className: styles.slotReserved },
  APPROVAL: { label: "预约中", className: styles.slotApproval },
  BEING_USED: { label: "使用中", className: styles.slotUsed },
} as const;

const ReservationEditor = defineComponent({
  emits: ["saved"],
  setup(_, { emit, expose }) {
    const open = ref(false);
    const saving = ref(false);
    const formRef = ref<FormInstance>();
    const selection = ref<SelectedSlot[]>([]);
    const types = ref<ConferenceType[]>([]);
    const goods = ref<ConferenceGoods[]>([]);
    const fields = ref<FieldConfiguration[]>([]);
    const form = reactive({
      appointmentDate: "",
      conferenceType: undefined as string | undefined,
      conferenceTheme: "",
      goodsIds: [] as string[],
      bookNum: undefined as number | undefined,
      content: "",
      participants: { type: "DEPARTMENT", ids: [] } as PersonScopeValue,
    });
    const field = (code: string) => fields.value.find((item) => item.fieldCode === code);
    const visible = (code: string) => !field(code)?.hidden;
    const required = (code: string) => Boolean(field(code)?.required);
    const openModal = async (date: string, rows: SelectedSlot[]): Promise<void> => {
      selection.value = [...rows];
      Object.assign(form, {
        appointmentDate: date,
        conferenceType: undefined,
        conferenceTheme: "",
        goodsIds: [],
        bookNum: undefined,
        content: "",
        participants: { type: "DEPARTMENT", ids: [] },
      });
      try {
        const [typeRows, goodsRows, fieldRows] = await Promise.all([
          getMeetRoomClient().listConferenceTypes(),
          getMeetRoomClient().listConferenceGoods({ pageNumber: 1, pageSize: 1000 }),
          getMeetRoomClient().listFieldConfigurations({ pageNumber: 1, pageSize: 1000 }),
        ]);
        types.value = typeRows;
        goods.value = goodsRows;
        fields.value = fieldRows.records;
        open.value = true;
      } catch (error) {
        message.error(errorMessage(error, "预约配置加载失败"));
      }
    };
    expose({ openModal });
    const save = async (): Promise<void> => {
      try {
        await formRef.value?.validate();
      } catch {
        return;
      }
      if (required("participantIds") && form.participants.ids.length === 0) {
        message.warning("请选择参会人员通知");
        return;
      }
      const first = selection.value[0];
      if (!first) {
        return;
      }
      saving.value = true;
      try {
        await getMeetRoomClient().createBookRoom({
          appointmentDate: form.appointmentDate,
          conferenceId: first.room.conferenceId,
          timeInterval: selection.value.map((item) => item.time.replaceAll(" ", "")).join(","),
          conferenceType: visible("conferenceType") ? (form.conferenceType ?? null) : null,
          conferenceTheme: visible("conferenceTheme") ? form.conferenceTheme.trim() || null : null,
          goodsIds: visible("goodsIds") ? form.goodsIds.join(",") : null,
          goodsNames: visible("goodsIds")
            ? goods.value
                .filter((item) => form.goodsIds.includes(item.id))
                .map((item) => item.goodsName)
                .join(",")
            : null,
          bookNum: visible("bookNum") ? (form.bookNum ?? null) : null,
          content: visible("content") ? form.content.trim() || null : null,
          participantType: visible("participantIds") ? form.participants.type : null,
          participantIds: visible("participantIds") ? form.participants.ids : [],
        });
        message.success("预约成功");
        open.value = false;
        emit("saved");
      } catch (error) {
        message.error(errorMessage(error, "预约失败"));
      } finally {
        saving.value = false;
      }
    };
    const rules = (code: string, messageText: string): FormRule[] =>
      required(code) ? [{ required: true, message: messageText, trigger: "change" }] : [];
    return () => (
      <Modal
        open={open.value}
        title="会议室预约"
        width="700px"
        confirmLoading={saving.value}
        onCancel={() => (open.value = false)}
        onOk={() => void save()}
      >
        <Form ref={formRef} model={form} labelCol={{ style: { width: "130px" } }}>
          <FormItem label="预约会议室">{text(selection.value[0]?.room.conferenceName)}</FormItem>
          <FormItem label="预约日期">{text(form.appointmentDate)}</FormItem>
          <FormItem label="预约时间段">{selection.value.map((item) => item.time).join("，") || "--"}</FormItem>
          {visible("conferenceType") && (
            <FormItem label="会议类型" name="conferenceType" rules={rules("conferenceType", "请选择会议类型")}>
              <Select
                v-model:value={form.conferenceType}
                options={types.value.map((item) => ({ label: item.name, value: item.id }))}
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="请选择会议类型"
              />
            </FormItem>
          )}
          {visible("conferenceTheme") && (
            <FormItem label="会议主题" name="conferenceTheme" rules={rules("conferenceTheme", "请输入会议主题")}>
              <Input v-model:value={form.conferenceTheme} maxlength={100} placeholder="请输入会议主题" />
            </FormItem>
          )}
          {visible("goodsIds") && (
            <FormItem label="会议物品登记" name="goodsIds" rules={rules("goodsIds", "请选择会议物品")}>
              <CheckboxGroup
                v-model:value={form.goodsIds}
                options={goods.value.map((item) => ({ label: item.goodsName, value: item.id }))}
              />
            </FormItem>
          )}
          {visible("bookNum") && (
            <FormItem label="参会人数" name="bookNum" rules={rules("bookNum", "请输入参会人数")}>
              <InputNumber
                v-model:value={form.bookNum}
                min={1}
                max={selection.value[0]?.room.capacity ?? 999}
                style={{ width: "100%" }}
                placeholder="请输入参会人数"
              />
            </FormItem>
          )}
          {visible("content") && (
            <FormItem label="会议内容" name="content" rules={rules("content", "请输入会议内容")}>
              <Textarea v-model:value={form.content} maxlength={200} rows={3} showCount placeholder="请输入会议内容" />
            </FormItem>
          )}
          {visible("participantIds") && (
            <FormItem label="参会人员通知" required={required("participantIds")}>
              <PersonScopePicker v-model:value={form.participants} />
            </FormItem>
          )}
        </Form>
      </Modal>
    );
  },
});

const ReservationDetail = defineComponent({
  emits: ["changed"],
  setup(_, { emit, expose }) {
    const open = ref(false);
    const loading = ref(false);
    const detail = ref<BookRoomDetail>();
    const cancelReason = ref("");
    const openModal = async (id: string): Promise<void> => {
      open.value = true;
      loading.value = true;
      cancelReason.value = "";
      try {
        detail.value = await getMeetRoomClient().getBookRoom(id);
      } catch (error) {
        message.error(errorMessage(error, "预约详情加载失败"));
        open.value = false;
      } finally {
        loading.value = false;
      }
    };
    expose({ openModal });
    const cancel = async (): Promise<void> => {
      const id = detail.value?.bookId ?? detail.value?.id;
      if (!id) {
        return;
      }
      loading.value = true;
      try {
        await getMeetRoomClient().cancelBookRoom(String(id), cancelReason.value.trim() || undefined);
        message.success("会议已取消");
        open.value = false;
        emit("changed");
      } catch (error) {
        message.error(errorMessage(error, "取消会议失败"));
      } finally {
        loading.value = false;
      }
    };
    const item = (label: string, value: unknown) => (
      <div class={styles.detailItem}>
        <span class={styles.detailLabel}>{label}</span>
        <span>{text(value)}</span>
      </div>
    );
    return () => (
      <Modal
        open={open.value}
        title="会议室预约详情"
        width="680px"
        confirmLoading={loading.value}
        okText="关闭"
        onOk={() => (open.value = false)}
        onCancel={() => (open.value = false)}
        v-slots={{
          footer: () => (
            <Space>
              <Button onClick={() => (open.value = false)}>关闭</Button>
              {detail.value?.isCancel !== false && (
                <PopConfirm title="确认取消该会议预约？" onConfirm={() => void cancel()}>
                  <Button danger type="primary" loading={loading.value}>
                    取消会议
                  </Button>
                </PopConfirm>
              )}
            </Space>
          ),
        }}
      >
        <div class={styles.detailGrid}>
          {item("预约人", detail.value?.subscribePersonName)}
          {item("预约部门", detail.value?.organization?.name)}
          {item("预约会议室", detail.value?.conferenceName)}
          {item("预约日期", detail.value?.appointmentDate)}
          {item("预约时间段", detail.value?.timeInterval)}
          {item("会议类型", detail.value?.conferenceType)}
          {item("会议主题", detail.value?.conferenceTheme)}
          {item("参会人数", detail.value?.bookNum)}
          {item("会议物品", detail.value?.goodsNames)}
          {item("参会人员", detail.value?.participantList?.map((row) => row.name).join("、"))}
        </div>
        <FormItem label="取消理由" style={{ marginTop: "18px" }}>
          <Textarea v-model:value={cancelReason.value} maxlength={200} rows={2} placeholder="取消会议时可填写理由" />
        </FormItem>
      </Modal>
    );
  },
});

export const ReservationPage = defineComponent({
  name: "ReservationPage",
  setup() {
    const query = reactive({ name: "", date: today() });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const selected = ref<SelectedSlot[]>([]);
    const editor = ref<{ openModal(date: string, rows: SelectedSlot[]): void }>();
    const detail = ref<{ openModal(id: string): void }>();
    const times = generateTimes();
    const findSlot = (record: AppointmentRoom, time: string): AppointmentSlot | undefined =>
      record.appointmentDetails?.find((slot) => slot.timeInterval?.replaceAll(" ", "") === time.replaceAll(" ", ""));
    const clickSlot = (room: AppointmentRoom, time: string): void => {
      const slot = findSlot(room, time);
      if (!slot) {
        return;
      }
      if (["RESERVED", "APPROVAL", "BEING_USED"].includes(String(slot.bookStatus)) && slot.bookId) {
        selected.value = [];
        detail.value?.openModal(String(slot.bookId));
        return;
      }
      if (slot.bookStatus !== "RESERVABLE") {
        return;
      }
      if (selected.value.length > 0 && selected.value[0]?.room.conferenceId !== room.conferenceId) {
        message.warning("会议预约只能选择一个会议室");
        return;
      }
      const index = selected.value.findIndex((item) => item.room.conferenceId === room.conferenceId && item.time === time);
      if (index !== -1) {
        selected.value.splice(index, 1);
      } else {
        selected.value.push({ room, slot, time });
      }
    };
    const columns: PcTableColumn[] = [
      {
        title: "会议室名称",
        dataIndex: "conferenceName",
        width: 180,
        fixed: "left",
        ellipsis: true,
        customRender: ({ text: value }) => text(value),
      },
      ...times.map(
        (time, index): PcTableColumn => ({
          title: time,
          dataIndex: `slot${index}`,
          width: 145,
          align: "center",
          customRender: ({ record }: { record: AppointmentRoom }) => {
            const slot = findSlot(record, time);
            const info = statusInfo[slot?.bookStatus as keyof typeof statusInfo];
            const isSelected = selected.value.some((item) => item.room.conferenceId === record.conferenceId && item.time === time);
            return (
              <div
                class={[styles.slotCell, info?.className ?? styles.slotDisabled, isSelected ? styles.slotSelected : ""]}
                onClick={() => clickSlot(record, time)}
              >
                {info?.label ?? "不可用"}
              </div>
            );
          },
        }),
      ),
    ];
    const [PcTable, tableApi] = usePcTable({
      tableCode: "MEET_ROOM_RESERVATION",
      rowKey: "conferenceId",
      columns,
      fetchApi: async () => {
        try {
          const result = await getMeetRoomClient().pageAppointmentRooms({
            keyword: query.name || undefined,
            date: query.date,
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
          });
          page.total = result.total;
          selected.value = [];
          return result;
        } catch (error) {
          message.error(errorMessage(error, "预约信息加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "DatePicker",
          fieldName: "date",
          label: "预约时间",
          defaultValue: today(),
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: false },
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
        query.date = String(values.date ?? today());
        query.name = String(values.name ?? "").trim();
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.date = today();
        query.name = "";
        page.pageNumber = 1;
        tableApi.query();
      },
    });
    const reload = () => tableApi.query();
    return () => (
      <PageLayout
        title="会议室预约"
        v-slots={{
          "layout-header": () => (
            <Button
              type="primary"
              disabled={selected.value.length === 0}
              onClick={() => editor.value?.openModal(query.date, selected.value)}
            >
              确认预约
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.pageContent}>
              <PcForm />
              <PcTable />
              <ReservationEditor ref={editor} onSaved={reload} />
              <ReservationDetail ref={detail} onChanged={reload} />
            </div>
          ),
          "footer-btn": () => (
            <div class={styles.reservationLegend}>
              {Object.values(statusInfo).map((item) => (
                <span class={styles.legendItem}>
                  <i class={[styles.legendDot, item.className]} />
                  {item.label}
                </span>
              ))}
              <span class={styles.legendItem}>
                <i class={[styles.legendDot, styles.slotDisabled]} />
                不可用
              </span>
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
