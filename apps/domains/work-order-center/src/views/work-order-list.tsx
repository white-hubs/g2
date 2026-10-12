import * as VueApi from "vue";

import * as WorkOrderContext from "../domain-context";
import * as PcUi from "../pc-ui-runtime";
import { errorMessage, flowStatusLabel, formatDateTime } from "../shared";

import styles from "../styles.module.less";

const { Button, Modal, Page, PageLayout, Tag, message, usePcForm, usePcTable } = PcUi;
const { defineComponent, reactive, ref } = VueApi;

export const WorkOrderList = defineComponent({
  name: "WorkOrderCenterList",
  setup() {
    const query = reactive<{ businessType?: string; username: string }>({ username: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const businessTypes = ref<{ label: string; value: string }[]>([]);
    const selectedIds = ref<string[]>([]);
    const deleteVisible = ref(false);
    const deleting = ref(false);

    const clearSelection = (): void => {
      selectedIds.value = [];
      tableApi.setSelectedRowKeys([]);
    };

    const [PcTable, tableApi] = usePcTable({
      tableCode: "WORK_ORDER_CENTER_DELETE",
      rowKey: "processInstanceId",
      rowSelection: "checkbox",
      rowSelectionChange(keys) {
        selectedIds.value = keys.map(String);
      },
      columns: [
        { title: "编号", dataIndex: "formNo", width: 200, ellipsis: true },
        { title: "申请名称", dataIndex: "instanceName", width: 220, ellipsis: true },
        { title: "发起人", dataIndex: "startUserName", width: 140, ellipsis: true },
        { title: "发起部门", dataIndex: "organizationName", width: 180, ellipsis: true },
        {
          title: "发起时间",
          dataIndex: "submitedTime",
          width: 180,
          customRender: ({ text }: { text?: string | number }) => formatDateTime(text),
        },
        {
          title: "处理状态",
          dataIndex: "status",
          width: 120,
          customRender: ({ text }: { text?: string }) => (
            <Tag color={text === "FINISHED" ? "green" : text === "REJECT" ? "red" : "blue"}>{flowStatusLabel(text)}</Tag>
          ),
        },
      ],
      fetchApi: () =>
        WorkOrderContext.getWorkOrderCenterClient().pageWorkOrders({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          businessType: query.businessType,
          username: query.username || undefined,
        }),
      fetchLoaded(data) {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Select",
          fieldName: "businessType",
          label: "工单类型",
          componentProps: {
            allowClear: true,
            showSearch: true,
            options: businessTypes,
            placeholder: "请选择工单类型",
          },
        },
        {
          component: "Input",
          fieldName: "username",
          label: "发起人",
          defaultValue: "",
          componentProps: { allowClear: true, maxLength: 20, showCount: true, placeholder: "请输入" },
        },
      ],
      handleSubmit(values) {
        query.businessType = typeof values.businessType === "string" ? values.businessType : undefined;
        query.username = String(values.username ?? "").trim();
        page.pageNumber = 1;
        clearSelection();
        tableApi.query();
      },
      handleReset() {
        query.businessType = undefined;
        query.username = "";
        page.pageNumber = 1;
        clearSelection();
        tableApi.query();
      },
    });

    const removeSelected = async (): Promise<void> => {
      if (selectedIds.value.length === 0 || deleting.value) {
        return;
      }
      deleting.value = true;
      try {
        await WorkOrderContext.getWorkOrderCenterClient().deleteWorkOrders(selectedIds.value);
        deleteVisible.value = false;
        clearSelection();
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(errorMessage(error, "删除失败"));
      } finally {
        deleting.value = false;
      }
    };

    void WorkOrderContext.getWorkOrderCenterClient()
      .listBusinessTypes()
      .then((items) => {
        businessTypes.value = items.map((item) => ({ label: item.name, value: item.code }));
      })
      .catch((error: unknown) => message.error(errorMessage(error, "工单类型加载失败")));

    return () => (
      <PageLayout
        title="工单删除"
        v-slots={{
          "layout-header": () => (
            <Button danger disabled={selectedIds.value.length === 0} onClick={() => (deleteVisible.value = true)}>
              批量删除
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.tablePage}>
              <PcForm />
              <PcTable />
              <Modal
                open={deleteVisible.value}
                title="确认删除"
                okText="确认"
                cancelText="取消"
                confirmLoading={deleting.value}
                onOk={() => void removeSelected()}
                onCancel={() => (deleteVisible.value = false)}
              >
                确定要删除选中的 {selectedIds.value.length} 项工单吗？
              </Modal>
            </div>
          ),
          "footer-btn": () => <span class={styles.selection}>已选 {selectedIds.value.length} 项</span>,
          "footer-page": () =>
            page.total > 0 ? (
              <Page
                current={page.pageNumber}
                pageSize={page.pageSize}
                total={page.total}
                cachePageQuery={false}
                onPageChange={(pageNumber: number, pageSize: number) => {
                  page.pageNumber = pageNumber;
                  page.pageSize = pageSize;
                  clearSelection();
                  tableApi.query();
                }}
              />
            ) : null,
        }}
      />
    );
  },
});
