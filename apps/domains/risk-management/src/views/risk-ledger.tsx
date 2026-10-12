import type { RiskLedgerRecord, RiskType } from "@g2-contract/risk-management";
import type { UploadRequestOption } from "@g2-platform/pc-ui";
import type { PcTableColumn } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  Button,
  Cascader,
  AntDatePicker,
  Form,
  FormItem,
  Input,
  Page,
  PageLayout,
  PopConfirm,
  PopOver,
  Select,
  SelectOption,
  Space,
  Spin,
  TabPane,
  Table,
  Tabs,
  Upload,
  message,
  usePcForm,
  usePcTable,
} from "../pc-ui-runtime";
import { buildRiskLedgerPayload } from "./risk-ledger-payload";
import { getRiskManagementClient } from "@/domain-context";

import styles from "./risk-ledger.module.css";

type LedgerSearch = {
  keyword: string;
  typeCode?: string;
  areaId: string;
  maintenanceDepId: string;
  receiveDepId: string;
  status?: string;
  receiveUserType?: string;
  purchasingDate?: string;
  usageDate?: string;
};
/** Select 的空值必须是 undefined；空字符串会被 antd 当作已选值，导致 placeholder 被隐藏。 */
const emptySearch = (): LedgerSearch => ({
  keyword: "",
  typeCode: undefined,
  areaId: "",
  maintenanceDepId: "",
  receiveDepId: "",
  status: undefined,
  receiveUserType: undefined,
  purchasingDate: undefined,
  usageDate: undefined,
});
const text = (value: unknown): string => (value === undefined || value === null || value === "" ? "--" : String(value));
const dateText = (value: unknown): string =>
  value === undefined || value === null || value === ""
    ? "--"
    : typeof value === "number"
      ? new Date(value).toISOString().slice(0, 10)
      : typeof value === "string" && value.length >= 10
        ? value.slice(0, 10)
        : text(value);

export const RiskLedgerPage = defineComponent({
  name: "RiskLedgerPage",
  setup() {
    const router = useRouter();
    const search = reactive<LedgerSearch>(emptySearch());
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const riskTypes = ref<RiskType[]>([]);
    const selectedIds = ref<string[]>([]);
    const deleting = ref(false);
    const loadTypes = async (): Promise<void> => {
      try {
        const result = await getRiskManagementClient().getRiskTypes({
          itemCode: "risk-source-type",
        });
        riskTypes.value = (Array.isArray(result) ? result : (result.records ?? [])) as RiskType[];
      } catch {
        riskTypes.value = [];
      }
    };
    const flattenTypes = (items: RiskType[]): Array<{ label: string; value: string }> =>
      items.flatMap((item) => [
        { label: item.name, value: String(item.code ?? item.id) },
        ...flattenTypes(Array.isArray(item.nextList) ? (item.nextList as RiskType[]) : []),
      ]);
    const fetchPage = async () => {
      try {
        const result = await getRiskManagementClient().pageRiskLedger({
          ...search,
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          typeCode: search.typeCode || undefined,
          areaId: search.areaId || undefined,
          maintenanceDepId: search.maintenanceDepId || undefined,
          receiveDepId: search.receiveDepId || undefined,
          status: search.status || undefined,
          receiveUserType: search.receiveUserType || undefined,
          purchasingDate: search.purchasingDate || undefined,
          usageDate: search.usageDate || undefined,
          keyword: search.keyword || undefined,
        });
        page.total = result.total ?? 0;
        return {
          records: result.records ?? [],
          total: page.total,
          pages: result.pages ?? 0,
        };
      } catch (error) {
        message.error(error instanceof Error ? error.message : "风险源台账加载失败");
        return { records: [], total: 0, pages: 0 };
      }
    };
    const remove = async (ids: string[]): Promise<void> => {
      if (!ids.length || deleting.value) return;
      deleting.value = true;
      try {
        await getRiskManagementClient().deleteRiskLedgers(ids);
        selectedIds.value = [];
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        deleting.value = false;
      }
    };
    const saveBlob = (blob: Blob, fileName: string): void => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    };
    const downloadTemplate = async (): Promise<void> => {
      try {
        saveBlob(await getRiskManagementClient().downloadRiskLedgerTemplate(), "风险台账模板.xlsx");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "模板下载失败");
      }
    };
    const downloadQrcodes = async (): Promise<void> => {
      const rows = tableApi.getSelectedRows() as RiskLedgerRecord[];
      if (!rows.length) return void message.warning("请选择要下载二维码的风险源");
      try {
        saveBlob(
          await getRiskManagementClient().downloadRiskLedgerQrcodes({
            entityType: "RISK_SOURCE",
            entityInfo: rows.map((item) => ({
              entityId: item.id,
              entityName: item.name,
              serialNumber: item.serialNumber,
            })),
          }),
          "二维码.zip",
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : "二维码下载失败");
      }
    };
    const importFile = async ({ file, onSuccess, onError }: UploadRequestOption): Promise<void> => {
      if (!(file instanceof File)) return void onError?.(new Error("请选择有效的 Excel 文件"));
      const formData = new FormData();
      formData.append("file", file);
      try {
        await getRiskManagementClient().importRiskLedgers(formData);
        onSuccess?.({});
        message.success("导入成功");
        tableApi.query();
      } catch (error) {
        const reason = error instanceof Error ? error : new Error("导入失败");
        onError?.(reason);
        message.error(reason.message);
      }
    };
    const columns: PcTableColumn[] = [
      {
        title: "序号",
        dataIndex: "index",
        width: 70,
        align: "center",
        customRender: ({ index }) => String((page.pageNumber - 1) * page.pageSize + (index ?? 0) + 1),
      },
      {
        title: "风险源编码",
        dataIndex: "serialNumber",
        width: 150,
        align: "center",
        ellipsis: true,
        customRender: ({ text: value }) => <PopOver content={text(value)}>{text(value)}</PopOver>,
      },
      {
        title: "模型编码",
        dataIndex: "bimCode",
        width: 130,
        align: "center",
        ellipsis: true,
      },
      {
        title: "风险源名称",
        dataIndex: "name",
        width: 180,
        align: "center",
        ellipsis: true,
        customRender: ({ record }) => {
          const item = record as RiskLedgerRecord;
          return (
            <Button
              type="link"
              size="small"
              onClick={() =>
                void router.push({
                  name: "risk-ledger-detail",
                  query: { id: item.id },
                })
              }
            >
              {text(item.name)}
            </Button>
          );
        },
      },
      {
        title: "风险源分类",
        dataIndex: "typeName",
        width: 130,
        align: "center",
        ellipsis: true,
      },
      {
        title: "所在区域",
        dataIndex: "areaName",
        width: 130,
        align: "center",
        ellipsis: true,
      },
      {
        title: "关联档位",
        dataIndex: "stallName",
        width: 120,
        align: "center",
        ellipsis: true,
      },
      {
        title: "关联现场点",
        dataIndex: "sitePointName",
        width: 130,
        align: "center",
        ellipsis: true,
      },
      {
        title: "详细位置",
        dataIndex: "attribute",
        width: 160,
        align: "center",
        ellipsis: true,
      },
      {
        title: "维护部门",
        dataIndex: "maintenanceDepName",
        width: 130,
        align: "center",
        ellipsis: true,
      },
      {
        title: "使用部门",
        dataIndex: "receiveDepName",
        width: 130,
        align: "center",
        ellipsis: true,
      },
      {
        title: "使用人",
        dataIndex: "receiveUserName",
        width: 100,
        align: "center",
        ellipsis: true,
      },
      {
        title: "使用人类型",
        dataIndex: "receiveUserType",
        width: 110,
        align: "center",
        customRender: ({ text: value }) => (value === "MERCHANT" ? "商户" : value === "MARKET" ? "市场人员" : "--"),
      },
      {
        title: "联系方式",
        dataIndex: "receiveUserPhone",
        width: 130,
        align: "center",
        ellipsis: true,
      },
      {
        title: "购买日期",
        dataIndex: "purchasingDate",
        width: 120,
        align: "center",
        customRender: ({ text: value }) => dateText(value),
      },
      {
        title: "到期日期",
        dataIndex: "usageDate",
        width: 120,
        align: "center",
        customRender: ({ text: value }) => dateText(value),
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 100,
        align: "center",
        customRender: ({ text: value }) => (value === "EXPIRE" ? "已过期" : value ? "未过期" : "--"),
      },
      {
        title: "生产厂家",
        dataIndex: "produceFactory",
        width: 140,
        align: "center",
        ellipsis: true,
      },
      {
        title: "配送公司",
        dataIndex: "deliveryCompany",
        width: 140,
        align: "center",
        ellipsis: true,
      },
      {
        title: "最近修改时间",
        dataIndex: "updateTime",
        width: 130,
        align: "center",
        customRender: ({ text: value }) => dateText(value),
      },
      {
        title: "操作",
        key: "action",
        fixed: "right",
        width: 170,
        customRender: ({ record }) => {
          const item = record as RiskLedgerRecord;
          return (
            <Space size={2}>
              <Button
                type="link"
                size="small"
                onClick={() =>
                  void router.push({
                    name: "risk-ledger-detail",
                    query: { id: item.id },
                  })
                }
              >
                详情
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() =>
                  void router.push({
                    name: "risk-ledger-edit",
                    query: { id: item.id },
                  })
                }
              >
                编辑
              </Button>
              <PopConfirm title="确认删除该项？" onConfirm={() => void remove([item.id])}>
                <Button type="link" danger size="small">
                  删除
                </Button>
              </PopConfirm>
            </Space>
          );
        },
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      tableCode: "RISK_SOURCE_LEDGER",
      rowKey: "id",
      columns,
      // 表格在 layout-content 可用高度内自行滚动，横向滚动条固定在表格底边，避免 PageLayout 捕获区撑高页面。
      autoScrollY: true,
      rowSelection: "checkbox",
      rowSelectionChange: (keys) => {
        selectedIds.value = keys.map(String);
      },
      fetchApi: fetchPage,
      fetchLoaded: (result) => {
        page.total = result.total;
      },
    });
    const [PcForm] = usePcForm({
      layout: "inline",
      cache: false,
      queryState: search,
      schema: [
        {
          component: "Select",
          fieldName: "typeCode",
          label: "风险源分类",
          componentProps: {
            allowClear: true,
            placeholder: "请选择风险源分类",
            options: flattenTypes(riskTypes.value),
          },
        },
        {
          component: "Input",
          fieldName: "areaId",
          label: "所在区域",
          componentProps: { allowClear: true, placeholder: "请选择区域" },
        },
        {
          component: "Input",
          fieldName: "maintenanceDepId",
          label: "维护部门",
          componentProps: { allowClear: true, placeholder: "请选择部门" },
        },
        {
          component: "Input",
          fieldName: "receiveDepId",
          label: "使用部门",
          componentProps: { allowClear: true, placeholder: "请选择部门" },
        },
        {
          component: "Select",
          fieldName: "status",
          label: "状态",
          componentProps: {
            allowClear: true,
            placeholder: "请选择状态",
            options: [
              { label: "已过期", value: "EXPIRE" },
              { label: "未过期", value: "NORMAL" },
            ],
          },
        },
        {
          component: "Select",
          fieldName: "receiveUserType",
          label: "使用人类型",
          componentProps: {
            allowClear: true,
            placeholder: "请选择使用人类型",
            options: [
              { label: "商户", value: "MERCHANT" },
              { label: "市场人员", value: "MARKET" },
            ],
          },
        },
        {
          component: "DatePicker",
          fieldName: "purchasingDate",
          label: "购买日期",
          componentProps: { placeholder: "请选择购买日期" },
        },
        {
          component: "DatePicker",
          fieldName: "usageDate",
          label: "到期日期",
          componentProps: { placeholder: "请选择到期日期" },
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "关键字",
          componentProps: {
            allowClear: true,
            placeholder: "编码、名称、使用人、车牌号",
          },
        },
      ],
      handleSubmit: () => {
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        Object.assign(search, emptySearch());
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
      collapsedVisibleCount: 4,
    });
    onMounted(() => void loadTypes());
    const slots = {
      "layout-header": () => (
        <Space>
          <Button type="primary" onClick={() => void router.push({ name: "risk-ledger-create" })}>
            新增
          </Button>
          <Button type="primary" onClick={() => void downloadQrcodes()}>
            下载二维码
          </Button>
          <Button type="primary" onClick={() => void downloadTemplate()}>
            下载模板
          </Button>
          <Upload accept=".xlsx,.xls" showUploadList={false} customRequest={importFile}>
            <Button type="primary">导入</Button>
          </Upload>
          <PopConfirm title="确认删除选中的风险源？" okText="确定" cancelText="取消" onConfirm={() => void remove(selectedIds.value)}>
            <Button danger disabled={!selectedIds.value.length} loading={deleting.value}>
              批量删除
            </Button>
          </PopConfirm>
        </Space>
      ),
      "layout-content": () => (
        <div class="risk-page-stack">
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          cachePageQuery={false}
          onPageChange={(nextPage: number, nextSize: number) => {
            page.pageNumber = nextPage;
            page.pageSize = nextSize;
            tableApi.query();
          }}
        />
      ),
    };
    return () => <PageLayout title="风险源管理" v-slots={slots} />;
  },
});

export const RiskLedgerFormPage = defineComponent({
  name: "RiskLedgerFormPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const id = typeof route.query.id === "string" ? route.query.id : undefined;
    const saving = ref(false);
    const loading = ref(Boolean(id));
    const riskTypes = ref<RiskType[]>([]);
    const activeTab = ref("basic");
    const parts = ref<Array<Record<string, unknown>>>([]);
    const form = reactive<Record<string, unknown>>({
      serialNumber: "",
      bimCode: "",
      typeCode: [],
      typeName: "",
      areaId: [],
      areaName: "",
      sitePointId: undefined,
      sitePointName: "",
      maintenanceDepId: undefined,
      maintenanceDepName: "",
      maintenanceUserId: undefined,
      maintenanceUserName: "",
      receiveDepId: undefined,
      receiveDepName: "",
      receiveUserType: undefined,
      receiveUserName: "",
      receiveUserPhone: "",
      location: "",
      latAndLon: "",
      name: "",
      norms: "",
      stallId: undefined,
      stallName: "",
      attribute: "",
      usageDate: undefined,
      purchasingDate: undefined,
      mandatoryTestingDate: undefined,
      files: [],
      efficiency: "",
      insurance: undefined,
      plateNumber: "",
      produceFactory: "",
      produceAddress: "",
      deliveryCompany: "",
      deliveryAddress: "",
    });
    const loadRiskTypes = async (): Promise<void> => {
      try {
        const result = await getRiskManagementClient().getRiskTypes({ itemCode: "risk-source-type" });
        riskTypes.value = (Array.isArray(result) ? result : (result.records ?? [])) as RiskType[];
      } catch {
        riskTypes.value = [];
      }
    };
    onMounted(async () => {
      if (id) {
        try {
          const record = await getRiskManagementClient().getRiskLedger(id);
          Object.assign(form, record);
          form.typeCode = record.typeCode ? String(record.typeCode).split(",") : [];
          form.areaId = record.areaId ? String(record.areaId).split(",") : [];
          parts.value = Array.isArray(record.partsDetails) ? (record.partsDetails as Array<Record<string, unknown>>) : [];
        } catch (error) {
          message.error(error instanceof Error ? error.message : "风险源详情加载失败");
        } finally {
          loading.value = false;
        }
      }
      await loadRiskTypes();
    });
    const save = async (): Promise<void> => {
      if (!String(form.name ?? "").trim()) return void message.warning("请输入风险源名称");
      saving.value = true;
      try {
        const payload = buildRiskLedgerPayload(form, parts.value, id);
        if (id) await getRiskManagementClient().updateRiskLedger(payload);
        else await getRiskManagementClient().createRiskLedger(payload);
        message.success("保存成功");
        await router.push({ name: "risk-ledger" });
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };
    const field = (label: string, key: string, placeholder = `请输入${label}`) => (
      <FormItem label={label} class="risk-ledger-form-item" style={{ marginBottom: "16px" }}>
        <Input
          value={String(form[key] ?? "")}
          placeholder={placeholder}
          onUpdate:value={(value: string) => {
            form[key] = value;
          }}
        />
      </FormItem>
    );
    const selectField = (label: string, key: string, options: Array<{ label: string; value: string }>, placeholder = `请选择${label}`) => (
      <FormItem label={label} class="risk-ledger-form-item" style={{ marginBottom: "16px" }}>
        <Select
          value={form[key] as string | undefined}
          allowClear
          placeholder={placeholder}
          onUpdate:value={(value) => {
            form[key] = value;
          }}
        >
          {options.map((option) => (
            <SelectOption key={option.value} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
      </FormItem>
    );
    const dateField = (label: string, key: string) => (
      <FormItem label={label} class="risk-ledger-form-item" style={{ marginBottom: "16px" }}>
        <AntDatePicker
          value={form[key] as string | undefined}
          valueFormat="YYYY-MM-DD"
          style={{ width: "100%" }}
          onUpdate:value={(value) => {
            form[key] = value;
          }}
        />
      </FormItem>
    );
    const section = (title: string, children: JSX.Element[]) => (
      <section class="risk-ledger-section" style={{ marginBottom: "28px" }}>
        <h3 style={{ borderLeft: "3px solid #1677ff", margin: "0 0 18px", paddingLeft: "8px", fontSize: "16px" }}>{title}</h3>
        <div class="risk-ledger-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: "24px" }}>
          {children}
        </div>
      </section>
    );
    const updatePart = (record: Record<string, unknown>, key: string, value: unknown): void => {
      record[key] = value;
    };
    const partColumns = [
      {
        title: "配件编号",
        dataIndex: "code",
        customRender: ({ record, text: value }: { record: Record<string, unknown>; text: unknown }) =>
          record.modifyFlag ? (
            <Input value={String(value ?? "")} placeholder="请输入" onUpdate:value={(next: string) => updatePart(record, "code", next)} />
          ) : (
            text(value)
          ),
      },
      {
        title: "配件名称",
        dataIndex: "name",
        customRender: ({ record, text: value }: { record: Record<string, unknown>; text: unknown }) =>
          record.modifyFlag ? (
            <Input value={String(value ?? "")} placeholder="请输入" onUpdate:value={(next: string) => updatePart(record, "name", next)} />
          ) : (
            text(value)
          ),
      },
      {
        title: "到期时间",
        dataIndex: "expireDate",
        customRender: ({ record, text: value }: { record: Record<string, unknown>; text: unknown }) =>
          record.modifyFlag ? (
            <AntDatePicker
              value={value as string | undefined}
              valueFormat="YYYY-MM-DD"
              placeholder="请选择日期"
              style={{ width: "100%" }}
              onUpdate:value={(next) => updatePart(record, "expireDate", next)}
            />
          ) : (
            dateText(value)
          ),
      },
      {
        title: "备注",
        dataIndex: "remarks",
        customRender: ({ record, text: value }: { record: Record<string, unknown>; text: unknown }) =>
          record.modifyFlag ? (
            <Input
              value={String(value ?? "")}
              placeholder="请输入"
              onUpdate:value={(next: string) => updatePart(record, "remarks", next)}
            />
          ) : (
            text(value)
          ),
      },
      {
        title: "操作",
        key: "action",
        customRender: ({ record, index }: { record: Record<string, unknown>; index?: number }) => (
          <Space size={2}>
            <Button
              type="link"
              onClick={() => {
                record.modifyFlag = !record.modifyFlag;
              }}
            >
              {record.modifyFlag ? "保存" : "编辑"}
            </Button>
            <Button type="link" danger onClick={() => parts.value.splice(index ?? 0, 1)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];
    const addPart = (): void => {
      parts.value.push({ code: "", name: "", expireDate: "", remarks: "", modifyFlag: true });
    };
    const slots = {
      "layout-content": () => (
        <Form layout="vertical" class="risk-ledger-form" aria-busy={loading.value}>
          <Spin spinning={loading.value}>
            <div style={{ minHeight: "320px" }}>
              {!loading.value && (
                <Tabs
                  activeKey={activeTab.value}
                  class={styles.stickyTabs}
                  onUpdate:activeKey={(key) => {
                    activeTab.value = String(key);
                  }}
                >
                  <TabPane key="basic" tab="基本信息">
                    {section("基本信息", [
                      field("风险源编码", "serialNumber"),
                      field("名称", "name", "请输入风险源名称"),
                      field("模型编码", "bimCode"),
                      <FormItem label="分类" class="risk-ledger-form-item" style={{ marginBottom: "16px" }}>
                        <Cascader
                          value={form.typeCode as string[]}
                          options={riskTypes.value}
                          fieldNames={{ label: "name", value: "code", children: "nextList" }}
                          placeholder="请选择风险源分类"
                          changeOnSelect
                          onUpdate:value={(value) => {
                            form.typeCode = value;
                          }}
                        />
                      </FormItem>,
                      field("所在区域", "areaName", "请选择区域"),
                      field("规格型号", "norms"),
                      field("关联现场点", "sitePointName", "请选择现场点"),
                      field("关联档位", "stallName", "请选择关联档位"),
                      field("维护部门", "maintenanceDepName", "请选择部门"),
                      field("详细位置", "attribute"),
                      field("维护人", "maintenanceUserName", "请选择维护人"),
                      field("使用部门", "receiveDepName", "请选择部门"),
                      field("使用人", "receiveUserName"),
                      selectField("使用人类型", "receiveUserType", [
                        { label: "商户", value: "MERCHANT" },
                        { label: "市场人员", value: "MARKET" },
                      ]),
                      field("联系方式", "receiveUserPhone"),
                      field("风险源位置", "latAndLon", "请选择风险源位置"),
                      dateField("使用到期日期", "usageDate"),
                      dateField("购买日期", "purchasingDate"),
                      dateField("强检日期", "mandatoryTestingDate"),
                    ])}
                    {section("产品其他信息", [
                      field("功率", "efficiency"),
                      selectField(
                        "是否购买保险",
                        "insurance",
                        [
                          { label: "是", value: "1" },
                          { label: "否", value: "0" },
                        ],
                        "请选择",
                      ),
                      field("车牌号", "plateNumber"),
                    ])}
                    {section("生产配送信息", [
                      field("生产厂家", "produceFactory"),
                      field("生产厂家地址", "produceAddress", "请输入厂家地址"),
                      field("配送公司", "deliveryCompany"),
                      field("配送公司地址", "deliveryAddress"),
                    ])}
                  </TabPane>
                  <TabPane key="parts" tab="配件信息">
                    <div
                      class="risk-ledger-parts-toolbar"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}
                    >
                      <h3 style={{ borderLeft: "3px solid #1677ff", margin: 0, paddingLeft: "8px", fontSize: "16px" }}>配件信息</h3>
                      <Button type="primary" onClick={addPart}>
                        添加配件
                      </Button>
                    </div>
                    <Table
                      rowKey={(_record: unknown, index?: number) => String(index)}
                      columns={partColumns}
                      dataSource={parts.value}
                      pagination={false}
                      bordered
                      size="small"
                    />
                  </TabPane>
                </Tabs>
              )}
            </div>
          </Spin>
        </Form>
      ),
      "footer-page": () => (
        <Space>
          <Button type="primary" loading={saving.value} onClick={() => void save()}>
            保存
          </Button>
          <Button onClick={() => void router.back()}>取消</Button>
        </Space>
      ),
    };
    return () => <PageLayout title={id ? "编辑风险源" : "新增风险源"} v-slots={slots} />;
  },
});
export const RiskLedgerDetailPage = defineComponent({
  name: "RiskLedgerDetailPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const record = ref<RiskLedgerRecord>();
    const loading = ref(true);
    onMounted(async () => {
      const id = route.query.id;
      if (typeof id !== "string") return;
      try {
        record.value = await getRiskManagementClient().getRiskLedger(id);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "风险源详情加载失败");
      } finally {
        loading.value = false;
      }
    });
    const detailValue = (key: string): string => text(record.value?.[key]);
    const detailDate = (key: string): string => dateText(record.value?.[key]);
    const detailItem = (label: string, value: unknown) => (
      <div class={styles.detailItem}>
        <span class={styles.detailLabel}>{label}</span>
        <span class={styles.detailValue}>{text(value)}</span>
      </div>
    );
    const attachmentItem = () => {
      const files = Array.isArray(record.value?.files) ? (record.value?.files as Array<Record<string, unknown>>) : [];
      return (
        <div class={styles.detailItem}>
          <span class={styles.detailLabel}>附件</span>
          <span class={styles.detailValue}>
            {files.length
              ? files.map((file) => (
                  <a key={String(file.id)} href={String(file.path ?? "#")} target="_blank" rel="noreferrer">
                    {String(file.name ?? "附件")}
                  </a>
                ))
              : "--"}
          </span>
        </div>
      );
    };
    // 详情数据异步回填，必须在 render 时创建 VNode，不能在 setup 阶段把初始空值固化。
    const detailColumns = () => [
      [
        detailItem("风险源编码", detailValue("serialNumber")),
        detailItem("风险源分类", detailValue("typeName")),
        detailItem("关联档位", detailValue("stallName")),
        detailItem("详细地址", detailValue("attribute")),
        detailItem("维护部门", detailValue("maintenanceDepName")),
        detailItem("使用人", detailValue("receiveUserName")),
        detailItem("使用到期日期", detailDate("usageDate")),
        detailItem("强检日期", detailDate("mandatoryTestingDate")),
        detailItem("维护人", detailValue("maintenanceUserName")),
      ],
      [
        detailItem("风险源名称", detailValue("name")),
        detailItem("所在区域", detailValue("areaName")),
        detailItem("模型编码", detailValue("bimCode")),
        detailItem("关联现场点", detailValue("sitePointName")),
        detailItem("使用部门", detailValue("receiveDepName")),
        detailItem("联系方式", detailValue("receiveUserPhone")),
        attachmentItem(),
        detailItem("风险源位置", detailValue("latAndLon")),
        detailItem("是否购买保险", record.value?.insurance === "1" ? "是" : record.value?.insurance ? "否" : "--"),
      ],
      [
        detailItem("生产厂家", detailValue("produceFactory")),
        detailItem("配送公司", detailValue("deliveryCompany")),
        detailItem("生产厂家地址", detailValue("produceAddress")),
        detailItem("配送公司地址", detailValue("deliveryAddress")),
        detailItem(
          "使用人类型",
          record.value?.receiveUserType === "MERCHANT" ? "商户" : record.value?.receiveUserType === "MARKET" ? "市场人员" : "--",
        ),
        detailItem("购买日期", detailDate("purchasingDate")),
        detailItem("功率", detailValue("efficiency")),
        detailItem("车牌号", detailValue("plateNumber")),
      ],
    ];
    const partColumns = [
      { title: "配件编号", dataIndex: "code", align: "center" as const, customRender: ({ text: value }: { text: unknown }) => text(value) },
      { title: "配件名称", dataIndex: "name", align: "center" as const, customRender: ({ text: value }: { text: unknown }) => text(value) },
      {
        title: "到期时间",
        dataIndex: "expireDate",
        align: "center" as const,
        customRender: ({ text: value }: { text: unknown }) => dateText(value),
      },
      { title: "备注", dataIndex: "remarks", align: "center" as const, customRender: ({ text: value }: { text: unknown }) => text(value) },
    ];
    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div style={{ minHeight: "320px" }}>
            {!loading.value && (
              <Tabs class={styles.detailTabs}>
                <TabPane key="basic" tab="基本信息">
                  <section class={styles.detailSection}>
                    <h3>基本信息</h3>
                    <div class={styles.detailGrid}>
                      {detailColumns().map((column, index) => (
                        <div key={index}>{column}</div>
                      ))}
                    </div>
                  </section>
                </TabPane>
                <TabPane key="parts" tab="配件信息">
                  <section class={styles.detailSection}>
                    <h3>配件信息</h3>
                    <Table
                      rowKey="id"
                      columns={partColumns}
                      dataSource={(record.value?.partsDetails as unknown[]) ?? []}
                      pagination={false}
                      bordered
                      size="small"
                    />
                  </section>
                </TabPane>
              </Tabs>
            )}
          </div>
        </Spin>
      ),
      "footer-page": () => <Button onClick={() => void router.back()}>返回</Button>,
    };
    return () => <PageLayout title="风险源详情" v-slots={slots} />;
  },
});
