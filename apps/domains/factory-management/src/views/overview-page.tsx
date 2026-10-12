import type { RoomRateRecord, RoomStatistics, TenantOverview } from "@g2-contract/factory-management";
import { Empty, Image, PageLayout, Spin, message } from "@g2-platform/pc-ui";
import * as echarts from "echarts";
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import { getFactoryManagementClient, getFactoryManagementTenantCode } from "../domain-context";
import { errorMessage } from "../shared";

import styles from "../styles.module.less";

const FALLBACK_IMAGE = "/resource/v1/factorymanagement-migrate/home4.png";

export const FactoryOverviewPage = defineComponent({
  name: "FactoryManagementOverviewPage",
  setup() {
    const loading = ref(true);
    const overview = ref<TenantOverview>({});
    const statistics = ref<RoomStatistics>({ leaseNum: 0, leaseTotal: 0 });
    const rates = ref<RoomRateRecord[]>([]);
    const pieRef = ref<HTMLDivElement>();
    const barRef = ref<HTMLDivElement>();
    let pieChart: echarts.ECharts | undefined;
    let barChart: echarts.ECharts | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const rentedArea = computed(() => Math.max(0, Number(statistics.value.leaseTotal ?? 0) - Number(statistics.value.leaseNum ?? 0)));
    const rentalRate = computed(() =>
      Number(statistics.value.leaseTotal) > 0 ? ((rentedArea.value / Number(statistics.value.leaseTotal)) * 100).toFixed(2) : "0.00",
    );
    const parkImage = computed(() => overview.value.files?.find((file) => file.path)?.path ?? FALLBACK_IMAGE);

    const renderCharts = (): void => {
      if (pieRef.value) {
        pieChart ??= echarts.init(pieRef.value);
        pieChart.setOption({
          tooltip: { trigger: "item" },
          legend: { bottom: 0, icon: "circle" },
          series: [
            {
              name: "园区租赁面积",
              type: "pie",
              radius: ["52%", "72%"],
              center: ["50%", "44%"],
              label: { show: false },
              data: [
                { value: rentedArea.value, name: "出租面积", itemStyle: { color: "#1677ff" } },
                { value: Number(statistics.value.leaseNum ?? 0), name: "可租面积", itemStyle: { color: "#dbe7f5" } },
              ],
            },
          ],
          graphic: [
            {
              type: "text",
              left: "center",
              top: "35%",
              style: { text: `${rentalRate.value}%`, fontSize: 25, fontWeight: 600, fill: "#1f2937" },
            },
            { type: "text", left: "center", top: "49%", style: { text: "出租率", fontSize: 13, fill: "#8c8c8c" } },
          ],
        });
      }
      if (barRef.value) {
        barChart ??= echarts.init(barRef.value);
        barChart.setOption({
          tooltip: { trigger: "axis", valueFormatter: (value: unknown) => `${String(value)}%` },
          grid: { left: 28, right: 22, top: 24, bottom: 38, containLabel: true },
          xAxis: {
            type: "category",
            data: rates.value.map((item) => item.areaName),
            axisLabel: { interval: 0, rotate: rates.value.length > 8 ? 25 : 0 },
          },
          yAxis: { type: "value", axisLabel: { formatter: "{value}%" }, splitLine: { lineStyle: { color: "#edf0f5" } } },
          series: [
            {
              name: "出租率",
              type: "bar",
              barMaxWidth: 28,
              data: rates.value.map((item) => Number(item.num ?? 0)),
              itemStyle: { color: "#1677ff", borderRadius: [4, 4, 0, 0] },
            },
          ],
        });
      }
    };

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const client = getFactoryManagementClient();
        const tenantCode = getFactoryManagementTenantCode();
        const statisticsTask = client
          .getRoomStatistics()
          .then((result) => {
            statistics.value = result;
          })
          .catch((error: unknown) => message.error(errorMessage(error, "租赁概况加载失败")));
        const ratesTask = client
          .listRoomRates()
          .then((result) => {
            rates.value = result;
          })
          .catch((error: unknown) => message.error(errorMessage(error, "区域出租率加载失败")));
        if (tenantCode) {
          void client
            .getTenantOverview(tenantCode)
            .then((result) => {
              overview.value = result;
            })
            .catch((error: unknown) => message.error(errorMessage(error, "园区基础信息加载失败")));
        } else {
          message.error("未获取到当前租户，园区基础信息加载失败");
        }
        await Promise.all([statisticsTask, ratesTask]);
        await nextTick();
        renderCharts();
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void load();
      resizeObserver = new ResizeObserver(() => {
        pieChart?.resize();
        barChart?.resize();
      });
      if (pieRef.value) {
        resizeObserver.observe(pieRef.value);
      }
      if (barRef.value) {
        resizeObserver.observe(barRef.value);
      }
    });
    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
      pieChart?.dispose();
      barChart?.dispose();
    });

    return () => (
      <PageLayout
        title="园区总览"
        showFooter={false}
        v-slots={{
          "layout-content": () => (
            <Spin spinning={loading.value}>
              <div class={styles.overviewPage}>
                <section class={styles.parkSummary}>
                  <div class={styles.parkImageWrap}>
                    <Image preview={false} src={parkImage.value} fallback={FALLBACK_IMAGE} />
                  </div>
                  <div class={styles.parkInfo}>
                    <div class={styles.metrics}>
                      <div class={styles.metricCard}>
                        <span class={styles.metricIcon}>建</span>
                        <div>
                          <span>总建筑面积</span>
                          <strong>{Number(overview.value.floorArea ?? 0).toLocaleString()}</strong>
                          <small>平方米</small>
                        </div>
                      </div>
                      <div class={styles.metricCard}>
                        <span class={`${styles.metricIcon} ${styles.metricBlue}`}>地</span>
                        <div>
                          <span>占地面积</span>
                          <strong>{Number(overview.value.areaCovered ?? 0).toLocaleString()}</strong>
                          <small>平方米</small>
                        </div>
                      </div>
                    </div>
                    <div class={styles.parkRemark}>{overview.value.remark || "暂无简介"}</div>
                  </div>
                </section>
                <section class={styles.chartGrid}>
                  <article class={styles.chartCard}>
                    <header>
                      <span>租赁概况</span>
                      <b>可租面积 {Number(statistics.value.leaseNum ?? 0).toLocaleString()} ㎡</b>
                    </header>
                    <div ref={pieRef} class={styles.pieChart} />
                  </article>
                  <article class={`${styles.chartCard} ${styles.rateCard}`}>
                    <header>
                      <span>区域出租率</span>
                    </header>
                    {rates.value.length > 0 ? <div ref={barRef} class={styles.barChart} /> : <Empty description="暂无区域出租率数据" />}
                  </article>
                </section>
              </div>
            </Spin>
          ),
        }}
      />
    );
  },
});
