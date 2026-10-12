import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { AreaProjectAdd, AreaProjectDelete, AreaProjectTree, AreaProjectUpdate, EnergyCollectConfigList } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import type { FormInstance } from "@/pc-ui-runtime";
import { Button, Form, FormItem, Input, Modal, Popconfirm, Select, Table, message } from "@/pc-ui-runtime";

type ClassifyItem = { categoryName: string; categoryCode: string };
type AreaRow = {
  id: string;
  areaName: string;
  deviceNum?: number;
  level?: number;
  parentId?: string;
};

export const AreaConfigure = defineComponent({
  name: "AreaConfigure",
  setup() {
    const router = useRouter();
    const classifyList = ref<ClassifyItem[]>([]);
    const currentClassify = ref("electricity_meter");
    const spinning = ref(true);
    const tableList = ref<AreaRow[]>([]);
    const isVisible = ref(false);
    const addType = ref("新增区域");
    const formRef = ref<FormInstance>();
    const areaForm = reactive({
      areaName: "",
      parentId: "",
      id: "",
    });
    const rules = {
      areaName: [{ required: true, message: "请输入区域名称" }],
    };

    const getAreaTreeList = async (type: string) => {
      spinning.value = true;
      const { data } = await AreaProjectTree({ instrumentType: type });
      spinning.value = false;
      const payload = data as { records?: AreaRow[] } | AreaRow[];
      tableList.value = Array.isArray(payload) ? payload : (payload.records ?? (payload as never));
    };

    const changeClassify = () => {
      void getAreaTreeList(currentClassify.value);
    };

    const deleteData = async (row: AreaRow) => {
      await AreaProjectDelete(row.id);
      void getAreaTreeList(currentClassify.value);
    };

    const openModel = (record: AreaRow | null, type?: string) => {
      formRef.value?.resetFields();
      isVisible.value = true;
      areaForm.areaName = "";
      areaForm.id = "";
      if (!record) {
        areaForm.parentId = "";
        addType.value = "新增区域";
      }
      if (record && type === "edit") {
        addType.value = "编辑下级";
        areaForm.areaName = record.areaName;
        areaForm.parentId = record.parentId ?? "";
        areaForm.id = record.id;
      }
      if (record && type === "add") {
        addType.value = "新增下级";
        areaForm.parentId = record.id;
      }
    };

    const submitArea = () => {
      void formRef.value?.validate().then(async () => {
        const obj = {
          areaName: areaForm.areaName,
          instrumentType: currentClassify.value,
          energyProjectItemParams: null,
          parentId: areaForm.parentId,
          id: areaForm.id,
        };
        if (addType.value === "编辑下级") {
          await AreaProjectUpdate(obj);
        } else {
          await AreaProjectAdd(obj);
        }
        void getAreaTreeList(currentClassify.value);
        isVisible.value = false;
      });
    };

    const toDetail = (record: AreaRow) => {
      void router.push({
        path: "/d/energy-consumption/associated-devices",
        query: { id: record.id, page: "area", name: record.areaName },
      });
    };

    onMounted(async () => {
      const { data } = await EnergyCollectConfigList();
      classifyList.value = data as ClassifyItem[];
      void getAreaTreeList(currentClassify.value);
    });

    const columns = [
      {
        title: "区域名称",
        dataIndex: "areaName",
        ellipsis: true,
        align: "center" as const,
      },
      {
        dataIndex: "deviceNum",
        title: "关联设备数",
        ellipsis: true,
        align: "center" as const,
      },
      {
        dataIndex: "action",
        title: "操作",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ record }: { record: AreaRow }) => (
          <div>
            {record.level !== 3 ? <a onClick={() => openModel(record, "add")}>新增下级</a> : null}
            <a class="ml-10px" onClick={() => openModel(record, "edit")}>
              编辑
            </a>
            <a class="ml-10px" onClick={() => toDetail(record)}>
              关联设备
            </a>
            <Popconfirm title="确定删除该区域？" okText="确定" cancelText="取消" onConfirm={() => void deleteData(record)}>
              <a class="ml-10px color-red">删除</a>
            </Popconfirm>
          </div>
        ),
      },
    ];

    return () => (
      <>
        <GLayout
          title="区域配置"
          v-slots={{
            "header-btn": () => (
              <Button type="primary" onClick={() => openModel(null, "add")}>
                新增区域
              </Button>
            ),
            "content-table": () => (
              <>
                能耗分类：
                <Select
                  placeholder="请选择仪表类型"
                  style={{ width: "180px" }}
                  value={currentClassify.value}
                  options={classifyList.value}
                  fieldNames={{ label: "categoryName", value: "categoryCode" }}
                  onUpdate:value={(v) => {
                    currentClassify.value = String(v ?? "");
                    changeClassify();
                  }}
                />
                <Table columns={columns} rowKey="id" dataSource={tableList.value} pagination={false} loading={spinning.value} />
              </>
            ),
          }}
        />
        <Modal
          open={isVisible.value}
          title={addType.value}
          onOk={submitArea}
          onCancel={() => {
            isVisible.value = false;
          }}
        >
          <Form ref={formRef} model={areaForm} layout="inline" rules={rules}>
            <FormItem name="areaName" label="区域名称：" style={{ width: "100%", marginBottom: "10px" }}>
              <Input
                value={areaForm.areaName}
                onUpdate:value={(v) => {
                  areaForm.areaName = String(v ?? "");
                }}
              />
            </FormItem>
          </Form>
        </Modal>
      </>
    );
  },
});

export default AreaConfigure;
