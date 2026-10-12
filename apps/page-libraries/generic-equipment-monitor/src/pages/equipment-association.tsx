import type { EquipmentAssociationRuleField } from "@g2-client/device-center/client";
import { Button, Page, PageLayout, PopOver, Select, Space, message, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, type PropType } from "vue";

import { normalizeAlarmPage } from "./normalize-page";
import type { GemPageProps } from "./page-props";

import styles from "./equipment-association.module.css";

interface RuleEditor extends EquipmentAssociationRuleField {
  key: number;
}

interface DeviceRow {
  id?: string;
  code?: string;
  name?: string;
  productInfo?: {
    name?: string;
    brandName?: string;
    productCategory?: { name?: string };
  };
  area?: { name?: string; pathName?: string };
}

interface SelectOption {
  label: string;
  value: string;
}

const fieldOptions = [
  { label: "产品", value: "PRODUCT" },
  { label: "区域", value: "AREA" },
  { label: "设备", value: "EQUIPMENT" },
];

const operatorOptions = [
  { label: "包含", value: "IN" },
  { label: "不包含", value: "NOT_IN" },
];

function textCell(value: unknown) {
  const text = String(value || "--");
  return <PopOver content={text}>{text}</PopOver>;
}

function unwrapList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const list = data.list ?? data.records ?? data.content ?? data.rows ?? data.children;
  return Array.isArray(list) ? list.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
}

function toOptions(rows: Record<string, unknown>[], valueKeys: string[], labelKeys: string[]): SelectOption[] {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const value = valueKeys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== "");
    if (value === undefined || value === null || value === "") return [];
    const key = String(value);
    if (seen.has(key)) return [];
    seen.add(key);
    const label = labelKeys.map((field) => row[field]).find((item) => item !== undefined && item !== null && item !== "");
    return [{ value: key, label: String(label ?? key) }];
  });
}

function flattenAreaOptions(rows: Record<string, unknown>[]): SelectOption[] {
  const result: SelectOption[] = [];
  const visit = (nodes: Record<string, unknown>[], parents: string[]): void => {
    nodes.forEach((node) => {
      const value = String(node.id ?? node.code ?? node.value ?? "");
      const name = String(node.aliasName ?? node.name ?? node.label ?? value);
      if (value) result.push({ value, label: [...parents, name].join(" / ") });
      if (Array.isArray(node.children)) visit(unwrapList({ children: node.children }), [...parents, name]);
    });
  };
  visit(rows, []);
  return result;
}

function parseRules(raw: unknown): EquipmentAssociationRuleField[][] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  let ruleSource: unknown;
  try {
    ruleSource = typeof data.rule === "string" ? JSON.parse(data.rule) : data.rule;
  } catch {
    return [];
  }
  if (!ruleSource || typeof ruleSource !== "object") return [];
  const items = (ruleSource as { rules?: unknown }).rules;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (item && typeof item === "object" ? (item as { ruleFields?: unknown }).ruleFields : []))
    .filter((fields) => Array.isArray(fields))
    .map((fields) =>
      fields
        .filter((field): field is Record<string, unknown> => Boolean(field && typeof field === "object"))
        .map((field) => ({
          field: String(field.field ?? "PRODUCT"),
          operator: String(field.operator ?? "IN"),
          value: Array.isArray(field.value) ? field.value.map(String) : [],
        })),
    );
}

export default defineComponent({
  name: "GemEquipmentAssociation",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getDeviceClient: { type: Function as PropType<GemPageProps["getDeviceClient"]>, required: true },
    applicationCode: { type: String, default: "" },
    title: { type: String, default: "设备关联" },
  },
  setup(props) {
    const filterVisible = ref(false);
    const saving = ref(false);
    const rules = ref<RuleEditor[][]>([]);
    const backupRules = ref<RuleEditor[][]>([]);
    const productOptions = ref<SelectOption[]>([]);
    const areaOptions = ref<SelectOption[]>([]);
    const equipmentOptions = ref<SelectOption[]>([]);
    let nextKey = 1;
    const page = reactive({ pageNumber: 1, pageSize: 20, total: 0 });
    const applicationCode = () => props.applicationCode || "SECURITY_MONITORING";
    const tagCode = () => `builtin.app::${applicationCode()}`;

    const createRule = (): RuleEditor => ({ key: nextKey++, field: "PRODUCT", operator: "IN", value: [] });
    const serializeRules = (): EquipmentAssociationRuleField[][] =>
      rules.value
        .map((group) =>
          group
            .filter((rule) => rule.field && rule.operator && rule.value.length > 0)
            .map(({ field, operator, value }) => ({ field, operator, value })),
        )
        .filter((group) => group.length > 0);
    const copyRules = (value: RuleEditor[][]): RuleEditor[][] =>
      value.map((group) => group.map((rule) => ({ ...rule, value: [...rule.value] })));
    const availableFieldOptions = (group: RuleEditor[], current: RuleEditor) =>
      fieldOptions.filter(
        (option) => option.value === current.field || !group.some((rule) => rule !== current && rule.field === option.value),
      );
    const valueOptions = (rule: RuleEditor): SelectOption[] => {
      const known = rule.field === "PRODUCT" ? productOptions.value : rule.field === "AREA" ? areaOptions.value : equipmentOptions.value;
      const knownValues = new Set(known.map((option) => option.value));
      return [...known, ...rule.value.filter((value) => !knownValues.has(value)).map((value) => ({ value, label: value }))];
    };

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "equipment-association-list",
      columns: [
        { dataIndex: "code", title: "设备编码", ellipsis: true, customRender: ({ text }) => textCell(text) },
        { dataIndex: "name", title: "设备名称", ellipsis: true, customRender: ({ text }) => textCell(text) },
        {
          dataIndex: "productCategoryName",
          title: "产品品类",
          customRender: ({ record }) => textCell((record as DeviceRow).productInfo?.productCategory?.name),
        },
        { dataIndex: "productName", title: "产品名称", customRender: ({ record }) => textCell((record as DeviceRow).productInfo?.name) },
        { dataIndex: "brandName", title: "设备品牌", customRender: ({ record }) => textCell((record as DeviceRow).productInfo?.brandName) },
        {
          dataIndex: "area",
          title: "所属区域",
          customRender: ({ record }) => textCell((record as DeviceRow).area?.pathName || (record as DeviceRow).area?.name),
        },
      ],
      fetchApi: async () => {
        const conditions = serializeRules();
        if (conditions.length === 0) {
          return { records: [], total: 0, pages: 0 };
        }
        const client = await getDeviceClient();
        return normalizeAlarmPage(
          await client.getEquipmentAssociationPage({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            rules: conditions,
          }),
        );
      },
      fetchLoaded: (result) => {
        page.total = result.total;
      },
    });

    const addGroup = (): void => {
      rules.value.push([createRule()]);
    };

    const removeRule = (groupIndex: number, ruleIndex: number): void => {
      rules.value[groupIndex]?.splice(ruleIndex, 1);
      if (!rules.value[groupIndex]?.length) rules.value.splice(groupIndex, 1);
    };

    const addRule = (group: RuleEditor[]): void => {
      const available = fieldOptions.find((option) => !group.some((rule) => rule.field === option.value));
      if (!available) {
        message.warning("每个条件组最多包含产品、区域、设备三个条件");
        return;
      }
      group.push({ ...createRule(), field: available.value });
    };

    const updateRuleField = (rule: RuleEditor, value: unknown): void => {
      rule.field = String(value ?? "PRODUCT");
      rule.value = [];
      query();
    };

    const updateRuleOperator = (rule: RuleEditor, value: unknown): void => {
      rule.operator = String(value ?? "IN");
      query();
    };

    const updateRuleValues = (rule: RuleEditor, value: unknown): void => {
      rule.value = (Array.isArray(value) ? value : []).map(String).filter(Boolean);
      query();
    };

    const loadFilterOptions = async (): Promise<void> => {
      try {
        const client = await getDeviceClient();
        const [products, areas, devices] = await Promise.all([
          client.getProductListAll(),
          client.getAreaTree(applicationCode()),
          client.getIotDeviceList({ pageNumber: 1, pageSize: 1000 }),
        ]);
        productOptions.value = toOptions(unwrapList(products), ["id", "productId", "prodId", "code"], ["prodName", "productName", "name"]);
        areaOptions.value = flattenAreaOptions(unwrapList(areas));
        equipmentOptions.value = toOptions(
          normalizeAlarmPage(devices).records as Record<string, unknown>[],
          ["id", "deviceId", "code"],
          ["name", "deviceName", "code"],
        );
      } catch {
        message.warning("筛选项加载失败，请稍后重试");
      }
    };

    const query = (): void => {
      page.pageNumber = 1;
      tableApi.query();
    };

    const save = async (): Promise<void> => {
      const conditions = serializeRules();
      if (conditions.length === 0) {
        message.warning("请至少配置一条完整筛选条件");
        return;
      }
      saving.value = true;
      try {
        const client = await getDeviceClient();
        await client.saveTagRule({ code: tagCode(), name: props.title, rules: conditions });
        backupRules.value = copyRules(rules.value);
        filterVisible.value = false;
        message.success("保存成功");
        query();
      } catch {
        message.error("保存失败");
      } finally {
        saving.value = false;
      }
    };

    onMounted(async () => {
      try {
        const client = await getDeviceClient();
        const loaded = parseRules(await client.getTagRule(tagCode()));
        rules.value = loaded.map((group) => group.map((rule) => ({ ...rule, key: nextKey++ })));
        backupRules.value = copyRules(rules.value);
      } catch {
        message.error("获取关联规则失败");
      }
      void loadFilterOptions();
      query();
    });

    return () => (
      <PageLayout
        title={props.title}
        v-slots={{
          "layout-header": () => (
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  filterVisible.value = !filterVisible.value;
                }}
              >
                筛选
              </Button>
              <Button type="primary" loading={saving.value} onClick={() => void save()}>
                保存
              </Button>
              <Button
                onClick={() => {
                  rules.value = copyRules(backupRules.value);
                  query();
                }}
              >
                还原
              </Button>
            </Space>
          ),
          "layout-content": () => (
            <div>
              {filterVisible.value ? (
                <section class={styles.filterPanel}>
                  <h3 class={styles.filterTitle}>筛选条件</h3>
                  {rules.value.map((group, groupIndex) => (
                    <div key={groupIndex} class={styles.conditionGroup}>
                      {groupIndex ? <div class={styles.groupDivider}>或</div> : null}
                      {group.map((rule, ruleIndex) => (
                        <Space key={rule.key} class={styles.conditionRow}>
                          <Button type="link" danger class={styles.removeButton} onClick={() => removeRule(groupIndex, ruleIndex)}>
                            −
                          </Button>
                          <span>{ruleIndex ? "且" : "当"}</span>
                          <Select
                            value={rule.field}
                            options={availableFieldOptions(group, rule)}
                            style={{ width: "150px" }}
                            onUpdate:value={(value: unknown) => updateRuleField(rule, value)}
                          />
                          <Select
                            value={rule.operator}
                            options={operatorOptions}
                            style={{ width: "150px" }}
                            onUpdate:value={(value: unknown) => updateRuleOperator(rule, value)}
                          />
                          <Select
                            value={rule.value}
                            mode="multiple"
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder={`请选择${fieldOptions.find((option) => option.value === rule.field)?.label ?? "条件"}`}
                            options={valueOptions(rule)}
                            class={styles.valueSelect}
                            onUpdate:value={(value: unknown) => updateRuleValues(rule, value)}
                          />
                        </Space>
                      ))}
                      <Button type="link" class={styles.addRuleButton} onClick={() => addRule(group)}>
                        ＋ 添加规则
                      </Button>
                    </div>
                  ))}
                  <Button block class={styles.addGroupButton} onClick={addGroup}>
                    添加条件组
                  </Button>
                </section>
              ) : null}
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              showSizeChanger
              pageSizeOptions={["10", "20", "50"]}
              showTotal={(total: number) => `共 ${total} 条数据`}
              onPageChange={(pageNumber: number, pageSize: number) => {
                page.pageNumber = pageNumber;
                page.pageSize = pageSize;
                tableApi.query();
              }}
            />
          ),
        }}
      />
    );

    function getDeviceClient() {
      if (!props.getDeviceClient) {
        throw new Error("设备关联页面缺少 deviceCenterClient");
      }
      return props.getDeviceClient();
    }
  },
});
