import { defineComponent, onMounted, reactive, ref } from "vue";

import { getAssetsFile } from "../../../utils/index";
import PanelCard from "../../card/card";
import PieChart from "../../chart/piec/piec";
import SelectBtn from "../../select-btn/select-btn";
import { cubeSafetyManagementMarketService, cubeSafetyManagementStatService } from "@/api/server";
import { Select } from "@/pc-ui-runtime";
import { PeriodStatTypeEnum } from "@/types/protocol";

import "./safety-card.less";

type AlarmStatusStat = any;
type PropertyFilingData = any;

interface SafetyCardState {
  period: PeriodStatTypeEnum;
  alarmTotal: AlarmStatusStat;
  options: { value: string; label: string }[];
  marketId: string;
  value: string;
  isbig: boolean;
  jd: PropertyFilingData;
  selectList: { label: string; value: string }[];
  chartData: { name: string; value: number }[];
}

export default defineComponent({
  name: "SafetyCard",
  emits: ["close"],
  setup(props, { emit }) {
    const total = ref(0);

    const state = reactive<SafetyCardState>({
      period: PeriodStatTypeEnum.TODAY,
      alarmTotal: {
        actualNum: 0,
        actualRatio: "0",
        handlerNum: 0,
        progressConfirmedNum: 0,
        timeoutNotHandlerNum: 0,
        totalNum: 0,
        unConfirmedNum: 0,
      },
      options: [],
      marketId: "",
      value: "",
      isbig: true,
      jd: {
        electricVehicleNum: 0,
        fireFightingEquipmentNum: 0,
        flammableEquipmentNum: 0,
        fireFightingEquipmentExpiredNum: 0,
        looseWorksNum: 0,
      },
      selectList: [
        { label: "今日", value: PeriodStatTypeEnum.TODAY },
        { label: "本周", value: PeriodStatTypeEnum.THIS_WEEK },
        { label: "本月", value: PeriodStatTypeEnum.THIS_MONTH },
        { label: "今年", value: PeriodStatTypeEnum.THIS_YEAR },
      ],
      chartData: [],
    });

    const getlist = async (): Promise<void> => {
      const now = new Date();
      const [status, ratio, filing] = await Promise.all([
        cubeSafetyManagementStatService.alarmStatusStat({
          tenantID: state.marketId,
          time: now,
          type: state.period,
        }),
        cubeSafetyManagementStatService.alarmActualRatioStat({
          tenantID: state.marketId,
          time: now,
          type: state.period,
        }),
        cubeSafetyManagementStatService.propertyFilingStat({
          tenantID: state.marketId,
          time: now,
          type: state.period,
        }),
      ]);

      state.alarmTotal = status as AlarmStatusStat;
      state.jd = filing as PropertyFilingData;
      total.value = 0;
      state.chartData = (ratio as Array<{ name: string; actualNum: number }>).map((item) => {
        total.value += item.actualNum;
        return {
          name: item.name,
          value: item.actualNum,
        };
      });
    };

    const handleChangeselect = (item: unknown): void => {
      const next = item == null ? "" : String(item);
      state.marketId = next;
      state.value = next;
      getlist();
    };

    const changeType = async (item: PeriodStatTypeEnum): Promise<void> => {
      state.period = item;
      getlist();
    };

    onMounted(async () => {
      const saftyElement = document.getElementById("safty");
      if (saftyElement) {
        if (saftyElement.parentNode) {
          state.isbig = (saftyElement.parentNode as unknown as { className: string[] }).className.includes("flex1");
        }
      }

      const data = (await cubeSafetyManagementMarketService.listMarket()) as { marketTenant: string; marketName: string }[];
      state.options = data.map((item) => ({
        value: item.marketTenant,
        label: item.marketName,
      }));

      changeType(PeriodStatTypeEnum.TODAY);
    });

    const handleClose = (): void => {
      emit("close");
    };

    const renderNumBlock = (title: string, value: number) => (
      <div class="num">
        {title}
        <div>{value}</div>
      </div>
    );

    const renderFireBlock = (title: string, value: number, icon: string, className: string) => (
      <div class={`num ${className}`}>
        {title}
        <div>{value || 0}</div>
        <img style={{ width: "40px", height: "40px" }} src={getAssetsFile(icon)} alt="" />
      </div>
    );

    return () => (
      <PanelCard title="安全管理总部" icon="icon-baojinghuizong" onClose={handleClose}>
        {{
          btn: () => (
            <div style={{ display: "flex", alignItems: "center" }}>
              <SelectBtn style={{ marginRight: "10px" }} list={state.selectList} onChange={changeType} />
              <Select
                value={state.value}
                allowClear
                style={{ width: "200px" }}
                options={state.options}
                onChange={handleChangeselect}
                placeholder="请选择市场"
              />
            </div>
          ),
          default: () => (
            <div class="alarmOverview-container">
              <div class="alarmOverview">
                <div class="alarm">
                  {renderNumBlock("报警总数", state.alarmTotal.totalNum)}
                  {renderNumBlock("未处理报警数", state.alarmTotal.progressConfirmedNum)}
                  {renderNumBlock("未响应报警数", state.alarmTotal.unConfirmedNum)}
                  {renderNumBlock("已处理报警数", state.alarmTotal.handlerNum)}
                </div>
                <div class="alarmOverview-chart">
                  <PieChart chartData={state.chartData} total={total.value} />
                </div>
              </div>

              <div class="fire">
                {renderFireBlock("电动车建档", state.jd.electricVehicleNum, "ddc.png", "one")}
                {renderFireBlock("消防设备建档", state.jd.fireFightingEquipmentNum, "hxfs.png", "two")}
                {renderFireBlock("易燃设备建档", state.jd.flammableEquipmentNum, "h.png", "three")}
                {renderFireBlock("消防设备过期", state.jd.fireFightingEquipmentExpiredNum, "xfs.png", "four")}
                {renderFireBlock("小散工程", state.jd.looseWorksNum, "xsgc.png", "five")}
              </div>
            </div>
          ),
        }}
      </PanelCard>
    );
  },
});
