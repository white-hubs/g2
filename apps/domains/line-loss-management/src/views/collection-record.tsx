import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { CollectionRecord } from "@g2-contract/line-loss-management";
import { Checkbox, Input, Page, PageLayout, PopOver, Spin, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import { computed, defineComponent, inject, onMounted, reactive, ref } from "vue";

import { unwrap, useLineLossClient } from "../api";
import { DOMAIN_CONTEXT_KEY } from "../domain-context";

interface DeviceOption {
  label: string;
  value: string;
}

interface CollectionRecordRow extends CollectionRecord {
  _rowKey: string;
}

function text(value: unknown) {
  const display = value === undefined || value === null || value === "" ? "--" : String(value);
  return <PopOver content={display === "--" ? "" : display}>{display}</PopOver>;
}

function meterTime(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const raw = String(value).trim();
  const numberValue = Number(raw);
  const parsed = /^-?\d+(\.\d+)?$/u.test(raw)
    ? dayjs(Math.abs(numberValue) < 1e12 ? Math.round(numberValue * 1000) : numberValue)
    : dayjs(raw);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : raw;
}

export default defineComponent({
  name: "LineLossCollectionRecord",
  setup() {
    const context = inject(DOMAIN_CONTEXT_KEY);
    if (!context) {
      throw new Error("LineLossCollectionRecord requires DomainContext");
    }
    const client = useLineLossClient();
    const defaults = [dayjs().subtract(1, "month").format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD")];
    const query = reactive({ pageNumber: 1, pageSize: 10, total: 0, dateRange: defaults, selectedDeviceIds: [] as string[] });
    const deviceOptions: DeviceOption[] = reactive([]);
    const deviceKeyword = ref("");
    const deviceLoading = ref(false);
    let tableRequestVersion = 0;
    const filteredDevices = computed(() => {
      const keyword = deviceKeyword.value.trim().toLocaleLowerCase();
      return keyword ? deviceOptions.filter((item) => item.label.toLocaleLowerCase().includes(keyword)) : deviceOptions;
    });
    const [PcTable, tableApi] = usePcTable({
      rowKey: "_rowKey",
      tableCode: "LINE_LOSS_COLLECTION_RECORD",
      columns: [
        { title: "序号", width: 80, align: "center", customRender: ({ index = 0 }) => (query.pageNumber - 1) * query.pageSize + index + 1 },
        { title: "设备编码", dataIndex: "deviceCode", align: "center", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "设备名称", dataIndex: "deviceName", align: "center", ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "上期抄表时间",
          dataIndex: "lastCollectTime",
          width: 180,
          align: "center",
          customRender: ({ text: value }) => text(meterTime(value)),
        },
        { title: "上次抄表数", dataIndex: "lastReadValue", align: "center", customRender: ({ text: value }) => text(value) },
        {
          title: "本期抄表时间",
          dataIndex: "currentCollectTime",
          width: 180,
          align: "center",
          customRender: ({ text: value }) => text(meterTime(value)),
        },
        { title: "抄表值", dataIndex: "readValue", align: "center", customRender: ({ text: value }) => text(value) },
        {
          title: "用量",
          dataIndex: "useValue",
          align: "center",
          customRender: ({ text: value }) => <span class="line-loss-record-usage">{text(value)}</span>,
        },
      ],
      autoFetch: false,
      fetchApi: async () => {
        const version = tableRequestVersion;
        if (query.selectedDeviceIds.length === 0) {
          return { total: 0, pages: 0, records: [] as CollectionRecordRow[] };
        }
        try {
          const api = await client();
          const result = await api.getCollectionRecords({
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            startTime: `${query.dateRange[0]} 00:00:00`,
            endTime: `${query.dateRange[1]} 23:59:59`,
            deviceIdSet: query.selectedDeviceIds,
          });
          if (version !== tableRequestVersion) {
            return { total: query.total, pages: 0, records: (tableApi.getDataSource() ?? []) as CollectionRecordRow[] };
          }
          const records: CollectionRecordRow[] = [];
          for (const [index, record] of (result.records ?? []).entries()) {
            records.push({
              ...record,
              _rowKey: `${query.pageNumber}-${index}-${record.deviceCode ?? ""}-${record.currentCollectTime ?? ""}`,
            });
          }
          return { total: result.total ?? 0, pages: result.pages ?? 0, records };
        } catch (error) {
          if (version !== tableRequestVersion) {
            return { total: query.total, pages: 0, records: (tableApi.getDataSource() ?? []) as CollectionRecordRow[] };
          }
          message.error(error instanceof Error ? error.message : "采集记录加载失败");
          return { total: 0, pages: 0, records: [] as CollectionRecordRow[] };
        }
      },
      fetchLoaded: (result) => {
        query.total = result.total;
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: true,
      syncStateRef: query,
      schema: [
        {
          component: "RangePicker",
          label: "时间范围",
          fieldName: "dateRange",
          defaultValue: defaults,
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: false },
        },
      ],
      handleSubmit: (values) => {
        query.dateRange = (values.dateRange as string[] | undefined) ?? defaults;
        query.pageNumber = 1;
        if (query.selectedDeviceIds.length === 0) {
          message.warning("请选择设备");
          return;
        }
        tableRequestVersion += 1;
        void tableApi.query();
      },
      handleReset: () => {
        tableRequestVersion += 1;
        query.selectedDeviceIds = [];
        query.dateRange = [...defaults];
        query.pageNumber = 1;
        query.total = 0;
        tableApi.setDataSource([]);
      },
    });

    const toggleDevice = (deviceId: string): void => {
      tableRequestVersion += 1;
      query.selectedDeviceIds = query.selectedDeviceIds.includes(deviceId)
        ? query.selectedDeviceIds.filter((id) => id !== deviceId)
        : [...query.selectedDeviceIds, deviceId];
      query.pageNumber = 1;
      if (query.selectedDeviceIds.length === 0) {
        query.total = 0;
        tableApi.setDataSource([]);
        return;
      }
      void tableApi.query();
    };

    onMounted(async () => {
      deviceLoading.value = true;
      try {
        const deviceClient = await context.ensureClient<DeviceCenterClient>("deviceCenterClient");
        const raw = await deviceClient.getSecurityDevicePage("ELECTRICMANAGE", { pageNumber: 1, pageSize: 1000, keyword: "", areaId: "" });
        const result = unwrap<{ records?: Record<string, unknown>[] }>(raw, {});
        deviceOptions.splice(
          0,
          deviceOptions.length,
          ...(result.records ?? [])
            .map((item) => ({ label: String(item.deviceName ?? item.name ?? ""), value: String(item.deviceId ?? item.id ?? "") }))
            .filter((item) => item.value),
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : "采集设备加载失败");
      } finally {
        deviceLoading.value = false;
      }
    });

    return () => (
      <PageLayout
        title="采集记录"
        v-slots={{
          "layout-content": () => (
            <div class="line-loss-record">
              <aside class="line-loss-record-sidebar">
                <Input v-model:value={deviceKeyword.value} placeholder="设备名称" allowClear />
                <Spin spinning={deviceLoading.value}>
                  <div class="line-loss-record-devices">
                    {filteredDevices.value.map((item) => (
                      <div
                        class={["line-loss-record-device", query.selectedDeviceIds.includes(item.value) && "is-selected"]}
                        key={item.value}
                        onClick={() => toggleDevice(item.value)}
                      >
                        <Checkbox
                          checked={query.selectedDeviceIds.includes(item.value)}
                          onClick={(event: Event) => event.stopPropagation()}
                          onChange={() => toggleDevice(item.value)}
                        />
                        <span>{item.label || "--"}</span>
                      </div>
                    ))}
                    {!deviceLoading.value && deviceOptions.length > 0 && <div class="line-loss-record-end">没有更多了</div>}
                  </div>
                </Spin>
              </aside>
              <div class="line-loss-record-main">
                <PcForm />
                <PcTable />
              </div>
            </div>
          ),
          "footer-page": () => (
            <Page
              current={query.pageNumber}
              pageSize={query.pageSize}
              total={query.total}
              cachePageQuery
              onPageChange={(page: number, size: number) => {
                tableRequestVersion += 1;
                query.pageNumber = page;
                query.pageSize = size;
                void tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
