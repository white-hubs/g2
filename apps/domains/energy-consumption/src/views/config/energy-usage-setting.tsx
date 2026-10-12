import { defineComponent, onBeforeUnmount, onMounted, reactive, ref } from "vue";

import { AddUsageSetting, DelUsageSetting, EditUsageSetting, EnergyCollectConfigList, EnergyUsagePage } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import type { FormInstance, FormRule } from "@/pc-ui-runtime";
import {
  Button,
  Form,
  FormItem,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Table,
  message,
  usePcQueryState,
} from "@/pc-ui-runtime";
import { getUsageYear } from "@/utils/getTime";

import "./energy-usage-setting.less";

interface UsageSettingType {
  instrumentType: string;
  year: string | number;
  instrumentName: string;
  energyValue: number;
  fuelName: string;
  unit: string;
  carbonFactor: string;
  calculateProportion: string;
  id?: string;
  sourceType?: string;
}

type ClassifyItem = {
  categoryCode: string;
  categoryName: string;
  fuelName: string;
  unit: string;
  carbonFactor: string;
  calculateProportion: string;
};

export const EnergyUsageSetting = defineComponent({
  name: "EnergyUsageSetting",
  setup() {
    const queryState = usePcQueryState({
      storage: "url",
      initialState: {
        year: undefined as string | undefined,
        instrumentType: undefined as string | undefined,
        keyword: "",
        pageNumber: 1,
        pageSize: 10,
        total: 0,
        pages: 1,
      },
      cacheFields: ["year", "instrumentType", "keyword", "pageNumber", "pageSize"],
      resolveValue: (field, raw) => {
        if (field === "pageNumber" || field === "pageSize" || field === "pages") return Number(raw);
        return raw;
      },
    });

    const loading = ref(true);
    const scrollY = ref(200);
    const classifyList = ref<ClassifyItem[]>([]);
    const yearList = ref<Array<{ label: number; value: number }>>([]);
    const tableList = ref<UsageSettingType[]>([]);
    const formRef = ref<FormInstance>();
    const usageVisible = ref(false);
    const modelTitle = ref("");
    const usageType = ref("");
    const energyUsageForm = reactive<UsageSettingType>({
      instrumentType: "",
      year: "",
      instrumentName: "",
      energyValue: 0,
      fuelName: "",
      unit: "",
      carbonFactor: "",
      calculateProportion: "",
    });

    const rules: Record<string, FormRule[]> = {
      instrumentType: [{ required: true, message: "请选择能耗分类", trigger: "blur" }],
      year: [{ required: true, message: "请选择年份", trigger: "change" }],
      fuel: [{ required: true, message: "请输入年用能", trigger: "change" }],
    };

    const scrollHandle = () => {
      const clientHeight = document.querySelector(".content-table")?.clientHeight;
      if (clientHeight) {
        scrollY.value = clientHeight - 200;
      }
    };

    const getTableList = async () => {
      loading.value = true;
      const { data } = await EnergyUsagePage({
        year: queryState.state.year,
        instrumentType: queryState.state.instrumentType,
        pageNumber: queryState.state.pageNumber,
        pageSize: queryState.state.pageSize,
      });
      const page = data as { records: UsageSettingType[]; pages: number; total: number };
      tableList.value = page.records;
      queryState.update({ pages: page.pages, total: page.total });
      loading.value = false;
    };

    const tableChange = (current: number, pageSize: number) => {
      queryState.setPage(current || 1, pageSize);
      void getTableList();
    };

    const reset = () => {
      queryState.update({
        year: undefined,
        instrumentType: undefined,
        keyword: "",
        pageNumber: 1,
        pageSize: 10,
      });
      void getTableList();
    };

    const openModel = (type: string, item?: UsageSettingType) => {
      formRef.value?.resetFields();
      usageType.value = type;
      modelTitle.value = type === "add" ? "新增年用能" : "编辑年用能";
      usageVisible.value = true;
      energyUsageForm.instrumentType = item?.instrumentType ?? "";
      energyUsageForm.instrumentName = item?.instrumentName ?? "";
      energyUsageForm.year = item?.year ?? "";
      energyUsageForm.unit = item?.unit ?? "";
      energyUsageForm.id = item?.id ?? "";
      energyUsageForm.energyValue = item?.energyValue ?? 0;
    };

    const changeClassify = (_value: string, option: ClassifyItem) => {
      energyUsageForm.instrumentType = option.categoryCode;
      energyUsageForm.instrumentName = option.categoryName;
      energyUsageForm.fuelName = option.fuelName;
      energyUsageForm.unit = option.unit;
      energyUsageForm.carbonFactor = option.carbonFactor;
      energyUsageForm.calculateProportion = option.calculateProportion;
    };

    const submitEnergyUsage = async () => {
      void formRef.value?.validate().then(async () => {
        if (usageType.value === "add") {
          await AddUsageSetting(energyUsageForm);
        } else {
          await EditUsageSetting({ ...energyUsageForm });
        }
        message.success("操作成功");
        void getTableList();
        usageVisible.value = false;
      });
    };

    const deleteData = async (record: UsageSettingType) => {
      await DelUsageSetting({ id: record.id });
      message.success("操作成功");
      void getTableList();
    };

    onMounted(async () => {
      scrollHandle();
      window.addEventListener("resize", scrollHandle);
      yearList.value = getUsageYear();
      const { data } = await EnergyCollectConfigList();
      classifyList.value = data as ClassifyItem[];
      void getTableList();
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", scrollHandle);
    });

    const columns = [
      {
        title: "年份",
        dataIndex: "year",
        key: "year",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => (text as string) ?? "--",
      },
      {
        title: "能源分类",
        dataIndex: "instrumentName",
        key: "instrumentName",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => (text as string) ?? "--",
      },
      {
        title: "用量",
        dataIndex: "energyValue",
        key: "energyValue",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ record }: { record: UsageSettingType }) =>
          record.energyValue !== null ? `${record.energyValue}${record.unit}` : "--",
      },
      {
        title: "数据来源",
        dataIndex: "sourceType",
        key: "sourceType",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => (text === "auto" ? "自动统计" : text === "handle" ? "手工录入" : "--"),
      },
      {
        dataIndex: "action",
        title: "操作",
        width: "140px",
        customRender: ({ record }: { record: UsageSettingType }) => (
          <>
            <Button type="link" onClick={() => openModel("edit", record)}>
              编辑
            </Button>
            <Popconfirm title="确定删除？" okText="确定" cancelText="取消" onConfirm={() => void deleteData(record)}>
              <a class="ml-10px color-red">删除</a>
            </Popconfirm>
          </>
        ),
      },
    ];

    return () => (
      <>
        <GLayout
          title="用能设置"
          v-slots={{
            "content-table": () => (
              <>
                <Form layout="inline" model={queryState.state} style={{ marginTop: "10px" }}>
                  <FormItem label="选择年份">
                    <Select
                      placeholder="请选择"
                      value={queryState.state.year}
                      style={{ width: "180px" }}
                      options={yearList.value}
                      allowClear
                      onUpdate:value={(v) => queryState.update({ year: v == null ? undefined : String(v) })}
                    />
                  </FormItem>
                  <FormItem label="选择分类">
                    <Select
                      placeholder="请选择"
                      value={queryState.state.instrumentType}
                      style={{ width: "180px" }}
                      options={classifyList.value}
                      allowClear
                      fieldNames={{ label: "categoryName", value: "categoryCode" }}
                      onUpdate:value={(v) => queryState.update({ instrumentType: v == null ? undefined : String(v) })}
                    />
                  </FormItem>
                  <FormItem>
                    <Button
                      type="primary"
                      onClick={() => {
                        queryState.update({ pageNumber: 1 });
                        void getTableList();
                      }}
                    >
                      查询
                    </Button>
                    <Button style={{ marginLeft: "10px" }} onClick={reset}>
                      重置
                    </Button>
                  </FormItem>
                </Form>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <Button type="primary" style={{ marginTop: "10px" }} onClick={() => openModel("add")}>
                    新增年用能
                  </Button>
                  <p style={{ marginLeft: "10px" }}>
                    数据来源=自动统计，为系统根据计量设备采集数据统计所得，每年1月1日自动统计一次，统计数据不足一年会自动换算成一年。
                  </p>
                </div>
                <div class="table">
                  <Table
                    dataSource={tableList.value}
                    columns={columns}
                    pagination={false}
                    size="small"
                    loading={loading.value}
                    rowKey="deviceId"
                    scroll={{ y: scrollY.value }}
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
                </div>
              </>
            ),
          }}
        />
        <Modal
          open={usageVisible.value}
          title={modelTitle.value}
          onOk={() => void submitEnergyUsage()}
          onCancel={() => {
            usageVisible.value = false;
          }}
        >
          <Form ref={formRef} model={energyUsageForm} rules={rules}>
            <FormItem name="instrumentType" label="能耗分类：" style={{ width: "50%", marginBottom: "10px" }}>
              <Select
                disabled={usageType.value === "edit"}
                placeholder="请选择"
                value={energyUsageForm.instrumentType}
                options={classifyList.value}
                allowClear
                fieldNames={{ label: "categoryName", value: "categoryCode" }}
                onChange={(v, option) => {
                  changeClassify(String(v ?? ""), (Array.isArray(option) ? option[0] : option) as ClassifyItem);
                }}
              />
            </FormItem>
            <div style={{ display: "flex" }}>
              <FormItem name="year" label="年用能：">
                <Select
                  disabled={usageType.value === "edit"}
                  value={energyUsageForm.year}
                  allowClear
                  style={{ width: "80px" }}
                  options={yearList.value}
                  onUpdate:value={(v) => {
                    energyUsageForm.year = (v as string | number) ?? "";
                  }}
                />
              </FormItem>
              <FormItem name="energyValue">
                <InputNumber
                  value={energyUsageForm.energyValue}
                  min={0}
                  max={9999999}
                  addonAfter={energyUsageForm.unit}
                  onUpdate:value={(v) => {
                    energyUsageForm.energyValue = v == null ? 0 : Number(v);
                  }}
                />
              </FormItem>
            </div>
          </Form>
        </Modal>
      </>
    );
  },
});

export default EnergyUsageSetting;
