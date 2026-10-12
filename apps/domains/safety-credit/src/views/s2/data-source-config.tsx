import type {
  SafetyCreditDataSourceCommand,
  SafetyCreditDataSourcePageQuery,
  SafetyCreditDataSourceVO,
  SafetyCreditEventMappingCommand,
  SafetyCreditEventMappingVO,
  SafetyCreditOuaaApplicationVO,
} from "@g2-contract/safety-credit";
import { type PcTableColumn, usePcTable } from "@g2-platform/pc-ui";
import {
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  Page,
  PageLayout,
  PopConfirm,
  PopOver,
  Select,
  Space,
  Table,
  Tag,
  message,
  usePcForm,
  usePcModal,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watchEffect } from "vue";

import { cleanText, displayText, formatDateTime, toNumber } from "./shared";
import { getSafetyCreditClient } from "@/domain-context";

import "./s2.less";

interface MappingFormRow {
  key: string;
  eventId: string;
  eventName: string;
  defaultScore: string;
}

let mappingRowSeed = 0;

function createMappingRow(mapping?: SafetyCreditEventMappingVO, defaultScore = -5): MappingFormRow {
  mappingRowSeed += 1;
  return {
    key: `mapping-${Date.now()}-${mappingRowSeed}`,
    eventId: mapping?.eventId ?? "",
    eventName: mapping?.eventName ?? "",
    defaultScore: String(mapping?.defaultScore ?? defaultScore),
  };
}

function buildMappingCommand(rows: MappingFormRow[]): SafetyCreditEventMappingCommand[] | undefined {
  if (rows.length === 0) {
    message.warning("请至少配置一个事件");
    return undefined;
  }
  const eventIds = new Set<string>();
  const commands: SafetyCreditEventMappingCommand[] = [];
  for (const row of rows) {
    const eventId = cleanText(row.eventId);
    const eventName = cleanText(row.eventName);
    if (eventName === undefined) {
      message.warning("请输入事件名称");
      return undefined;
    }
    if (eventId !== undefined && eventIds.has(eventId)) {
      message.warning(`事件ID ${eventId} 重复`);
      return undefined;
    }
    if (eventId !== undefined) {
      eventIds.add(eventId);
    }

    const defaultScore = toNumber(row.defaultScore, Number.NaN);
    if (!Number.isFinite(defaultScore)) {
      message.warning(`事件 ${eventName} 的分值无效`);
      return undefined;
    }

    const command: SafetyCreditEventMappingCommand = {
      eventName,
      defaultScore,
    };
    if (eventId !== undefined) {
      command.eventId = eventId;
    }
    commands.push(command);
  }
  return commands;
}

function toInputNumberValue(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInputNumberText(value: number | string | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

export const DataSourceConfig = defineComponent({
  name: "DataSourceConfig",
  setup: () => {
    const loading = ref(false);
    const rows = ref<SafetyCreditDataSourceVO[]>([]);
    const total = ref(0);
    const applicationLoading = ref(false);
    const applicationOptions = ref<SafetyCreditOuaaApplicationVO[]>([]);
    const applicationSearchText = ref("");
    const mappingSource = ref<SafetyCreditDataSourceVO | null>(null);
    const mappingRows = ref<MappingFormRow[]>([]);
    const sourceForm = reactive({
      applicationCode: "",
      applicationName: "",
      defaultScore: "-5",
      enabled: true,
    });

    const query = reactive({
      pageNumber: 1,
      pageSize: 10,
      applicationName: "",
      enabled: "" as "" | "ENABLED" | "DISABLED",
    });

    const [SourceModal, sourceModalApi] = usePcModal({
      confirmText: "确定",
      cancelText: "取消",
      title: "新增源应用",
      width: "560px",
      onConfirm: () => void saveSource(),
    });

    const [MappingModal, mappingModalApi] = usePcModal({
      confirmText: "确定",
      cancelText: "取消",
      title: "事件映射",
      width: "820px",
      onConfirm: () => void saveMappings(),
    });
    let applicationSearchTimer: ReturnType<typeof setTimeout> | undefined;
    let applicationSearchSeq = 0;

    function buildQuery(): SafetyCreditDataSourcePageQuery {
      const payload: SafetyCreditDataSourcePageQuery = {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      };
      const applicationName = cleanText(query.applicationName);
      if (applicationName !== undefined) {
        payload.applicationName = applicationName;
      }
      if (query.enabled !== "") {
        payload.enabled = query.enabled === "ENABLED";
      }
      return payload;
    }

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const result = await getSafetyCreditClient().pageDataSources(buildQuery());
        rows.value = result.records ?? [];
        total.value = result.total ?? 0;
      } finally {
        loading.value = false;
      }
    }

    async function loadApplications(keyword = applicationSearchText.value): Promise<void> {
      const searchSeq = ++applicationSearchSeq;
      applicationLoading.value = true;
      try {
        const searchKeyword = cleanText(keyword);
        const result = await getSafetyCreditClient().pageOuaaApplications({
          pageNumber: 1,
          pageSize: 200,
          enabled: true,
          ...(searchKeyword === undefined ? {} : { keyword: searchKeyword }),
        });
        if (searchSeq !== applicationSearchSeq) {
          return;
        }
        const configuredCodes = new Set(rows.value.map((item) => item.applicationCode));
        applicationOptions.value = (result.records ?? []).filter(
          (item) => cleanText(item.code) !== undefined && !configuredCodes.has(item.code),
        );
      } finally {
        if (searchSeq === applicationSearchSeq) {
          applicationLoading.value = false;
        }
      }
    }

    function searchApplications(keyword: string): void {
      applicationSearchText.value = keyword;
      if (applicationSearchTimer !== undefined) {
        clearTimeout(applicationSearchTimer);
      }
      applicationSearchTimer = setTimeout(() => {
        void loadApplications(keyword);
      }, 250);
    }

    function resetQuery(): void {
      query.pageNumber = 1;
      query.applicationName = "";
      query.enabled = "";
      void load();
    }

    function changePage(pageNumber: number, pageSize: number): void {
      query.pageNumber = pageNumber;
      query.pageSize = pageSize;
      void load();
    }

    async function toggleEnabled(record: SafetyCreditDataSourceVO): Promise<void> {
      await getSafetyCreditClient().updateDataSourceEnabled(record.id, { enabled: !record.enabled });
      message.success(record.enabled ? "数据源已停用" : "数据源已启用");
      await load();
    }

    function selectApplication(applicationCode: string): void {
      const selected = applicationOptions.value.find((item) => item.code === applicationCode);
      sourceForm.applicationCode = selected?.code ?? "";
      sourceForm.applicationName = selected?.name ?? "";
      applicationSearchText.value = "";
    }

    function openCreate(): void {
      sourceForm.applicationCode = "";
      sourceForm.applicationName = "";
      sourceForm.defaultScore = "-5";
      sourceForm.enabled = true;
      applicationSearchText.value = "";
      if (applicationSearchTimer !== undefined) {
        clearTimeout(applicationSearchTimer);
        applicationSearchTimer = undefined;
      }
      sourceModalApi.open();
      void loadApplications();
    }

    function openMappings(record: SafetyCreditDataSourceVO): void {
      mappingSource.value = record;
      mappingRows.value = (record.eventMappings ?? []).map((mapping) => createMappingRow(mapping, record.defaultScore));
      mappingModalApi.setState({ title: `${displayText(record.applicationName)} - 事件映射` });
      mappingModalApi.open();
    }

    function addMapping(): void {
      mappingRows.value = [...mappingRows.value, createMappingRow(undefined, mappingSource.value?.defaultScore ?? -5)];
    }

    function removeMapping(row: MappingFormRow): void {
      mappingRows.value = mappingRows.value.filter((item) => item.key !== row.key);
    }

    async function saveSource(): Promise<void> {
      const applicationCode = cleanText(sourceForm.applicationCode);
      const applicationName = cleanText(sourceForm.applicationName);
      if (applicationCode === undefined || applicationName === undefined) {
        message.warning("请选择源应用");
        return;
      }
      const defaultScore = toNumber(sourceForm.defaultScore, Number.NaN);
      if (!Number.isFinite(defaultScore)) {
        message.warning("默认分值无效");
        return;
      }
      const payload: SafetyCreditDataSourceCommand = {
        applicationCode,
        applicationName,
        defaultScore,
        enabled: sourceForm.enabled,
      };
      sourceModalApi.setState({ confirmLoading: true });
      try {
        await getSafetyCreditClient().createDataSource(payload);
        message.success("源应用已新增");
        sourceModalApi.close();
        await load();
      } finally {
        sourceModalApi.setState({ confirmLoading: false });
      }
    }

    async function saveMappings(): Promise<void> {
      const source = mappingSource.value;
      if (source === null) {
        return;
      }
      const eventMappings = buildMappingCommand(mappingRows.value);
      if (eventMappings === undefined) {
        return;
      }
      mappingModalApi.setState({ confirmLoading: true });
      try {
        await getSafetyCreditClient().updateDataSourceEventMappings(source.id, { eventMappings });
        message.success("事件映射已保存");
        mappingModalApi.close();
        await load();
      } finally {
        mappingModalApi.setState({ confirmLoading: false });
      }
    }

    const columns: PcTableColumn[] = [
      {
        title: "源应用",
        dataIndex: "applicationName",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "接入状态",
        align: "center" as const,
        width: 100,
        customRender: ({ record }: { record: SafetyCreditDataSourceVO }): JSX.Element => (
          <Tag color={record.enabled ? "green" : "red"}>{record.enabled ? "启用" : "停用"}</Tag>
        ),
      },
      {
        title: "事件类型数",
        align: "center" as const,
        width: 110,
        customRender: ({ record }: { record: SafetyCreditDataSourceVO }): string =>
          displayText(record.eventMappings?.length ?? record.eventCount),
      },
      {
        title: "默认分值",
        dataIndex: "defaultScore",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: number }): string => displayText(text),
      },
      {
        title: "最近推送时间",
        dataIndex: "lastPushTime",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: unknown }): string => formatDateTime(text),
      },
      {
        title: "操作",
        align: "center" as const,
        width: 210,
        fixed: "right" as const,
        customRender: ({ record }: { record: SafetyCreditDataSourceVO }): JSX.Element => (
          <Space>
            <Button type="link" size="small" onClick={() => openMappings(record)}>
              事件映射
            </Button>
            <PopConfirm
              okText="确定"
              cancelText="取消"
              title={record.enabled ? "确认停用该数据源？" : "确认启用该数据源？"}
              onConfirm={() => void toggleEnabled(record)}
            >
              <Button type="link" size="small">
                {record.enabled ? "停用" : "启用"}
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];
    const [DataTable, dataTableApi] = usePcTable({ rowKey: "id", tableCode: "SAFETY_CREDIT_data-source-config", columns, dataSource: [] });
    watchEffect(() => {
      dataTableApi.setState({ dataSource: rows.value });
      dataTableApi.loading.value = loading.value;
    });

    onMounted(() => {
      void load();
    });

    const searchFormSchema = [
      {
        component: "Input",
        label: "源应用",
        fieldName: "applicationName",
        componentProps: {
          placeholder: "请输入源应用",
        },
      },
      {
        component: "Select",
        label: "接入状态",
        fieldName: "enabled",
        defaultValue: undefined,
        componentProps: {
          allowClear: true,
          placeholder: "全部",
          options: [
            { label: "启用", value: "ENABLED" },
            { label: "停用", value: "DISABLED" },
          ],
        },
      },
    ];

    const [CubeForm] = usePcForm({
      syncStateRef: query,
      layout: "horizontal",
      schema: searchFormSchema,
      showCollapseButton: true,
      handleSubmit: (data) => {
        query.pageNumber = 1;
        query.applicationName = String(data.applicationName ?? "").trim();
        query.enabled = (data.enabled ?? "") as "" | "ENABLED" | "DISABLED";
        void load();
      },
      handleReset: resetQuery,
    });

    const slots = {
      "layout-header": (): JSX.Element => (
        <Button type="primary" onClick={openCreate}>
          新增源应用
        </Button>
      ),
      "layout-content": (): JSX.Element => (
        <div class="safety-credit-s2">
          <CubeForm />

          <section class="table-wrap">
            <DataTable />
          </section>
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page cachePageQuery={false} current={query.pageNumber} pageSize={query.pageSize} total={total.value} onPageChange={changePage} />
      ),
    };

    const sourceModalSlots = {
      default: (): JSX.Element => (
        <div class="s2-modal-body">
          <Form class="s2-form-grid source-form" model={sourceForm} layout="vertical">
            <FormItem class="form-item" label="源应用名称" required>
              <Select
                allowClear
                filterOption={false}
                loading={applicationLoading.value}
                optionFilterProp="label"
                optionLabelProp="label"
                placeholder="请输入或选择上游应用"
                searchValue={applicationSearchText.value}
                showSearch
                class="source-application-select"
                options={applicationOptions.value.map((item) => ({ label: item.name, value: item.code }))}
                value={sourceForm.applicationCode || undefined}
                onChange={(inputValue) => {
                  const value = inputValue as string | undefined;
                  return selectApplication(value ?? "");
                }}
                onSearch={searchApplications}
                onClear={() => {
                  selectApplication("");
                  void loadApplications("");
                }}
              />
            </FormItem>
            <FormItem class="form-item" label="默认分值" required>
              <InputNumber
                value={toInputNumberValue(sourceForm.defaultScore)}
                onUpdate:value={(inputValue) => {
                  const value = inputValue as number | null | undefined;
                  return (sourceForm.defaultScore = toInputNumberText(value));
                }}
              />
            </FormItem>
            <FormItem class="form-item" label="接入状态">
              <Select
                value={String(sourceForm.enabled)}
                options={[
                  { label: "启用——接收该应用推送的事件", value: "true" },
                  { label: "停用——不接收该应用推送的事件", value: "false" },
                ]}
                onChange={(inputValue) => {
                  const value = inputValue as string;
                  return (sourceForm.enabled = value === "true");
                }}
              />
            </FormItem>
          </Form>
        </div>
      ),
    };

    const mappingColumns = [
      {
        title: "事件类型",
        dataIndex: "eventName",
        align: "center" as const,
        customRender: ({ record }: { record: MappingFormRow }): JSX.Element => (
          <Input
            value={record.eventName}
            placeholder="请输入事件类型"
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return (record.eventName = value);
            }}
          />
        ),
      },
      {
        title: "分值",
        dataIndex: "defaultScore",
        align: "center" as const,
        width: 130,
        customRender: ({ record }: { record: MappingFormRow }): JSX.Element => (
          <InputNumber
            value={toInputNumberValue(record.defaultScore)}
            onUpdate:value={(inputValue) => {
              const value = inputValue as number | null | undefined;
              return (record.defaultScore = toInputNumberText(value));
            }}
          />
        ),
      },
      {
        title: "操作",
        align: "center" as const,
        width: 90,
        customRender: ({ record }: { record: MappingFormRow }): JSX.Element => (
          <Button type="link" size="small" danger onClick={() => removeMapping(record)}>
            删除
          </Button>
        ),
      },
    ];

    const mappingModalSlots = {
      default: (): JSX.Element => (
        <div class="s2-modal-body">
          <div class="s2-section first">
            <div class="section-header">
              <h3>应用事件</h3>
              <Button size="small" onClick={addMapping}>
                新增事件
              </Button>
            </div>
            {mappingRows.value.length > 0 ? (
              <Table
                class="s2-editable-table"
                rowKey="key"
                dataSource={mappingRows.value}
                columns={mappingColumns}
                pagination={false}
                size="small"
              />
            ) : (
              <div class="empty-tip">暂无事件映射</div>
            )}
          </div>
        </div>
      ),
    };

    return (): JSX.Element => (
      <PageLayout title="数据源配置" v-slots={slots}>
        <SourceModal v-slots={sourceModalSlots} />
        <MappingModal v-slots={mappingModalSlots} />
      </PageLayout>
    );
  },
});
