import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  PopConfirm,
  Radio,
  RadioGroup,
  Select,
  Table,
  TreeSelect,
  message,
} from "@g2-platform/pc-ui";
import { defineComponent, ref, watch, type PropType, type VNodeChild } from "vue";

import {
  assetChoice,
  assetEntryTotals,
  assetMoney,
  assetName,
  assetRowIssue,
  assetTableCell,
  normalizeAssetCategories,
  readonlyConsumablesOutRows,
  setPendingAssetRows,
  type AssetCategory,
  type AssetControlClient,
  type AssetRow,
} from "./asset-model";

type ChoiceKind = "AssetSource" | "AssetTypeSelect" | "ScrappingReason" | "WareHouseSelect";
type TableKind = "AddAssetTable" | "ChooseAssetTable" | "ConsumablesEnter";
type CellRenderer = (name: string, value: unknown, onChange: (next: unknown) => void, row: AssetRow) => VNodeChild;

const choiceSettings: Record<
  ChoiceKind,
  { placeholder: string; source: "assetSource" | "assetType" | "reasonForScrapping" | "warehouse"; tree?: boolean }
> = {
  AssetSource: { placeholder: "请选择资产来源", source: "assetSource" },
  AssetTypeSelect: { placeholder: "请选择资产类别", source: "assetType", tree: true },
  ScrappingReason: { placeholder: "请选择", source: "reasonForScrapping" },
  WareHouseSelect: { placeholder: "请选择仓库", source: "warehouse" },
};

function findCategory(rows: AssetCategory[], id: string): AssetCategory | undefined {
  for (const row of rows) {
    if (String(row.id) === id) return row;
    const found = findCategory(row.children ?? [], id);
    if (found) return found;
  }
  return undefined;
}

export const AssetChoiceControl = defineComponent({
  name: "StreamEngineAssetChoiceControl",
  props: {
    kind: { type: String as PropType<ChoiceKind>, required: true },
    value: { type: Object as PropType<AssetCategory | null>, default: null },
    client: { type: Object as PropType<AssetControlClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<AssetCategory[]>([]);
    const loading = ref(false);
    let requestVersion = 0;
    watch(
      () => [props.kind, props.readonly] as const,
      async () => {
        const version = ++requestVersion;
        if (props.readonly) {
          loading.value = false;
          return;
        }
        loading.value = true;
        try {
          const setting = choiceSettings[props.kind];
          const result =
            setting.source === "warehouse"
              ? await props.client.listAssetWarehouses()
              : setting.tree
                ? await props.client.listAssetClassificationTree("assetType")
                : await props.client.listAssetClassifications(setting.source);
          if (version === requestVersion) options.value = normalizeAssetCategories(result);
        } catch (error) {
          if (version === requestVersion) message.error(error instanceof Error ? error.message : "选项加载失败");
        } finally {
          if (version === requestVersion) loading.value = false;
        }
      },
      { immediate: true },
    );

    return () => {
      if (props.readonly) return <span>{assetName(props.value)}</span>;
      const setting = choiceSettings[props.kind];
      const select = (next: unknown): void => {
        if (next == null || next === "") {
          emit("update:value", null);
          return;
        }
        const found = findCategory(options.value, String(next));
        emit(
          "update:value",
          found ? (setting.tree ? { id: found.id, name: found.name } : found) : { id: String(next), name: String(next) },
        );
      };
      return setting.tree ? (
        <TreeSelect
          value={props.value?.id}
          treeData={options.value}
          fieldNames={{ label: "name", value: "id", children: "children" }}
          loading={loading.value}
          allowClear
          treeDefaultExpandAll
          placeholder={setting.placeholder}
          style={{ width: "100%" }}
          onUpdate:value={select}
        />
      ) : (
        <Select
          value={props.value?.id}
          options={options.value.map((option) => ({ label: option.name, value: option.id }))}
          loading={loading.value}
          allowClear
          placeholder={setting.placeholder}
          style={{ width: "100%" }}
          onUpdate:value={select}
        />
      );
    };
  },
});

export const AssetExpiredControl = defineComponent({
  name: "StreamEngineAssetExpiredControl",
  props: {
    value: { type: Boolean as PropType<boolean | null>, default: null },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    return () =>
      props.readonly ? (
        <span>{props.value === true ? "是" : props.value === false ? "否" : "--"}</span>
      ) : (
        <RadioGroup value={props.value} onUpdate:value={(next: boolean) => emit("update:value", next)}>
          <Radio value={true}>是</Radio>
          <Radio value={false}>否</Radio>
        </RadioGroup>
      );
  },
});

const assetColumns: Array<[string, string]> = [
  ["资产编码", "serialNumber"],
  ["财务编码", "financeNumber"],
  ["资产名称", "name"],
  ["资产类别", "typeName"],
  ["管理员", "adminName"],
  ["购入日期", "purchaseDate"],
  ["原值", "price"],
  ["规格型号", "norms"],
  ["计量单位", "unit"],
  ["数量", "number"],
];
const entryColumns: Array<[string, string]> = [
  ["耗材编码", "code"],
  ["耗材名称", "name"],
  ["规格型号", "model"],
  ["品牌", "brand"],
  ["耗材分类", "categoryName"],
  ["单位", "unit"],
  ["质保期限(月)", "qualityPeriod"],
  ["限领数量", "useLimit"],
  ["库存量", "stock"],
];

const AssetPicker = defineComponent({
  name: "StreamEngineAssetPicker",
  props: {
    open: { type: Boolean, required: true },
    kind: { type: String as PropType<"asset" | "consumable">, required: true },
    client: { type: Object as PropType<AssetControlClient>, required: true },
    value: { type: Array as PropType<AssetRow[]>, default: () => [] },
    businessType: { type: String, default: "" },
    receiveDepId: { type: String, default: "" },
  },
  emits: ["close", "select"],
  setup(props, { emit }) {
    const page = ref(1);
    const total = ref(0);
    const rows = ref<AssetRow[]>([]);
    const selected = ref<AssetRow[]>([]);
    const categories = ref<AssetCategory[]>([]);
    const categoryId = ref<string>();
    const keyword = ref("");
    const loading = ref(false);
    let requestVersion = 0;
    let categoryVersion = 0;
    const load = async (): Promise<void> => {
      const version = ++requestVersion;
      loading.value = true;
      try {
        const params = {
          pageNumber: page.value,
          pageSize: 10,
          typeId: props.kind === "asset" ? categoryId.value : undefined,
          categoryId: props.kind === "consumable" ? categoryId.value : undefined,
          keyword: keyword.value || undefined,
          businessType: props.kind === "asset" ? props.businessType || undefined : undefined,
          receiveDepId: props.kind === "asset" ? props.receiveDepId || undefined : undefined,
        };
        const result = props.kind === "asset" ? await props.client.pageAssets(params) : await props.client.pageConsumables(params);
        if (version !== requestVersion) return;
        rows.value = result.records;
        total.value = result.total;
      } catch (error) {
        if (version === requestVersion) message.error(error instanceof Error ? error.message : "列表加载失败");
      } finally {
        if (version === requestVersion) loading.value = false;
      }
    };
    watch(
      () => props.open,
      (open) => {
        if (!open) {
          requestVersion++;
          categoryVersion++;
          loading.value = false;
          return;
        }
        selected.value = [...props.value];
        page.value = 1;
        keyword.value = "";
        categoryId.value = undefined;
        void load();
        const version = ++categoryVersion;
        void (props.kind === "asset" ? props.client.listAssetClassifications("assetType") : props.client.listConsumableCategories())
          .then((result) => {
            if (props.open && version === categoryVersion) categories.value = normalizeAssetCategories(result);
          })
          .catch((error: unknown) => {
            if (props.open && version === categoryVersion) message.error(error instanceof Error ? error.message : "分类加载失败");
          });
      },
    );
    const choose = (): void => {
      if (!selected.value.length) {
        message.warning(`请选择${props.kind === "asset" ? "资产" : "耗材"}`);
        return;
      }
      emit("select", selected.value);
    };
    const pickerColumns = [
      { title: "序号", key: "index", width: 70, customRender: ({ index }: { index: number }) => (page.value - 1) * 10 + index + 1 },
      ...(props.kind === "asset" ? assetColumns : entryColumns).map(([title, key]) => ({
        title,
        dataIndex: key,
        key,
        width: 150,
        ellipsis: true,
        customRender: ({ text }: { text: unknown }) => (key === "purchaseDate" ? assetTableCell(text).slice(0, 10) : assetTableCell(text)),
      })),
    ];
    if (props.kind === "asset")
      pickerColumns.splice(4, 0, {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 100,
        ellipsis: true,
        customRender: ({ text }: { text: unknown }) =>
          ({ LEAVE_UNUSED: "闲置", MAKE_USE_OF: "在用", WEED_OUT: "报废" })[String(text) as "LEAVE_UNUSED"] ?? "--",
      });

    return () => (
      <Form.ItemRest>
        <Modal
          open={props.open}
          width={1200}
          title={`${props.kind === "asset" ? "资产" : "耗材"}列表`}
          okText="确定"
          cancelText="取消"
          onOk={choose}
          onCancel={() => emit("close")}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            {props.kind === "asset" ? (
              <Select
                value={categoryId.value}
                options={categories.value.map((item) => ({ label: item.name, value: item.id }))}
                allowClear
                placeholder="资产类别"
                style={{ width: "218px" }}
                onUpdate:value={(next) => {
                  categoryId.value = next == null ? undefined : String(next);
                }}
              />
            ) : (
              <TreeSelect
                value={categoryId.value}
                treeData={categories.value}
                fieldNames={{ label: "name", value: "id", children: "children" }}
                allowClear
                placeholder="耗材类别"
                style={{ width: "218px" }}
                onUpdate:value={(next) => {
                  categoryId.value = next == null ? undefined : String(next);
                }}
              />
            )}
            <Input
              value={keyword.value}
              placeholder={props.kind === "asset" ? "资产编码、资产名称" : "耗材编码、耗材名称"}
              style={{ width: "218px" }}
              onUpdate:value={(next: string) => {
                keyword.value = next;
              }}
              onPressEnter={() => {
                page.value = 1;
                void load();
              }}
            />
            <Button
              type="primary"
              onClick={() => {
                page.value = 1;
                void load();
              }}
            >
              查询
            </Button>
            <Button
              onClick={() => {
                categoryId.value = undefined;
                keyword.value = "";
                page.value = 1;
                void load();
              }}
            >
              重置
            </Button>
          </div>
          <Table
            rowKey="id"
            dataSource={rows.value}
            loading={loading.value}
            size="small"
            columns={pickerColumns}
            rowSelection={{
              type: "checkbox",
              preserveSelectedRowKeys: true,
              selectedRowKeys: selected.value.map((entry) => String(entry.id)),
              onChange: (keys: Array<string | number>, pageRows: AssetRow[]) => {
                const retained = selected.value.filter((entry) => keys.some((key) => String(key) === String(entry.id)));
                const seen = new Set(retained.map((entry) => String(entry.id)));
                selected.value = [...retained, ...pageRows.filter((entry) => !seen.has(String(entry.id)))];
              },
            }}
            pagination={{
              current: page.value,
              pageSize: 10,
              total: total.value,
              onChange: (next: number) => {
                page.value = next;
                void load();
              },
            }}
            scroll={{ x: props.kind === "asset" ? 1750 : 1450, y: 450 }}
          />
        </Modal>
      </Form.ItemRest>
    );
  },
});

const addColumns: Array<[string, string, boolean]> = [
  ["资产编码", "serialNumber", true],
  ["财务编码", "financeNumber", true],
  ["资产名称", "name", true],
  ["资产类别", "type", true],
  ["购入日期", "purchaseDate", true],
  ["维保期限（月）", "maintenanceTime", true],
  ["使用期限（月）", "usageTime", true],
  ["规格型号", "norms", false],
  ["计量单位", "unit", false],
  ["数量", "number", true],
  ["原值", "price", false],
  ["管理员", "adminId", false],
  ["区域", "areaIds", false],
];

export const AssetTableControl = defineComponent({
  name: "StreamEngineAssetTableControl",
  props: {
    kind: { type: String as PropType<TableKind>, required: true },
    value: { type: Array as PropType<AssetRow[]>, default: () => [] },
    client: { type: Object as PropType<AssetControlClient>, required: true },
    readonly: { type: Boolean, default: false },
    businessType: { type: String, default: "" },
    receiveDepId: { type: String, default: "" },
    renderCell: { type: Function as PropType<CellRenderer>, default: undefined },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const pickerOpen = ref(false);
    const editing = ref<string[]>([]);
    const saving = ref<string>();
    const keyOf = (row: AssetRow, index: number) => String(row.key ?? row.id ?? index);
    const emitRows = (rows: AssetRow[]): void => {
      if (props.kind === "AddAssetTable") setPendingAssetRows(rows, editing.value);
      emit("update:value", rows);
    };
    const updateRow = (row: AssetRow, key: string, next: unknown): void => {
      emitRows(
        props.value.map((entry) =>
          entry === row
            ? {
                ...entry,
                [key]: next,
                ...(props.kind === "ConsumablesEnter" && ["num", "price"].includes(key)
                  ? {
                      storeAmount: Number(
                        (Number(key === "num" ? next : (entry.num ?? 0)) * Number(key === "price" ? next : (entry.price ?? 0))).toFixed(2),
                      ),
                    }
                  : {}),
              }
            : entry,
        ),
      );
    };
    const addRow = (): void => {
      const key = crypto.randomUUID();
      editing.value = [...editing.value, key];
      emitRows([...props.value, { key, name: "", purchaseDate: "", typeName: "", flowConvertData: false }]);
    };
    const removeRow = (row: AssetRow): void => {
      const key = keyOf(row, props.value.indexOf(row));
      editing.value = editing.value.filter((entry) => entry !== key);
      emitRows(props.value.filter((entry) => entry !== row));
    };
    const saveRow = async (row: AssetRow, index: number): Promise<void> => {
      const key = keyOf(row, index);
      if (saving.value) return;
      const issue = assetRowIssue(props.kind === "AddAssetTable" ? "AddAssetTable" : "ConsumablesEnter", [row], true);
      if (issue) {
        message.error(issue.replace("第1行", `第${index + 1}行`));
        return;
      }
      if (props.kind === "AddAssetTable") {
        const serial = String(row.serialNumber ?? "");
        if (props.value.some((entry, position) => position !== index && entry.serialNumber === serial)) {
          message.error(`第${index + 1}行数据，资产编码重复`);
          return;
        }
        saving.value = key;
        try {
          const duplicates = await props.client.checkAssetCodes({
            checkSerialNumberList: [{ key: row.id == null ? null : String(row.id), value: serial }],
          });
          if (duplicates.includes(serial)) {
            message.error(`第${index + 1}行资产编码 ${serial} 已存在`);
            return;
          }
          if (props.value.find((entry, position) => keyOf(entry, position) === key)?.serialNumber !== serial) return;
        } catch (error) {
          message.error(error instanceof Error ? error.message : `第${index + 1}行校验资产编码时发生错误`);
          return;
        } finally {
          saving.value = undefined;
        }
      }
      editing.value = editing.value.filter((entry) => entry !== key);
      if (props.kind === "AddAssetTable") setPendingAssetRows(props.value, editing.value);
    };
    const applySelection = (selection: AssetRow[]): void => {
      if (props.kind === "ChooseAssetTable") {
        emitRows(selection);
      } else {
        const existing = new Set(props.value.map((row) => String(row.id)));
        const added: AssetRow[] = selection
          .filter((row) => !existing.has(String(row.id)))
          .map((row): AssetRow => ({ ...row, flowConvertData: false, price: 0, num: 1, storeAmount: 0 }));
        editing.value = [...editing.value, ...added.map((row) => String(row.id))];
        emitRows([...props.value, ...added]);
      }
      pickerOpen.value = false;
    };
    const cell = (name: string, row: AssetRow, key: string): VNodeChild =>
      props.renderCell?.(name, row[key], (next) => updateRow(row, key, next), row) ?? assetTableCell(row[key]);
    const editColumn = ([title, key, required]: [string, string, boolean]) => ({
      title: required ? <span style={{ color: "#cf1322" }}>{title}</span> : title,
      dataIndex: key,
      key,
      width: 200,
      align: "center" as const,
      customRender: ({ record, index }: { record: AssetRow; index: number }) => {
        if (!editing.value.includes(keyOf(record, index)) || props.readonly)
          return key === "purchaseDate" ? assetTableCell(record[key]).slice(0, 10) : assetTableCell(record[key]);
        if (key === "type") return cell("AssetTypeSelect", record, key);
        if (key === "adminId") return cell("UserPicker", record, key);
        if (key === "areaIds") return cell("AreaList", record, key);
        if (key === "purchaseDate")
          return (
            <DatePicker
              value={record[key] as never}
              valueFormat="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="请选择购入日期"
              style={{ width: "100%" }}
              onUpdate:value={(next) => updateRow(record, key, next)}
            />
          );
        if (["maintenanceTime", "usageTime", "number", "price"].includes(key))
          return (
            <InputNumber
              value={record[key] == null ? undefined : Number(record[key])}
              min={0}
              precision={key === "price" ? 2 : 0}
              placeholder={`请输入${title}`}
              style={{ width: "100%" }}
              onUpdate:value={(next) => updateRow(record, key, next)}
            />
          );
        return (
          <Input
            value={String(record[key] ?? "")}
            maxlength={key === "name" ? 20 : key === "serialNumber" || key === "financeNumber" ? 200 : undefined}
            placeholder={`请输入${title}`}
            onUpdate:value={(next: string) => updateRow(record, key, key === "name" ? next.replace(/[^\w\u4E00-\u9FA5]/g, "") : next)}
          />
        );
      },
    });
    const entryColumn = ([title, key]: [string, string]) => ({
      title,
      dataIndex: key,
      key,
      width: 150,
      align: "center" as const,
      customRender: ({ text }: { text: unknown }) => assetTableCell(text),
    });
    const imageColumn = {
      title: "图片",
      dataIndex: "file",
      key: "file",
      width: 120,
      customRender: ({ text }: { text: unknown }) => {
        const file = Array.isArray(text) ? (text[0] as AssetRow | undefined) : undefined;
        const url = String(file?.path ?? "");
        return url ? <img src={url} alt="耗材图片" style={{ maxWidth: "100px", maxHeight: "100px" }} /> : "暂无图片";
      },
    };
    return () => {
      const isAdded = props.kind === "AddAssetTable";
      const isEntry = props.kind === "ConsumablesEnter";
      const title = isAdded ? "添加资产" : isEntry ? "耗材明细" : "选择资产";
      const totals = assetEntryTotals(props.value);
      const columns = [
        { title: "序号", key: "index", width: 90, align: "center" as const, customRender: ({ index }: { index: number }) => index + 1 },
        ...(isAdded
          ? addColumns.map(editColumn)
          : isEntry
            ? [
                entryColumn(entryColumns[1]!),
                entryColumn(entryColumns[0]!),
                imageColumn,
                ...entryColumns.slice(2, 6).map(entryColumn),
                entryColumn(["库存量", "stock"]),
              ]
            : assetColumns.map(entryColumn)),
        ...(isEntry
          ? [
              {
                title: <span style={{ color: "#cf1322" }}>数量</span>,
                key: "num",
                width: 150,
                customRender: ({ record, index }: { record: AssetRow; index: number }) =>
                  props.readonly || !editing.value.includes(keyOf(record, index)) ? (
                    assetTableCell(record.num)
                  ) : (
                    <InputNumber
                      value={Number(record.num ?? 1)}
                      min={1}
                      precision={0}
                      style={{ width: "100%" }}
                      onUpdate:value={(next) => updateRow(record, "num", next)}
                    />
                  ),
              },
              {
                title: <span style={{ color: "#cf1322" }}>单价</span>,
                key: "price",
                width: 150,
                customRender: ({ record, index }: { record: AssetRow; index: number }) =>
                  props.readonly || !editing.value.includes(keyOf(record, index)) ? (
                    assetMoney(record.price)
                  ) : (
                    <InputNumber
                      value={Number(record.price ?? 0)}
                      min={0}
                      precision={2}
                      style={{ width: "100%" }}
                      onUpdate:value={(next) => updateRow(record, "price", next)}
                    />
                  ),
              },
              {
                title: "金额",
                key: "storeAmount",
                width: 150,
                customRender: ({ record }: { record: AssetRow }) => assetMoney(record.storeAmount),
              },
            ]
          : []),
        ...(!props.readonly
          ? [
              {
                title: "操作",
                key: "operation",
                fixed: "right" as const,
                width: 145,
                customRender: ({ record, index }: { record: AssetRow; index: number }) => (
                  <div style={{ display: "flex", gap: "2px" }}>
                    {props.kind !== "ChooseAssetTable" ? (
                      <Button
                        type="link"
                        loading={saving.value === keyOf(record, index)}
                        disabled={Boolean(saving.value) && saving.value !== keyOf(record, index)}
                        onClick={() => {
                          if (editing.value.includes(keyOf(record, index))) {
                            void saveRow(record, index);
                            return;
                          }
                          editing.value = [...editing.value, keyOf(record, index)];
                          if (props.kind === "AddAssetTable") setPendingAssetRows(props.value, editing.value);
                        }}
                      >
                        {editing.value.includes(keyOf(record, index)) ? "保存" : "编辑"}
                      </Button>
                    ) : null}
                    <PopConfirm
                      title={`确认删除${isEntry ? "耗材" : "资产"}？`}
                      okText="确定"
                      cancelText="取消"
                      onConfirm={() => removeRow(record)}
                    >
                      <Button type="link" danger>
                        删除
                      </Button>
                    </PopConfirm>
                  </div>
                ),
              },
            ]
          : []),
      ];
      return (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap", marginBottom: "10px" }}>
            <strong>{title}</strong>
            {isEntry ? (
              <>
                <span>总量：{totals.count}</span>
                <span>金额：{totals.amount}</span>
              </>
            ) : null}
            {!props.readonly ? (
              <Button
                type="primary"
                shape="round"
                onClick={
                  isAdded
                    ? addRow
                    : () => {
                        pickerOpen.value = true;
                      }
                }
              >
                {isAdded ? "添加资产" : isEntry ? "选择耗材" : "选择资产"}
              </Button>
            ) : null}
          </div>
          <Table
            rowKey={(row: AssetRow) => String(row.key ?? row.id)}
            dataSource={props.value}
            columns={columns}
            pagination={false}
            size="small"
            scroll={{ x: isAdded ? 2850 : isEntry ? 1650 : 1450 }}
          />
          {!isAdded ? (
            <AssetPicker
              open={pickerOpen.value}
              kind={isEntry ? "consumable" : "asset"}
              client={props.client}
              value={props.value}
              businessType={props.businessType}
              receiveDepId={props.receiveDepId}
              onClose={() => {
                pickerOpen.value = false;
              }}
              onSelect={applySelection}
            />
          ) : null}
        </div>
      );
    };
  },
});

export const ConsumablesOutReadonlyControl = defineComponent({
  name: "StreamEngineConsumablesOutReadonlyControl",
  props: {
    value: { type: Array as PropType<AssetRow[]>, default: () => [] },
  },
  setup(props) {
    const image = ({ text }: { text: unknown }) => {
      const file = Array.isArray(text) ? (text[0] as AssetRow | undefined) : undefined;
      const path = String(file?.path ?? "");
      return path ? <img src={path} alt="耗材图片" style={{ maxWidth: "100px", maxHeight: "100px" }} /> : "暂无图片";
    };
    const columns = [
      { title: "序号", key: "index", width: 80, customRender: ({ index }: { index: number }) => index + 1 },
      { title: "图片", dataIndex: "file", key: "file", width: 120, customRender: image },
      ...(["耗材名称", "耗材编码", "规格型号", "品牌", "耗材分类", "单位", "单价", "库存量", "限领数量", "出库数量", "金额"] as const).map(
        (title, index) => {
          const key = ["name", "code", "model", "brand", "categoryName", "unit", "avgPrice", "storeNum", "useLimit", "num", "storeAmount"][
            index
          ]!;
          return {
            title,
            dataIndex: key,
            key,
            width: 145,
            customRender: ({ text }: { text: unknown }) => (key === "storeAmount" ? assetMoney(text) : assetTableCell(text)),
          };
        },
      ),
    ];
    return () => {
      const rows = readonlyConsumablesOutRows(props.value);
      const totals = assetEntryTotals(rows);
      return (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "10px" }}>
            <strong>耗材领用</strong>
            <span>总量：{totals.count}</span>
            <span>金额：{totals.amount}</span>
          </div>
          <Table
            rowKey={(row: AssetRow) => String(row.id ?? row.code)}
            dataSource={rows}
            columns={columns}
            pagination={false}
            size="small"
            scroll={{ x: 1850 }}
          />
        </div>
      );
    };
  },
});

export function assetControlValue(value: unknown): AssetCategory | null {
  return assetChoice(value);
}
