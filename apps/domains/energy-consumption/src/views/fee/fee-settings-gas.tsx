import { defineComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { StepItem } from "./components/step-item";
import { chargeTypeE, getChargeConfig, instrumentTypeE, saveChargeConfig } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import { Button, Spin, message } from "@/pc-ui-runtime";
import type { UsagePricesState } from "@/types/fee";

import "./fee-settings-form.less";

export const FeeSettingsGas = defineComponent({
  name: "FeeSettingsGas",
  setup() {
    const router = useRouter();
    const isLoading = ref(false);
    const btnLoading = ref(false);
    const chargeType = ref("JTJ");
    const stepRef = ref<{
      addItem: () => void;
      validateForm: () => Promise<{ items: UsagePricesState[] } | undefined>;
      resetForm: () => void;
    }>();
    const usagePrices = ref<UsagePricesState[]>([]);

    const defaultConfig = () => {
      if (!usagePrices.value?.length) {
        usagePrices.value = [{ endUsage: undefined, price: undefined, startUsage: undefined }];
      }
    };

    const queryConfig = async () => {
      isLoading.value = true;
      try {
        const result = (await getChargeConfig({ instrumentType: instrumentTypeE.GAS })) as {
          data?: { chargeType?: string; usagePrices?: UsagePricesState[] };
        };
        chargeType.value = result.data?.chargeType || "JTJ";
        usagePrices.value = result.data?.usagePrices || [];
        defaultConfig();
      } finally {
        isLoading.value = false;
      }
    };

    const submitForm = async () => {
      if (btnLoading.value) return;
      const step = await stepRef.value?.validateForm();
      const params = {
        chargeType: chargeType.value || chargeTypeE.jtj,
        instrumentType: instrumentTypeE.GAS,
        usagePrices: step?.items,
      };
      btnLoading.value = true;
      try {
        await saveChargeConfig(params);
        message.success("操作成功");
        await queryConfig();
      } finally {
        btnLoading.value = false;
      }
    };

    onMounted(() => {
      void queryConfig();
    });

    return () => (
      <GLayout
        title="燃气费配置"
        showSearch={false}
        showFooter
        v-slots={{
          "content-table": () => (
            <Spin spinning={isLoading.value}>
              <div class="fee_setting">
                <div class="item">
                  <div class="title">
                    <span class="tit-left">阶梯：</span>
                    <Button type="primary" onClick={() => stepRef.value?.addItem()}>
                      添加
                    </Button>
                    <span class="fee-hint">用量阶梯收费方式配置</span>
                  </div>
                  <div class="content">
                    <StepItem
                      ref={stepRef}
                      min={1}
                      placeholder={["燃气用量最小值", "燃气用量最大值", "费用"]}
                      unit="m³"
                      items={usagePrices.value}
                    />
                  </div>
                </div>
              </div>
            </Spin>
          ),
          "footer-btn": () => (
            <>
              <Button class="ml-90px" type="primary" loading={btnLoading.value} onClick={() => void submitForm()}>
                保存
              </Button>
              <Button class="ml-20px" onClick={() => stepRef.value?.resetForm()}>
                重置
              </Button>
            </>
          ),
          "footer-page": () => (
            <Button class="ml-20px" onClick={() => router.go(-1)}>
              返回
            </Button>
          ),
        }}
      />
    );
  },
});
