import { defineComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { EnergyGateList } from "@/api";
import iconF1 from "@/assets/icon_f1.png";
import iconF2 from "@/assets/icon_f2.png";
import iconF3 from "@/assets/icon_f3.png";
import iconF4 from "@/assets/icon_f4.png";
import { GLayout } from "@/components/common/g-layout";

import "./fee-settings.less";

const BASE = "/d/energy-consumption";

interface FeeNavItem {
  path: string;
  text: string;
  icon: string;
  type: string;
}

export const FeeSettings = defineComponent({
  name: "FeeSettings",
  setup() {
    const router = useRouter();
    const navList = ref<FeeNavItem[]>([
      { path: `${BASE}/fee-settings/electric`, text: "电费配置", icon: iconF1, type: "electricity_meter" },
      { path: `${BASE}/fee-settings/water`, text: "水费配置", icon: iconF2, type: "water_meter" },
      { path: `${BASE}/fee-settings/gas`, text: "燃气费配置", icon: iconF3, type: "gas_meter" },
      { path: "", text: "热力费配置", icon: iconF4, type: "vapour" },
    ]);

    const queryConfig = async () => {
      const { data } = (await EnergyGateList()) as {
        data: Array<{ open: boolean; energyType: string }>;
      };
      const tabList = data.filter((item) => item.open).map((item) => item.energyType);
      navList.value = navList.value.filter((item) => tabList.includes(item.type));
    };

    onMounted(() => {
      void queryConfig();
    });

    return () => (
      <GLayout
        title="费用设置"
        showSearch={false}
        v-slots={{
          "content-table": () => (
            <div class="fee">
              {navList.value.map((item, index) =>
                item.path ? (
                  <a
                    key={index}
                    class="item"
                    href={item.path}
                    onClick={(e: Event) => {
                      e.preventDefault();
                      void router.push(item.path);
                    }}
                  >
                    <div class="wrap">
                      <span class="text">{item.text}</span>
                      <img src={item.icon} class="icon" alt="" />
                    </div>
                  </a>
                ) : (
                  <div key={index} class="item not">
                    <div class="wrap">
                      <span class="text">{item.text}</span>
                      <img src={item.icon} class="icon" alt="" />
                    </div>
                  </div>
                ),
              )}
            </div>
          ),
        }}
      />
    );
  },
});
