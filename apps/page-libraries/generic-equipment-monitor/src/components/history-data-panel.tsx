import type { DeviceCenterClient } from "@g2-client/device-center/client";
import { Button, Empty, Input, Radio, RadioGroup, Select, Spin, Table } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, type PropType } from "vue";

import styles from "./history-data-panel.module.css";

type PropOption = { label: string; value: string; dataType?: string };

function unwrap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const root = raw as Record<string, unknown>;
  if (root.data && typeof root.data === "object") return root.data as Record<string, unknown>;
  return root;
}

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function endOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

function formatDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default defineComponent({
  name: "GemHistoryDataPanel",
  props: {
    deviceId: { type: String, required: true },
    getDeviceClient: { type: Function as PropType<() => Promise<DeviceCenterClient>>, required: true },
  },
  setup(props) {
    const loading = ref(false);
    const error = ref("");
    const tabPosition = ref<"TODAY" | "THIS_WEEK">("TODAY");
    const propCode = ref<string>();
    const options = ref<PropOption[]>([]);
    const rows = ref<Array<{ key: string; valueTranslate: string; time: string }>>([]);
    const dates = reactive({
      start: formatDay(new Date()),
      end: formatDay(new Date()),
    });

    const applyPreset = (preset: "TODAY" | "THIS_WEEK") => {
      tabPosition.value = preset;
      const now = new Date();
      if (preset === "TODAY") {
        dates.start = formatDay(now);
        dates.end = formatDay(now);
      } else {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        dates.start = formatDay(start);
        dates.end = formatDay(now);
      }
    };

    const loadOptions = async () => {
      const client = await props.getDeviceClient();
      const raw = await client.getDeviceIotDetail(props.deviceId, { withSnapShot: true, withPropertySpec: true });
      const data = unwrap(raw);
      const list = (Array.isArray(data.productPropVoList) ? data.productPropVoList : []) as Array<Record<string, unknown>>;
      options.value = list.map((p) => ({
        label: String(p.propName || p.propCode || ""),
        value: String(p.propCode || ""),
        dataType: String(p.dataType || ""),
      }));
      if (!propCode.value && options.value[0]) propCode.value = options.value[0].value;
    };

    const search = async () => {
      if (!props.deviceId || !propCode.value) return;
      loading.value = true;
      error.value = "";
      try {
        const client = await props.getDeviceClient();
        const startTs = startOfDay(new Date(dates.start));
        const endTs = endOfDay(new Date(dates.end));
        const raw = await client.getDeviceHistoryGroup({
          deviceId: props.deviceId,
          propCodes: propCode.value,
          startTs,
          endTs,
        });
        const data = unwrap(raw);
        const series = (data[propCode.value] || data[Object.keys(data)[0] || ""] || []) as Array<Record<string, unknown>>;
        const list = Array.isArray(series) ? series : [];
        rows.value = list.map((item, i) => {
          const ts = Number(item.ts || item.time || item.timestamp || 0);
          const value = item.valueTranslate ?? item.value ?? item.val ?? "--";
          return {
            key: String(i),
            valueTranslate: String(value),
            time: ts ? formatTs(ts) : String(item.time || "--"),
          };
        });
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
        rows.value = [];
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      applyPreset("TODAY");
      try {
        await loadOptions();
        await search();
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
      }
    });

    return () => (
      <div>
        <div class={styles.toolbar}>
          <RadioGroup
            buttonStyle="solid"
            value={tabPosition.value}
            onChange={(e) => {
              applyPreset(e.target.value as "TODAY" | "THIS_WEEK");
            }}
          >
            <Radio.Button value="TODAY">今日</Radio.Button>
            <Radio.Button value="THIS_WEEK">本周</Radio.Button>
          </RadioGroup>
          <Input
            type="date"
            style={{ width: 150 }}
            value={dates.start}
            onUpdate:value={(v: string) => {
              dates.start = v;
            }}
          />
          <span>~</span>
          <Input
            type="date"
            style={{ width: 150 }}
            value={dates.end}
            onUpdate:value={(v: string) => {
              dates.end = v;
            }}
          />
          <Select
            style={{ width: 200 }}
            value={propCode.value}
            options={options.value}
            placeholder="请选择设备属性"
            allowClear={false}
            onChange={(v: unknown) => {
              propCode.value = v != null ? String(v) : undefined;
            }}
          />
          <Button type="primary" onClick={() => void search()}>
            查询
          </Button>
        </div>
        <div class={styles.content}>
          {error.value ? <p class={styles.error}>{error.value}</p> : null}
          {loading.value ? (
            <Spin />
          ) : rows.value.length ? (
            <Table
              size="small"
              bordered
              pagination={{ pageSize: 10 }}
              dataSource={rows.value}
              columns={[
                { align: "center", title: "值", dataIndex: "valueTranslate", key: "valueTranslate" },
                { align: "center", title: "更新时间", dataIndex: "time", key: "time" },
              ]}
              scroll={{ y: 420 }}
            />
          ) : (
            <Empty />
          )}
        </div>
      </div>
    );
  },
});
