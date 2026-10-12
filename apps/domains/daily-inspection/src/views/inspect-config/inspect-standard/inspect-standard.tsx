// @ts-nocheck — 对齐 cube inspect-standard 列表：左对象树 + 右表格。
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { computed, defineComponent, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { InspectBusinessType } from "@/compat/constants";
import { getDailyInspectionClient } from "@/domain-context";
import {
  Button,
  Empty,
  Input,
  Page,
  PageLayout,
  PopConfirm,
  PopOver,
  Spin,
  Switch,
  TabPane,
  Tabs,
  message,
  usePcForm,
  usePcTable,
  type PcTableColumn,
} from "@/pc-ui-runtime";

import styles from "./inspect-standard.module.css";

type TargetCategory = "DEVICE" | "STALL" | "PROPERTY" | "SITE_POINT" | "RISK_SOURCE" | "SMALL_ENGINEERING";

interface ObjectNode {
  id: string;
  name: string;
  children?: ObjectNode[];
}

interface SourceNode {
  id?: string | number;
  name?: string;
  categoryName?: string;
  categoryCode?: string;
  categoryCodeConcat?: string;
  children?: SourceNode[];
  nextList?: SourceNode[];
}

const BASE = "/d/daily-inspection";

const tabList: { key: TargetCategory; name: string }[] = [
  { key: "DEVICE", name: "设备" },
  { key: "STALL", name: "档位" },
  { key: "PROPERTY", name: "资产" },
  { key: "SITE_POINT", name: "现场点" },
  { key: "RISK_SOURCE", name: "风险源" },
  { key: "SMALL_ENGINEERING", name: "小散工程" },
];

const mapNodes = (list: SourceNode[] = [], childrenField: "children" | "nextList" = "children"): ObjectNode[] => {
  return list
    .map((item) => {
      const children = item[childrenField]?.length ? mapNodes(item[childrenField], childrenField) : [];
      return {
        id: String(item.id ?? item.categoryCodeConcat ?? item.categoryCode ?? ""),
        name: item.name ?? item.categoryName ?? "--",
        ...(children.length ? { children } : {}),
      };
    })
    .filter((item) => item.id);
};

const filterNodes = (list: ObjectNode[], keyword: string): ObjectNode[] => {
  if (!keyword) return list;
  return list
    .map((item) => {
      const children = item.children ? filterNodes(item.children, keyword) : [];
      if (item.name.includes(keyword) || children.length) {
        return { ...item, children };
      }
      return null;
    })
    .filter(Boolean) as ObjectNode[];
};

export const InspectStandard = defineComponent({
  name: "InspectStandard",
  setup() {
    const router = useRouter();
    const client = getDailyInspectionClient();
    const searchParams = reactive({
      pageNumber: 1,
      pageSize: 10,
      keyword: "",
      targetType: "",
    });
    const page = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });

    const targetType = ref(searchParams.targetType);
    const targetCategory = ref<TargetCategory>("DEVICE");
    const leftKeyword = ref("");
    const leftLoading = ref(false);
    const objectData = ref<ObjectNode[]>([]);

    const columns: PcTableColumn[] = [
      {
        title: "巡检标准",
        dataIndex: "name",
        key: "name",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "设为默认巡检标准",
        dataIndex: "defaultStandard",
        key: "defaultStandard",
        ellipsis: true,
        align: "center",
        width: 180,
        customRender: ({ record }: { record: InspectionRecord }) => (
          <Switch
            checked={Boolean(record.defaultStandard)}
            class={styles["default-switch"]}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={(checked: boolean) => void handleSwitch(checked, record)}
          />
        ),
      },
      {
        title: "操作",
        dataIndex: "action",
        key: "action",
        fixed: "right",
        width: 180,
        align: "center",
        customRender: ({ record }: { record: InspectionRecord }) => (
          <>
            <Button type="link" size="small" onClick={() => detailRow(String(record.id ?? ""))}>
              详情
            </Button>
            <Button type="link" size="small" onClick={() => editRow(String(record.id ?? ""))}>
              编辑
            </Button>
            <PopConfirm title="确认删除该项？" onConfirm={() => void deleteRow(String(record.id ?? ""))}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "inspect-standard",
      rowKey: "id",
      autoFetch: false,
      fetchApi: async () => {
        try {
          const result = await client.listConfig("standard", {
            pageNumber: searchParams.pageNumber,
            pageSize: searchParams.pageSize,
            keyword: searchParams.keyword || undefined,
            targetTypeEq: true,
            targetType: targetType.value || undefined,
            businessType: InspectBusinessType.DAILY_INSPECTION,
          });
          page.total = result.total;
          page.pageNumber = searchParams.pageNumber;
          page.pageSize = searchParams.pageSize;
          return result;
        } catch {
          message.error("巡检标准加载失败");
          return { records: [], total: 0, pages: 0 };
        }
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      showCollapseButton: true,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          componentProps: { allowClear: true, placeholder: "巡检标准" },
        },
      ],
      handleSubmit(values) {
        searchParams.keyword = String(values.keyword ?? "").trim();
        searchParams.pageNumber = 1;
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        searchParams.keyword = "";
        searchParams.pageNumber = 1;
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    const handleChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      searchParams.pageNumber = pageNumber;
      searchParams.pageSize = pageSize;
      tableApi.query();
    };

    const handleAdd = (): void => {
      void router.push({ path: `${BASE}/inspect-standard-form`, query: { type: "add" } });
    };
    const handleAiGenerate = (): void => {
      void router.push(`${BASE}/inspect-standard-ai`);
    };
    const editRow = (id: string): void => {
      void router.push({ path: `${BASE}/inspect-standard-form`, query: { type: "edit", id } });
    };
    const detailRow = (id: string): void => {
      void router.push({ path: `${BASE}/inspect-standard-form`, query: { type: "detail", id } });
    };

    const handleSwitch = async (enable: boolean, record: InspectionRecord): Promise<void> => {
      const id = String(record.id ?? "");
      if (!id) return;
      if (!targetType.value) {
        message.warning("请选择关联标准");
        record.defaultStandard = !enable;
        return;
      }
      try {
        await client.setDefaultStandard(id, {
          defaultStandard: Number(enable),
          targetType: String(targetType.value),
          targetCategory: targetCategory.value,
          businessType: InspectBusinessType.DAILY_INSPECTION,
        });
        message.success("操作成功");
        tableApi.query();
      } catch (error) {
        record.defaultStandard = !enable;
        message.error((error as { errorMessage?: string })?.errorMessage ?? "操作失败");
      }
    };

    const deleteRow = async (id: string): Promise<void> => {
      try {
        await client.deleteConfig("standard", id);
        message.success("操作成功");
        tableApi.query();
      } catch (error) {
        message.error((error as { errorMessage?: string })?.errorMessage ?? "操作失败");
      }
    };

    const queryObjectData = async (): Promise<void> => {
      leftLoading.value = true;
      try {
        switch (targetCategory.value) {
          case "DEVICE": {
            const res = await client.getIotProductCategoryTree();
            objectData.value = filterNodes(mapNodes(res as unknown as SourceNode[], "children"), leftKeyword.value);
            break;
          }
          case "STALL": {
            const res = await client.stallTypeList({ enabled: true });
            objectData.value = filterNodes(mapNodes(res as unknown as SourceNode[]), leftKeyword.value);
            break;
          }
          case "PROPERTY": {
            const res = await client.getAssemblyClassifyPage({ pageNumber: 1, pageSize: 1000, type: "assetType" });
            objectData.value = filterNodes(mapNodes((res?.records ?? []) as SourceNode[]), leftKeyword.value);
            break;
          }
          case "SITE_POINT": {
            const res = await client.inspectPointTypeList();
            objectData.value = filterNodes(mapNodes(res as unknown as SourceNode[]), leftKeyword.value);
            break;
          }
          case "RISK_SOURCE": {
            const res = await client.getRiskSourceType({ itemCode: "risk-source-type", pageNumber: 1, pageSize: 1000 });
            objectData.value = filterNodes(mapNodes(res as unknown as SourceNode[], "nextList"), leftKeyword.value);
            break;
          }
          case "SMALL_ENGINEERING": {
            const res = await client.getProjectTypeList({ name: leftKeyword.value });
            objectData.value = filterNodes(mapNodes(res as unknown as SourceNode[]), leftKeyword.value);
            break;
          }
        }
      } catch {
        objectData.value = [];
      } finally {
        leftLoading.value = false;
      }
    };

    const handleSelectObject = (item: ObjectNode): void => {
      const nextSelected = targetType.value !== item.id;
      targetType.value = nextSelected ? item.id : "";
      searchParams.targetType = targetType.value;
      tableApi.query();
    };

    const renderObjectNodes = (items: ObjectNode[], level = 0): JSX.Element => (
      <ul class={styles["object-list"]}>
        {items.map((item) => (
          <li key={item.id}>
            <div
              class={[styles["object-item"], targetType.value === item.id && styles.active]}
              style={{ paddingLeft: `${8 + level * 12}px` }}
              onClick={() => handleSelectObject(item)}
            >
              <span class={styles["object-name"]} title={item.name}>
                {item.name}
              </span>
            </div>
            {item.children?.length ? renderObjectNodes(item.children, level + 1) : null}
          </li>
        ))}
      </ul>
    );

    watch(targetCategory, () => {
      targetType.value = "";
      searchParams.targetType = "";
      leftKeyword.value = "";
      void queryObjectData();
      tableApi.query();
    });

    onMounted(() => {
      void queryObjectData();
      tableApi.query();
    });

    const SearchInput = Input.Search;

    const objectPanel = computed(() => (
      <div class={styles["object-panel"]}>
        <SearchInput
          value={leftKeyword.value}
          allowClear
          placeholder="请输入关键字"
          onSearch={() => void queryObjectData()}
          onUpdate:value={(value: string) => {
            leftKeyword.value = value;
          }}
          class={styles["left-search"]}
        />
        <Tabs
          activeKey={targetCategory.value}
          class={styles["object-tabs"]}
          onUpdate:activeKey={(key: string) => {
            targetCategory.value = key as TargetCategory;
          }}
        >
          {tabList.map((item) => (
            <TabPane key={item.key} tab={item.name}>
              <Spin spinning={leftLoading.value}>{objectData.value.length ? renderObjectNodes(objectData.value) : <Empty />}</Spin>
            </TabPane>
          ))}
        </Tabs>
      </div>
    ));

    const slots = {
      "layout-header": () => (
        <div class={styles["header-actions"]}>
          <Button onClick={handleAiGenerate}>AI自动生成</Button>
          <Button type="primary" onClick={handleAdd}>
            新增
          </Button>
        </div>
      ),
      "layout-content": () => (
        <div class={styles["page-flex"]}>
          <div class={styles["page-left"]}>{objectPanel.value}</div>
          <div class={styles["page-right"]}>
            <div class={styles["table-search"]}>
              <PcForm />
            </div>
            <PcTable />
          </div>
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handleChange} />,
    };

    return () => <PageLayout title="巡检标准" v-slots={slots} />;
  },
});
