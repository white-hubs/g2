import { defineComponent, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import {
  EnergyCollectConfigList,
  EnergyProjectAdd,
  EnergyProjectDelete,
  EnergyProjectUpdate,
  SubItemList,
  SubItemPage,
  SubItemTreePage,
} from "@/api";
import { GLayout } from "@/components/common/g-layout";
import type { FormInstance } from "@/pc-ui-runtime";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  TabPane,
  Tabs,
  Table,
  Textarea,
  message,
  usePcQueryState,
} from "@/pc-ui-runtime";

import "./sub-item-settings.less";

type ClassifyItem = { categoryName: string; categoryCode: string };
type SubItemRow = {
  id: string;
  code?: string;
  projectName: string;
  remark?: string;
  instrumentType?: string;
  instrumentTypeName?: string;
  parentId?: string;
  parentName?: string;
  metersNum?: number;
};

type StructureCell = { projectName: string; rowspan?: number; colspan?: number };

const listColumnsBase = [
  {
    title: "分项编码",
    dataIndex: "code",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => text || "--",
  },
  {
    title: "分项名称",
    dataIndex: "projectName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => text || "--",
  },
  {
    title: "分项说明",
    dataIndex: "remark",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => text || "--",
  },
  {
    title: "能耗分类",
    dataIndex: "instrumentTypeName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => text || "--",
  },
  {
    title: "上级分项",
    dataIndex: "parentName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => text || "--",
  },
  {
    title: "关联设备数量",
    dataIndex: "metersNum",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: number }) => text,
  },
];

export const SubItemSettings = defineComponent({
  name: "SubItemSettings",
  setup() {
    const router = useRouter();
    const queryState = usePcQueryState({
      storage: "url",
      initialState: {
        instrumentType: undefined as string | undefined,
        keyword: "",
        pageNumber: 1,
        pageSize: 10,
        total: 0,
        pages: 1,
      },
      cacheFields: ["instrumentType", "keyword", "pageNumber", "pageSize"],
      resolveValue: (field, raw) => {
        if (field === "pageNumber" || field === "pageSize" || field === "pages") return Number(raw);
        return raw;
      },
    });

    const scrollY = ref(200);
    const activeKey = ref("0");
    const classifyList = ref<ClassifyItem[]>([]);
    const tableList = ref<SubItemRow[]>([]);
    const listLoading = ref(true);
    const structureTableList = ref<StructureCell[][]>([]);
    const structureTableHead = ref<string[]>([]);
    const subItemVisible = ref(false);
    const formRef = ref<FormInstance>();
    const subItemOptions = ref<SubItemRow[]>([]);
    const isAddSubItem = ref(true);
    const deviceForm = reactive({
      projectName: "",
      remark: "",
      instrumentType: "",
      parentId: "",
      id: "",
      code: "",
    });

    const rules = {
      projectName: [
        { required: true, message: "请输入分项名称" },
        { pattern: /^[a-zA-Z0-9\u4e00-\u9fa5]+$/, message: "请输入正确的分项名称" },
      ],
      instrumentType: [{ required: true, message: "请选择能耗分类" }],
    };

    const scrollHandle = () => {
      const clientHeight = document.querySelector(".layout-content")?.clientHeight;
      if (clientHeight) {
        scrollY.value = clientHeight - 240;
      }
    };

    const getTableList = async () => {
      listLoading.value = true;
      const { data } = await SubItemPage({
        instrumentType: queryState.state.instrumentType,
        pageNumber: queryState.state.pageNumber,
        pageSize: queryState.state.pageSize,
      });
      const page = data as { records: SubItemRow[]; total: number; pages: number };
      tableList.value = page.records;
      queryState.update({ total: page.total, pages: page.pages });
      listLoading.value = false;
    };

    const reset = () => {
      queryState.update({
        instrumentType: undefined,
        keyword: "",
        pageNumber: 1,
        pageSize: 10,
      });
      void getTableList();
    };

    const tableChange = (current: number, pageSize: number) => {
      queryState.setPage(current || 1, pageSize);
      void getTableList();
    };

    const deleteData = async (row: SubItemRow) => {
      await EnergyProjectDelete(row.id);
      message.success("操作成功");
      void getTableList();
    };

    const toDetail = (record: SubItemRow) => {
      void router.push({
        path: "/d/energy-consumption/associated-devices",
        query: { id: record.id, page: "sub-item", name: record.projectName },
      });
    };

    const toSubItem = () => {
      void router.push("/d/energy-consumption/classify-settings");
    };

    const changeClassify = async (instrumentType: string) => {
      if (instrumentType) {
        const { data } = await SubItemList({ instrumentType });
        deviceForm.parentId = "";
        subItemOptions.value = data as SubItemRow[];
      } else {
        const { data } = await SubItemList();
        deviceForm.parentId = "";
        subItemOptions.value = data as SubItemRow[];
      }
    };

    const changeParent = async (_value: unknown, option: SubItemRow) => {
      deviceForm.instrumentType = option?.instrumentType ?? "";
      formRef.value?.clearValidate();
      if (!deviceForm.parentId) {
        const { data } = await SubItemList();
        subItemOptions.value = data as SubItemRow[];
      }
    };

    const openSubItem = (type: string, item?: SubItemRow) => {
      formRef.value?.resetFields();
      void SubItemList().then((res) => {
        subItemOptions.value = res.data as SubItemRow[];
      });
      if (type === "edit" && item) {
        isAddSubItem.value = false;
        deviceForm.projectName = item.projectName;
        deviceForm.remark = item.remark ?? "";
        deviceForm.instrumentType = item.instrumentType ?? "";
        deviceForm.parentId = item.parentId ?? "";
        deviceForm.id = item.id;
        deviceForm.code = item.code ?? "";
      } else {
        isAddSubItem.value = true;
        deviceForm.projectName = "";
        deviceForm.remark = "";
        deviceForm.instrumentType = "";
        deviceForm.parentId = "";
        deviceForm.id = "";
        deviceForm.code = "";
      }
      subItemVisible.value = true;
    };

    const submitSubItem = () => {
      void formRef.value?.validate().then(async () => {
        if (deviceForm.id === "") {
          await EnergyProjectAdd(deviceForm);
        } else {
          await EnergyProjectUpdate(deviceForm);
        }
        message.success("操作成功");
        void getTableList();
        subItemVisible.value = false;
      });
    };

    const computeLeafCount = (node: { children: StructureCell[] & { children?: unknown[] }[]; rowspan?: number }): number => {
      const children = (node.children ?? []) as Array<{ children?: unknown[]; rowspan?: number }>;
      if (!children.length) {
        node.rowspan = 1;
        return 1;
      }
      let leafCount = 0;
      for (let i = 0; i < children.length; i++) {
        leafCount += computeLeafCount(children[i] as never);
      }
      node.rowspan = leafCount;
      return leafCount;
    };

    const parseTreeToRow = (
      node: { children: Array<{ projectName: string; children?: unknown[] }> },
      data: StructureCell[][] = [],
      row: StructureCell[] = [],
    ): StructureCell[][] => {
      if (!node.children.length) {
        data.push(row);
      } else {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          const cell: StructureCell = { projectName: child.projectName };
          const extendRow = [...JSON.parse(JSON.stringify(row)), cell] as StructureCell[];
          if (extendRow.length === 1) {
            extendRow[0].rowspan = 1;
          } else if (extendRow.length > 1) {
            extendRow[extendRow.length - 2].rowspan = i === 0 ? computeLeafCount(node as never) : 0;
            extendRow[extendRow.length - 1].rowspan = 1;
          }
          parseTreeToRow(child as never, data, extendRow);
        }
      }
      return data;
    };

    const padArrayLength = (arr: StructureCell[][], fillObject: StructureCell) => {
      const maxLength = Math.max(...arr.map((subArray) => subArray.length), 0);
      structureTableHead.value = ["能耗分类", "分项名称"];
      if (maxLength > 2) {
        for (let i = 1; i <= maxLength - 2; i++) {
          structureTableHead.value.push(`${i}级子项`);
        }
      }
      return arr.map((subArray) => {
        if (subArray.length < maxLength) {
          const padding = Array(maxLength - subArray.length).fill(fillObject);
          return [...subArray, ...padding];
        }
        return subArray;
      });
    };

    const setStructureList = (list: Array<{ projectName: string; children?: unknown[] }>) => {
      let arr = parseTreeToRow({ value: "", children: list } as never);
      const fillArr = padArrayLength(arr, { projectName: "", rowspan: 1 });
      const result: StructureCell[][][] = [];
      const map = new Map<string, StructureCell[][]>();
      arr = JSON.parse(JSON.stringify(fillArr)) as StructureCell[][];
      arr.forEach((row) => {
        const key = JSON.stringify(row[0]);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(row);
      });
      map.forEach((value) => result.push(value));
      const dataTable = JSON.parse(JSON.stringify(result)) as StructureCell[][][];
      dataTable.forEach((item, i) => {
        item.forEach((child, index) => {
          child.forEach((child1, index1) => {
            if (index !== 0) {
              if (result[i][index - 1][index1] && child1.projectName === result[i][index - 1][index1].projectName) {
                result[i][index][index1].rowspan = 0;
              }
            }
          });
        });
      });
      structureTableList.value = result.reduce((acc, curr) => acc.concat(curr), [] as StructureCell[][]);
    };

    const getStructureTableList = async () => {
      listLoading.value = true;
      const { data } = await SubItemTreePage({
        instrumentType: queryState.state.instrumentType,
      });
      structureTableList.value = data as never;
      listLoading.value = false;
      setStructureList(data as never);
    };

    const tabsChange = (value: string | number) => {
      activeKey.value = String(value);
      // 按切换后的 tab 拉取对应数据
      if (String(value) === "0") {
        void getTableList();
      } else {
        void getStructureTableList();
      }
    };

    onMounted(async () => {
      scrollHandle();
      window.addEventListener("resize", scrollHandle);
      const { data } = await EnergyCollectConfigList();
      classifyList.value = data as ClassifyItem[];
      void getTableList();
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", scrollHandle);
    });

    const renderFilter = (onSearch: () => void) => (
      <div style={{ marginBottom: "20px" }}>
        <Form layout="inline" model={queryState.state} style={{ marginTop: "10px" }}>
          <FormItem label="能耗分类">
            <Select
              placeholder="请选择"
              value={queryState.state.instrumentType}
              style={{ width: "180px" }}
              options={classifyList.value}
              allowClear
              fieldNames={{ label: "categoryName", value: "categoryCode" }}
              onUpdate:value={(v) => {
                queryState.update({ instrumentType: v == null ? undefined : String(v) });
              }}
            />
          </FormItem>
          <FormItem>
            <Button type="primary" onClick={onSearch}>
              查询
            </Button>
            <Button style={{ marginLeft: "10px" }} onClick={reset}>
              重置
            </Button>
          </FormItem>
        </Form>
      </div>
    );

    const columns = [
      ...listColumnsBase,
      {
        dataIndex: "action",
        title: "操作",
        width: "200px",
        customRender: ({ record }: { record: SubItemRow }) => (
          <div>
            <a class="ml-10px" onClick={() => openSubItem("edit", record)}>
              编辑
            </a>
            <Popconfirm title="确定删除该分项？" okText="删除" cancelText="取消" onConfirm={() => void deleteData(record)}>
              <a class="ml-10px color-red">删除</a>
            </Popconfirm>
            <a class="ml-10px" onClick={() => toDetail(record)}>
              关联设备
            </a>
          </div>
        ),
      },
    ];

    return () => (
      <>
        <GLayout
          title="分项设置"
          v-slots={{
            "header-btn": () => (
              <>
                <Button type="primary" onClick={toSubItem} style={{ marginRight: "10px" }}>
                  能耗分类设置
                </Button>
                <Button type="primary" onClick={() => openSubItem("add")}>
                  新增分项
                </Button>
              </>
            ),
            "content-data": () => (
              <Tabs activeKey={activeKey.value} onChange={tabsChange}>
                <TabPane key="0" tab="列表">
                  {renderFilter(() => void getTableList())}
                  <Table
                    columns={columns}
                    dataSource={tableList.value}
                    pagination={false}
                    loading={listLoading.value}
                    scroll={{ y: scrollY.value }}
                    rowKey="id"
                  />
                  <Pagination
                    current={queryState.state.pageNumber}
                    pageSize={queryState.state.pageSize}
                    showSizeChanger
                    showTotal={(total: number) => `共 ${total} 条 第${queryState.state.pageNumber}/${queryState.state.pages}页`}
                    total={queryState.state.total}
                    onChange={tableChange}
                    style={{ marginTop: "10px", float: "right" }}
                  />
                </TabPane>
                <TabPane key="1" tab="结构图">
                  {renderFilter(() => void getStructureTableList())}
                  {structureTableList.value[0] && structureTableList.value[0].length === 0 ? (
                    <div class="noData">暂无数据！</div>
                  ) : (
                    <div class="contractTable">
                      <table class="table" style={{ border: "1px solid #f0f0f0", borderCollapse: "collapse" }}>
                        {structureTableHead.value.length > 0 ? (
                          <thead class="thead">
                            <tr>
                              {structureTableHead.value.map((item) => (
                                <th key={item}>{item}</th>
                              ))}
                            </tr>
                          </thead>
                        ) : null}
                        <tbody class="tbody">
                          {structureTableList.value.map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) =>
                                cell.rowspan ? (
                                  <td key={j} rowspan={cell.rowspan} colspan={cell.colspan}>
                                    <div class="cell">{cell.projectName}</div>
                                  </td>
                                ) : null,
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabPane>
              </Tabs>
            ),
          }}
        />
        <Modal
          open={subItemVisible.value}
          title={isAddSubItem.value ? "新增分项" : "编辑分项"}
          onOk={submitSubItem}
          onCancel={() => {
            subItemVisible.value = false;
          }}
        >
          <Form ref={formRef} model={deviceForm} layout="inline" rules={rules}>
            <FormItem name="projectName" label="分项名称：" style={{ width: "100%", marginBottom: "10px" }}>
              <Input
                value={deviceForm.projectName}
                onUpdate:value={(v) => {
                  deviceForm.projectName = String(v ?? "");
                }}
              />
            </FormItem>
            <FormItem name="remark" label="分项说明：" style={{ width: "100%", marginBottom: "10px" }}>
              <Textarea
                value={deviceForm.remark}
                maxlength={50}
                onUpdate:value={(v) => {
                  deviceForm.remark = String(v ?? "");
                }}
              />
            </FormItem>
            <FormItem name="instrumentType" label="能耗分类：" style={{ width: "100%", marginBottom: "10px" }}>
              <Select
                value={deviceForm.instrumentType}
                allowClear
                options={classifyList.value}
                fieldNames={{ label: "categoryName", value: "categoryCode" }}
                onChange={(v) => {
                  deviceForm.instrumentType = String(v ?? "");
                  void changeClassify(String(v ?? ""));
                }}
              />
            </FormItem>
            <FormItem name="parentId" label="上级分项：" style={{ width: "100%", marginBottom: "10px" }}>
              <Select
                value={deviceForm.parentId}
                allowClear
                disabled={!isAddSubItem.value}
                options={subItemOptions.value}
                fieldNames={{ label: "projectName", value: "id" }}
                onChange={(v, option) => {
                  deviceForm.parentId = String(v ?? "");
                  void changeParent(v, (Array.isArray(option) ? option[0] : option) as SubItemRow);
                }}
              />
            </FormItem>
          </Form>
        </Modal>
      </>
    );
  },
});

export default SubItemSettings;
