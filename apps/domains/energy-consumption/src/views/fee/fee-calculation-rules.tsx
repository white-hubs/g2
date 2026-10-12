import { defineComponent, h, onMounted, ref } from "vue";

import { RuleModal } from "./components/rule-modal";
import { EnergyCollectConfigList, deleteEnergyChargeRules, getEnergyChargeRules } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import { Button, Form, FormItem, Pagination, PopConfirm, Popover, Select, Table, message } from "@/pc-ui-runtime";
import { usePcQueryState } from "@/pc-ui-runtime";
import { timeFormat } from "@/utils/common";

import "./fee-calculation-rules.less";

export const FeeCalculationRules = defineComponent({
  name: "FeeCalculationRules",
  setup() {
    const queryState = usePcQueryState({
      storage: "url",
      initialState: {
        instrumentType: undefined as string | undefined,
        pageNumber: 1,
        pageSize: 10,
        total: 0,
        pages: 1,
      },
      cacheFields: ["instrumentType", "pageNumber", "pageSize"],
      resolveValue: (field, raw) => {
        if (field === "pageNumber" || field === "pageSize" || field === "pages") return Number(raw);
        return raw;
      },
    });

    const scrollY = ref(200);
    const ruleVisible = ref(false);
    const ruleData = ref<Record<string, unknown> | null>(null);
    const feeLoading = ref(false);
    const classifyList = ref<Array<{ categoryName: string; categoryCode: string }>>([]);
    const tableList = ref<unknown[]>([]);

    const scrollHandle = () => {
      const clientHeight = document.querySelector(".layout-content")?.clientHeight;
      if (clientHeight) scrollY.value = clientHeight - 140;
    };

    const feeColumns = [
      {
        title: "规则名称",
        dataIndex: "ruleName",
        key: "ruleName",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => h(Popover, { content: text }, { default: () => text || "--" }),
      },
      {
        title: "能耗分类",
        dataIndex: "instrumentTypeName",
        key: "instrumentTypeName",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => h(Popover, { content: text }, { default: () => text || "--" }),
      },
      {
        title: "计费方式",
        dataIndex: "complexFeeRate",
        key: "complexFeeRate",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: boolean }) =>
          h(Popover, { content: String(text) }, { default: () => (text ? "复费率" : text === false ? "单费率" : "--") }),
      },
      {
        title: "单价（元h）",
        dataIndex: "stairsEnergyContentsList",
        key: "stairsEnergyContentsList",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text, record }: { text: Array<Record<string, unknown>>; record: { complexFeeRate?: boolean } }) => {
          const item = text?.[0] || {};
          const display = record.complexFeeRate
            ? `${item.fvPrice || "--"}/${item.gvPrice || "--"}/${item.jvPrice || "--"}/${item.pvPrice || "--"}`
            : String(item.price ?? "--");
          return h(Popover, { content: display }, { default: () => display });
        },
      },
      {
        title: "生效时间",
        dataIndex: "effectiveTime",
        key: "effectiveTime",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => timeFormat(text, true),
      },
      {
        title: "创建时间",
        dataIndex: "createTime",
        key: "createTime",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => timeFormat(text, true),
      },
      {
        title: "创建人",
        dataIndex: "createBy",
        key: "createBy",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => h(Popover, { content: text }, { default: () => text ?? "--" }),
      },
      {
        dataIndex: "action",
        title: "操作",
        width: 140,
        fixed: "right" as const,
        customRender: ({ record }: { record: Record<string, unknown> }) => (
          <>
            <PopConfirm title="你确定删除当前数据?" ok-text="确定" cancel-text="取消" onConfirm={() => void deleteData(record)}>
              <Button type="link" danger>
                删除
              </Button>
            </PopConfirm>
            <Button
              type="link"
              onClick={() => {
                ruleData.value = record;
                ruleVisible.value = true;
              }}
            >
              编辑
            </Button>
          </>
        ),
      },
    ];

    const getFeeList = async () => {
      feeLoading.value = true;
      try {
        const { data } = (await getEnergyChargeRules({
          instrumentType: queryState.state.instrumentType,
          total: queryState.state.total,
          pageSize: queryState.state.pageSize,
          pageNumber: queryState.state.pageNumber,
        })) as { data: { records: unknown[]; total: number; pages: number } };
        tableList.value = data.records;
        queryState.state.total = data.total;
        queryState.state.pages = data.pages;
      } finally {
        feeLoading.value = false;
      }
    };

    const deleteData = async (record: Record<string, unknown>) => {
      await deleteEnergyChargeRules({ id: record.id });
      message.success("操作成功");
      await getFeeList();
    };

    const reset = () => {
      queryState.update({ instrumentType: undefined });
      queryState.resetPage();
      void getFeeList();
    };

    onMounted(async () => {
      scrollHandle();
      window.addEventListener("resize", scrollHandle);
      await getFeeList();
      const { data } = (await EnergyCollectConfigList()) as {
        data: Array<{ categoryName: string; categoryCode: string }>;
      };
      classifyList.value = data;
    });

    return () => (
      <GLayout
        title="费用计算规则"
        v-slots={{
          "content-data": () => (
            <>
              <div class="header">
                <Form layout="inline" model={queryState.state}>
                  <FormItem label="能源分类">
                    <Select
                      placeholder="请选择能源分类"
                      style="width: 180px"
                      v-model:value={queryState.state.instrumentType}
                      allowClear
                      options={classifyList.value}
                      fieldNames={{ label: "categoryName", value: "categoryCode" }}
                    />
                  </FormItem>
                  <FormItem>
                    <Button
                      type="primary"
                      onClick={() => {
                        queryState.resetPage();
                        void getFeeList();
                      }}
                    >
                      查询
                    </Button>
                    <Button style="margin-left: 10px" onClick={reset}>
                      重置
                    </Button>
                  </FormItem>
                </Form>
                <Button
                  type="primary"
                  style="margin-left: 10px"
                  onClick={() => {
                    ruleData.value = null;
                    ruleVisible.value = true;
                  }}
                >
                  新建计费规则
                </Button>
              </div>
              <Table
                dataSource={tableList.value}
                columns={feeColumns}
                pagination={false}
                size="small"
                scroll={{ y: scrollY.value }}
                loading={feeLoading.value}
              />
              <div class="footer">
                <Pagination
                  v-model:current={queryState.state.pageNumber}
                  v-model:pageSize={queryState.state.pageSize}
                  showSizeChanger
                  total={queryState.state.total}
                  showTotal={(total: number) => `共 ${total} 条 第${queryState.state.pageNumber}/${queryState.state.pages}页`}
                  onChange={(current: number, pageSize: number) => {
                    queryState.setPage(current || 1, pageSize);
                    void getFeeList();
                  }}
                />
              </div>
            </>
          ),
          default: () =>
            ruleVisible.value ? (
              <RuleModal
                visible={ruleVisible.value}
                data={ruleData.value}
                onClose={() => {
                  ruleVisible.value = false;
                  void getFeeList();
                }}
              />
            ) : null,
        }}
      />
    );
  },
});
