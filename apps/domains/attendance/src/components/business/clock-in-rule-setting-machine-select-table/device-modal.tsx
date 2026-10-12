import { Modal, Page, type PcTableColumn, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, ref } from "vue";

import {
  getAreaTree,
  getCustomerTagListAll,
  getDeviceInstancePageAll,
  getIotProductCategoryTree,
  getProductListAll,
} from "@/api/selection";
import { DeptTreeSelect } from "@/components/department-select";

interface AttendanceDevice {
  id: string;
  name: string;
  code?: string;
  productInfo?: { name?: string; productCategory?: { name?: string } };
  department?: { name?: string };
  area?: { pathName?: string };
}
export const DeviceModalTable = defineComponent({
  props: { value: { type: Array as PropType<AttendanceDevice[]>, default: () => [] } },
  emits: ["ok"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const page = ref({ pageNumber: 1, pageSize: 10, total: 0 });
    const selected = ref(new Map<string, AttendanceDevice>());
    const query = ref<Record<string, unknown>>({});
    let version = 0;
    const load = async (): Promise<void> => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const { categoryCode, anyMatchedAreaId, ...rest } = query.value;
        const data = await getDeviceInstancePageAll({
          ...rest,
          categoryCode: Array.isArray(categoryCode) ? categoryCode.join("-") : typeof categoryCode === "string" ? categoryCode : undefined,
          anyMatchedAreaId: Array.isArray(anyMatchedAreaId)
            ? anyMatchedAreaId.join("-")
            : typeof anyMatchedAreaId === "string"
              ? anyMatchedAreaId
              : undefined,
          filterTagCodes: [],
          pageNumber: page.value.pageNumber,
          pageSize: page.value.pageSize,
        });
        if (current !== version || !open.value) {
          return;
        }
        tableApi.setDataSource(data.records);
        page.value.total = data.total;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "设备列表加载失败");
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };
    const [PcForm, formApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        {
          fieldName: "productId",
          label: "所属产品",
          component: "Select",
          componentProps: {
            options: [],
            fieldNames: { label: "prodName", value: "id" },
            placeholder: "请选择所属产品",
            showSearch: true,
            optionFilterProp: "prodName",
            style: { width: "180px" },
          },
        },
        {
          fieldName: "categoryCode",
          label: "产品品类",
          component: "Cascader",
          componentProps: {
            options: [],
            changeOnSelect: true,
            fieldNames: { label: "categoryName", value: "categoryCode", children: "children" },
            placeholder: "请选择产品品类",
            showSearch: true,
            style: { width: "180px" },
          },
        },
        {
          fieldName: "anyMatchedAreaId",
          label: "所在区域",
          component: "Cascader",
          componentProps: {
            options: [],
            changeOnSelect: true,
            fieldNames: { label: "name", value: "id", children: "children" },
            placeholder: "请选择所在区域",
            showSearch: true,
            style: { width: "180px" },
          },
        },
        {
          fieldName: "anyMatchedDepartmentId",
          label: "维护部门",
          component: DeptTreeSelect,
          componentProps: { placeholder: "请选择维护部门", showSearch: true, style: { width: "180px" } },
        },
        {
          fieldName: "tagCodes",
          label: "设备标签",
          component: "Select",
          componentProps: {
            options: [],
            mode: "multiple",
            maxTagCount: 1,
            fieldNames: { label: "tagName", value: "tagCode" },
            placeholder: "请选择设备标签",
            showSearch: true,
            optionFilterProp: "tagName",
            style: { width: "280px" },
          },
        },
        { fieldName: "keyword", label: "", component: "Input", componentProps: { placeholder: "设备名称", style: { width: "180px" } } },
      ],
      handleSubmit(values) {
        query.value = values;
        page.value.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.value = {};
        page.value.pageNumber = 1;
        void load();
      },
    });
    const columns: PcTableColumn[] = [
      { title: "设备编号", dataIndex: "code", align: "center", ellipsis: true },
      { title: "设备名称", dataIndex: "name", align: "center", ellipsis: true },
      {
        title: "所属产品",
        dataIndex: "productInfo",
        align: "center",
        ellipsis: true,
        customRender: ({ record }: { record: AttendanceDevice }) => record.productInfo?.name || "--",
      },
      {
        title: "产品品类",
        key: "category",
        align: "center",
        ellipsis: true,
        customRender: ({ record }: { record: AttendanceDevice }) => record.productInfo?.productCategory?.name || "--",
      },
      {
        title: "维护部门",
        dataIndex: "department",
        align: "center",
        ellipsis: true,
        customRender: ({ record }: { record: AttendanceDevice }) => record.department?.name || "--",
      },
      {
        title: "所在区域",
        dataIndex: "areaName",
        align: "center",
        ellipsis: true,
        customRender: ({ record }: { record: AttendanceDevice }) => record.area?.pathName || "--",
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "attendance-device-selector",
      rowSelection: "checkbox",
      autoFetch: false,
      autoScrollY: false,
      scrollY: 400,
      rowSelectionChange(keys) {
        const kept = new Set(keys.map(String));
        for (const row of (tableApi.getDataSource() ?? []) as AttendanceDevice[]) {
          if (kept.has(row.id)) {
            selected.value.set(row.id, row);
          } else {
            selected.value.delete(row.id);
          }
        }
        tableApi.setSelectedRowKeys([...selected.value.keys()]);
      },
    });
    const loadOptions = async (): Promise<void> => {
      const results = await Promise.allSettled([
        getProductListAll(),
        getIotProductCategoryTree(),
        getAreaTree(),
        getCustomerTagListAll({ status: 1 }),
      ]);
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          message.error("设备筛选条件加载失败");
          return;
        }
        Object.assign(formApi.state.schema[index === 3 ? 4 : index].componentProps ?? {}, { options: result.value });
      });
    };
    const close = (): void => {
      open.value = false;
      version++;
    };
    expose({
      openModal() {
        open.value = true;
        selected.value = new Map(props.value.map((row) => [row.id, row]));
        tableApi.setSelectedRowKeys([...selected.value.keys()]);
        void load();
        void loadOptions();
      },
    });
    return () => (
      <Modal
        open={open.value}
        title="设备列表"
        width={1300}
        okText="确定"
        cancelText="取消"
        onCancel={close}
        onOk={() => {
          emit("ok", [...selected.value.values()]);
          close();
        }}
      >
        <PcForm />
        <PcTable />
        <Page
          cachePageQuery={false}
          syncToUrl={false}
          current={page.value.pageNumber}
          pageSize={page.value.pageSize}
          total={page.value.total}
          onPageChange={(pageNumber, pageSize) => {
            page.value.pageNumber = pageNumber;
            page.value.pageSize = pageSize;
            void load();
          }}
        />
      </Modal>
    );
  },
});
