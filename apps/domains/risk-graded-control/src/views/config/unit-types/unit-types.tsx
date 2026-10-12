import { computed, defineComponent, reactive, ref } from "vue";

import { createUnitType, deleteUnitType, pageUnitTypes, updateUnitType } from "@/api/server";
import {
  LIST_ACTION_DELETE_PROPS,
  LIST_ACTION_LINK_PROPS,
  TABLE_CODE_COLUMN_WIDTH,
  TABLE_PAGE_SIZE,
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
  Space,
  message,
  usePcForm,
  usePcTable,
  type ColumnType,
} from "@/pc-ui-runtime";
import type { UnitTypeVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { mapUnitTypeFromApi, mapUnitTypeToApi } from "@/utils/risk-control-mapper";

export const UnitTypesPage = defineComponent({
  name: "UnitTypesPage",
  setup() {
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
    });
    const modalVisible = ref(false);
    const modalMode = ref<"create" | "edit">("create");
    const editingId = ref<string | null>(null);

    const form = reactive({
      code: "",
      name: "",
    });

    const resetForm = (): void => {
      form.code = "";
      form.name = "";
    };

    const openCreate = (): void => {
      modalMode.value = "create";
      editingId.value = null;
      resetForm();
      modalVisible.value = true;
    };

    const openEdit = (record: UnitTypeVO): void => {
      modalMode.value = "edit";
      editingId.value = record.id;
      form.code = record.code;
      form.name = record.name;
      modalVisible.value = true;
    };

    const reloadList = (): void => {
      tableApi.query();
    };

    const handleSubmit = async (): Promise<void> => {
      if (!form.name.trim()) {
        message.warning("请输入类型名称");
        return;
      }
      try {
        const payload = mapUnitTypeToApi(form);
        if (modalMode.value === "create") {
          await useAuthRequest(() => createUnitType(payload));
          message.success("新增成功");
        } else if (editingId.value) {
          const id = editingId.value;
          await useAuthRequest(() => updateUnitType(id, payload));
          message.success("保存成功");
        }
        modalVisible.value = false;
        reloadList();
      } catch (e) {
        showApiError(e);
      }
    };

    const handleDelete = (record: UnitTypeVO): void => {
      AntModal.confirm({
        centered: true,
        title: "删除确认",
        content: `确定删除类型「${record.name}」吗？`,
        okText: "确定",
        cancelText: "取消",
        onOk: async () => {
          try {
            await useAuthRequest(() => deleteUnitType(record.id));
            message.success("删除成功");
            reloadList();
          } catch (e) {
            showApiError(e);
          }
        },
      });
    };

    const columns: ColumnType[] = [
      { title: "类型编号", dataIndex: "code", width: TABLE_CODE_COLUMN_WIDTH, ellipsis: true },
      { title: "类型名称", dataIndex: "name", width: 160 },
      {
        title: "操作",
        fixed: "right",
        dataIndex: "action",
        width: 140,
        customRender: ({ record }: { record: UnitTypeVO }) => (
          <Space>
            <Button {...LIST_ACTION_LINK_PROPS} onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button {...LIST_ACTION_DELETE_PROPS} onClick={() => handleDelete(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];

    const fetchUnitTypePage = async () => {
      const result = await useAuthRequest(() =>
        pageUnitTypes({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
        }),
      );
      const records = (result?.records ?? []).map(mapUnitTypeFromApi);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_UNIT_TYPES",
      rowKey: "id",
      fetchApi: fetchUnitTypePage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          componentProps: { placeholder: "搜索类型名称/编号", allowClear: true, maxlength: 100 },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const modalTitle = computed(() => (modalMode.value === "create" ? "新增单元类型" : "编辑单元类型"));

    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={openCreate}>
          新增
        </Button>
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
            width={520}
            onCancel={() => {
              modalVisible.value = false;
            }}
            onOk={() => {
              void handleSubmit();
            }}
            okText="提交"
            cancelText="取消"
          >
            <Form layout="vertical">
              {modalMode.value === "edit" && (
                <FormItem label="类型编号">
                  <Input v-model:value={form.code} disabled />
                </FormItem>
              )}
              <FormItem label="类型名称" required>
                <Input v-model:value={form.name} maxlength={20} placeholder="请输入类型名称" />
              </FormItem>
            </Form>
          </Modal>
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("风险单元类型管理")} v-slots={slots} />;
  },
});
