import { createApp, defineComponent, ref } from "vue";

import { AssetChoiceControl, AssetTableControl, ConsumablesOutReadonlyControl } from "./asset-controls";
import type { AssetControlClient, AssetRow } from "./asset-model";
import { DeviceSnapshotControl, OfficialAutofillControl, OfficialSelectControl, WorkStatusControl } from "./official-retrofit-controls";
import type { BusinessChoice, DeviceProperty, OfficialRetrofitClient } from "./official-retrofit-model";

const client: AssetControlClient & OfficialRetrofitClient = {
  listAssetClassifications: async () => [{ id: "source-1", name: "采购", code: "PURCHASE" }],
  listAssetClassificationTree: async () => [{ id: "type-1", name: "办公设备" }],
  listAssetWarehouses: async () => [{ id: "store-1", name: "中央仓库" }],
  pageAssets: async () => ({
    records: [
      {
        id: "asset-1",
        serialNumber: "AS-001",
        financeNumber: "FI-001",
        name: "打印机",
        typeName: "办公设备",
        adminName: "张工",
        purchaseDate: "2026-09-24",
        price: 800,
        norms: "A4",
        unit: "台",
        number: 1,
      },
    ],
    total: 1,
  }),
  pageConsumables: async () => ({
    records: [
      { id: "cons-1", code: "CO-001", name: "墨盒", model: "黑色", brand: "品牌A", categoryName: "办公耗材", unit: "盒", stock: 5 },
    ],
    total: 1,
  }),
  listConsumableCategories: async () => [{ id: "cat-1", name: "办公耗材" }],
  checkAssetCodes: async () => [],
  listOfficialSeals: async () => [{ id: "seal-1", name: "公章" }],
  listFocusWorkTypes: async () => [{ id: "type-1", name: "常规督办" }],
  getFocusWork: async () => ({ id: "focus-1", name: "重点事项" }),
  listFocusWork: async () => [{ id: "focus-1", name: "重点事项" }],
  listFocusWorkStatuses: async () => [{ id: "active", name: "处理中" }],
  getFocusWorkRequirement: async () => ({ id: "req-1", name: "按期完成" }),
  getFocusWorkCompleteTime: async () => ({ id: "time-1", name: "2026-09-30" }),
  getNorthDeviceDetail: async () => ({
    productPropVoList: [
      { propCode: "mode", propName: "运行模式", dataType: "enum", dataConstraint: [{ value: "1", label: "自动" }] },
      { propCode: "pressure", propName: "压力", unitName: "Pa" },
    ],
    snapshots: [
      { key: "mode", value: "1" },
      { key: "pressure", value: 0 },
    ],
  }),
};

const Qa = defineComponent({
  setup() {
    const source = ref<BusinessChoice | null>(null);
    const seal = ref<BusinessChoice | null>(null);
    const chosen = ref<AssetRow[]>([]);
    const entered = ref<AssetRow[]>([]);
    const status = ref<BusinessChoice | null>(null);
    const progress = ref(0);
    const snapshot = ref<DeviceProperty[]>([]);
    const requirementSource = ref("focus-1");
    const requirement = ref<BusinessChoice | null>({ id: "saved-requirement", name: "已保存要求" });
    return () => (
      <main style={{ maxWidth: "1180px", margin: "30px auto", padding: "20px", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: "22px" }}>资产与行政控件验收</h1>
        <section>
          <h2 style={{ fontSize: "16px" }}>资产选择</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
            <label>
              资产来源
              <AssetChoiceControl
                kind="AssetSource"
                value={source.value}
                client={client}
                onUpdate:value={(next: BusinessChoice | null) => {
                  source.value = next;
                }}
              />
            </label>
            <label>
              印章类别
              <OfficialSelectControl
                kind="OfficialSealList"
                value={seal.value}
                client={client}
                onUpdate:value={(next: BusinessChoice | null) => {
                  seal.value = next;
                }}
              />
            </label>
          </div>
          <AssetTableControl
            kind="ChooseAssetTable"
            value={chosen.value}
            client={client}
            businessType="PROPERTY_MANAGEMENT"
            onUpdate:value={(next: AssetRow[]) => {
              chosen.value = next;
            }}
          />
          <output id="asset-value">{JSON.stringify(chosen.value)}</output>
        </section>
        <section>
          <h2 style={{ fontSize: "16px" }}>事项联动</h2>
          <WorkStatusControl
            value={status.value}
            progress={progress.value}
            onUpdate:value={(next: BusinessChoice | null) => {
              status.value = next;
            }}
            onUpdate:progress={(next: number) => {
              progress.value = next;
            }}
          />
          <output id="progress-value">{progress.value}</output>
        </section>
        <section>
          <h2 style={{ fontSize: "16px" }}>工作要求</h2>
          <OfficialAutofillControl
            kind="FocusWorkRequirement"
            value={requirement.value}
            sourceId={requirementSource.value}
            client={client}
            onUpdate:value={(next: BusinessChoice | null) => {
              requirement.value = next;
            }}
          />
          <output id="requirement-value">{JSON.stringify(requirement.value)}</output>
          <button
            type="button"
            onClick={() => {
              requirementSource.value = "focus-2";
            }}
          >
            切换事项
          </button>
        </section>
        <section>
          <h2 style={{ fontSize: "16px" }}>设备快照</h2>
          <DeviceSnapshotControl
            kind="DeviceStatus"
            value={snapshot.value}
            deviceId="device-1"
            client={client}
            onUpdate:value={(next: DeviceProperty[]) => {
              snapshot.value = next;
            }}
          />
        </section>
        <section>
          <h2 style={{ fontSize: "16px" }}>耗材入库</h2>
          <AssetTableControl
            kind="ConsumablesEnter"
            value={entered.value}
            client={client}
            onUpdate:value={(next: AssetRow[]) => {
              entered.value = next;
            }}
          />
          <output id="entered-value">{JSON.stringify(entered.value)}</output>
        </section>
        <section>
          <h2 style={{ fontSize: "16px" }}>耗材只读金额</h2>
          <ConsumablesOutReadonlyControl
            value={[{ id: "cons-1", name: "墨盒", code: "CO-001", avgPrice: 7.35, num: 2, storeAmount: 99 }]}
          />
        </section>
      </main>
    );
  },
});

createApp(Qa).mount("#app");
