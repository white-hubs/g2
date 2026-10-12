import type { ConferenceType } from "@g2-contract/meet-room";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Space,
  Switch,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { type PropType, defineComponent, reactive, ref } from "vue";

import { getMeetRoomClient } from "../domain-context";
import { errorMessage, text } from "../shared";

import styles from "../styles.module.css";

const TypeEditor = defineComponent({
  name: "MeetRoomTypeEditor",
  props: { kind: { type: String as PropType<"meeting" | "room">, required: true } },
  emits: ["saved"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const saving = ref(false);
    const form = reactive<Partial<ConferenceType>>({ name: "", status: true });
    const openModal = (record?: ConferenceType): void => {
      Object.assign(form, { id: record?.id, name: record?.name ?? "", status: record?.status ?? true });
      open.value = true;
    };
    expose({ openModal });
    const save = async (): Promise<void> => {
      if (!form.name?.trim()) {
        message.warning(`请输入${props.kind === "meeting" ? "会议" : "会议室"}类型名称`);
        return;
      }
      saving.value = true;
      try {
        const client = getMeetRoomClient();
        const body = { name: form.name.trim(), status: form.status ?? true };
        if (props.kind === "room") {
          await client.saveRoomType({ ...body, id: form.id });
        } else if (form.id) {
          await client.updateConferenceType(form.id, body);
        } else {
          await client.createConferenceType(body);
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
    return () => (
      <Modal
        open={open.value}
        title={`${form.id ? "编辑" : "新增"}${props.kind === "meeting" ? "会议类型" : "会议室类型"}`}
        confirmLoading={saving.value}
        onCancel={() => (open.value = false)}
        onOk={() => void save()}
      >
        <Form labelCol={{ style: { width: "110px" } }}>
          <FormItem label="类型名称" required>
            <Input v-model:value={form.name} maxlength={50} placeholder="请输入类型名称" />
          </FormItem>
          <FormItem label="使用状态">
            <Switch v-model:checked={form.status} checkedChildren="启用" unCheckedChildren="停用" />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});

function createTypePage(kind: "meeting" | "room") {
  const title = kind === "meeting" ? "会议类型" : "会议室类型";
  return defineComponent({
    name: kind === "meeting" ? "MeetTypePage" : "MeetRoomTypePage",
    setup() {
      const query = reactive({ keyword: "" });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const modalRef = ref<{ openModal(record?: ConferenceType): void }>();
      const remove = async (record: ConferenceType): Promise<void> => {
        try {
          if (kind === "meeting") {
            await getMeetRoomClient().deleteConferenceType(record.id);
          } else {
            await getMeetRoomClient().deleteRoomType(record.id);
          }
          message.success("删除成功");
          tableApi.query();
        } catch (error) {
          message.error(errorMessage(error, "删除失败"));
        }
      };
      const [PcTable, tableApi] = usePcTable({
        tableCode: kind === "meeting" ? "MEET_ROOM_MEETING_TYPE" : "MEET_ROOM_ROOM_TYPE",
        rowKey: "id",
        columns: [
          { title: "类型名称", dataIndex: "name", ellipsis: true, customRender: ({ text: value }) => text(value) },
          {
            title: "使用状态",
            dataIndex: "status",
            width: 130,
            customRender: ({ record }: { record: ConferenceType }) => (record.status ? "启用" : "停用"),
          },
          {
            title: "操作",
            dataIndex: "action",
            width: 150,
            fixed: "right",
            customRender: ({ record }: { record: ConferenceType }) => (
              <Space size={4}>
                <Button type="link" size="small" onClick={() => modalRef.value?.openModal(record)}>
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
            const result =
              kind === "meeting"
                ? await getMeetRoomClient().pageConferenceTypes({
                    keyword: query.keyword || undefined,
                    pageNumber: page.pageNumber,
                    pageSize: page.pageSize,
                  })
                : await getMeetRoomClient().pageRoomTypes({
                    keyword: query.keyword || undefined,
                    pageNumber: page.pageNumber,
                    pageSize: page.pageSize,
                  });
            page.total = result.total;
            return result;
          } catch (error) {
            message.error(errorMessage(error, `${title}加载失败`));
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
            label: "",
            defaultValue: "",
            componentProps: { allowClear: true, placeholder: `请输入${title}名称` },
          },
        ],
        handleSubmit(values) {
          query.keyword = String(values.keyword ?? "").trim();
          page.pageNumber = 1;
          tableApi.query();
        },
        handleReset() {
          query.keyword = "";
          page.pageNumber = 1;
          tableApi.query();
        },
      });
      return () => (
        <PageLayout
          title={title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" onClick={() => modalRef.value?.openModal()}>
                新增
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.pageContent}>
                <PcForm />
                <PcTable />
                <TypeEditor kind={kind} ref={modalRef} onSaved={() => tableApi.query()} />
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
}

export const MeetTypePage = createTypePage("meeting");
export const MeetRoomTypePage = createTypePage("room");
