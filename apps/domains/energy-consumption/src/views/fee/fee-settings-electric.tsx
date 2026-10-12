import { defineComponent, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { PriceItem } from "./components/price-item";
import { StepItem } from "./components/step-item";
import { TimeRangeItem } from "./components/time-range-item";
import { chargeTypeE, getChargeConfig, instrumentTypeE, saveChargeConfig } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import { Button, RadioGroup, Spin, message } from "@/pc-ui-runtime";
import type { PeriodDefinesState, PeriodPricesState, UsagePricesState } from "@/types/fee";

import "./fee-settings-form.less";

const BASE = "/d/energy-consumption";

export const FeeSettingsElectric = defineComponent({
  name: "FeeSettingsElectric",
  setup() {
    const router = useRouter();
    const chargeType = ref("FPG");
    const chargeTypeOptions = [
      { label: "复合收费", value: "FPG" },
      { label: "阶梯收费", value: "JTJ" },
    ];
    const isLoading = ref(false);
    const btnLoading = ref(false);
    const isJTJ = ref(false);
    const priceRef = ref<{
      addItem: () => void;
      validateForm: () => Promise<{ items: PeriodPricesState[] } | undefined>;
      resetForm: () => void;
    }>();
    const timeRangeRef = ref<{
      addItem: () => void;
      validateForm: () => Promise<{ items: PeriodDefinesState[] } | undefined>;
      resetForm: () => void;
    }>();
    const stepRef = ref<{
      addItem: () => void;
      validateForm: () => Promise<{ items: UsagePricesState[] } | undefined>;
      resetForm: () => void;
    }>();
    const periodPrices = ref<PeriodPricesState[]>([]);
    const periodDefines = ref<PeriodDefinesState[]>([]);
    const usagePrices = ref<UsagePricesState[]>([]);

    const defaultConfig = () => {
      if (!periodPrices.value?.length) {
        periodPrices.value = [{ periodType: "PV", price: undefined }];
        periodDefines.value = [{ periodType: "PV", time: ["00:00:00", "23:59:59"] }];
      }
      if (isJTJ.value && (!usagePrices.value || !usagePrices.value.length)) {
        usagePrices.value = [{ endUsage: undefined, price: undefined, startUsage: undefined }];
      }
    };

    const queryConfig = async () => {
      isLoading.value = true;
      try {
        const result = (await getChargeConfig({ instrumentType: instrumentTypeE.ELECTRIC })) as {
          data?: {
            chargeType?: string;
            periodPrices?: PeriodPricesState[];
            usagePrices?: UsagePricesState[];
            periodDefines?: Array<{ periodType: string; startTime: string; endTime: string }>;
          };
        };
        chargeType.value = result.data?.chargeType || "FPG";
        periodPrices.value = result.data?.periodPrices || [];
        usagePrices.value = result.data?.usagePrices || [];
        let times: PeriodDefinesState[] = [];
        if (result.data?.periodDefines) {
          times = result.data.periodDefines.map((item) => ({
            periodType: item.periodType,
            time: [item.startTime, item.endTime] as [string, string],
          }));
        }
        periodDefines.value = times || [];
        defaultConfig();
      } finally {
        isLoading.value = false;
      }
    };

    const submitForm = async () => {
      if (btnLoading.value) return;
      let params: Record<string, unknown> = {};
      if (isJTJ.value) {
        const step = await stepRef.value?.validateForm();
        params = {
          instrumentType: instrumentTypeE.ELECTRIC,
          chargeType: chargeType.value || chargeTypeE.fpg,
          usagePrices: step?.items,
        };
      } else {
        const price = await priceRef.value?.validateForm();
        const timeRange = await timeRangeRef.value?.validateForm();
        let times: Array<{ periodType: string | number | undefined; startTime: string; endTime: string }> = [];
        if (timeRange?.items?.length) {
          times = timeRange.items.map((item) => ({
            periodType: item.periodType,
            startTime: item.time?.[0] || "",
            endTime: item.time?.[1] || "",
          }));
        }
        params = {
          instrumentType: instrumentTypeE.ELECTRIC,
          chargeType: chargeType.value || chargeTypeE.fpg,
          periodPrices: price?.items,
          periodDefines: times,
        };
      }
      btnLoading.value = true;
      try {
        await saveChargeConfig(params);
        message.success("操作成功");
        await queryConfig();
      } finally {
        btnLoading.value = false;
      }
    };

    const resetForm = () => {
      priceRef.value?.resetForm();
      timeRangeRef.value?.resetForm();
      stepRef.value?.resetForm();
    };

    watch(
      () => chargeType.value,
      (value) => {
        if (value === "FPG") isJTJ.value = false;
        if (value === "JTJ") {
          isJTJ.value = true;
          defaultConfig();
        }
      },
    );

    onMounted(() => {
      void queryConfig();
    });

    return () => (
      <GLayout
        title="电费配置"
        showSearch={false}
        showFooter
        v-slots={{
          "content-table": () => (
            <Spin spinning={isLoading.value}>
              <div class="fee_setting">
                <div class="item">
                  <div class="title">
                    <span class="tit-left">计费方式：</span>
                    <RadioGroup v-model:value={chargeType.value} options={chargeTypeOptions} />
                  </div>
                </div>
                {!isJTJ.value ? (
                  <>
                    <div class="item">
                      <div class="title">
                        <span class="tit-left">费率价格：</span>
                        <Button type="primary" onClick={() => priceRef.value?.addItem()}>
                          添加
                        </Button>
                      </div>
                      <div class="content">
                        <PriceItem ref={priceRef} placeholder={["费率时段", "费率价格"]} items={periodPrices.value} />
                      </div>
                    </div>
                    <div class="item">
                      <div class="title">
                        <span class="tit-left">费率时段：</span>
                        <Button type="primary" onClick={() => timeRangeRef.value?.addItem()}>
                          添加
                        </Button>
                      </div>
                      <div class="content">
                        <TimeRangeItem ref={timeRangeRef} placeholder={["费率时段", "起止时间"]} items={periodDefines.value} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div class="item">
                    <div class="title">
                      <span class="tit-left">阶梯：</span>
                      <Button type="primary" onClick={() => stepRef.value?.addItem()}>
                        添加
                      </Button>
                      <span class="fee-hint">用电量阶梯收费方式配置</span>
                    </div>
                    <div class="content">
                      <StepItem ref={stepRef} min={0} placeholder={["用电量最小值", "用电量最大值", "费用"]} items={usagePrices.value} />
                    </div>
                  </div>
                )}
              </div>
            </Spin>
          ),
          "footer-btn": () => (
            <>
              <Button class="ml-90px" type="primary" loading={btnLoading.value} onClick={() => void submitForm()}>
                保存
              </Button>
              <Button class="ml-20px" onClick={resetForm}>
                重置
              </Button>
            </>
          ),
          "footer-page": () => (
            <Button class="ml-20px" onClick={() => void router.push(`${BASE}/fee-settings`)}>
              返回
            </Button>
          ),
        }}
      />
    );
  },
});
