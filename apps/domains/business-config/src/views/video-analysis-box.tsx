import type { VideoAnalysisBox, VideoAnalysisBoxInput } from "@g2-contract/business-config";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getBusinessConfigClient } from "../domain-context";
import { Button, Form, FormItem, Input, Modal, PageLayout, PopConfirm, Space, Spin, message, type FormInstance } from "../pc-ui-runtime";

const errorText = (error: unknown): string => (error instanceof Error ? error.message : "请求失败");

export const VideoAnalysisBoxPage = defineComponent({
  name: "BusinessConfigVideoAnalysisBoxPage",
  setup() {
    const records = ref<VideoAnalysisBox[]>([]);
    const loading = ref(false);
    const modalOpen = ref(false);
    const saving = ref(false);
    const formRef = ref<FormInstance>();
    const editing = ref<VideoAnalysisBox>();
    const draft = reactive({ name: "", variable: "" });

    async function load(): Promise<void> {
      loading.value = true;
      try {
        records.value = await getBusinessConfigClient().listVideoAnalysisBoxes();
      } catch (error) {
        message.error(errorText(error));
      } finally {
        loading.value = false;
      }
    }

    function openEditor(record?: VideoAnalysisBox): void {
      editing.value = record;
      draft.name = record?.name ?? "";
      draft.variable = record?.variable ?? "";
      modalOpen.value = true;
      formRef.value?.clearValidate?.();
    }

    async function save(): Promise<void> {
      if (saving.value) return;
      try {
        await formRef.value?.validateFields();
        saving.value = true;
        const input: VideoAnalysisBoxInput = {
          ...(editing.value ? { id: editing.value.id } : {}),
          name: draft.name.trim(),
          variable: draft.variable.trim(),
        };
        if (editing.value) await getBusinessConfigClient().updateVideoAnalysisBox(input);
        else await getBusinessConfigClient().createVideoAnalysisBox(input);
        message.success(editing.value ? "修改成功" : "新增成功");
        modalOpen.value = false;
        await load();
      } catch (error) {
        if (error instanceof Error) message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    }

    async function remove(record: VideoAnalysisBox): Promise<void> {
      try {
        await getBusinessConfigClient().deleteVideoAnalysisBox(record.id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(errorText(error));
      }
    }

    function openUrl(record: VideoAnalysisBox): void {
      try {
        const url = new URL(record.variable ?? "");
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("仅支持 http 或 https 链接");
        window.open(url.href, "_blank", "noopener,noreferrer");
      } catch (error) {
        message.error(errorText(error) || "分析盒子链接无效");
      }
    }

    onMounted(() => void load());

    return () => (
      <PageLayout
        title="分析盒子配置"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => openEditor()}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <>
              {loading.value ? <Spin /> : null}
              {!loading.value && records.value.length === 0 ? <div>暂无数据</div> : null}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
                {records.value.map((record) => (
                  <section
                    key={record.id}
                    style={{
                      minHeight: "120px",
                      padding: "20px",
                      background: "#f2f2f2",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "14px",
                    }}
                  >
                    <button
                      type="button"
                      style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: "16px", fontWeight: 600 }}
                      onClick={() => openUrl(record)}
                    >
                      {record.name}
                    </button>
                    <Space>
                      <Button type="link" size="small" onClick={() => openEditor(record)}>
                        编辑
                      </Button>
                      <PopConfirm title="确定要删除该条数据吗?" okText="确定" cancelText="取消" onConfirm={() => void remove(record)}>
                        <Button type="link" size="small" danger>
                          删除
                        </Button>
                      </PopConfirm>
                    </Space>
                  </section>
                ))}
              </div>
              <Modal
                open={modalOpen.value}
                title={editing.value ? "编辑" : "新增"}
                width={600}
                okText="确定"
                cancelText="取消"
                confirmLoading={saving.value}
                onOk={() => void save()}
                onCancel={() => (modalOpen.value = false)}
              >
                <Form ref={formRef} model={draft} labelCol={{ style: { width: "100px", textAlign: "left" } }}>
                  <FormItem label="名称" name="name" rules={[{ required: true, message: "请输入名称" }]}>
                    <Input value={draft.name} placeholder="请输入名称" onUpdate:value={(value) => (draft.name = value)} />
                  </FormItem>
                  <FormItem label="URL链接" name="variable" rules={[{ required: true, message: "请输入URL链接" }]}>
                    <Input
                      value={draft.variable}
                      maxlength={100}
                      placeholder="请输入URL链接"
                      onUpdate:value={(value) => (draft.variable = value)}
                    />
                  </FormItem>
                </Form>
              </Modal>
            </>
          ),
        }}
      />
    );
  },
});
