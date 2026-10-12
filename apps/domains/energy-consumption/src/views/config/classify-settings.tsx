import { defineComponent, onMounted, onBeforeUnmount, reactive, ref } from "vue";

import { ClassifySettingsPage, FuelListPage, UpdateClassifySettings } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import type { FormInstance } from "@/pc-ui-runtime";
import { Button, Form, FormItem, Input, InputNumber, Modal, Select, Switch, Table, message } from "@/pc-ui-runtime";

import "./classify-settings.less";

interface FuelType {
  calculateProportion: number;
  carbonFactor: number;
  code: string;
  fuelName: string;
  id: number;
  unit: string;
  label?: string;
  value?: string;
}

const collectTypeOption = [
  { label: "计量设备自动采集", value: "auto" },
  { label: "人工录入", value: "hand" },
];

const columns = [
  {
    title: "编码",
    dataIndex: "custCode",
    key: "custCode",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "能耗分类",
    dataIndex: "categoryName",
    key: "categoryName",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text as string) ?? "--",
  },
  {
    title: "数据采集",
    dataIndex: "collectType",
    key: "collectType",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: string }) => (text ? (text === "auto" ? "计量设备自动采集" : "人工录入") : "--"),
  },
  {
    title: "监测开关",
    dataIndex: "collectOn",
    key: "collectOn",
    ellipsis: true,
    align: "center" as const,
    customRender: ({ text }: { text: boolean }) => (text ? "开" : "关"),
  },
  {
    dataIndex: "action",
    title: "操作",
    width: "140px",
  },
];

export const ClassifySettings = defineComponent({
  name: "ClassifySettings",
  setup() {
    const loading = ref(true);
    const scrollY = ref(200);
    const fuelOption = ref<FuelType[]>([]);
    const tableList = ref<Record<string, unknown>[]>([]);
    const deviceVisible = ref(false);
    const formRef = ref<FormInstance>();
    const deviceForm = reactive({
      collectOn: true,
      id: "",
      categoryName: "",
      custCode: "",
      collectType: "",
      fuelCode: "",
      rolloverValue: null as number | null,
      maxStepUsage: null as number | null,
    });
    const fuelUnit = ref({
      unit: "",
      carbonFactor: 0 as number | string,
      calculateProportion: 0 as number | string,
    });

    const scrollHandle = () => {
      const clientHeight = document.querySelector(".content-table")?.clientHeight;
      if (clientHeight) {
        scrollY.value = clientHeight - 120;
      }
    };

    const getFuelList = async () => {
      const { data } = await FuelListPage({ keyword: "" });
      fuelOption.value = data as FuelType[];
    };

    const getTableList = async () => {
      loading.value = true;
      const { data } = await ClassifySettingsPage();
      tableList.value = (data as { records: Record<string, unknown>[] }).records;
      loading.value = false;
    };

    const changeFuel = (_value: unknown, option: FuelType) => {
      fuelUnit.value.unit = option?.unit ?? "";
      fuelUnit.value.carbonFactor = option?.carbonFactor ?? "";
      fuelUnit.value.calculateProportion = option?.calculateProportion ?? "";
    };

    const openModel = (item: Record<string, unknown>) => {
      deviceVisible.value = true;
      deviceForm.id = String(item.id ?? "");
      deviceForm.collectOn = Boolean(item.collectOn);
      deviceForm.categoryName = String(item.categoryName ?? "");
      deviceForm.custCode = String(item.custCode ?? "");
      deviceForm.collectType = String(item.collectType ?? "");
      deviceForm.fuelCode = String(item.fuelCode ?? "");
      deviceForm.rolloverValue = (item.rolloverValue as number | null) ?? null;
      deviceForm.maxStepUsage = (item.maxStepUsage as number | null) ?? null;
      fuelUnit.value.unit = String(item.unit ?? "");
      fuelUnit.value.carbonFactor = (item.carbonFactor as number) ?? 0;
      fuelUnit.value.calculateProportion = (item.calculateProportion as number) ?? 0;
    };

    const submitDevice = async () => {
      await formRef.value?.validate();
      await UpdateClassifySettings(deviceForm);
      await getTableList();
      message.success("配置成功");
      deviceVisible.value = false;
    };

    onMounted(() => {
      scrollHandle();
      void getFuelList();
      window.addEventListener("resize", scrollHandle);
      setTimeout(() => {
        void getTableList();
      }, 0);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", scrollHandle);
    });

    return () => (
      <GLayout
        title="分类设置"
        v-slots={{
          "content-table": () => (
            <>
              <div>
                <p>请配置能耗分类，如果需要监测请打开监测开关。并同步设置其数据采集方式。</p>
                <p>
                  系统只会对监测开关是开启的能耗分类进行采集、存储、分析、上报操作。采集方式为人工录入的情况下，需要按日或者月进行补录数值
                </p>
              </div>
              <div class="classify-settings-table">
                <Table
                  dataSource={tableList.value}
                  columns={columns.map((col) =>
                    col.dataIndex === "action"
                      ? {
                          ...col,
                          customRender: ({ record }: { record: Record<string, unknown> }) => (
                            <Button type="link" onClick={() => openModel(record)}>
                              配置
                            </Button>
                          ),
                        }
                      : col,
                  )}
                  pagination={false}
                  size="small"
                  loading={loading.value}
                  rowKey="deviceId"
                  scroll={{ y: scrollY.value }}
                />
              </div>
            </>
          ),
          default: () => (
            <Modal
              open={deviceVisible.value}
              title="分类设置"
              width="640px"
              destroyOnClose
              okText="确定"
              cancelText="取消"
              onOk={() => void submitDevice()}
              onCancel={() => {
                deviceVisible.value = false;
              }}
            >
              <Form ref={formRef} class="classify-settings-modal-form" model={deviceForm} layout="horizontal">
                <FormItem name="categoryName" label="能耗分类">
                  <span class="classify-settings-modal-form__text">{deviceForm.categoryName}</span>
                </FormItem>
                <FormItem name="collectOn" label="监测开关">
                  <Switch
                    checked={deviceForm.collectOn}
                    disabled={deviceForm.categoryName === "电"}
                    onUpdate:checked={(v) => {
                      deviceForm.collectOn = Boolean(v);
                    }}
                  />
                </FormItem>
                <FormItem name="collectType" label="采集方式">
                  <Select
                    value={deviceForm.collectType}
                    allowClear
                    class="classify-settings-modal-form__control"
                    options={collectTypeOption}
                    onUpdate:value={(v) => {
                      deviceForm.collectType = String(v ?? "");
                    }}
                  />
                </FormItem>
                <FormItem name="custCode" label="分类编码">
                  <Input
                    value={deviceForm.custCode}
                    class="classify-settings-modal-form__control"
                    maxlength={20}
                    onUpdate:value={(v) => {
                      deviceForm.custCode = String(v ?? "");
                    }}
                  />
                </FormItem>
                <FormItem name="fuelCode" label="燃料类型">
                  <Select
                    value={deviceForm.fuelCode}
                    allowClear
                    showSearch
                    class="classify-settings-modal-form__control classify-settings-modal-form__select-fuel"
                    optionFilterProp="fuelName"
                    options={fuelOption.value}
                    fieldNames={{ label: "fuelName", value: "code" }}
                    onChange={(value, option) => {
                      const opt = (Array.isArray(option) ? option[0] : option) as FuelType;
                      changeFuel(value, opt);
                      deviceForm.fuelCode = String(value ?? "");
                    }}
                  />
                  <div class="classify-settings-modal-form__hint">
                    单位：{fuelUnit.value.unit}、折标准煤系数：{fuelUnit.value.calculateProportion}kgce、碳排因子：
                    {fuelUnit.value.carbonFactor}kgCO2
                  </div>
                </FormItem>
                <FormItem name="rolloverValue" label="回卷周期值">
                  <InputNumber
                    value={deviceForm.rolloverValue ?? undefined}
                    class="classify-settings-modal-form__control"
                    min={0}
                    precision={2}
                    controls={false}
                    placeholder="为空时不处理回卷"
                    onUpdate:value={(v) => {
                      deviceForm.rolloverValue = v == null ? null : Number(v);
                    }}
                  />
                </FormItem>
                <FormItem name="maxStepUsage" label="单次最大合理用量">
                  <InputNumber
                    value={deviceForm.maxStepUsage ?? undefined}
                    class="classify-settings-modal-form__control"
                    min={0}
                    precision={2}
                    controls={false}
                    placeholder="为空时不限制"
                    onUpdate:value={(v) => {
                      deviceForm.maxStepUsage = v == null ? null : Number(v);
                    }}
                  />
                </FormItem>
              </Form>
            </Modal>
          ),
        }}
      />
    );
  },
});

export default ClassifySettings;
