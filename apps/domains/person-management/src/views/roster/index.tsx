import {
  Button,
  Modal,
  Page,
  PageLayout,
  Space,
  TreeSelect,
  Upload,
  type UploadRequestOption,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";

import { RosterOperatePage, dateOnly, getRosterDerivedDisplayValue } from "./operate-page";

// 列表状态与领域服务在共享详情组件之后加载。
import { defineComponent, markRaw, onMounted, reactive, ref } from "vue";

import { getPersonManagementClient, getPersonManagementContext } from "../../domain-context";

// 表格行类型独立于运行时依赖。
import type { StaffRow } from "@g2-contract/person-management";

// 导航能力单独分组，避免导入重排影响提交检查。
import { useRouter } from "vue-router";

export { RosterOperatePage };
export { BusinessPermissionsPage } from "./permissions-page";

const BASE = "/d/person-management";

interface TreeOption {
  label: string;
  value: string;
  children?: TreeOption[];
}

interface SelectOption {
  label: string;
  value: string;
}

interface ImportError {
  row: number;
  column: number;
  colName: string;
  msg: string;
  key: string;
}

function date(value: unknown): string {
  return dateOnly(value) ?? "--";
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toTree(items: { id: string; name: string; children?: unknown[] }[]): TreeOption[] {
  return items.map((item) => ({
    label: item.name,
    value: String(item.id),
    children:
      Array.isArray(item.children) && item.children.length > 0
        ? toTree(item.children as { id: string; name: string; children?: unknown[] }[])
        : undefined,
  }));
}

export const RosterPage = defineComponent({
  name: "PersonnelRosterPage",
  setup() {
    const router = useRouter();
    const query = reactive<{
      keyword: string;
      organizationId?: string;
      archiveStatus?: string;
      type?: string;
      status?: string;
    }>({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const departments = reactive<TreeOption[]>([]);
    const staffTypes = reactive<SelectOption[]>([]);
    const importing = ref(false);
    const exporting = ref(false);
    const downloadingTemplate = ref(false);
    const importErrorOpen = ref(false);
    const canManageBusinessPermissions = getPersonManagementContext().getFunctionCodes().has("personnelManagement:userInfo:userPermission");

    const navigate = (type: "add" | "edit" | "detail", row?: StaffRow): void => {
      void router.push({ path: `${BASE}/roster-operate`, query: { type, ...(row ? { id: row.id } : {}) } });
    };

    const [PcTable, tableApi] = usePcTable({
      tableCode: "ROSTER",
      rowKey: "id",
      pagination: false,
      columns: [
        { title: "员工姓名", dataIndex: "name", width: 150, fixed: "left", ellipsis: true },
        { title: "员工工号", dataIndex: "jobNumber", width: 150, ellipsis: true },
        { title: "联系电话", dataIndex: "mobile", width: 150, ellipsis: true },
        { title: "婚姻状况", dataIndex: "maritalStatusName", width: 130, ellipsis: true },
        {
          title: "年龄",
          dataIndex: "age",
          width: 90,
          align: "center",
          customRender: ({ record }: { record: StaffRow }) => getRosterDerivedDisplayValue(record, "age"),
        },
        { title: "岗位", dataIndex: "appointmentName", width: 150, ellipsis: true },
        { title: "职位", dataIndex: "postNames", width: 150, ellipsis: true },
        { title: "部门", dataIndex: "organizationName", width: 180, ellipsis: true },
        { title: "员工类型", dataIndex: "typeName", width: 130, ellipsis: true },
        { title: "员工状态", dataIndex: "statusName", width: 130, ellipsis: true },
        { title: "工作状态", dataIndex: "stateName", width: 130, ellipsis: true },
        { title: "入职时间", dataIndex: "inductionDate", width: 140, customRender: ({ text: value }) => date(value) },
        {
          title: "司龄",
          dataIndex: "companyYears",
          width: 100,
          align: "center",
          customRender: ({ record }: { record: StaffRow }) => getRosterDerivedDisplayValue(record, "companyYears"),
        },
        { title: "计划转正日期", dataIndex: "planRegularWorkerDate", width: 160, customRender: ({ text: value }) => date(value) },
        {
          title: "工龄",
          dataIndex: "workingYears",
          width: 100,
          align: "center",
          customRender: ({ record }: { record: StaffRow }) => getRosterDerivedDisplayValue(record, "workingYears"),
        },
        { title: "资料完善", dataIndex: "perfect", width: 130, customRender: ({ text: value }) => (value ? "已完善" : "待完善") },
        {
          title: "操作",
          dataIndex: "action",
          width: 250,
          fixed: "right",
          customRender: ({ record }: { record: StaffRow }) => (
            <Space size={2}>
              <Button type="link" size="small" onClick={() => navigate("detail", record)}>
                详情
              </Button>
              <Button type="link" size="small" onClick={() => navigate("edit", record)}>
                编辑
              </Button>
              {canManageBusinessPermissions ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => void router.push({ path: `${BASE}/business-permissions`, query: { mobile: record.mobile } })}
                >
                  业务权限
                </Button>
              ) : null}
            </Space>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const result = await getPersonManagementClient().pageStaff({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            keyword: query.keyword.trim() || undefined,
            organizationId: query.organizationId,
            archiveStatus: query.archiveStatus,
            type: query.type,
            status: query.status,
          });
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "花名册加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });

    const [ErrorTable, errorTableApi] = usePcTable({
      tableCode: "ROSTER_IMPORT_ERRORS",
      rowKey: "key",
      pagination: false,
      autoFetch: false,
      columns: [
        { title: "行号", dataIndex: "row", width: 80 },
        { title: "列号", dataIndex: "column", width: 80 },
        { title: "列名", dataIndex: "colName", width: 140 },
        { title: "提示信息", dataIndex: "msg" },
      ],
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      cache: false,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "员工姓名",
          defaultValue: "",
          componentProps: { placeholder: "请输入员工姓名或工号", allowClear: true, style: { width: "218px" } },
        },
        {
          component: markRaw(TreeSelect),
          fieldName: "organizationId",
          label: "所属部门",
          defaultValue: undefined,
          componentProps: {
            treeData: departments,
            placeholder: "请选择部门",
            allowClear: true,
            showSearch: true,
            treeNodeFilterProp: "label",
            style: { width: "218px" },
          },
        },
        {
          component: "Select",
          fieldName: "archiveStatus",
          label: "资料完善",
          defaultValue: undefined,
          componentProps: {
            options: [
              { label: "待完善", value: "WAITING_FOR_PERFECT" },
              { label: "已完善", value: "PERFECTED" },
            ],
            placeholder: "请选择",
            allowClear: true,
            style: { width: "218px" },
          },
        },
        {
          component: "Select",
          fieldName: "type",
          label: "员工类型",
          defaultValue: undefined,
          componentProps: { options: staffTypes, placeholder: "请选择", allowClear: true, style: { width: "218px" } },
        },
        {
          component: "Select",
          fieldName: "status",
          label: "员工状态",
          defaultValue: undefined,
          componentProps: {
            options: [
              { label: "正式", value: "FORMAL" },
              { label: "离职", value: "LEAVE_OFFICE" },
              { label: "试用", value: "ON_TRIAL" },
            ],
            placeholder: "请选择",
            allowClear: true,
            style: { width: "218px" },
          },
        },
      ],
      handleSubmit(values) {
        Object.assign(query, values);
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        Object.assign(query, { keyword: "", organizationId: undefined, archiveStatus: undefined, type: undefined, status: undefined });
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    const template = async (): Promise<void> => {
      if (downloadingTemplate.value) {
        return;
      }
      downloadingTemplate.value = true;
      try {
        download(await getPersonManagementClient().exportStaffTemplate(), "花名册模板.xlsx");
      } catch (error) {
        message.error(errorMessage(error, "模板下载失败"));
      } finally {
        downloadingTemplate.value = false;
      }
    };

    const exportRecords = async (): Promise<void> => {
      if (exporting.value) {
        return;
      }
      exporting.value = true;
      try {
        download(
          await getPersonManagementClient().exportStaff({
            keyword: query.keyword.trim() || undefined,
            organizationId: query.organizationId,
            archiveStatus: query.archiveStatus,
            type: query.type,
            status: query.status,
          }),
          "花名册.xlsx",
        );
      } catch (error) {
        message.error(errorMessage(error, "导出失败"));
      } finally {
        exporting.value = false;
      }
    };

    const upload = async (option: UploadRequestOption): Promise<void> => {
      if (importing.value) {
        return;
      }
      importing.value = true;
      try {
        const errors = await getPersonManagementClient().importStaff(option.file as Blob);
        if (errors.length > 0) {
          const rows: ImportError[] = errors.map((item, index) => ({
            key: String(index),
            row: item.row,
            column: item.column,
            colName: item.colName,
            msg: item.msg,
          }));
          errorTableApi.setDataSource(rows);
          importErrorOpen.value = true;
        } else {
          message.success("导入成功");
          tableApi.query();
        }
        option.onSuccess?.({}, option.file as unknown as XMLHttpRequest);
      } catch (error) {
        message.error(errorMessage(error, "导入失败"));
        option.onError?.(error instanceof Error ? error : new Error("导入失败"));
      } finally {
        importing.value = false;
      }
    };

    onMounted(async () => {
      const client = getPersonManagementClient();
      const [departmentResult, typeResult] = await Promise.allSettled([client.treeDepartments(), client.getStaffEnums("staffType")]);
      if (departmentResult.status === "fulfilled") {
        departments.splice(0, departments.length, ...toTree(departmentResult.value));
      }
      if (typeResult.status === "fulfilled") {
        staffTypes.splice(0, staffTypes.length, ...typeResult.value.map((item) => ({ label: item.name, value: item.value })));
      }
    });

    return () => (
      <PageLayout
        title="员工花名册"
        v-slots={{
          "layout-header": () => (
            <Space>
              <Button type="primary" onClick={() => navigate("add")}>
                新增
              </Button>
              <Button loading={downloadingTemplate.value} onClick={() => void template()}>
                下载模板
              </Button>
              <Button loading={exporting.value} onClick={() => void exportRecords()}>
                批量导出
              </Button>
              <Upload showUploadList={false} customRequest={upload}>
                <Button loading={importing.value}>批量导入</Button>
              </Upload>
            </Space>
          ),
          "layout-content": () => (
            <>
              <PcForm />
              <PcTable />
              <Modal
                open={importErrorOpen.value}
                title="导入错误，请检查"
                width={800}
                footer={null}
                onCancel={() => (importErrorOpen.value = false)}
              >
                <ErrorTable />
              </Modal>
            </>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(number, size) => {
                page.pageNumber = number;
                page.pageSize = size;
                tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
