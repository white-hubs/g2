import type { AccessControlClient, DoorDeviceRecord } from "@g2-contract/access-control";
import type { MdataClient } from "@g2-contract/mdata";
import { defineComponent, inject, onMounted, reactive, ref } from "vue";

import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY } from "../domain-context";
import { getAccessControlPcUi } from "../domain-context";
import AssociationModal, { type AssociationModalExpose, type AssociationResult } from "./components/association-modal";
import ControlModal, { type ControlModalExpose } from "./components/control-modal";
import { buildAssociatePayload, mapDoorTypeOptions, normalizeDevicePage } from "./device-actions";
import { defineAsyncAccessPcUiComponent, accessPcUiMessage as message } from "./pc-ui-runtime";

const PopOver = defineAsyncAccessPcUiComponent("PopOver");
const textCell = (value: unknown) => <PopOver content={String(value || "")}>{String(value || "--")}</PopOver>;

function mapAreaOptions(raw: unknown): Array<{ label: string; value: string; children?: Array<{ label: string; value: string }> }> {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown })?.data)
      ? ((raw as { data: unknown[] }).data as unknown[])
      : [];
  const walk = (nodes: unknown[]): Array<{ label: string; value: string; children?: Array<{ label: string; value: string }> }> =>
    (nodes as Array<Record<string, unknown>>).map((n) => ({
      label: String(n.name ?? n.label ?? n.id ?? ""),
      value: String(n.id ?? n.value ?? ""),
      children: Array.isArray(n.children) ? walk(n.children as unknown[]) : undefined,
    }));
  return walk(list as unknown[]);
}

export default defineComponent({
  name: "RoomDevicePage",
  setup: () => {
    const ctx = inject(DOMAIN_CONTEXT_KEY);
    const applicationCode = inject(APPLICATION_CODE_KEY, "DOORMANAGE");
    if (!ctx) {
      throw new Error("RoomDevicePage requires DomainContext");
    }
    const { Page, usePcForm, usePcTable } = getAccessControlPcUi();
    const Button = defineAsyncAccessPcUiComponent("Button");
    const PageLayout = defineAsyncAccessPcUiComponent("PageLayout");
    const PopConfirm = defineAsyncAccessPcUiComponent("PopConfirm");
    const Space = defineAsyncAccessPcUiComponent("Space");

    const associationModal = ref<AssociationModalExpose>();
    const controlModal = ref<ControlModalExpose>();
    const doorTypeOptions = reactive<Array<{ label: string; value: string }>>([]);
    const areaOptions = reactive<Array<{ label: string; value: string; children?: Array<{ label: string; value: string }> }>>([]);
    const selectedIds = ref<Array<string | number>>([]);
    const search = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      keyword: "",
      type: "",
      doorArea: "",
    });

    const client = async (): Promise<AccessControlClient> => ctx.ensureClient<AccessControlClient>("accessControlClient");

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "ROOM_DEVICE",
      rowSelection: "checkbox",
      rowSelectionChange: (keys) => {
        selectedIds.value = keys as Array<string | number>;
      },
      columns: [
        {
          dataIndex: "doorCode",
          title: "编码",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "name",
          title: "门禁名称",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "doorModelName",
          title: "设备型号",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "typeName",
          title: "门禁类型",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "areaName",
          title: "所属区域",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "action",
          title: "操作",
          width: 160,
          customRender: ({ record }: { record: DoorDeviceRecord }) => (
            <Space>
              <Button type="link" size="small" onClick={() => controlModal.value?.open(record)}>
                查看
              </Button>
              <PopConfirm
                title="删除当前选中？"
                onConfirm={async () => {
                  if (record.id == null) {
                    return;
                  }
                  const api = await client();
                  await api.removeDoorDevice({ id: record.id });
                  message.success("移除成功");
                  tableApi.query();
                }}
              >
                <Button type="link" size="small" danger>
                  移除
                </Button>
              </PopConfirm>
            </Space>
          ),
        },
      ],
      fetchApi: async () => {
        const api = await client();
        const result = await api.getDoorDevicePage({
          pageNumber: search.pageNumber,
          pageSize: search.pageSize,
          keyword: search.keyword,
          type: search.type,
          doorArea: search.doorArea,
          applicationCode,
        });
        return normalizeDevicePage(result);
      },
      fetchLoaded: (data) => {
        search.total = data.total;
        selectedIds.value = [];
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入门禁名称或编号搜索" },
        },
        {
          component: "Select",
          fieldName: "type",
          label: "门禁类型",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "请选择门禁类型",
            options: doorTypeOptions,
          },
        },
        {
          component: "Cascader",
          fieldName: "doorArea",
          label: "所属区域",
          defaultValue: [],
          componentProps: {
            allowClear: true,
            changeOnSelect: true,
            placeholder: "请选择所属区域",
            options: areaOptions,
            fieldNames: { label: "label", value: "value", children: "children" },
          },
        },
      ],
      handleSubmit: (values) => {
        search.type = String(values.type || "");
        search.keyword = String(values.keyword || "");
        const area = values.doorArea;
        search.doorArea = Array.isArray(area) ? String(area[area.length - 1] || "") : String(area || "");
        search.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        Object.assign(search, { type: "", keyword: "", doorArea: "", pageNumber: 1 });
        tableApi.query();
      },
    });

    const associateDevices = async (result: AssociationResult): Promise<void> => {
      const api = await client();
      const devices = buildAssociatePayload(result.type, result.list);
      await api.addDoorDevices(devices);
      message.success("关联成功");
      associationModal.value?.close();
      tableApi.query();
    };

    const removeSelected = async (): Promise<void> => {
      if (!selectedIds.value.length) {
        message.warning("请选择设备");
        return;
      }
      const api = await client();
      await api.removeDoorDeviceBatch({ ids: selectedIds.value });
      message.success("批量移除成功");
      tableApi.query();
    };

    onMounted(async () => {
      const api = await client();
      const types = (await api.getDoorType({})) as Array<Record<string, unknown>>;
      doorTypeOptions.splice(0, doorTypeOptions.length, ...mapDoorTypeOptions(types || []));
      try {
        const mdata = await ctx.ensureClient<MdataClient>("mdataClient");
        const areas = await mdata.getAreaList({});
        areaOptions.splice(0, areaOptions.length, ...mapAreaOptions(areas));
      } catch {
        /* 区域可选 */
      }
    });

    const slots = {
      "layout-header": () => (
        <Space>
          <Button type="primary" onClick={() => associationModal.value?.open()}>
            导入设备
          </Button>
          <PopConfirm
            title="删除当前选中？"
            onConfirm={() => {
              void removeSelected();
            }}
          >
            <Button type="primary" danger disabled={!selectedIds.value.length}>
              批量移除
            </Button>
          </PopConfirm>
        </Space>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
          <AssociationModal
            ref={associationModal}
            onSubmit={(result: AssociationResult) => {
              void associateDevices(result);
            }}
          />
          <ControlModal ref={controlModal} onChanged={() => tableApi.query()} />
        </>
      ),
      "footer-page": () => (
        <Page
          current={search.pageNumber}
          pageSize={search.pageSize}
          total={search.total}
          showQuickJumper={false}
          showSizeChanger
          showTotal={(total: number) => `共 ${total} 条`}
          pageSizeOptions={["10", "20", "50", "100"]}
          onPageChange={(pageNumber: number, pageSize: number) => {
            search.pageNumber = pageNumber;
            search.pageSize = pageSize;
            tableApi.query();
          }}
        />
      ),
    };

    return () => <PageLayout title="门禁设备" v-slots={slots} />;
  },
});
