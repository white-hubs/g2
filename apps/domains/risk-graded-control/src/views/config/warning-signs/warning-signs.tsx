import { computed, defineComponent, reactive, ref } from "vue";

import {
  createWarningSign,
  deleteWarningSign,
  getWarningSign,
  pageWarningSigns,
  updateWarningSignEnabled,
  updateWarningSign,
} from "@/api/server";
import { uploadRiskControlFile } from "@/api/upload-risk-file";
import { FileImageThumb } from "@/components/file-image-thumb/file-image-thumb";
import {
  FILE_SCENE_CODE,
  LIST_ACTION_DELETE_PROPS,
  LIST_ACTION_LINK_PROPS,
  TABLE_CODE_COLUMN_WIDTH,
  TABLE_PAGE_SIZE,
  WARNING_SIGN_TYPES,
  RISK_MODAL_BODY_STYLE,
} from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  AntModal,
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout as PcLayout,
  Select,
  SelectOption,
  Space,
  Switch,
  Tag,
  Textarea,
  Upload,
  message,
  usePcForm,
  usePcTable,
  type ColumnType,
  type UploadChangeParam,
  type UploadFile,
  type UploadRequestOption,
} from "@/pc-ui-runtime";
import type { WarningSignVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { mapWarningSignFromApi, mapWarningSignToApi } from "@/utils/risk-control-mapper";

const SIGN_TYPE_COLOR: Record<string, string> = {
  警告: "gold",
  禁止: "red",
  指令: "blue",
  提示: "green",
};

const signTypeLabel = (type: string): string => `${type}标志`;

export const WarningSignsPage = defineComponent({
  name: "WarningSignsPage",
  setup() {
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
      signType: "",
      enabled: "" as "" | "ENABLED" | "DISABLED",
    });
    const togglingIds = ref<Set<string>>(new Set());
    const selectedRowKeys = ref<string[]>([]);
    const modalVisible = ref(false);
    const modalMode = ref<"create" | "edit" | "view">("create");
    const editingId = ref<string | null>(null);
    const iconFileList = ref<UploadFile[]>([]);
    const iconFileId = ref<string | undefined>();

    const form = reactive({
      code: "",
      name: "",
      type: "警告",
      applicableScenario: "",
      status: "ENABLED" as WarningSignVO["status"],
    });

    const resetForm = (): void => {
      form.code = "";
      form.name = "";
      form.type = "警告";
      form.applicableScenario = "";
      form.status = "ENABLED";
      iconFileList.value = [];
      iconFileId.value = undefined;
    };

    const fillFormFromRecord = (record: WarningSignVO): void => {
      form.code = record.code;
      form.name = record.name;
      form.type = record.type;
      form.applicableScenario = record.applicableScenario ?? "";
      form.status = record.status;
      iconFileId.value = record.iconFileId;
      iconFileList.value = record.iconUrl
        ? [{ uid: record.iconFileId ?? "-1", name: "icon.png", status: "done", url: record.iconUrl }]
        : [];
    };

    const openCreate = (): void => {
      modalMode.value = "create";
      editingId.value = null;
      resetForm();
      modalVisible.value = true;
    };

    const openEdit = async (record: WarningSignVO): Promise<void> => {
      modalMode.value = "edit";
      editingId.value = record.id;
      try {
        const vo = await useAuthRequest(() => getWarningSign(record.id));
        fillFormFromRecord(mapWarningSignFromApi(vo));
        modalVisible.value = true;
      } catch (e) {
        showApiError(e);
      }
    };

    const openView = async (record: WarningSignVO): Promise<void> => {
      modalMode.value = "view";
      editingId.value = record.id;
      try {
        const vo = await useAuthRequest(() => getWarningSign(record.id));
        fillFormFromRecord(mapWarningSignFromApi(vo));
        modalVisible.value = true;
      } catch (e) {
        showApiError(e);
      }
    };

    const reloadList = (): void => {
      tableApi.query();
    };

    const handleSubmit = async (): Promise<void> => {
      if (!form.name.trim()) {
        message.warning("请输入标志名称");
        return;
      }
      try {
        const payload = mapWarningSignToApi({
          ...form,
          iconFileId: iconFileId.value,
        });
        if (modalMode.value === "create") {
          await useAuthRequest(() => createWarningSign(payload));
          message.success("新增成功");
        } else if (editingId.value) {
          const id = editingId.value;
          await useAuthRequest(() => updateWarningSign(id, payload));
          message.success("保存成功");
        }
        modalVisible.value = false;
        reloadList();
      } catch (e) {
        showApiError(e);
      }
    };

    const handleDelete = (record: WarningSignVO): void => {
      AntModal.confirm({
        centered: true,
        title: "删除确认",
        content: `确定删除标志「${record.name}」吗？`,
        okText: "确定",
        cancelText: "取消",
        onOk: async () => {
          try {
            await useAuthRequest(() => deleteWarningSign(record.id));
            message.success("删除成功");
            selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id);
            reloadList();
          } catch (e) {
            showApiError(e);
          }
        },
      });
    };

    const handleStatusToggle = async (record: WarningSignVO, checked: boolean): Promise<void> => {
      const nextStatus = checked ? "ENABLED" : "DISABLED";
      const previousStatus = record.status;
      const nextSet = new Set(togglingIds.value);
      nextSet.add(record.id);
      togglingIds.value = nextSet;
      record.status = nextStatus;
      try {
        await useAuthRequest(() => updateWarningSignEnabled(record.id, { enabled: checked }));
        message.success(checked ? "已启用" : "已停用");
      } catch (e) {
        record.status = previousStatus;
        showApiError(e);
      } finally {
        const doneSet = new Set(togglingIds.value);
        doneSet.delete(record.id);
        togglingIds.value = doneSet;
      }
    };

    const handleBatchDelete = (): void => {
      if (selectedRowKeys.value.length === 0) {
        message.warning("请先选择要删除的数据");
        return;
      }
      AntModal.confirm({
        centered: true,
        title: "批量删除",
        content: `确定删除选中的 ${selectedRowKeys.value.length} 条标志？`,
        okText: "确定",
        cancelText: "取消",
        onOk: async () => {
          try {
            await Promise.all(selectedRowKeys.value.map((id) => useAuthRequest(() => deleteWarningSign(id))));
            message.success("删除成功");
            selectedRowKeys.value = [];
            tableApi.setSelectedRowKeys([]);
            reloadList();
          } catch (e) {
            showApiError(e);
          }
        },
      });
    };

    const customUpload = async (options: UploadRequestOption): Promise<void> => {
      const { file, onSuccess, onError } = options;
      const blob = file as File;
      try {
        const result = await useAuthRequest(() => uploadRiskControlFile(blob, FILE_SCENE_CODE.WARNING_SIGN_ICON));
        iconFileId.value = result.id || undefined;
        onSuccess?.({ url: result.path, fileId: iconFileId.value });
        message.success("图标上传成功");
      } catch (e) {
        showApiError(e);
        onError?.(e as Error);
      }
    };

    const onIconChange = (info: UploadChangeParam): void => {
      iconFileList.value = info.fileList.slice(-1);
    };

    const columns: ColumnType[] = [
      { title: "标志编号", dataIndex: "code", width: TABLE_CODE_COLUMN_WIDTH, ellipsis: true },
      { title: "标志名称", dataIndex: "name", width: 160, ellipsis: true },
      {
        title: "适用场景",
        dataIndex: "applicableScenario",
        width: 160,
        ellipsis: true,
        customRender: ({ text }: { text: string }) => text || "—",
      },
      {
        title: "标志类型",
        dataIndex: "type",
        width: 120,
        customRender: ({ text }: { text: string }) => <Tag color={SIGN_TYPE_COLOR[text]}>{signTypeLabel(text)}</Tag>,
      },
      {
        title: "图标",
        dataIndex: "iconUrl",
        width: 72,
        align: "center",
        customRender: ({ text, record }: { text: string; record: WarningSignVO }) => (
          <FileImageThumb src={text} alt={record.name} size={32} />
        ),
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 120,
        customRender: ({ record }: { record: WarningSignVO }) => (
          <Switch
            checked={record.status === "ENABLED"}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            loading={togglingIds.value.has(record.id)}
            onChange={(checked) => {
              void handleStatusToggle(record, Boolean(checked));
            }}
          />
        ),
      },
      {
        title: "操作",
        fixed: "right",
        dataIndex: "action",
        width: 180,
        customRender: ({ record }: { record: WarningSignVO }) => (
          <Space>
            <Button
              {...LIST_ACTION_LINK_PROPS}
              onClick={() => {
                void openView(record);
              }}
            >
              查看
            </Button>
            <Button
              {...LIST_ACTION_LINK_PROPS}
              onClick={() => {
                void openEdit(record);
              }}
            >
              编辑
            </Button>
            <Button {...LIST_ACTION_DELETE_PROPS} onClick={() => handleDelete(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];

    const fetchWarningSignPage = async () => {
      const result = await useAuthRequest(() =>
        pageWarningSigns({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          signType: search.signType || undefined,
          enabled: search.enabled ? search.enabled === "ENABLED" : undefined,
        }),
      );
      const records = (result?.records ?? []).map(mapWarningSignFromApi);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_WARNING_SIGNS",
      rowKey: "id",
      rowSelection: "checkbox",
      fetchApi: fetchWarningSignPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
      rowSelectionChange: (keys) => {
        selectedRowKeys.value = keys.map(String);
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          label: "标志类型",
          fieldName: "signType",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "全部类型",
            options: [{ label: "全部类型", value: "" }, ...WARNING_SIGN_TYPES.map((t) => ({ label: signTypeLabel(t), value: t }))],
          },
        },
        {
          component: "Select",
          label: "启用状态",
          fieldName: "enabled",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "全部状态",
            options: [
              { label: "全部状态", value: "" },
              { label: "启用", value: "ENABLED" },
              { label: "禁用", value: "DISABLED" },
            ],
          },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          componentProps: { placeholder: "搜索标志名称", allowClear: true, maxlength: 100 },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
        signType: (values.signType as string | undefined) ?? "",
        enabled: (values.enabled as "" | "ENABLED" | "DISABLED" | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.signType = (values.signType as string | undefined) ?? "";
        search.enabled = (values.enabled as "" | "ENABLED" | "DISABLED" | undefined) ?? "";
        page.pageNumber = 1;
        selectedRowKeys.value = [];
        tableApi.setSelectedRowKeys([]);
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.signType = "";
        search.enabled = "";
        page.pageNumber = 1;
        selectedRowKeys.value = [];
        tableApi.setSelectedRowKeys([]);
        tableApi.query();
      },
      showCollapseButton: true,
      collapsedVisibleCount: 2,
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const modalTitle = computed(() => {
      if (modalMode.value === "view") return "查看安全警示标志";
      if (modalMode.value === "edit") return "编辑安全警示标志";
      return "新增安全警示标志";
    });

    const slots = {
      "layout-header": () => (
        <Space>
          <Button danger type="primary" disabled={selectedRowKeys.value.length === 0} onClick={handleBatchDelete}>
            批量删除
          </Button>
          <Button type="primary" onClick={openCreate}>
            新增
          </Button>
        </Space>
      ),
      "layout-content": () => (
        <div class="risk-stack risk-table-page">
          <PcForm />
          <PcTable />
          <Modal
            wrapClassName="risk-modal"
            bodyStyle={RISK_MODAL_BODY_STYLE}
            open={modalVisible.value}
            title={modalTitle.value}
            width={560}
            footer={
              modalMode.value === "view" ? (
                <Button
                  onClick={() => {
                    modalVisible.value = false;
                  }}
                >
                  关闭
                </Button>
              ) : (
                <Space>
                  <Button
                    onClick={() => {
                      modalVisible.value = false;
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      void handleSubmit();
                    }}
                  >
                    提交
                  </Button>
                </Space>
              )
            }
            onCancel={() => {
              modalVisible.value = false;
            }}
          >
            <Form layout="vertical">
              {modalMode.value !== "create" && (
                <FormItem label="标志编号">
                  <Input v-model:value={form.code} disabled />
                </FormItem>
              )}
              <FormItem label="标志名称" required>
                <Input v-model:value={form.name} disabled={modalMode.value === "view"} maxlength={50} />
              </FormItem>
              <FormItem label="标志类型" required>
                <Select v-model:value={form.type} disabled={modalMode.value === "view"}>
                  {WARNING_SIGN_TYPES.map((t) => (
                    <SelectOption key={t} value={t}>
                      {signTypeLabel(t)}
                    </SelectOption>
                  ))}
                </Select>
              </FormItem>
              <FormItem label="图标上传">
                {modalMode.value === "view" ? (
                  <FileImageThumb src={iconFileList.value[0]?.url ?? ""} alt={form.name} size={64} />
                ) : (
                  <Upload
                    customRequest={customUpload}
                    fileList={iconFileList.value}
                    onChange={onIconChange}
                    maxCount={1}
                    accept=".png,.svg,.jpg"
                  >
                    <Button>+ 上传图标</Button>
                  </Upload>
                )}
              </FormItem>
              <FormItem label="状态">
                <Switch
                  checked={form.status === "ENABLED"}
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                  disabled={modalMode.value === "view"}
                  onChange={(checked) => {
                    form.status = checked ? "ENABLED" : "DISABLED";
                  }}
                />
              </FormItem>
              <FormItem label="适用场景">
                <Textarea
                  v-model:value={form.applicableScenario}
                  disabled={modalMode.value === "view"}
                  rows={3}
                  maxlength={500}
                  showCount
                  placeholder="请输入适用场景"
                />
              </FormItem>
            </Form>
          </Modal>
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("安全警示标志管理")} v-slots={slots} />;
  },
});
