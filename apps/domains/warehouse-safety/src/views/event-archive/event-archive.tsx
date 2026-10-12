import { computed, defineComponent, onMounted, reactive, ref } from "vue";

import { CubeLayout } from "@/compat/legacy-components";
import {
  Button,
  DateRangePicker,
  Empty,
  Form,
  FormItem,
  Input,
  Modal,
  PlayCircleOutlined,
  Space,
  Spin,
  Tag,
  message,
} from "@/pc-ui-runtime";
import {
  listWarehouseAlarmDevices,
  listWarehouseAlarmVideoFiles,
  pageWarehouseAlarmRecords,
  type WarehouseAlarmDevice,
  type WarehouseAlarmMedia,
  type WarehouseAlarmRecord,
} from "@/services/alarm-center-api";
import { emptyText, formatDateTime } from "@/utils/format";

import styles from "./event-archive.module.less";

export const EventArchive = defineComponent({
  name: "EventArchive",
  setup() {
    const loading = ref(false);
    const deviceLoading = ref(false);
    const mediaLoading = ref(false);
    const rows = ref<WarehouseAlarmRecord[]>([]);
    const active = ref<WarehouseAlarmRecord | null>(null);
    const activeDevices = ref<WarehouseAlarmDevice[]>([]);
    const activeMedia = ref<WarehouseAlarmMedia[]>([]);
    const detailVisible = ref(false);
    const search = reactive({
      keyword: "",
      period: [] as string[],
    });
    const serveIp = window.location.protocol;

    const activeDevice = computed<WarehouseAlarmDevice | null>(() => {
      if (activeDevices.value[0]) {
        return activeDevices.value[0];
      }
      if (!active.value) {
        return null;
      }
      return {
        id: String(active.value.alarmTargetKey || active.value.businessKey || active.value.id),
        code: active.value.alarmTargetCode,
        name: active.value.alarmTargetName || active.value.alarmEventName || "默认关联设备",
        area: { pathName: active.value.areaName },
      };
    });

    const loadDevices = async (record: WarehouseAlarmRecord): Promise<void> => {
      if (!record.id) {
        activeDevices.value = [];
        return;
      }
      deviceLoading.value = true;
      try {
        activeDevices.value = await listWarehouseAlarmDevices(String(record.id));
      } catch {
        activeDevices.value = [];
      } finally {
        deviceLoading.value = false;
      }
    };

    const loadMedia = async (record: WarehouseAlarmRecord): Promise<void> => {
      const businessKey = record.businessKey == null ? "" : String(record.businessKey);
      if (!businessKey) {
        activeMedia.value = [];
        return;
      }
      mediaLoading.value = true;
      try {
        activeMedia.value = await listWarehouseAlarmVideoFiles(businessKey);
      } catch {
        activeMedia.value = [];
      } finally {
        mediaLoading.value = false;
      }
    };

    const selectRecord = async (record: WarehouseAlarmRecord): Promise<void> => {
      active.value = record;
      await Promise.all([loadDevices(record), loadMedia(record)]);
    };

    const loadList = async (): Promise<void> => {
      loading.value = true;
      try {
        const [begin, end] = search.period;
        const result = await pageWarehouseAlarmRecords({
          keyword: search.keyword.trim() || undefined,
          period: begin && end ? { begin, end } : undefined,
        });
        const records = result.records;
        rows.value = records;
        if (records[0]) {
          await selectRecord(records[0]);
        } else {
          active.value = null;
          activeDevices.value = [];
          activeMedia.value = [];
        }
      } catch {
        message.error("报警记录加载失败");
      } finally {
        loading.value = false;
      }
    };

    const reset = (): void => {
      search.keyword = "";
      search.period = [];
      void loadList();
    };

    const openDetail = (): void => {
      if (!active.value) {
        message.warning("请选择事件");
        return;
      }
      detailVisible.value = true;
    };

    const detailItems = (record: WarehouseAlarmRecord): Array<[string, string]> => [
      ["报警事件", emptyText(record.alarmEventName || record.alarmEvent)],
      ["报警级别", emptyText(record.alarmLevelName || record.alarmLevelCode)],
      ["报警类型", emptyText(record.alarmTypeName)],
      ["处理状态", emptyText(record.alarmStatusName || record.alarmStatus)],
      ["报警时间", formatDateTime(record.alarmTime)],
      ["报警对象", emptyText(record.alarmTargetName || record.alarmTargetCode)],
      ["报警区域", emptyText(record.areaName)],
      ["报警编号", emptyText(record.code || record.id)],
      ["业务编号", emptyText(record.businessKey)],
      ["说明", emptyText(record.remark)],
    ];

    const videoList = computed(() =>
      activeMedia.value
        .filter((item) => item.type !== "PHOTOGRAPH")
        .map((item) => ({
          ...item,
          src: serveIp === "http:" ? item.intranetFilePath : item.extranetFilePath,
        }))
        .filter((item) => item.src),
    );

    onMounted(() => {
      void loadList();
    });

    return (): JSX.Element => {
      const device = activeDevice.value;
      return (
        <div class={styles.shell}>
          <CubeLayout
            title="事件档案"
            subTitle="报警记录与实时监控联动，默认展示报警关联的第一个设备"
            v-slots={{
              "layout-content": () => (
                <div class={styles.content}>
                  <div class={styles.searchPanel}>
                    <Form layout="inline">
                      <FormItem label="关键词">
                        <Input
                          v-model:value={search.keyword}
                          class={styles.searchInput}
                          placeholder="搜索报警事件、对象、区域"
                          showCount={false}
                          onPressEnter={() => void loadList()}
                        />
                      </FormItem>
                      <FormItem label="报警时间">
                        <DateRangePicker v-model:value={search.period} valueFormat="YYYY-MM-DD" />
                      </FormItem>
                      <FormItem>
                        <Space>
                          <Button type="primary" onClick={() => void loadList()}>
                            查询
                          </Button>
                          <Button onClick={reset}>重置</Button>
                        </Space>
                      </FormItem>
                    </Form>
                  </div>
                  <div class={styles.archiveLayout}>
                    <div class={styles.eventPanel}>
                      <div class={styles.panelHeader}>
                        <span>事件列表</span>
                        <Tag color="blue">{rows.value.length}条</Tag>
                      </div>
                      <Spin spinning={loading.value}>
                        {rows.value.length ? (
                          <div class={styles.eventList}>
                            {rows.value.map((item) => {
                              const selected = active.value?.id === item.id;
                              return (
                                <button
                                  type="button"
                                  class={[styles.eventItem, selected ? styles.eventItemActive : ""]}
                                  key={item.id}
                                  onClick={() => void selectRecord(item)}
                                >
                                  <div class={styles.eventThumb}>
                                    <PlayCircleOutlined />
                                  </div>
                                  <div class={styles.eventInfo}>
                                    <div class={styles.eventTitle}>{emptyText(item.alarmEventName || item.alarmEvent)}</div>
                                    <div class={styles.eventMeta}>{formatDateTime(item.alarmTime)}</div>
                                    <div class={styles.eventMeta}>{emptyText(item.areaName || item.alarmTargetName)}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <Empty description="暂无报警记录" />
                        )}
                      </Spin>
                    </div>
                    <div class={styles.playerPanel}>
                      <div class={styles.panelHeader}>
                        <span>视频播放</span>
                        <div class={styles.playerActions}>
                          <span>{device ? [device.code, device.name].filter(Boolean).join(" · ") : "暂无关联设备"}</span>
                          <Button type="link" onClick={openDetail}>
                            查看详情
                          </Button>
                        </div>
                      </div>
                      <Spin spinning={deviceLoading.value || mediaLoading.value}>
                        <div class={styles.videoPlayer}>
                          {videoList.value.length ? (
                            <div class={styles.videoGrid}>
                              {videoList.value.map((item, index) => (
                                <div class={styles.videoCard} key={`${item.id || item.src}-${index}`}>
                                  <div class={styles.videoInfo}>
                                    <div>{item.deviceName || device?.name || `录像${index + 1}`}</div>
                                    <span>{formatDateTime(item.executeTime)}</span>
                                  </div>
                                  <div class={styles.videoViewport}>
                                    <video src={item.src} muted playsinline class={styles.videoBackdrop} aria-hidden="true" />
                                    <video src={item.src} controls class={styles.videoElement} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div class={styles.videoEmpty}>
                              <div>{active.value ? "暂无录像" : "请选择报警记录"}</div>
                              <span>
                                {active.value
                                  ? active.value.businessKey
                                    ? "当前事件暂无可播放录像"
                                    : "当前事件暂无录像信息"
                                  : "请选择报警记录查看录像"}
                              </span>
                            </div>
                          )}
                        </div>
                      </Spin>
                    </div>
                  </div>
                </div>
              ),
            }}
          />
          <Modal v-model:open={detailVisible.value} title="事件详情" width={820} footer={null}>
            {active.value ? (
              <div class={styles.detailGrid}>
                {detailItems(active.value).map(([label, value]) => (
                  <div class={styles.detailItem} key={label}>
                    <div class={styles.detailLabel}>{label}</div>
                    <div class={styles.detailValue}>{value}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </Modal>
        </div>
      );
    };
  },
});
