import type { DeviceCenterClient } from "@g2-client/device-center/client";
import { Button, Col, Empty, Image, Input, Radio, RadioGroup, Row, Space, Spin, Switch, message } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";

import styles from "./device-basic-data.module.css";

const GEM_ASSETS = "/resource/v1/generic-equipment-monitor-migrate";

type AttrItem = {
  attributeCode: string;
  attributeName: string;
  dataType: string;
  permission: string;
  unitName?: string;
  value?: string | number | boolean;
  attributeKeyValueVos?: Array<{ label: string; value: string | number }>;
  valueMin?: unknown;
  valueMax?: unknown;
};

type DeviceInfo = {
  baseArchivesInfo?: {
    name?: string;
    code?: string;
    status?: { onlineState?: boolean };
    area?: { name?: string; pathName?: string; pathId?: string };
  };
  productInfo?: { name?: string; picture?: string; id?: string };
  picture?: string;
  areaName?: string;
};

function unwrap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const root = raw as Record<string, unknown>;
  if (root.data && typeof root.data === "object") return root.data as Record<string, unknown>;
  return root;
}

function mapIotDetailToAttrs(raw: unknown): AttrItem[] {
  const data = unwrap(raw);
  const props = (Array.isArray(data.productPropVoList) ? data.productPropVoList : []) as Array<Record<string, unknown>>;
  const snaps = (Array.isArray(data.snapshots) ? data.snapshots : []) as Array<{ key?: string; value?: string }>;
  const snapMap = new Map(snaps.map((s) => [String(s.key || ""), s.value ?? ""]));
  return props.map((product) => {
    const code = String(product.propCode || "");
    const constraint = product.dataConstraint;
    return {
      attributeCode: code,
      attributeName: String(product.propName || code),
      dataType: String(product.dataType || ""),
      permission: product.dataWrite ? "READ_WRITE" : "READ",
      unitName: String(product.unitName || ""),
      value: snapMap.get(code) ?? "",
      attributeKeyValueVos: Array.isArray(constraint) ? (constraint as Array<{ label: string; value: string | number }>) : [],
      valueMin: Array.isArray(constraint) ? constraint[0] : undefined,
      valueMax: Array.isArray(constraint) ? constraint[1] : undefined,
    };
  });
}

function displayEnumValue(item: AttrItem, value: unknown): string {
  const vos = item.attributeKeyValueVos || [];
  const hit = vos.find((e) => String(e.value) === String(value));
  return hit?.label || (value != null && value !== "" ? String(value) : "--");
}

export default defineComponent({
  name: "GemDeviceBasicData",
  props: {
    deviceId: { type: String, required: true },
    getDeviceClient: { type: Function as PropType<() => Promise<DeviceCenterClient>>, required: true },
  },
  setup(props) {
    const loading = ref(true);
    const error = ref("");
    const deviceData = ref<DeviceInfo | null>(null);
    const attrs = ref<AttrItem[]>([]);
    const attributeValue = reactive<Record<string, string | number | boolean>>({});
    const writeDraft = reactive<Record<string, string>>({});

    const online = computed(() => Boolean(deviceData.value?.baseArchivesInfo?.status?.onlineState));
    const readData = computed(() => attrs.value.filter((a) => a.permission === "READ"));
    const writeData = computed(() => attrs.value.filter((a) => a.permission === "READ_WRITE"));

    const imgSrc = computed(() => {
      const path = deviceData.value?.picture;
      return path || `${GEM_ASSETS}/device.png`;
    });

    const applyAttrs = (list: AttrItem[]) => {
      attrs.value = list;
      for (const item of list) {
        attributeValue[item.attributeCode] = item.value ?? "";
        writeDraft[item.attributeCode] = item.value != null ? String(item.value) : "";
      }
    };

    const load = async () => {
      if (!props.deviceId) {
        error.value = "缺少设备标识";
        loading.value = false;
        return;
      }
      loading.value = true;
      error.value = "";
      try {
        const client = await props.getDeviceClient();
        const [infoRaw, iotRaw] = await Promise.all([
          client.getDeviceInfo(props.deviceId),
          client.getDeviceIotDetail(props.deviceId, { withSnapShot: true, withPropertySpec: true }),
        ]);
        const info = unwrap(infoRaw) as DeviceInfo;
        const base = info.baseArchivesInfo;
        info.areaName = base?.area?.pathName || base?.area?.name || info.areaName || "--";
        deviceData.value = info;
        applyAttrs(mapIotDetailToAttrs(iotRaw));
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
      } finally {
        loading.value = false;
      }
    };

    const writeAttr = async (item: AttrItem, expectedValue: string | number | boolean) => {
      try {
        const client = await props.getDeviceClient();
        await client.attributeWriteValue({
          deviceId: props.deviceId,
          propWriteValues: [{ code: item.attributeCode, expectedValue: String(expectedValue) }],
        });
        attributeValue[item.attributeCode] = expectedValue;
        writeDraft[item.attributeCode] = String(expectedValue);
        message.success("下发指令成功");
      } catch (e) {
        message.error(e instanceof Error ? e.message : "下发失败");
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

    const renderWriteControl = (item: AttrItem) => {
      const type = item.dataType.toLowerCase();
      if (type === "boolean") {
        return (
          <div class={styles.controlItem}>
            <span class={styles.controlLabel}>{item.attributeName}：</span>
            <Switch
              checked={String(attributeValue[item.attributeCode]) === "1" || attributeValue[item.attributeCode] === true}
              checkedChildren="开"
              unCheckedChildren="关"
              onChange={(checked) => void writeAttr(item, checked ? 1 : 0)}
            />
          </div>
        );
      }
      if (type === "enum") {
        return (
          <div class={styles.controlItem}>
            <span class={styles.controlLabel}>{item.attributeName}：</span>
            <RadioGroup
              buttonStyle="solid"
              value={attributeValue[item.attributeCode] != null ? String(attributeValue[item.attributeCode]) : undefined}
              onChange={(e) => {
                void writeAttr(item, e.target.value);
              }}
            >
              {(item.attributeKeyValueVos || []).map((opt) => (
                <Radio.Button key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </Radio.Button>
              ))}
            </RadioGroup>
          </div>
        );
      }
      return (
        <div class={styles.controlItem}>
          <span class={styles.controlLabel}>{item.attributeName}：</span>
          <Space>
            <Input
              style={{ width: type === "string" ? 220 : 140 }}
              value={writeDraft[item.attributeCode]}
              onUpdate:value={(v: string) => {
                writeDraft[item.attributeCode] = v;
              }}
            />
            <Button type="primary" size="small" onClick={() => void writeAttr(item, writeDraft[item.attributeCode])}>
              下发
            </Button>
          </Space>
        </div>
      );
    };

    return () => {
      if (loading.value) {
        return (
          <div class={styles.baseHeight}>
            <Spin />
          </div>
        );
      }
      if (error.value) {
        return <p class={styles.error}>{error.value}</p>;
      }
      if (!deviceData.value) {
        return <Empty />;
      }
      const base = deviceData.value.baseArchivesInfo;
      return (
        <div class={styles.baseHeight}>
          <div class={styles.itemTitle}>基本信息</div>
          <div class={styles.msg}>
            <div class={styles.msgItem}>
              <div class={styles.msgLeft}>设备名称：</div>
              <div class={styles.msgRight}>{base?.name || "--"}</div>
            </div>
            <div class={styles.msgItem}>
              <div class={styles.msgLeft}>设备编码：</div>
              <div class={styles.msgRight}>{base?.code || "--"}</div>
            </div>
            <div class={styles.msgItem}>
              <div class={styles.msgLeft}>产品名称：</div>
              <div class={styles.msgRight}>{deviceData.value.productInfo?.name || "--"}</div>
            </div>
            <div class={styles.msgItem}>
              <div class={styles.msgLeft}>设备状态：</div>
              <div class={styles.msgRight}>
                <span class={online.value ? styles.online : styles.offline}>{online.value ? "在线" : "离线"}</span>
              </div>
            </div>
            <div class={styles.msgItem}>
              <div class={styles.msgLeft}>所属区域：</div>
              <div class={styles.msgRight}>{deviceData.value.areaName || "--"}</div>
            </div>
            <div class={styles.msgItem}>
              <div class={styles.msgLeft}>产品图片：</div>
              <div class={styles.msgRight}>
                <div class={styles.picBox}>
                  <Image width={80} height={80} src={imgSrc.value} style={{ objectFit: "contain" }} />
                </div>
              </div>
            </div>
          </div>

          {online.value ? (
            <>
              {readData.value.length ? (
                <>
                  <div class={styles.itemTitle}>现场数据</div>
                  <div class={styles.msg}>
                    {readData.value.map((item) => (
                      <div class={styles.msgItem} key={item.attributeCode}>
                        <div class={styles.msgLeft}>{item.attributeName}：</div>
                        <div class={styles.msgRight}>
                          {item.dataType === "enum" || item.dataType === "boolean"
                            ? displayEnumValue(item, attributeValue[item.attributeCode])
                            : attributeValue[item.attributeCode] != null && attributeValue[item.attributeCode] !== ""
                              ? `${attributeValue[item.attributeCode]} ${item.unitName || ""}`
                              : "--"}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              {writeData.value.length ? (
                <>
                  <div class={styles.itemTitle}>设备控制</div>
                  <div class={styles.control}>
                    <Row gutter={[16, 16]}>
                      {writeData.value.map((item) => (
                        <Col span={8} key={item.attributeCode}>
                          {renderWriteControl(item)}
                        </Col>
                      ))}
                    </Row>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      );
    };
  },
});
