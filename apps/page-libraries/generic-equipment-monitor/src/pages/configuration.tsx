import {
  Button,
  DeleteOutlined,
  EditOutlined,
  Empty,
  Form,
  FormItem,
  Input,
  Modal,
  PageLayout,
  PopConfirm,
  Spin,
  message,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, type PropType } from "vue";

import type { GemPageProps } from "./page-props";

import styles from "./configuration.module.css";

type ConfigurationItem = { id?: string | number; applicationCode?: string; monitorName?: string; monitorUrl?: string };

function unwrapList(raw: unknown): ConfigurationItem[] {
  let value = raw;
  for (let index = 0; index < 4; index += 1) {
    if (Array.isArray(value)) return value as ConfigurationItem[];
    if (!value || typeof value !== "object") return [];
    const record = value as Record<string, unknown>;
    value = record.data ?? record.result ?? record.records ?? record.list;
  }
  return Array.isArray(value) ? (value as ConfigurationItem[]) : [];
}

function validMonitorUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default defineComponent({
  name: "GemConfiguration",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getDeviceClient: { type: Function as PropType<GemPageProps["getDeviceClient"]>, required: true },
    applicationCode: { type: String, required: true },
    title: { type: String, default: "二维组态" },
  },
  setup(props) {
    const loading = ref(false),
      saving = ref(false),
      modalOpen = ref(false),
      invalidUrl = ref(false);
    const items = ref<ConfigurationItem[]>([]);
    const selectedId = ref<string | number | null>(null),
      editingId = ref<string | number | null>(null);
    const iframeUrl = ref("");
    const form = reactive({ monitorName: "", monitorUrl: "" });

    const load = async () => {
      loading.value = true;
      try {
        const client = await props.getDeviceClient!();
        items.value = unwrapList(await client.getConfiguration(props.applicationCode));
        if (selectedId.value !== null && !items.value.some((item) => item.id === selectedId.value)) {
          selectedId.value = null;
          iframeUrl.value = "";
          invalidUrl.value = false;
        }
      } catch {
        items.value = [];
        message.error("获取监测配置失败");
      } finally {
        loading.value = false;
      }
    };
    const selectItem = (item: ConfigurationItem) => {
      selectedId.value = item.id ?? null;
      const url = String(item.monitorUrl || "").trim();
      invalidUrl.value = !validMonitorUrl(url);
      iframeUrl.value = invalidUrl.value ? "" : url;
    };
    const openAdd = () => {
      editingId.value = null;
      form.monitorName = "";
      form.monitorUrl = "";
      modalOpen.value = true;
    };
    const openEdit = (item: ConfigurationItem) => {
      editingId.value = item.id ?? null;
      form.monitorName = String(item.monitorName || "");
      form.monitorUrl = String(item.monitorUrl || "");
      modalOpen.value = true;
    };
    const save = async () => {
      const monitorName = form.monitorName.trim(),
        monitorUrl = form.monitorUrl.trim();
      if (!monitorName) return void message.warning("请输入监测名称");
      if (!monitorUrl) return void message.warning("请输入链接地址");
      if (!validMonitorUrl(monitorUrl)) return void message.warning("请输入有效的 http/https 链接");
      saving.value = true;
      try {
        const client = await props.getDeviceClient!();
        const payload = { applicationCode: props.applicationCode, monitorName, monitorUrl };
        if (editingId.value === null) await client.addConfiguration(payload);
        else await client.editConfiguration(editingId.value, { ...payload, id: editingId.value });
        message.success(editingId.value === null ? "新增成功" : "编辑成功");
        modalOpen.value = false;
        await load();
      } catch {
        message.error("保存失败");
      } finally {
        saving.value = false;
      }
    };
    const remove = async (item: ConfigurationItem) => {
      if (item.id === undefined) return;
      try {
        const client = await props.getDeviceClient!();
        await client.deleteConfiguration(item.id);
        if (selectedId.value === item.id) {
          selectedId.value = null;
          iframeUrl.value = "";
          invalidUrl.value = false;
        }
        message.success("删除成功");
        await load();
      } catch {
        message.error("删除失败");
      }
    };
    onMounted(() => void load());

    return () => (
      <PageLayout
        title={props.title}
        showFooter={false}
        v-slots={{
          "layout-content": () => (
            <div class={styles.pageBody}>
              <aside class={styles.sidebar}>
                <div class={styles.sidebarHeader}>
                  <span class={styles.sectionTitle}>监测</span>
                  <Button type="primary" onClick={openAdd}>
                    新增
                  </Button>
                </div>
                <Spin spinning={loading.value}>
                  <div class={styles.list}>
                    {items.value.length ? (
                      items.value.map((item) => (
                        <div
                          key={String(item.id)}
                          class={[styles.listItem, selectedId.value === item.id ? styles.active : ""]}
                          onClick={() => selectItem(item)}
                        >
                          <span class={styles.itemName} title={item.monitorName}>
                            {item.monitorName || "--"}
                          </span>
                          <span class={styles.itemActions}>
                            <button
                              type="button"
                              aria-label="编辑"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEdit(item);
                              }}
                            >
                              <EditOutlined />
                            </button>
                            <PopConfirm title="是否确认删除该控制" onConfirm={() => void remove(item)}>
                              <button
                                type="button"
                                class={styles.deleteButton}
                                aria-label="删除"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <DeleteOutlined />
                              </button>
                            </PopConfirm>
                          </span>
                        </div>
                      ))
                    ) : (
                      <Empty description="暂无数据" class={styles.emptyList} />
                    )}
                  </div>
                </Spin>
              </aside>
              <main class={styles.viewer}>
                {invalidUrl.value ? (
                  <Empty description="当前二维组态链接错误，请检查" />
                ) : iframeUrl.value ? (
                  <iframe class={styles.iframe} src={iframeUrl.value} title="二维组态监测" />
                ) : null}
              </main>
              <Modal
                open={modalOpen.value}
                title={editingId.value === null ? "新增监测信息" : "编辑监测信息"}
                confirmLoading={saving.value}
                okText="确定"
                cancelText="取消"
                onOk={() => void save()}
                onCancel={() => {
                  modalOpen.value = false;
                }}
              >
                <Form layout="vertical">
                  <FormItem label="监测名称" required>
                    <Input v-model:value={form.monitorName} maxlength={50} placeholder="请输入监测信息名称" />
                  </FormItem>
                  <FormItem label="组态链接" required>
                    <Input v-model:value={form.monitorUrl} maxlength={100} placeholder="请输入二维组态链接地址" />
                  </FormItem>
                </Form>
              </Modal>
            </div>
          ),
        }}
      />
    );
  },
});
