import type { ConferenceGoods } from "@g2-contract/meet-room";
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
  Textarea,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getMeetRoomClient } from "../domain-context";
import { errorMessage, text } from "../shared";

import styles from "../styles.module.css";

const GoodsEditor = defineComponent({
  emits: ["saved"],
  setup(_, { emit, expose }) {
    const open = ref(false);
    const saving = ref(false);
    const form = reactive({ id: "", goodsName: "", areaId: "", areaName: "", illustrate: "" });
    expose({
      openModal: (record?: ConferenceGoods) => {
        Object.assign(form, {
          id: record?.id ?? "",
          goodsName: record?.goodsName ?? "",
          areaId: record?.areaId ?? "",
          areaName: record?.areaName ?? "",
          illustrate: record?.illustrate ?? "",
        });
        open.value = true;
      },
    });
    const save = async (): Promise<void> => {
      if (!form.goodsName.trim()) {
        message.warning("请输入物品名称");
        return;
      }
      saving.value = true;
      try {
        const body = {
          goodsName: form.goodsName.trim(),
          areaId: form.areaId || null,
          areaName: form.areaName.trim() || null,
          illustrate: form.illustrate.trim() || null,
        };
        if (form.id) {
          await getMeetRoomClient().updateConferenceGoods(form.id, body);
        } else {
          await getMeetRoomClient().createConferenceGoods(body);
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
        title={`${form.id ? "编辑" : "新增"}会议物品`}
        confirmLoading={saving.value}
        onCancel={() => (open.value = false)}
        onOk={() => void save()}
      >
        <Form labelCol={{ style: { width: "100px" } }}>
          <FormItem label="物品名称" required>
            <Input v-model:value={form.goodsName} maxlength={50} placeholder="请输入物品名称" />
          </FormItem>
          <FormItem label="所属区域">
            <Input v-model:value={form.areaName} maxlength={100} placeholder="请输入所属区域" />
          </FormItem>
          <FormItem label="物品说明">
            <Textarea v-model:value={form.illustrate} rows={3} maxlength={200} showCount placeholder="请输入物品说明" />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});

export const MeetGoodsPage = defineComponent({
  name: "MeetGoodsPage",
  setup() {
    const query = reactive({ goodsName: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const modalRef = ref<{ openModal(record?: ConferenceGoods): void }>();
    const selected = ref<string[]>([]);
    const remove = async (id: string): Promise<void> => {
      try {
        await getMeetRoomClient().deleteConferenceGoods(id);
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(errorMessage(error, "删除失败"));
      }
    };
    const batchRemove = async (): Promise<void> => {
      if (selected.value.length === 0) {
        return;
      }
      try {
        await getMeetRoomClient().batchDeleteConferenceGoods(selected.value);
        selected.value = [];
        tableApi.setSelectedRowKeys([]);
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(errorMessage(error, "批量删除失败"));
      }
    };
    const [PcTable, tableApi] = usePcTable({
      tableCode: "MEET_ROOM_GOODS",
      rowKey: "id",
      rowSelection: "checkbox",
      rowSelectionChange(keys) {
        selected.value = keys.map(String);
      },
      columns: [
        { title: "物品名称", dataIndex: "goodsName", width: 220, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "所属区域", dataIndex: "areaName", width: 240, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "物品说明", dataIndex: "illustrate", ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "操作",
          dataIndex: "action",
          width: 150,
          fixed: "right",
          customRender: ({ record }: { record: ConferenceGoods }) => (
            <Space size={4}>
              <Button type="link" size="small" onClick={() => modalRef.value?.openModal(record)}>
                编辑
              </Button>
              <PopConfirm title="确认删除该项？" onConfirm={() => void remove(record.id)}>
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
          const result = await getMeetRoomClient().pageConferenceGoods({
            goodsName: query.goodsName || undefined,
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
          });
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "会议物品加载失败"));
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
          fieldName: "goodsName",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入物品名称" },
        },
      ],
      handleSubmit(values) {
        query.goodsName = String(values.goodsName ?? "").trim();
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.goodsName = "";
        page.pageNumber = 1;
        tableApi.query();
      },
    });
    return () => (
      <PageLayout
        title="会议物品"
        v-slots={{
          "layout-header": () => (
            <Space>
              <Button type="primary" onClick={() => modalRef.value?.openModal()}>
                新增
              </Button>
              <PopConfirm title="确认删除选中物品？" onConfirm={() => void batchRemove()}>
                <Button danger disabled={selected.value.length === 0}>
                  批量删除
                </Button>
              </PopConfirm>
            </Space>
          ),
          "layout-content": () => (
            <div class={styles.pageContent}>
              <PcForm />
              <PcTable />
              <GoodsEditor ref={modalRef} onSaved={() => tableApi.query()} />
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
