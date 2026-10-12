import dayjs from "dayjs";
import { defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";

import { EnergyCollectConfigList, EnergyCollectPeriodItype, addEnergyChargeRules, editEnergyChargeRules } from "@/api";
import { Button, DatePicker, Form, FormItem, Input, InputNumber, Modal, Select, Table, message } from "@/pc-ui-runtime";

interface RuleItem {
  stairs: number;
  startEnergy: number;
  endEnergy: number;
  price: number;
  fv: string;
  fvPrice: number;
  pv: string;
  pvPrice: number;
  gv: string;
  gvPrice: number;
  jv: string;
  jvPrice: number;
}

export const RuleModal = defineComponent({
  name: "RuleModal",
  props: {
    visible: { type: Boolean, default: false },
    data: { type: Object as PropType<Record<string, unknown> | null>, default: null },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const modalVisible = ref(false);
    const submitLoading = ref(false);
    const formRef = ref();
    const classifyList = ref<Array<{ categoryName: string; categoryCode: string }>>([]);
    const stairsEnergyContentsList = ref<RuleItem[]>([]);
    let ruleItem: RuleItem = {
      stairs: 1,
      startEnergy: 0,
      endEnergy: 0,
      price: 0,
      fv: "",
      fvPrice: 0,
      pv: "",
      pvPrice: 0,
      gv: "",
      gvPrice: 0,
      jv: "",
      jvPrice: 0,
    };

    const ruleForm = reactive({
      ruleName: "",
      instrumentType: "",
      instrumentTypeName: "",
      effectiveTime: "",
      complexFeeRate: "false",
      stairsEnergyType: "NOTHING",
    });

    const rules = {
      ruleName: [{ required: true, message: "请输入规则名称", trigger: "blur" }],
      instrumentType: [{ required: true, message: "请选择能耗分类", trigger: "change" }],
      effectiveTime: [{ required: true, message: "请选择生效时间", trigger: "blur" }],
      complexFeeRate: [{ required: true, message: "请选择计费方式", trigger: "change" }],
      stairsEnergyType: [{ required: true, message: "请选择阶梯用量", trigger: "change" }],
    };

    const updateStairField = (index: number, field: keyof RuleItem, value: unknown) => {
      const table = JSON.parse(JSON.stringify([stairsEnergyContentsList.value[index]])) as RuleItem[];
      (table[0] as unknown as Record<string, unknown>)[field] = value;
      stairsEnergyContentsList.value[index] = table[0];
    };

    const ruleColumns = [
      {
        title: "峰时段",
        dataIndex: "fv",
        key: "fv",
        width: 160,
        align: "left" as const,
        customRender: ({ text }: { text: string }) => text || "--",
      },
      {
        title: "峰单价",
        dataIndex: "fvPrice",
        key: "fvPrice",
        align: "center" as const,
        customRender: ({ index }: { index: number }) => (
          <InputNumber
            value={stairsEnergyContentsList.value[index]?.fvPrice}
            max={9999999999}
            min={0}
            onChange={(value: number | string | null) => updateStairField(index, "fvPrice", value)}
          />
        ),
      },
      {
        title: "谷时段",
        dataIndex: "gv",
        key: "gv",
        width: 160,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text || "--",
      },
      {
        title: "谷单价",
        dataIndex: "gvPrice",
        key: "gvPrice",
        align: "center" as const,
        customRender: ({ index }: { index: number }) => (
          <InputNumber
            value={stairsEnergyContentsList.value[index]?.gvPrice}
            max={9999999999}
            min={0}
            onChange={(value: number | string | null) => updateStairField(index, "gvPrice", value)}
          />
        ),
      },
      {
        title: "平时段",
        dataIndex: "pv",
        key: "pv",
        width: 160,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text || "--",
      },
      {
        title: "平单价",
        dataIndex: "pvPrice",
        key: "pvPrice",
        align: "center" as const,
        customRender: ({ index }: { index: number }) => (
          <InputNumber
            value={stairsEnergyContentsList.value[index]?.pvPrice}
            max={9999999999}
            min={0}
            onChange={(value: number | string | null) => updateStairField(index, "pvPrice", value)}
          />
        ),
      },
      {
        title: "尖时段",
        dataIndex: "jv",
        key: "jv",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text || "--",
      },
      {
        title: "尖单价",
        dataIndex: "jvPrice",
        key: "jvPrice",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ index }: { index: number }) => (
          <InputNumber
            value={stairsEnergyContentsList.value[index]?.jvPrice}
            max={9999999999}
            min={0}
            onChange={(value: number | string | null) => updateStairField(index, "jvPrice", value)}
          />
        ),
      },
    ];

    const getData = async () => {
      const res = (await EnergyCollectPeriodItype("default")) as {
        data: Array<{ code: string; startTime: string; endTime: string }>;
      };
      ruleItem = {
        stairs: 1,
        startEnergy: 0,
        endEnergy: 0,
        price: 0,
        fv: res.data
          .filter((x) => x.code === "FV")
          .map((x) => `${x.startTime}-${x.endTime}`)
          .join(","),
        fvPrice: 0,
        pv: res.data
          .filter((x) => x.code === "PV")
          .map((x) => `${x.startTime}-${x.endTime}`)
          .join(","),
        pvPrice: 0,
        gv: res.data
          .filter((x) => x.code === "GV")
          .map((x) => `${x.startTime}-${x.endTime}`)
          .join(","),
        gvPrice: 0,
        jv: res.data
          .filter((x) => x.code === "JV")
          .map((x) => `${x.startTime}-${x.endTime}`)
          .join(","),
        jvPrice: 0,
      };
      if (props.data) {
        ruleForm.ruleName = String(props.data.ruleName || "");
        ruleForm.instrumentTypeName = String(props.data.instrumentTypeName || "");
        ruleForm.instrumentType = String(props.data.instrumentType || "");
        ruleForm.effectiveTime = dayjs(String(props.data.effectiveTime)).format("YYYY-MM-DD");
        ruleForm.complexFeeRate = props.data.complexFeeRate ? "true" : "false";
        ruleForm.stairsEnergyType = String(props.data.stairsEnergyType || "NOTHING");
        stairsEnergyContentsList.value = JSON.parse(String(props.data.stairsEnergyContents || "[]")) as RuleItem[];
      } else {
        stairsEnergyContentsList.value = [ruleItem];
      }
      const { data } = (await EnergyCollectConfigList()) as {
        data: Array<{ categoryName: string; categoryCode: string }>;
      };
      classifyList.value = data;
    };

    const close = (type?: string) => {
      if (type === "ok") {
        formRef.value?.validate().then(async () => {
          submitLoading.value = true;
          stairsEnergyContentsList.value.forEach((_x, i) => {
            if (i !== 0) {
              stairsEnergyContentsList.value[i].startEnergy = stairsEnergyContentsList.value[i - 1].endEnergy;
            }
          });
          const params = {
            ...ruleForm,
            complexFeeRate: ruleForm.complexFeeRate === "true",
            stairsEnergyContentsList: stairsEnergyContentsList.value,
            stairsEnergyContents: JSON.stringify(stairsEnergyContentsList.value),
          };
          try {
            if (props.data) {
              await editEnergyChargeRules({ id: props.data.id, ...params });
            } else {
              await addEnergyChargeRules(params);
            }
            message.success("新增成功");
            modalVisible.value = false;
            emit("close");
          } finally {
            submitLoading.value = false;
          }
        });
      } else {
        emit("close");
        modalVisible.value = false;
      }
    };

    watch(
      () => props.visible,
      () => {
        modalVisible.value = props.visible;
      },
      { immediate: true },
    );

    onMounted(() => {
      void getData();
    });

    return () => (
      <Modal
        v-model:visible={modalVisible.value}
        confirmLoading={submitLoading.value}
        width="1200px"
        title=""
        onOk={() => close("ok")}
        onCancel={() => close("cancel")}
      >
        <Form ref={formRef} layout="inline" model={ruleForm} class="modal-form" rules={rules as never}>
          <FormItem label="规则名称" name="ruleName">
            <Input v-model:value={ruleForm.ruleName} placeholder="请输入" />
          </FormItem>
          <FormItem label="能耗分类" name="instrumentType">
            <Select
              placeholder="请选择"
              style="width: 180px"
              v-model:value={ruleForm.instrumentType}
              allowClear
              options={classifyList.value}
              fieldNames={{ label: "categoryName", value: "categoryCode" }}
              onChange={(_value, option) => {
                const opt = (Array.isArray(option) ? option[0] : option) as { categoryName?: string } | undefined;
                ruleForm.instrumentTypeName = opt?.categoryName || "";
              }}
            />
          </FormItem>
          <FormItem label="生效时间" name="effectiveTime">
            <DatePicker v-model:value={ruleForm.effectiveTime} value-format="YYYY-MM-DD" />
          </FormItem>
          <FormItem label="计费方式" name="complexFeeRate">
            <Select
              placeholder="请选择"
              style="width: 180px"
              v-model:value={ruleForm.complexFeeRate}
              options={[
                { label: "单费率", value: "false" },
                { label: "复费率", value: "true" },
              ]}
            />
          </FormItem>
          <FormItem label="阶梯用量" name="stairsEnergyType">
            <Select
              v-model:value={ruleForm.stairsEnergyType}
              placeholder="请选择"
              options={[
                { label: "无", value: "NOTHING" },
                { label: "按月", value: "MONTH" },
                { label: "按年", value: "YEARS" },
              ]}
            />
          </FormItem>
        </Form>
        <div>
          <p
            style="float: right;color:var(--ant-color-primary, #1677ff);cursor: pointer;"
            onClick={() => stairsEnergyContentsList.value.push({ ...ruleItem })}
          >
            添加阶梯
          </p>
          {stairsEnergyContentsList.value.map((item, index) => (
            <div class="table" key={index}>
              <div class="table-head">
                <p>
                  {ruleForm.stairsEnergyType !== "NOTHING" ? (
                    <div style="display: inline-block;margin-left: 10px;">
                      <span>阶梯：</span>
                      <span>{index === 0 ? 0 : stairsEnergyContentsList.value[index - 1].endEnergy}</span>
                      <span>{"<用量≤"}</span>
                      <InputNumber
                        value={item.endEnergy}
                        max={9999999999}
                        min={0}
                        style="width: 100px"
                        placeholder="请输入"
                        onChange={(value: number | string | null) => updateStairField(index, "endEnergy", value)}
                      />
                    </div>
                  ) : null}
                  {ruleForm.complexFeeRate === "false" ? (
                    <div style="display: inline-block;margin-left: 10px;">
                      <span>单价：</span>
                      <InputNumber
                        value={item.price}
                        max={9999999999}
                        min={0}
                        style="width: 100px"
                        placeholder="请输入"
                        onChange={(value: number | string | null) => updateStairField(index, "price", value)}
                      />
                    </div>
                  ) : null}
                </p>
                {stairsEnergyContentsList.value.length > 1 ? (
                  <p
                    style="float: right;color:var(--ant-color-primary, #1677ff);cursor: pointer;"
                    onClick={() => stairsEnergyContentsList.value.splice(index, 1)}
                  >
                    移除
                  </p>
                ) : null}
              </div>
              {ruleForm.complexFeeRate === "true" ? (
                <Table columns={ruleColumns} dataSource={[stairsEnergyContentsList.value[index]]} rowKey="stairs" pagination={false} />
              ) : null}
            </div>
          ))}
        </div>
      </Modal>
    );
  },
});
