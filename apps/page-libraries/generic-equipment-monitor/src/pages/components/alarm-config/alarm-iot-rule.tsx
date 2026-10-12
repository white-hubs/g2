import type { DeviceCenterClient } from "@g2-client/device-center/client";
import { Button, Cascader, FormItem, Input, Modal, Pagination, Select, Space, Table } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";

import { normalizeAlarmPage } from "../../normalize-page";
import {
  EXECUTE_MODE_OPTIONS,
  flattenIotDeviceInstances,
  mapAreaCascaderOptions,
  parseWritableIotProps,
  unwrapApiList,
  type AreaCascaderOption,
} from "./alarm-config.model";
import type { AlarmIotType } from "./types";

type IotDeviceRow = Record<string, unknown> & {
  id?: string;
  code?: string;
  name?: string;
  brandName?: string;
  pathName?: string;
  productInfo?: Record<string, unknown>;
  productCategory?: Record<string, unknown>;
};

function asTreeOptions(raw: unknown): Record<string, unknown>[] {
  return unwrapApiList(raw).map((item) => {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const children = Array.isArray(row.children) ? asTreeOptions(row.children) : undefined;
    return {
      ...row,
      categoryName: row.categoryName ?? row.name ?? row.label,
      categoryCode: row.categoryCode ?? row.code ?? row.value,
      children,
    };
  });
}

export default defineComponent({
  name: "GemAlarmIotRule",
  props: {
    value: { type: Object as PropType<AlarmIotType>, required: true },
    readonly: { type: Boolean, default: false },
    applicationCode: { type: String, default: "" },
    getDeviceClient: { type: Function as PropType<() => Promise<DeviceCenterClient>>, default: undefined },
  },
  emits: {
    "update:value": (_v: AlarmIotType) => true,
    delete: () => true,
  },
  setup(props, { emit }) {
    const local = ref<AlarmIotType>({ ...props.value });
    const categoryTree = ref<Record<string, unknown>[]>([]);
    const productOptions = ref<{ label: string; value: string }[]>([]);
    const propOptions = ref<{ label: string; value: string; propName: string }[]>([]);
    const areaOptions = ref<AreaCascaderOption[]>([]);
    const tagOptions = ref<{ label: string; value: string }[]>([]);
    const deviceModalOpen = ref(false);
    const deviceLoading = ref(false);
    const deviceRows = ref<IotDeviceRow[]>([]);
    const deviceSelectedKey = ref<string>("");
    const deviceSelectedRow = ref<IotDeviceRow | null>(null);
    const deviceQuery = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      categoryCode: "",
      productId: "",
      lastAreaId: undefined as string | undefined,
      keyword: "",
      tagCodes: [] as string[],
    });

    watch(
      () => props.value,
      (v) => {
        local.value = { ...v };
      },
      { deep: true },
    );

    const patch = (partial: Partial<AlarmIotType>): void => {
      local.value = { ...local.value, ...partial };
      emit("update:value", { ...local.value });
    };

    async function loadCategoryTree(): Promise<void> {
      if (!props.getDeviceClient) return;
      try {
        const client = await props.getDeviceClient();
        categoryTree.value = asTreeOptions(await client.getIotProductCategoryTree());
      } catch {
        categoryTree.value = [];
      }
    }

    async function loadAreaOptions(): Promise<void> {
      const code = props.applicationCode.trim();
      if (!code || !props.getDeviceClient) return;
      try {
        const client = await props.getDeviceClient();
        areaOptions.value = mapAreaCascaderOptions(await client.getAreaTree(code));
      } catch {
        areaOptions.value = [];
      }
    }

    async function loadTagOptions(): Promise<void> {
      if (!props.getDeviceClient) return;
      try {
        const client = await props.getDeviceClient();
        const tagsRaw = await client.getCustomerTagListAll({ status: 1 });
        const tagPage = normalizeAlarmPage(tagsRaw);
        const tagList = tagPage.records.length ? tagPage.records : Array.isArray(tagsRaw) ? (tagsRaw as unknown[]) : [];
        tagOptions.value = tagList
          .map((item) => {
            const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
            const value = String(row.tagCode ?? row.code ?? row.id ?? "");
            const label = String(row.tagName ?? row.name ?? value);
            return value ? { label, value } : null;
          })
          .filter((x): x is { label: string; value: string } => !!x);
      } catch {
        tagOptions.value = [];
      }
    }

    async function loadProducts(categoryPath: string): Promise<void> {
      if (!props.getDeviceClient || !categoryPath) {
        productOptions.value = [];
        return;
      }
      const leaf = categoryPath.split("-").filter(Boolean).pop() || categoryPath;
      try {
        const client = await props.getDeviceClient();
        productOptions.value = unwrapApiList(await client.getProductModelByCategory(leaf))
          .map((item) => {
            const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
            const value = String(row.id ?? row.productId ?? "");
            const label = String(row.name ?? row.productName ?? value);
            return value ? { label, value } : null;
          })
          .filter((x): x is { label: string; value: string } => !!x);
      } catch {
        productOptions.value = [];
      }
    }

    async function loadProps(prodId: string | null): Promise<void> {
      if (!props.getDeviceClient || !prodId) {
        propOptions.value = [];
        return;
      }
      try {
        const client = await props.getDeviceClient();
        propOptions.value = parseWritableIotProps(await client.getDeviceCondition({ prodIds: prodId, withPropertySpec: true }));
      } catch {
        propOptions.value = [];
      }
    }

    onMounted(() => {
      void loadCategoryTree();
      void loadAreaOptions();
      void loadTagOptions();
      if (local.value.deviceProdCategoryCode) {
        void loadProducts(local.value.deviceProdCategoryCode);
      }
      if (local.value.deviceProdId) {
        void loadProps(local.value.deviceProdId);
      }
    });

    async function loadDeviceRows(): Promise<void> {
      if (!props.getDeviceClient) {
        deviceRows.value = [];
        return;
      }
      deviceLoading.value = true;
      try {
        const client = await props.getDeviceClient();
        const code = props.applicationCode.trim();
        const filterTagCodes = [...(code ? [`builtin.app::${code}`] : []), ...deviceQuery.tagCodes];
        const page = normalizeAlarmPage(
          await client.getIotDeviceList({
            pageNumber: deviceQuery.pageNumber,
            pageSize: deviceQuery.pageSize,
            categoryCode: deviceQuery.categoryCode || undefined,
            productId: deviceQuery.productId || undefined,
            anyMatchedAreaId: deviceQuery.lastAreaId || undefined,
            keyword: deviceQuery.keyword || undefined,
            tagCodes: deviceQuery.tagCodes.length ? deviceQuery.tagCodes : undefined,
            ...(code ? { applicationCode: code } : {}),
            ...(filterTagCodes.length ? { filterTagCodes } : {}),
          }),
        );
        deviceQuery.total = page.total;
        deviceRows.value = flattenIotDeviceInstances(page.records) as IotDeviceRow[];
      } catch {
        deviceRows.value = [];
      } finally {
        deviceLoading.value = false;
      }
    }

    const openDeviceModal = (): void => {
      deviceQuery.pageNumber = 1;
      deviceQuery.keyword = "";
      deviceQuery.lastAreaId = undefined;
      deviceQuery.tagCodes = [];
      deviceQuery.categoryCode = local.value.deviceProdCategoryCode || "";
      deviceQuery.productId = local.value.deviceProdId || "";
      deviceSelectedKey.value = local.value.id || "";
      deviceSelectedRow.value = null;
      deviceModalOpen.value = true;
      void loadDeviceRows();
    };

    const confirmDeviceModal = (): void => {
      const row = deviceSelectedRow.value;
      if (row) {
        const productInfo = (row.productInfo && typeof row.productInfo === "object" ? row.productInfo : row) as Record<string, unknown>;
        const productCategory = (row.productCategory && typeof row.productCategory === "object" ? row.productCategory : {}) as Record<
          string,
          unknown
        >;
        const prodId = String(productInfo.id ?? row.productId ?? local.value.deviceProdId ?? "");
        patch({
          deviceProdCategoryCode: String(productCategory.pathCode ?? local.value.deviceProdCategoryCode ?? ""),
          deviceProdId: prodId || null,
          code: String(row.code ?? ""),
          name: String(row.name ?? ""),
          id: String(row.id ?? deviceSelectedKey.value),
          modelId: prodId || null,
        });
        void loadProps(prodId || null);
      }
      deviceModalOpen.value = false;
    };

    const categoryValue = (): string[] =>
      local.value.deviceProdCategoryCode ? local.value.deviceProdCategoryCode.split("-").filter(Boolean) : [];

    return () => (
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <Space wrap align="start">
          <FormItem>
            <Cascader
              disabled={props.readonly}
              style={{ width: 200 }}
              value={categoryValue()}
              options={categoryTree.value}
              fieldNames={{ label: "categoryName", value: "categoryCode", children: "children" }}
              changeOnSelect
              placeholder="请选择产品品类"
              onUpdate:value={(v: string[]) => {
                const path = v?.length ? v.join("-") : "";
                patch({
                  deviceProdCategoryCode: path,
                  deviceProdId: null,
                  propCode: null,
                  propName: "",
                });
                deviceQuery.categoryCode = path;
                void loadProducts(path);
                propOptions.value = [];
              }}
            />
          </FormItem>
          <FormItem>
            <Select
              disabled={props.readonly}
              style={{ width: 200 }}
              value={local.value.deviceProdId ?? undefined}
              options={productOptions.value}
              placeholder="请选择设备产品"
              onUpdate:value={(v: string) => {
                patch({ deviceProdId: v || null, modelId: v || null, propCode: null, propName: "" });
                deviceQuery.productId = v || "";
                void loadProps(v || null);
              }}
            />
          </FormItem>
          <FormItem>
            <Space>
              <Input
                disabled={props.readonly}
                style={{ width: 160 }}
                value={local.value.name}
                placeholder="请选择设备"
                onUpdate:value={(v: string) => patch({ name: v })}
              />
              <Button disabled={props.readonly} type="primary" onClick={() => openDeviceModal()}>
                选择
              </Button>
            </Space>
          </FormItem>
          <FormItem>
            <Select
              disabled={props.readonly}
              style={{ width: 200 }}
              value={local.value.propCode ?? undefined}
              options={propOptions.value}
              placeholder="请选择设备指令"
              onUpdate:value={(v: string) => {
                const picked = propOptions.value.find((opt) => opt.value === v);
                patch({ propCode: v || null, propName: picked?.propName || "" });
              }}
            />
          </FormItem>
          <FormItem>
            <Input
              disabled={props.readonly}
              style={{ width: 200 }}
              value={local.value.propValue}
              placeholder="属性设定具体数值"
              onUpdate:value={(v: string) => patch({ propValue: v })}
            />
          </FormItem>
          <FormItem>
            <Select
              disabled={props.readonly}
              style={{ width: 200 }}
              value={local.value.executeMode}
              options={[...EXECUTE_MODE_OPTIONS]}
              onUpdate:value={(v: string) => patch({ executeMode: v })}
            />
          </FormItem>
        </Space>
        {!props.readonly ? (
          <Button type="link" danger onClick={() => emit("delete")}>
            删除
          </Button>
        ) : null}
        <Modal
          open={deviceModalOpen.value}
          title="选择设备"
          width={900}
          maskClosable
          onCancel={() => {
            deviceModalOpen.value = false;
            deviceQuery.tagCodes = [];
          }}
          onOk={confirmDeviceModal}
        >
          <Space wrap style={{ marginBottom: 16 }}>
            <FormItem label="区域">
              <Select
                style={{ width: 200 }}
                placeholder="请选择区域"
                allowClear
                options={areaOptions.value.map((a) => ({ label: a.name, value: a.id }))}
                value={deviceQuery.lastAreaId}
                onUpdate:value={(v: string) => {
                  deviceQuery.lastAreaId = v;
                }}
              />
            </FormItem>
            <FormItem label="设备标签">
              <Select
                style={{ width: 200 }}
                placeholder="请选择设备标签"
                mode="multiple"
                maxTagCount={1}
                allowClear
                options={tagOptions.value}
                value={deviceQuery.tagCodes}
                onUpdate:value={(v: string[]) => {
                  deviceQuery.tagCodes = v ?? [];
                }}
              />
            </FormItem>
            <FormItem>
              <Input
                style={{ width: 200 }}
                placeholder="输入搜索内容"
                value={deviceQuery.keyword}
                onUpdate:value={(v: string) => {
                  deviceQuery.keyword = v;
                }}
              />
            </FormItem>
            <FormItem>
              <Button type="primary" loading={deviceLoading.value} onClick={() => void loadDeviceRows()}>
                查询
              </Button>
              <Button
                style={{ marginLeft: 20 }}
                onClick={() => {
                  deviceQuery.pageNumber = 1;
                  deviceQuery.keyword = "";
                  deviceQuery.lastAreaId = undefined;
                  deviceQuery.tagCodes = [];
                  void loadDeviceRows();
                }}
              >
                重置
              </Button>
            </FormItem>
          </Space>
          <Table
            pagination={false}
            loading={deviceLoading.value}
            rowKey="id"
            dataSource={deviceRows.value}
            columns={[
              { title: "设备编码", dataIndex: "code" },
              { title: "设备名称", dataIndex: "name" },
              { title: "设备品牌", dataIndex: "brandName" },
              { title: "区域", dataIndex: "pathName" },
            ]}
            rowSelection={{
              type: "radio",
              selectedRowKeys: deviceSelectedKey.value ? [deviceSelectedKey.value] : [],
              onChange: (keys: (string | number)[], rows: IotDeviceRow[]) => {
                deviceSelectedKey.value = keys.length ? String(keys[0]) : "";
                deviceSelectedRow.value = rows[0] ?? null;
              },
            }}
          />
          <div style={{ display: "flex", flexDirection: "row-reverse", marginTop: 16 }}>
            <Pagination
              current={deviceQuery.pageNumber}
              pageSize={deviceQuery.pageSize}
              total={deviceQuery.total}
              showSizeChanger
              showTotal={(total: number) => `共${total}条数据`}
              onChange={(page: number, pageSize: number) => {
                deviceQuery.pageNumber = page;
                deviceQuery.pageSize = pageSize;
                void loadDeviceRows();
              }}
            />
          </div>
        </Modal>
      </div>
    );
  },
});
