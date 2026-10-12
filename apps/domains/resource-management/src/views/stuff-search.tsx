import type { ResourceFile, ResourceItem } from "@g2-contract/resource-management";
import { defineComponent, h, reactive, ref } from "vue";

import { getResourceManagementClient, getResourceRuntime } from "../domain-context";
import {
  Button,
  Image,
  ImagePreviewGroup,
  Modal,
  Page,
  PageLayout,
  message,
  usePcForm,
  usePcTable,
  type PcTableColumn,
} from "../pc-ui-runtime";

const display = (value: unknown): string => (value === undefined || value === null || value === "" ? "--" : String(value));

export const StuffSearch = defineComponent({
  name: "ResourceManagementStuffSearch",
  setup() {
    const client = getResourceManagementClient();
    const runtime = getResourceRuntime();
    const isHospitalAdmin = runtime.terminal === "kh-admin-web";
    const query = reactive({
      tenant: isHospitalAdmin ? (undefined as string | undefined) : runtime.tenant,
      deptId: undefined as string | undefined,
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const tenants = ref<{ label: string; value: string }[]>([]);
    const departments = ref<{ label: string; value: string }[]>([]);
    const previewOpen = ref(false);
    const previewFiles = ref<ResourceFile[]>([]);
    const exportLoading = ref(false);
    const flatRows = ref<ResourceItem[]>([]);
    let listVersion = 0;
    let departmentVersion = 0;

    const span = (field: keyof ResourceItem, index: number): number => {
      if (index > 0 && flatRows.value[index - 1]?.[field] === flatRows.value[index]?.[field]) return 0;
      let count = 1;
      while (index + count < flatRows.value.length && flatRows.value[index + count]?.[field] === flatRows.value[index]?.[field]) count++;
      return count;
    };
    const merged = (field: keyof ResourceItem): Pick<PcTableColumn, "customCell"> => ({
      customCell: (_record, index) => ({ rowSpan: span(field, Number(index ?? 0)) }),
    });
    const columns: PcTableColumn[] = [
      { title: "所属部门", dataIndex: "deptName", align: "center", ...merged("deptName") },
      { title: "手术室", dataIndex: "deviceName", align: "center", ...merged("deviceName") },
      { title: "物品名称", dataIndex: "name", align: "center" },
      { title: "尺寸", dataIndex: "size", align: "center" },
      { title: "数量", dataIndex: "number", align: "center" },
      { title: "厂家", dataIndex: "manufacturer", align: "center" },
      { title: "型号", dataIndex: "model", align: "center" },
      {
        title: "机组编号",
        dataIndex: "machinesCode",
        align: "center",
        ...merged("machinesCode"),
        customRender: ({ text }) => display(text),
      },
      { title: "机组铭牌参数", dataIndex: "arguments", align: "center", ...merged("arguments"), customRender: ({ text }) => display(text) },
      {
        title: "机组铭牌附件",
        dataIndex: "fileIds",
        align: "center",
        ...merged("fileIds"),
        customRender: ({ record }) => {
          const files = (record as ResourceItem).fileList;
          return files?.length ? (
            <Button
              type="link"
              onClick={() => {
                previewFiles.value = files;
                previewOpen.value = true;
              }}
            >
              查看图片
            </Button>
          ) : (
            "--"
          );
        },
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "d/resource-management/stuff-search",
      pagination: false,
      autoFetch: false,
    });

    async function load(): Promise<void> {
      if (!query.tenant) {
        flatRows.value = [];
        tableApi.setDataSource([]);
        page.total = 0;
        return;
      }
      const current = ++listVersion;
      tableApi.loading.value = true;
      try {
        const result = await client.pageItems({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          tenant: query.tenant,
          deptId: query.deptId ?? "",
        });
        if (current === listVersion) {
          flatRows.value = result.records.flatMap((group) => group.itemList ?? []);
          tableApi.setDataSource(flatRows.value);
          page.total = result.total;
        }
      } catch (error) {
        if (current === listVersion) message.error(error instanceof Error ? error.message : "物品查询失败");
      } finally {
        if (current === listVersion) tableApi.loading.value = false;
      }
    }
    async function loadDepartments(tenant: string): Promise<void> {
      const current = ++departmentVersion;
      departments.value = [];
      if (!tenant) return;
      try {
        const result = await client.listDepartments(tenant, true);
        if (current === departmentVersion) departments.value = result.map((item) => ({ label: item.name, value: item.id }));
      } catch (error) {
        if (current === departmentVersion) message.error(error instanceof Error ? error.message : "部门加载失败");
      }
    }
    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: false,
      syncStateRef: query,
      schema: [
        ...(isHospitalAdmin
          ? [
              {
                component: "Select",
                fieldName: "tenant",
                label: "所属医院",
                defaultValue: undefined,
                componentProps: {
                  options: tenants,
                  placeholder: "请选择所属医院",
                  allowClear: true,
                  showSearch: true,
                  optionFilterProp: "label",
                  style: { width: "180px" },
                },
              },
            ]
          : []),
        {
          component: "Select",
          fieldName: "deptId",
          label: "所属部门",
          defaultValue: undefined,
          componentProps: {
            options: departments,
            placeholder: "请选择维护部门",
            allowClear: true,
            showSearch: true,
            optionFilterProp: "label",
            style: { width: "180px" },
          },
        },
      ],
      handleSubmit: () => {
        page.pageNumber = 1;
        void load();
      },
      handleReset: () => {
        query.deptId = undefined;
        page.pageNumber = 1;
        void load();
      },
      handleValuesChange: (_values, changed) => {
        if (changed && "tenant" in changed) {
          query.tenant = typeof changed.tenant === "string" ? changed.tenant : undefined;
          query.deptId = undefined;
          page.pageNumber = 1;
          void loadDepartments(query.tenant ?? "");
        }
      },
    });
    if (isHospitalAdmin) {
      void client
        .listTenants()
        .then((values) => {
          tenants.value = values.map((item) => ({ label: item.name, value: item.code }));
          if (!query.tenant && values[0]) {
            query.tenant = values[0].code;
            void loadDepartments(values[0].code);
            void load();
          }
        })
        .catch((error: unknown) => message.error(error instanceof Error ? error.message : "医院列表加载失败"));
    } else {
      void loadDepartments(runtime.tenant);
      void load();
    }
    const exportItems = async (): Promise<void> => {
      if (exportLoading.value || !query.tenant) return;
      exportLoading.value = true;
      try {
        const blob = await client.exportItems({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          tenant: query.tenant,
          deptId: query.deptId ?? "",
          tenantName: tenants.value.find((item) => item.value === query.tenant)?.label ?? "",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "物品列表.xlsx";
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "物品导出失败");
      } finally {
        exportLoading.value = false;
      }
    };
    const slots = {
      "layout-header": () =>
        isHospitalAdmin ? (
          <Button type="primary" disabled={!query.tenant} loading={exportLoading.value} onClick={() => void exportItems()}>
            批量导出
          </Button>
        ) : null,
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
          cachePageQuery={false}
          onPageChange={(number: number, size: number) => {
            page.pageNumber = number;
            page.pageSize = size;
            void load();
          }}
        />
      ),
    };
    return () => (
      <>
        <PageLayout title="物品查询" v-slots={slots} />
        <Modal
          open={previewOpen.value}
          width={600}
          footer={null}
          onCancel={() => {
            previewOpen.value = false;
          }}
        >
          {h(ImagePreviewGroup, {}, () =>
            previewFiles.value.map((file) => (
              <span key={file.id} aria-label={file.name}>
                <Image src={file.path} width={120} height={120} />
              </span>
            )),
          )}
        </Modal>
      </>
    );
  },
});
