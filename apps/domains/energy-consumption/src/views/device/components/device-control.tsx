import { defineComponent, onMounted, ref, watch, type PropType } from "vue";

import { EnumerateAttribute } from "./device-attribute/enumerate-attribute";
import { SetStringAttribute } from "./device-attribute/set-string-attribute";
import { SetValueAttribute } from "./device-attribute/set-value-attribute";
import { SwitchAttribute } from "./device-attribute/switch-attribute";
import { unwrapData } from "@/api/unwrap";
import { getDeviceCenterClient } from "@/domain-context";
import { Col, Row } from "@/pc-ui-runtime";

import "./device-control.less";

export type DeviceAttributeItem = {
  precision?: number;
  attributeCode: string;
  attributeName: string;
  dataType: string;
  permission: string;
  valueMin?: unknown;
  valueMax?: unknown;
  attributeKeyValueVos?: Array<{ label: string; value: string | number | boolean }>;
  unitName?: string;
  value?: string | number | boolean;
};

/**
 * 将 getDeviceIotDetail 响应映射为旧 GHIotSocket.deviceDetail 的 dataArr 结构，
 * 首版只做读 + 写，不订阅 socket。
 */
function mapIotDetailToDataArr(raw: unknown): DeviceAttributeItem[] {
  const data = unwrapData<Record<string, unknown>>(raw) || {};
  const root = data && typeof data === "object" ? data : {};
  const productPropVoList = (Array.isArray(root.productPropVoList) ? root.productPropVoList : []) as Array<Record<string, unknown>>;
  const snapshots = (Array.isArray(root.snapshots) ? root.snapshots : []) as Array<{ key?: string; value?: string }>;
  const snapMap = new Map(snapshots.map((s) => [String(s.key || ""), s.value ?? ""]));

  return productPropVoList.map((product) => {
    const code = String(product.propCode || "");
    const constraint = Array.isArray(product.dataConstraint) ? (product.dataConstraint as unknown[]) : [];
    return {
      precision: product.precision as number | undefined,
      attributeCode: code,
      attributeName: String(product.propName || code),
      dataType: String(product.dataType || ""),
      permission: product.dataWrite ? "READ_WRITE" : "READ",
      valueMin: constraint[0],
      valueMax: constraint[1],
      attributeKeyValueVos: constraint as Array<{ label: string; value: string | number | boolean }>,
      unitName: String(product.unitName || ""),
      value: snapMap.get(code) ?? "",
    };
  });
}

function displayEnumValue(item: DeviceAttributeItem, value: unknown): string {
  const vos = item.attributeKeyValueVos || [];
  const hit = vos.find((e) => String(e.value) === String(value));
  return hit?.label || "--";
}

/**
 * 设备特性只读 + 设备控制读写面板。
 * 初始数据走 device-center.getDeviceIotDetail（与旧 GHIotSocket.deviceDetail 同源），写值走 attributeWriteValue。
 */
export const DeviceControl = defineComponent({
  name: "DeviceControl",
  props: {
    deviceId: { type: [String, Number] as PropType<string | number>, default: "" },
    show: { type: Boolean, default: false },
    instrumentType: { type: String, default: "" },
  },
  setup(props) {
    const readData = ref<DeviceAttributeItem[]>([]);
    const readAndWritData = ref<DeviceAttributeItem[]>([]);
    const attributeValue = ref<Record<string, string | number | boolean>>({});

    const load = async () => {
      const deviceId = String(props.deviceId || "");
      if (!deviceId) {
        readData.value = [];
        readAndWritData.value = [];
        attributeValue.value = {};
        return;
      }
      try {
        const client = await getDeviceCenterClient();
        const raw = await client.getDeviceIotDetail(deviceId, { withSnapShot: true, withPropertySpec: true });
        const dataArr = mapIotDetailToDataArr(raw);
        const excludeCode = ["pressure", "natural_gas_concentration"];
        readData.value = dataArr.filter((item) => item.permission === "READ" && !excludeCode.includes(item.attributeCode));
        readAndWritData.value = dataArr.filter((item) => item.permission === "READ_WRITE");
        attributeValue.value = Object.fromEntries(dataArr.map((item) => [item.attributeCode, item.value ?? ""]));
      } catch {
        readData.value = [];
        readAndWritData.value = [];
        attributeValue.value = {};
      }
    };

    onMounted(() => {
      void load();
    });

    watch(
      () => props.deviceId,
      () => {
        void load();
      },
    );

    return () => (
      <div>
        {readData.value.length ? (
          <div class="field-data">
            <p>|| 设备特性</p>
            <div class="fireControlMsg">
              {readData.value.map((item, index) => (
                <div class="fireControlMsg-item" key={`${item.attributeCode}-${index}`}>
                  <div class="fireControlMsg-item-left">{item.attributeName}：</div>
                  <div class="fireControlMsg-item-right">
                    {item.attributeKeyValueVos?.length && (item.dataType === "enum" || item.dataType === "boolean")
                      ? displayEnumValue(item, attributeValue.value[item.attributeCode])
                      : attributeValue.value[item.attributeCode]
                        ? `${attributeValue.value[item.attributeCode]} ${item.unitName || ""}`
                        : "--"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {readAndWritData.value.length ? (
          <div style={props.show ? "width: 180%;transform: translateX(-200px)" : undefined}>
            <div class="item-title">设备控制</div>
            <div class="fireControlMsg-control">
              <Row gutter={[16, 16]} style="margin-left: 0; margin-right: 0">
                {readAndWritData.value.map((item) => {
                  const type = item.dataType.toLowerCase();
                  return (
                    <Col span={8} key={item.attributeCode}>
                      <div class="column">
                        {type === "boolean" ? (
                          <SwitchAttribute
                            attributeItem={item}
                            deviceId={props.deviceId}
                            curValue={attributeValue.value[item.attributeCode]}
                          />
                        ) : type === "enum" ? (
                          <EnumerateAttribute
                            attributeItem={item}
                            deviceId={props.deviceId}
                            curValue={attributeValue.value[item.attributeCode]}
                          />
                        ) : type === "string" ? (
                          <SetStringAttribute
                            attributeItem={item}
                            deviceId={props.deviceId}
                            curValue={attributeValue.value[item.attributeCode] as string | number}
                          />
                        ) : (
                          <SetValueAttribute
                            attributeItem={item}
                            deviceId={props.deviceId}
                            curValue={attributeValue.value[item.attributeCode] as string | number}
                          />
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          </div>
        ) : null}
      </div>
    );
  },
});
