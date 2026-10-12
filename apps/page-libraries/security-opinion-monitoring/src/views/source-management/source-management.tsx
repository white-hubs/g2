import type { CollectFrequency, SourceModifyParam, SourceVO } from "@g2-contract/security-opinion";
import {
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  PopConfirm,
  Select,
  SelectOption,
  Space,
  Table,
  Tooltip,
  message,
} from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent, onMounted, reactive, ref } from "vue";

import { securityOpinionApi } from "../../api/security-opinion";
import { PageShell } from "../../components/page-shell/page-shell";
import { SourceStatusDot } from "../../components/source-status-dot/source-status-dot";
import { COLLECT_FREQUENCY_OPTIONS, SOURCE_MAX_ITEMS } from "../../constants";
import { usePageName } from "../../utils/page-name";

import styles from "./source-management.module.css";

/** 信源名称 + URL + 采集频率 + 每次最多采集 + 状态 + 操作 */
const SOURCE_TABLE_SCROLL_X = 1144;

const DEFAULT_FORM: SourceModifyParam = {
  name: "",
  url: "",
  frequency: "15",
  maxItems: SOURCE_MAX_ITEMS,
};

export const SourceManagementPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const records = ref<SourceVO[]>([]);
    const loading = ref(false);
    const modalVisible = ref(false);
    const editingId = ref<string | null>(null);
    const form = reactive<SourceModifyParam>({ ...DEFAULT_FORM });

    const fetchList = async (): Promise<void> => {
      loading.value = true;
      try {
        records.value = await securityOpinionApi.listSources();
      } finally {
        loading.value = false;
      }
    };

    const openAdd = (): void => {
      editingId.value = null;
      Object.assign(form, DEFAULT_FORM);
      modalVisible.value = true;
    };

    const openEdit = (record: SourceVO): void => {
      editingId.value = record.id;
      form.name = record.name;
      form.url = record.url;
      form.frequency = record.frequency;
      form.maxItems = record.maxItems;
      modalVisible.value = true;
    };

    const onSubmit = async (): Promise<void> => {
      if (!form.name.trim() || !form.url.trim()) {
        message.warning("请填写信源名称和 URL");
        return;
      }
      if (!Number.isInteger(form.maxItems) || form.maxItems < 1 || form.maxItems > SOURCE_MAX_ITEMS) {
        message.warning(`每次最多采集条数须为 1～${SOURCE_MAX_ITEMS} 的整数`);
        return;
      }
      if (editingId.value) {
        await securityOpinionApi.updateSource(editingId.value, { ...form });
        message.success("信源已更新");
      } else {
        await securityOpinionApi.createSource({ ...form });
        message.success("信源已添加");
      }
      modalVisible.value = false;
      void fetchList();
    };

    const onToggle = async (record: SourceVO): Promise<void> => {
      if (record.status === "paused") {
        await securityOpinionApi.resumeSource(record.id);
        message.success("信源已开启");
      } else {
        await securityOpinionApi.pauseSource(record.id);
        message.success("信源已暂停");
      }
      void fetchList();
    };

    const onDelete = async (id: string): Promise<void> => {
      await securityOpinionApi.deleteSource(id);
      message.success("信源已删除");
      void fetchList();
    };

    const freqLabel = (v: CollectFrequency): string => COLLECT_FREQUENCY_OPTIONS.find((o) => o.value === v)?.label ?? v;

    onMounted(() => {
      void fetchList();
    });

    const columns = [
      {
        title: "信源名称",
        dataIndex: "name",
        width: 168,
        ellipsis: true,
        customRender: ({ record }: { record: SourceVO }) => (
          <Tooltip title={record.name}>
            <span class={styles.nameCell}>{record.name}</span>
          </Tooltip>
        ),
      },
      {
        title: "URL",
        dataIndex: "url",
        width: 480,
        ellipsis: true,
        customRender: ({ record }: { record: SourceVO }) => (
          <Tooltip title={record.url}>
            <span class={styles.urlCell}>{record.url}</span>
          </Tooltip>
        ),
      },
      {
        title: "采集频率",
        dataIndex: "frequency",
        width: 112,
        customRender: ({ record }: { record: SourceVO }) => freqLabel(record.frequency),
      },
      {
        title: "每次最多采集",
        dataIndex: "maxItems",
        width: 136,
        align: "center" as const,
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 100,
        align: "center" as const,
        customRender: ({ record }: { record: SourceVO }) => <SourceStatusDot status={record.status} />,
      },
      {
        title: "操作",
        width: 148,
        fixed: "right" as const,
        customRender: ({ record }: { record: SourceVO }) => (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              onClick={() => {
                openEdit(record);
              }}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                void onToggle(record);
              }}
            >
              {record.status === "paused" ? "开启" : "暂停"}
            </Button>
            <PopConfirm
              title="是否删除该信源，删除后不可操作，请谨慎操作！"
              onConfirm={() => {
                void onDelete(record.id);
              }}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];

    return () => (
      <PageShell
        title={pageTitle.value}
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={openAdd}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <div class="tableWrap">
              <Table
                class="security-opinion-monitoring-table"
                columns={columns}
                dataSource={records.value}
                rowKey="id"
                loading={loading.value}
                pagination={false}
                scroll={{ x: SOURCE_TABLE_SCROLL_X }}
                tableLayout="fixed"
              />
            </div>
          ),
          "footer-page": () => null,
        }}
      >
        <Modal
          open={modalVisible.value}
          title={editingId.value ? "编辑信源" : "添加信源"}
          onOk={() => {
            void onSubmit();
          }}
          onCancel={() => {
            modalVisible.value = false;
          }}
          okText="保存"
        >
          <Form layout="vertical">
            <FormItem label="信源名称" required>
              <Input v-model:value={form.name} placeholder="例如：安全客" maxlength={100} showCount={false} />
            </FormItem>
            <FormItem label="URL地址" required>
              <Input v-model:value={form.url} placeholder="例如：https://www.anquanke.com" maxlength={500} showCount={false} />
            </FormItem>
            <FormItem label="采集频率">
              <Select v-model:value={form.frequency}>
                {COLLECT_FREQUENCY_OPTIONS.map((o) => (
                  <SelectOption key={o.value} value={o.value}>
                    {o.label}
                  </SelectOption>
                ))}
              </Select>
            </FormItem>
            <FormItem label="每次最多采集条数">
              <InputNumber v-model:value={form.maxItems} min={1} max={SOURCE_MAX_ITEMS} precision={0} style={{ width: "100%" }} />
            </FormItem>
          </Form>
        </Modal>
      </PageShell>
    );
  },
});
