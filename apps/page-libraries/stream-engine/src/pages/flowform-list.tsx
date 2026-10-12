import type { FormFlowRecord, StreamEngineClient } from "@g2-client/stream-engine/client";
import {
  Button,
  DownloadOutlined,
  Form,
  FormItem,
  LinkOutlined,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Select,
  Spin,
  Switch,
  type PcTableColumn,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, type PropType } from "vue";

import type { StreamEnginePageProps } from "../contract";

export default defineComponent({
  name: "FlowformList",
  props: {
    title: { type: String, default: "表单管理" },
    applicationCode: { type: String, default: "stream-engine" },
    getClient: { type: Function as PropType<StreamEnginePageProps["getClient"]>, required: true },
    getOuaaClient: { type: Function as PropType<StreamEnginePageProps["getOuaaClient"]>, default: undefined },
    onNavigate: { type: Function as PropType<StreamEnginePageProps["onNavigate"]> },
    onClose: { type: Function as PropType<StreamEnginePageProps["onClose"]> },
  },
  setup(props) {
    const client = ref<StreamEngineClient>();
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const query = reactive<{ keyword?: string; application?: string; type?: string; status?: string }>({});
    const typeOptions = ref<Array<{ label: string; value: string }>>([]);
    const appOptions = ref<Array<{ label: string; value: string }>>([]);
    const statusOptions = ref<Array<{ label: string; value: string }>>([]);
    const optionsLoading = ref(true);
    const createOpen = ref(false);
    const createType = ref<string>("FLOW_FORM");
    const pending = reactive<Record<string, boolean>>({});
    const shareOpen = ref(false);
    const shareLoading = ref(false);
    const shareUrl = ref("");
    const shareQrCode = ref("");
    const copying = ref(false);
    const downloading = ref(false);
    let version = 0;
    let shareVersion = 0;

    const openDesign = (row?: FormFlowRecord, type = "FLOW_FORM"): void => {
      props.onNavigate?.({
        page: "FormProcessDesign",
        query: {
          id: row?.id ? String(row.id) : undefined,
          type: String(row?.type ?? type),
          title: row?.name ? String(row.name) : "表单设计",
        },
      });
    };

    const columns: PcTableColumn[] = [
      { title: "表单名称", dataIndex: "name", ellipsis: true },
      { title: "编码", dataIndex: "code", width: 160, ellipsis: true },
      {
        title: "应用",
        dataIndex: "applicationName",
        width: 160,
        ellipsis: true,
        customRender: ({ record }) =>
          record.applicationName || appOptions.value.find((option) => option.value === record.application)?.label || "--",
      },
      {
        title: "类型",
        dataIndex: "typeName",
        width: 120,
        ellipsis: true,
        customRender: ({ record }) =>
          record.typeName || typeOptions.value.find((option) => option.value === record.type)?.label || record.type || "--",
      },
      { title: "说明", dataIndex: "remark", width: 300, ellipsis: true },
      {
        title: "状态",
        dataIndex: "statusName",
        width: 100,
        customRender: ({ record }) => {
          const row = record as FormFlowRecord;
          return row.statusName || statusOptions.value.find((option) => option.value === String(row.status))?.label || "--";
        },
      },
      { title: "更新时间", dataIndex: "updateTime", width: 180, ellipsis: true },
      {
        title: "开关",
        dataIndex: "enable",
        width: 90,
        customRender: ({ record }) => {
          const row = record as FormFlowRecord;
          return (
            <PopConfirm
              title={`确认${row.enable ? "停用" : "启用"}该表单？`}
              okText="确定"
              cancelText="取消"
              onConfirm={() => toggleEnable(row)}
            >
              <Switch
                checked={Boolean(row.enable)}
                loading={Boolean(pending[String(row.id)])}
                disabled={Boolean(pending[String(row.id)])}
              />
            </PopConfirm>
          );
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 220,
        fixed: "right",
        customRender: ({ record }) => {
          const row = record as FormFlowRecord;
          return (
            <>
              <Button type="link" disabled={Boolean(pending[String(row.id)])} onClick={() => openDesign(row)}>
                编辑
              </Button>
              {row.publicForm && row.status === "IN_USE" ? (
                <Button type="link" disabled={Boolean(pending[String(row.id)])} onClick={() => void share(row)}>
                  分享
                </Button>
              ) : null}
              <PopConfirm title="确认删除该表单？" okText="确定" cancelText="取消" onConfirm={() => remove(row)}>
                <Button type="link" danger loading={Boolean(pending[String(row.id)])}>
                  删除
                </Button>
              </PopConfirm>
            </>
          );
        },
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "STREAM_ENGINE_FLOWFORM",
      rowKey: "id",
      autoFetch: false,
    });

    const load = async (): Promise<void> => {
      if (!client.value) {
        return;
      }
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await client.value.pageFormFlows({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: query.keyword,
          application: query.application,
          type: query.type,
          status: query.status,
        });
        if (current !== version) {
          return;
        }
        tableApi.setDataSource(result.records);
        page.total = result.total;
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : "表单列表加载失败");
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };

    const toggleEnable = async (row: FormFlowRecord): Promise<void> => {
      if (!client.value || !row.id || pending[row.id]) {
        return;
      }
      const enabled = Boolean(row.enable);
      pending[row.id] = true;
      try {
        await client.value.enableFormFlow({ id: row.id, enable: !enabled });
        message.success(enabled ? "已停用" : "已启用");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "启停失败");
      } finally {
        pending[row.id] = false;
      }
    };

    const remove = async (row: FormFlowRecord): Promise<void> => {
      if (!client.value || !row.id || pending[row.id]) {
        return;
      }
      pending[row.id] = true;
      try {
        await client.value.deleteFormFlow(row.id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        pending[row.id] = false;
      }
    };

    const closeShare = (): void => {
      shareOpen.value = false;
      shareVersion++;
      shareLoading.value = false;
    };
    const share = async (row: FormFlowRecord): Promise<void> => {
      if (!client.value || !row.id || pending[row.id]) return;
      const current = ++shareVersion;
      shareOpen.value = true;
      shareLoading.value = true;
      shareQrCode.value = "";
      shareUrl.value = "";
      pending[row.id] = true;
      try {
        const tenantInfo: unknown = JSON.parse(sessionStorage.getItem("GH-NowEnterprise") ?? "{}");
        const tenant = tenantInfo && typeof tenantInfo === "object" && "code" in tenantInfo ? String(tenantInfo.code) : "";
        if (!row.qrCodeUrl || !tenant) throw new Error("分享链接或企业信息缺失");
        const url = new URL(String(row.qrCodeUrl), location.origin);
        url.searchParams.set("businessType", String(row.businessType ?? ""));
        url.searchParams.set("tenant", tenant);
        shareUrl.value = url.href;
        const response = await client.value.getFormFlowQrCode({ id: row.id, tenant, qrCodeUrl: url.href, businessType: row.businessType });
        if (current !== shareVersion) return;
        const path = response && typeof response === "object" && "path" in response ? response.path : undefined;
        if (typeof path !== "string" || !path) throw new Error("二维码未返回");
        shareQrCode.value = path;
      } catch (error) {
        if (current === shareVersion) message.error(error instanceof Error ? error.message : "分享加载失败");
      } finally {
        pending[row.id] = false;
        if (current === shareVersion) shareLoading.value = false;
      }
    };
    const copyLink = async (): Promise<void> => {
      if (copying.value || !shareUrl.value) return;
      copying.value = true;
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(shareUrl.value);
        else {
          const input = document.createElement("textarea");
          input.value = shareUrl.value;
          input.style.position = "fixed";
          input.style.opacity = "0";
          document.body.appendChild(input);
          input.select();
          const copied = document.execCommand("copy");
          input.remove();
          if (!copied) throw new Error("复制链接失败");
        }
        message.success("链接已复制");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "复制链接失败");
      } finally {
        copying.value = false;
      }
    };
    const downloadCode = async (): Promise<void> => {
      if (downloading.value || !shareQrCode.value) return;
      downloading.value = true;
      try {
        const response = await fetch(shareQrCode.value);
        if (!response.ok) throw new Error("二维码下载失败");
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = "form-qr-code.png";
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "二维码下载失败");
      } finally {
        downloading.value = false;
      }
    };

    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: true,
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "表单名称",
          componentProps: { placeholder: "请输入表单名称", allowClear: true },
          defaultValue: undefined,
        },
        {
          component: "Select",
          fieldName: "application",
          label: "应用",
          componentProps: { placeholder: "请选择应用", allowClear: true, options: appOptions },
          defaultValue: undefined,
        },
        {
          component: "Select",
          fieldName: "type",
          label: "类型",
          componentProps: { placeholder: "请选择类型", allowClear: true, options: typeOptions },
          defaultValue: undefined,
        },
        {
          component: "Select",
          fieldName: "status",
          label: "状态",
          componentProps: {
            placeholder: "请选择状态",
            allowClear: true,
            options: statusOptions,
          },
          defaultValue: undefined,
        },
      ],
      handleSubmit(values) {
        query.keyword = typeof values.keyword === "string" ? values.keyword.trim() : undefined;
        query.application = typeof values.application === "string" ? values.application : undefined;
        query.type = typeof values.type === "string" ? values.type : undefined;
        query.status = typeof values.status === "string" ? values.status : undefined;
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.keyword = undefined;
        query.application = undefined;
        query.type = undefined;
        query.status = undefined;
        page.pageNumber = 1;
        void load();
      },
    });

    onMounted(async () => {
      try {
        client.value = await props.getClient();
        const [types, apps, statuses] = await Promise.all([
          client.value.listFormFlowTypes(),
          client.value.listFormFlowApplications(),
          client.value.listFormFlowStatuses(),
        ]);
        typeOptions.value = types
          .map((item) => {
            const record = item as Record<string, unknown>;
            return {
              label: String(record.name ?? record.label ?? record.value ?? ""),
              value: String(record.value ?? record.code ?? record.name ?? ""),
            };
          })
          .filter((item) => item.value);
        appOptions.value = apps
          .map((item) => {
            const record = item as Record<string, unknown>;
            return {
              label: String(record.name ?? record.label ?? record.value ?? ""),
              value: String(record.value ?? record.code ?? record.name ?? ""),
            };
          })
          .filter((item) => item.value);
        statusOptions.value = statuses
          .map((item) => {
            const record = item as Record<string, unknown>;
            return { label: String(record.name ?? record.label ?? record.value ?? ""), value: String(record.value ?? record.code ?? "") };
          })
          .filter((item) => item.value);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "表单筛选项加载失败");
      } finally {
        optionsLoading.value = false;
      }
      await load();
    });

    const slots = {
      "layout-header": () => (
        <Button
          type="primary"
          onClick={() => {
            createOpen.value = true;
          }}
        >
          新增
        </Button>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          cachePageQuery={true}
          onPageChange={(pageNumber: number, pageSize: number) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            void load();
          }}
        />
      ),
    };

    return () => (
      <>
        <PageLayout title={props.title} v-slots={slots} />
        <Modal
          open={createOpen.value}
          title="新增表单"
          width={500}
          okText="确定"
          cancelText="取消"
          okButtonProps={{ disabled: optionsLoading.value || !createType.value }}
          onCancel={() => {
            createOpen.value = false;
          }}
          onOk={() => {
            createOpen.value = false;
            openDesign(undefined, createType.value);
          }}
        >
          <Form layout="vertical">
            <FormItem label="表单类型" required>
              <Select
                value={createType.value}
                options={typeOptions.value}
                loading={optionsLoading.value}
                placeholder="请选择表单类型"
                style={{ width: "100%" }}
                onUpdate:value={(value) => {
                  createType.value = String(value);
                }}
              />
            </FormItem>
          </Form>
        </Modal>
        <Modal open={shareOpen.value} title="分享" width={520} footer={null} onCancel={closeShare}>
          <Spin spinning={shareLoading.value}>
            <div style={{ minHeight: "220px", display: "grid", justifyItems: "center", gap: "12px" }}>
              {shareQrCode.value ? (
                <img src={shareQrCode.value} alt="表单二维码" width={192} height={192} style={{ objectFit: "contain" }} />
              ) : null}
              <Button disabled={!shareQrCode.value} loading={downloading.value} onClick={() => void downloadCode()}>
                <DownloadOutlined />
                下载二维码
              </Button>
            </div>
          </Spin>
          <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
            <span style={{ overflowWrap: "anywhere" }}>{shareUrl.value}</span>
            <Button type="primary" disabled={!shareUrl.value || shareLoading.value} loading={copying.value} onClick={() => void copyLink()}>
              <LinkOutlined />
              复制链接
            </Button>
          </div>
        </Modal>
      </>
    );
  },
});
