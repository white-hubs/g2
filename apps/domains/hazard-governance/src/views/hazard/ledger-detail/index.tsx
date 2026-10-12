import type { HazardDetailVO } from "@g2-contract/hazard-governance";
import { computed, defineComponent, onMounted, shallowRef, watch } from "vue";
import type { VNodeChild } from "vue";
import { useRoute, useRouter } from "vue-router";

import { goBack, useLayoutTitle } from "../shared/page";
import { BasicDetail } from "./basic-detail";
import { type HazardDetailResponse, unwrapHazardDetail } from "./detail-utils";
import { OperationLogs } from "./operation-logs";
import { useAuthRequest } from "@/api/request";
import { getHazardDetail } from "@/api/server";
import { PageLayout as PcLayout } from "@/pc-ui-runtime";
import { Button, Space, Spin, TabPane, Tabs, message } from "@/pc-ui-runtime";

import "./index.less";

export const HazardLedgerDetail = defineComponent({
  name: "HazardLedgerDetail",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const detail = shallowRef<HazardDetailVO>();
    const loading = shallowRef(false);
    const hazardId = computed(() => String(route.query.id ?? ""));

    const loadDetail = async (): Promise<void> => {
      if (!hazardId.value) {
        detail.value = undefined;
        message.warning("缺少隐患ID");
        return;
      }
      loading.value = true;
      try {
        const response = await useAuthRequest(() => getHazardDetail(hazardId.value));
        detail.value = unwrapHazardDetail(response as HazardDetailResponse);
        if (!detail.value) {
          message.warning("隐患详情数据为空");
        }
      } catch (error) {
        console.error(error);
        message.error("隐患详情加载失败");
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadDetail);
    watch(hazardId, () => {
      void loadDetail();
    });

    const renderContent = (): VNodeChild => {
      const currentDetail = detail.value;
      if (!currentDetail?.basicInfo) {
        return <div class="hazard-ledger-empty">暂无详情数据</div>;
      }
      return (
        <Tabs>
          <TabPane key="base" tab="基本详情">
            <BasicDetail detail={currentDetail} />
          </TabPane>
          <TabPane key="logs" tab="操作日志">
            <OperationLogs detail={currentDetail} />
          </TabPane>
        </Tabs>
      );
    };

    const slots = {
      "layout-content": () => (
        <div class="hazard-stack hazard-ledger-detail">
          <div class="hazard-ledger-detail-tabs">
            <Spin spinning={loading.value}>{renderContent()}</Spin>
          </div>
        </div>
      ),
      "footer-page": () => (
        <Space>
          <Button onClick={() => goBack(router, { name: "hazard-ledger" })}>返回</Button>
        </Space>
      ),
    };

    return () => <PcLayout title={useLayoutTitle("隐患详情")} v-slots={slots} />;
  },
});
