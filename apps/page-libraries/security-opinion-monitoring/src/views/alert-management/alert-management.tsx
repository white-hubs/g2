import type {
  OpinionVO,
  PublicOpinionAlertChannelVO,
  PublicOpinionAlertEventVO,
  PublicOpinionAlertNotificationConfigItemVO,
  PublicOpinionAlertPushRecordVO,
  PublicOpinionAlertReceiverVO,
  PublicOpinionAlertVO,
  PublicOpinionResponseActionVO,
  PushStatus,
  WarningLevel,
} from "@g2-contract/security-opinion";
import {
  Button,
  DatePicker,
  DateRangePicker,
  Empty,
  Form,
  FormItem,
  Input,
  Modal,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Textarea,
  message,
} from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { securityOpinionApi } from "../../api/security-opinion";
import { GPagination } from "../../components/common/pagination";
import { PageShell } from "../../components/page-shell/page-shell";
import { SentimentTag } from "../../components/sentiment-tag/sentiment-tag";
import {
  PUSH_STATUS_COLOR,
  PUSH_STATUS_LABEL,
  PUSH_STATUS_OPTIONS,
  TABLE_PAGE_SIZE,
  WARNING_LEVEL_COLOR,
  WARNING_LEVEL_LABEL,
  WARNING_LEVEL_OPTIONS,
} from "../../constants";
import { formatDateTime } from "../../utils/format-datetime";
import { usePageName } from "../../utils/page-name";

import styles from "./alert-management.module.css";

const EVENT_TABLE_SCROLL_X = 900;
const RECEIVER_PAGE_SIZE = 20;

interface ReceiverOptionState {
  keyword: string;
  pageNumber: number;
  total: number;
  loadedCount: number;
  finished: boolean;
  loading: boolean;
  requestId: number;
  options: PublicOpinionAlertReceiverVO[];
}

interface NotificationConfigDraft {
  warningLevel: WarningLevel;
  sceneCode?: string;
  availableChannels: PublicOpinionAlertChannelVO[];
  channelsLoading: boolean;
  channels: string[];
  receiverUserIds: string[];
  receivers: PublicOpinionAlertReceiverVO[];
  receiverState: ReceiverOptionState;
}

function nodeText(node: { node?: string; content?: string; description?: string }): string {
  return node.node || node.content || node.description || "-";
}

function actionText(action: PublicOpinionResponseActionVO): string {
  const time = action.actionTime ? `${formatDateTime(action.actionTime)} ` : "";
  const operator = action.operatorName ? ` ${action.operatorName}` : "";
  return `${time}${action.actionType || "应对"}：${action.actionContent || "-"}${operator}`;
}

function normalizeChannel(channel: string): string {
  const value = channel.trim().toUpperCase();
  if (value === "SYSTEM" || value === "SITE" || value === "CHANNEL_SITE") return "CHANNEL_SITE";
  if (value === "APP" || value === "CHANNEL_APP") return "CHANNEL_APP";
  if (value === "SMS" || value === "CHANNEL_SMS") return "CHANNEL_SMS";
  return value;
}

function createReceiverState(initialOptions: PublicOpinionAlertReceiverVO[] = []): ReceiverOptionState {
  return {
    keyword: "",
    pageNumber: 1,
    total: 0,
    loadedCount: 0,
    finished: false,
    loading: false,
    requestId: 0,
    options: initialOptions,
  };
}

function receiverKey(receiver: PublicOpinionAlertReceiverVO): string {
  return receiver.userId || receiver.id;
}

function mergeReceivers(current: PublicOpinionAlertReceiverVO[], incoming: PublicOpinionAlertReceiverVO[]): PublicOpinionAlertReceiverVO[] {
  const map = new Map<string, PublicOpinionAlertReceiverVO>();
  current.forEach((receiver) => {
    const key = receiverKey(receiver);
    if (key) map.set(key, receiver);
  });
  incoming.forEach((receiver) => {
    const key = receiverKey(receiver);
    if (key) map.set(key, receiver);
  });
  return Array.from(map.values());
}

function receiverLabel(receiver: PublicOpinionAlertReceiverVO): string {
  const name = receiver.name || receiver.userName || `用户${receiverKey(receiver)}`;
  const mobile = receiver.mobile ? ` ${receiver.mobile}` : "";
  const org = receiver.organizationName ? `（${receiver.organizationName}）` : "";
  return `${name}${mobile}${org}`;
}

function receiverName(receiver: PublicOpinionAlertReceiverVO): string {
  return receiver.userName || receiver.name || `用户${receiverKey(receiver)}`;
}

function isScrollNearBottom(event: Event): boolean {
  const target = event.target as HTMLElement;
  return target.scrollTop + target.clientHeight >= target.scrollHeight - 24;
}

function levelClass(level?: string): string {
  const normalized = String(level ?? "").toUpperCase();
  if (normalized === "RED") return styles.levelRed;
  if (normalized === "YELLOW") return styles.levelYellow;
  return styles.levelBlue;
}

function alertKey(record: PublicOpinionAlertVO): string {
  return record.opinionId || record.id;
}

export const AlertManagementPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const records = ref<PublicOpinionAlertVO[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const pageSize = ref(TABLE_PAGE_SIZE);
    const loading = ref(false);
    const pushingId = ref("");
    const archivingEventId = ref("");
    const notificationVisible = ref(false);
    const notificationLoading = ref(false);
    const configDrafts = ref<NotificationConfigDraft[]>([]);
    const manualPushVisible = ref(false);
    const manualPushTarget = ref<PublicOpinionAlertVO | null>(null);
    const manualChannels = ref<PublicOpinionAlertChannelVO[]>([]);
    const manualChannelsLoading = ref(false);
    const manualReceiverState = reactive(createReceiverState());
    const manualForm = reactive({
      channels: [] as string[],
      receiverUserIds: [] as string[],
    });
    const recordsVisible = ref(false);
    const pushRecords = ref<PublicOpinionAlertPushRecordVO[]>([]);
    const opinionDetailVisible = ref(false);
    const opinionDetailLoading = ref(false);
    const activeOpinion = ref<OpinionVO | null>(null);
    const eventVisible = ref(false);
    const eventLoading = ref(false);
    const activeEvent = ref<PublicOpinionAlertEventVO | null>(null);
    const activeEventFallback = ref<PublicOpinionAlertVO | null>(null);
    const archiveVisible = ref(false);
    const archiveLoading = ref(false);
    const archiveOperatorReceiverState = reactive(createReceiverState());

    const filters = reactive({
      keyword: "",
      warningLevel: "" as WarningLevel | "",
      pushStatus: "" as PushStatus | "",
      timeRange: undefined as string[] | undefined,
    });

    const archiveForm = reactive({
      archiveRemark: "",
      actionTime: "",
      actionType: "",
      actionContent: "",
      operatorUserId: undefined as string | undefined,
      operatorName: "",
    });

    const fetchList = async (): Promise<void> => {
      loading.value = true;
      try {
        const [startTime, endTime] = filters.timeRange ?? [];
        const result = await securityOpinionApi.pageAlerts({
          pageNumber: pageNumber.value,
          pageSize: pageSize.value,
          keyword: filters.keyword.trim() || undefined,
          warningLevel: filters.warningLevel || undefined,
          pushStatus: filters.pushStatus || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
        });
        records.value = result?.records ?? [];
        total.value = result?.total ?? 0;
      } finally {
        loading.value = false;
      }
    };

    const onSearch = (): void => {
      pageNumber.value = 1;
      void fetchList();
    };

    const onReset = (): void => {
      filters.keyword = "";
      filters.warningLevel = "";
      filters.pushStatus = "";
      filters.timeRange = undefined;
      pageNumber.value = 1;
      void fetchList();
    };

    const onPageChange = (page: number, size: number): void => {
      pageNumber.value = page;
      pageSize.value = size;
      void fetchList();
    };

    const levelTag = (level?: string, text?: string) => {
      const value = String(level ?? "");
      if (!value) return <span>-</span>;
      return <Tag color={WARNING_LEVEL_COLOR[value] ?? "default"}>{text || WARNING_LEVEL_LABEL[value] || value}</Tag>;
    };

    const pushStatusTag = (status?: string, text?: string) => {
      const value = String(status ?? "");
      if (!value) return <span>-</span>;
      return <Tag color={PUSH_STATUS_COLOR[value] ?? "default"}>{text || PUSH_STATUS_LABEL[value] || value}</Tag>;
    };

    const replaceAlertRecord = (target: PublicOpinionAlertVO, next: PublicOpinionAlertVO): void => {
      const targetKey = alertKey(target);
      records.value = records.value.map((item) => (alertKey(item) === targetKey ? { ...item, ...next } : item));
      if (manualPushTarget.value && alertKey(manualPushTarget.value) === targetKey) {
        manualPushTarget.value = { ...manualPushTarget.value, ...next };
      }
    };

    const refreshPushedAlert = async (target: PublicOpinionAlertVO): Promise<void> => {
      try {
        const latest = await securityOpinionApi.getAlert(alertKey(target));
        replaceAlertRecord(target, latest);
      } catch {
        message.warning("推送状态刷新失败，请稍后重新查询");
      }
    };

    const resetReceiverState = (state: ReceiverOptionState, options: PublicOpinionAlertReceiverVO[] = []): void => {
      state.keyword = "";
      state.pageNumber = 1;
      state.total = 0;
      state.loadedCount = 0;
      state.finished = false;
      state.loading = false;
      state.requestId += 1;
      state.options = options;
    };

    const receiverFinished = (state: ReceiverOptionState): boolean => state.finished;

    const loadReceiverOptions = async (
      state: ReceiverOptionState,
      reset = false,
      pinnedReceivers: PublicOpinionAlertReceiverVO[] = [],
    ): Promise<void> => {
      if (state.loading && !reset) return;
      if (!reset && receiverFinished(state)) return;
      if (reset) {
        state.pageNumber = 1;
        state.total = 0;
        state.loadedCount = 0;
        state.finished = false;
        state.options = mergeReceivers([], pinnedReceivers);
      }
      const requestId = state.requestId + 1;
      state.requestId = requestId;
      state.loading = true;
      try {
        const currentPage = reset ? 1 : state.pageNumber;
        const keyword = state.keyword.trim();
        const result = await securityOpinionApi.pageAlertReceivers({
          pageNumber: currentPage,
          pageSize: RECEIVER_PAGE_SIZE,
          keyword: keyword || undefined,
        });
        if (state.requestId !== requestId) return;
        state.total = result.total;
        state.loadedCount = (reset ? 0 : state.loadedCount) + result.records.length;
        state.options = mergeReceivers(reset ? pinnedReceivers : state.options, result.records);
        state.pageNumber += 1;
        state.finished = result.records.length < RECEIVER_PAGE_SIZE || (result.total > 0 && state.loadedCount >= result.total);
      } finally {
        if (state.requestId === requestId) {
          state.loading = false;
        }
      }
    };

    const loadDraftChannels = async (draft: NotificationConfigDraft): Promise<void> => {
      draft.channelsLoading = true;
      try {
        const channels = draft.sceneCode ? await securityOpinionApi.listAlertChannels(draft.sceneCode) : [];
        draft.availableChannels = channels;
        const availableCodes = new Set(channels.map((channel) => String(channel.channelCode)));
        draft.channels = draft.channels.filter((channel) => availableCodes.has(channel));
      } catch {
        draft.availableChannels = [];
        draft.channels = [];
        message.warning("消息渠道加载失败，请检查消息中心配置");
      } finally {
        draft.channelsLoading = false;
      }
    };

    const loadConfig = async (): Promise<void> => {
      notificationLoading.value = true;
      try {
        const result = await securityOpinionApi.getAlertNotificationConfig();
        const byLevel = new Map<string, PublicOpinionAlertNotificationConfigItemVO>();
        (result?.configs ?? []).forEach((item) => byLevel.set(String(item.warningLevel).toUpperCase(), item));
        configDrafts.value = (["BLUE", "YELLOW", "RED"] as WarningLevel[]).map((level) => {
          const item = byLevel.get(level);
          const receiverUserIds = item?.receiverUserIds ?? [];
          const receivers = item?.receivers ?? [];
          return {
            warningLevel: level,
            sceneCode: item?.sceneCode,
            availableChannels: [],
            channelsLoading: false,
            channels: item?.channels?.map((channel) => normalizeChannel(String(channel))) ?? [],
            receiverUserIds,
            receivers,
            receiverState: createReceiverState(receivers),
          };
        });
        await Promise.all(
          configDrafts.value.flatMap((draft) => [
            loadDraftChannels(draft),
            loadReceiverOptions(draft.receiverState, true, draft.receivers),
          ]),
        );
      } finally {
        notificationLoading.value = false;
      }
    };

    const searchDraftReceivers = (draft: NotificationConfigDraft, keyword = ""): void => {
      draft.receiverState.keyword = keyword;
      void loadReceiverOptions(draft.receiverState, true, draft.receivers);
    };

    const loadMoreDraftReceivers = (draft: NotificationConfigDraft, event: Event): void => {
      if (isScrollNearBottom(event)) {
        void loadReceiverOptions(draft.receiverState, false, draft.receivers);
      }
    };

    const openNotificationConfig = async (): Promise<void> => {
      notificationVisible.value = true;
      await loadConfig();
    };

    const saveNotificationConfig = async (): Promise<void> => {
      notificationLoading.value = true;
      try {
        await securityOpinionApi.saveAlertNotificationConfig({
          configs: configDrafts.value.map((item) => ({
            warningLevel: item.warningLevel,
            channels: item.channels.map((channel) => normalizeChannel(channel)),
            receiverUserIds: item.receiverUserIds,
          })),
        });
        message.success("通知配置已保存");
        notificationVisible.value = false;
      } finally {
        notificationLoading.value = false;
      }
    };

    const sceneCodeForAlert = (record: PublicOpinionAlertVO): string => {
      const level = String(record.warningLevel ?? "").toUpperCase();
      return record.sceneCode || configDrafts.value.find((item) => item.warningLevel === level)?.sceneCode || "";
    };

    const openManualPush = async (record: PublicOpinionAlertVO): Promise<void> => {
      manualPushTarget.value = record;
      manualForm.channels = [];
      manualForm.receiverUserIds = [];
      manualChannels.value = [];
      resetReceiverState(manualReceiverState);
      manualPushVisible.value = true;
      const sceneCode = sceneCodeForAlert(record);
      if (!sceneCode) {
        message.warning("该预警缺少消息渠道配置，无法加载通知渠道");
      } else {
        manualChannelsLoading.value = true;
        try {
          manualChannels.value = await securityOpinionApi.listAlertChannels(sceneCode);
        } catch {
          manualChannels.value = [];
          message.warning("消息渠道加载失败，请检查消息中心配置");
        } finally {
          manualChannelsLoading.value = false;
        }
      }
      void loadReceiverOptions(manualReceiverState, true);
    };

    const searchManualReceivers = (keyword = ""): void => {
      manualReceiverState.keyword = keyword;
      void loadReceiverOptions(manualReceiverState, true);
    };

    const loadMoreManualReceivers = (event: Event): void => {
      if (isScrollNearBottom(event)) {
        void loadReceiverOptions(manualReceiverState);
      }
    };

    const submitManualPush = async (): Promise<void> => {
      const record = manualPushTarget.value;
      if (!record) return;
      if (!manualForm.channels.length) {
        message.warning("请选择推送渠道");
        return;
      }
      if (!manualForm.receiverUserIds.length) {
        message.warning("请选择通知人");
        return;
      }
      pushingId.value = record.opinionId || record.id;
      try {
        await securityOpinionApi.pushAlert(record.opinionId || record.id, {
          channels: manualForm.channels,
          receiverUserIds: manualForm.receiverUserIds,
        });
        message.success("推送任务已提交");
        manualPushVisible.value = false;
        await refreshPushedAlert(record);
      } finally {
        pushingId.value = "";
      }
    };

    const openPushRecords = async (record: PublicOpinionAlertVO): Promise<void> => {
      recordsVisible.value = true;
      pushRecords.value = await securityOpinionApi.listAlertPushRecords(record.opinionId || record.id);
    };

    const openOpinionDetail = async (record: PublicOpinionAlertVO): Promise<void> => {
      const opinionId = record.opinionId || record.id;
      if (!opinionId) {
        message.info("未找到关联舆情");
        return;
      }
      opinionDetailVisible.value = true;
      opinionDetailLoading.value = true;
      activeOpinion.value = null;
      try {
        activeOpinion.value = await securityOpinionApi.getOpinion(opinionId);
      } finally {
        opinionDetailLoading.value = false;
      }
    };

    const openEvent = async (eventId?: string, opinionId?: string, fallbackRecord?: PublicOpinionAlertVO): Promise<void> => {
      if (!eventId) {
        if (opinionId) {
          message.info("该预警暂未关联事件");
        }
        return;
      }
      activeEventFallback.value =
        fallbackRecord ??
        records.value.find((record) => record.relatedEventId === eventId || record.id === opinionId || record.opinionId === opinionId) ??
        null;
      eventVisible.value = true;
      eventLoading.value = true;
      try {
        activeEvent.value = await securityOpinionApi.getAlertEvent(eventId);
      } finally {
        eventLoading.value = false;
      }
    };

    const resetArchiveForm = (): void => {
      archiveForm.archiveRemark = "";
      archiveForm.actionTime = "";
      archiveForm.actionType = "";
      archiveForm.actionContent = "";
      archiveForm.operatorUserId = undefined;
      archiveForm.operatorName = "";
      resetReceiverState(archiveOperatorReceiverState);
    };

    const openArchive = (): void => {
      resetArchiveForm();
      archiveVisible.value = true;
      void loadReceiverOptions(archiveOperatorReceiverState, true);
    };

    const openArchiveFromAlert = async (record: PublicOpinionAlertVO): Promise<void> => {
      if (!record.relatedEventId) {
        message.info("该预警暂未关联事件，无法归档");
        return;
      }
      archivingEventId.value = record.relatedEventId;
      activeEventFallback.value = record;
      try {
        activeEvent.value = await securityOpinionApi.getAlertEvent(record.relatedEventId);
        openArchive();
      } finally {
        archivingEventId.value = "";
      }
    };

    const searchArchiveOperatorReceivers = (keyword = ""): void => {
      archiveOperatorReceiverState.keyword = keyword;
      void loadReceiverOptions(archiveOperatorReceiverState, true);
    };

    const loadMoreArchiveOperatorReceivers = (event: Event): void => {
      if (isScrollNearBottom(event)) {
        void loadReceiverOptions(archiveOperatorReceiverState);
      }
    };

    const selectArchiveOperator = (value?: string): void => {
      const selected = archiveOperatorReceiverState.options.find((receiver) => receiverKey(receiver) === value);
      archiveForm.operatorUserId = value || undefined;
      archiveForm.operatorName = selected ? receiverName(selected) : "";
    };

    const submitArchive = async (): Promise<void> => {
      if (!activeEvent.value?.eventId) {
        message.warning("请先选择事件");
        return;
      }
      if (!archiveForm.archiveRemark.trim()) {
        message.warning("请填写归档说明");
        return;
      }
      if (!archiveForm.actionTime) {
        message.warning("请选择应对时间");
        return;
      }
      if (!archiveForm.actionType.trim()) {
        message.warning("请填写应对类型");
        return;
      }
      if (!archiveForm.actionContent.trim()) {
        message.warning("请填写应对内容");
        return;
      }
      if (!archiveForm.operatorUserId) {
        message.warning("请选择操作人");
        return;
      }
      archiveLoading.value = true;
      try {
        await securityOpinionApi.archiveAlertEvent(activeEvent.value.eventId, {
          archiveRemark: archiveForm.archiveRemark.trim(),
          responseActions: [
            {
              actionTime: archiveForm.actionTime,
              actionType: archiveForm.actionType.trim(),
              actionContent: archiveForm.actionContent.trim(),
              operatorUserId: archiveForm.operatorUserId,
              operatorName: archiveForm.operatorName.trim(),
            },
          ],
        });
        message.success("事件已归档");
        archiveVisible.value = false;
        activeEvent.value = await securityOpinionApi.getAlertEvent(activeEvent.value.eventId);
        void fetchList();
      } finally {
        archiveLoading.value = false;
      }
    };

    onMounted(() => {
      void fetchList();
      void loadConfig();
      const eventId = typeof route.query.eventId === "string" ? route.query.eventId : undefined;
      const opinionId = typeof route.query.opinionId === "string" ? route.query.opinionId : undefined;
      if (eventId) {
        void openEvent(eventId, opinionId);
      }
    });

    const eventHeatIndex = (event: PublicOpinionAlertEventVO): number | undefined =>
      event.heatIndex ?? activeEventFallback.value?.heatIndex;

    const eventSource = (event: PublicOpinionAlertEventVO): string =>
      event.source || activeEventFallback.value?.source || event.opinion?.source || "";

    const eventAlertTime = (event: PublicOpinionAlertEventVO): string =>
      event.alertTime || activeEventFallback.value?.alertTime || event.opinion?.alertTime || "";

    const pushRecordColumns = [
      {
        title: "接收人",
        dataIndex: "receiverName",
        width: 120,
        customRender: ({ record }: { record: PublicOpinionAlertPushRecordVO }) => record.receiverName || "-",
      },
      {
        title: "渠道",
        dataIndex: "channelText",
        width: 100,
        customRender: ({ record }: { record: PublicOpinionAlertPushRecordVO }) => record.channelText || "-",
      },
      {
        title: "状态",
        dataIndex: "pushStatus",
        width: 100,
        customRender: ({ record }: { record: PublicOpinionAlertPushRecordVO }) => pushStatusTag(record.pushStatus, record.pushStatusText),
      },
      { title: "推送时间", dataIndex: "pushTime", width: 160, customRender: ({ text }: { text: string }) => formatDateTime(text) },
      {
        title: "推送失败原因",
        dataIndex: "failureReason",
        width: 220,
        ellipsis: true,
        customRender: ({ record }: { record: PublicOpinionAlertPushRecordVO }) => record.failureReason || record.responseMessage || "-",
      },
    ];

    const renderAlertCard = (record: PublicOpinionAlertVO) => (
      <div key={record.id} class={[styles.alertCard, levelClass(record.warningLevel)].join(" ")}>
        <div class={styles.cardHeader}>
          <Space>
            {levelTag(record.warningLevel, record.warningLevelText)}
            <span class={styles.cardTitle}>{record.title}</span>
          </Space>
          <Space>
            <span class={styles.heat}>AI分析热度 {record.heatIndex ?? "-"}</span>
            {pushStatusTag(record.pushStatus, record.pushStatusText)}
          </Space>
        </div>
        <div class={styles.summary}>{record.summary || record.content || "-"}</div>
        <div class={styles.meta}>
          <span>来源：{record.source || "-"}</span>
          <span>
            情感：
            <SentimentTag sentiment={record.sentiment} />
          </span>
          <span>预警时间：{formatDateTime(record.alertTime)}</span>
          {record.lastPushTime ? <span>最后推送：{formatDateTime(record.lastPushTime)}</span> : null}
          {record.relatedEventId ? (
            <span class={styles.eventLink} onClick={() => void openEvent(record.relatedEventId, record.id, record)}>
              关联事件：{record.relatedEventName || "查看事件"}
            </span>
          ) : null}
        </div>
        <div class={styles.keywords}>
          <span>关联关键词：</span>
          {record.keywords?.length ? record.keywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>) : <span>-</span>}
        </div>
        {record.lastPushFailureReason ? <div class={styles.failure}>推送失败原因：{record.lastPushFailureReason}</div> : null}
        <div class={styles.cardActions}>
          <Button size="small" onClick={() => void openOpinionDetail(record)}>
            舆情详情
          </Button>
          <Button size="small" loading={pushingId.value === (record.opinionId || record.id)} onClick={() => void openManualPush(record)}>
            手动推送
          </Button>
          <Button size="small" onClick={() => void openPushRecords(record)}>
            推送记录
          </Button>
          <Button size="small" disabled={!record.relatedEventId} onClick={() => void openEvent(record.relatedEventId, record.id, record)}>
            事件详情
          </Button>
          <Button
            size="small"
            type="primary"
            disabled={!record.relatedEventId}
            loading={archivingEventId.value === record.relatedEventId}
            onClick={() => void openArchiveFromAlert(record)}
          >
            归档
          </Button>
        </div>
      </div>
    );

    return () => (
      <PageShell
        title={pageTitle.value}
        showFooter
        v-slots={{
          "layout-header": () => (
            <Space>
              <Button
                onClick={() => {
                  void openNotificationConfig();
                }}
              >
                通知人配置
              </Button>
            </Space>
          ),
          "layout-content": () => (
            <>
              <Form layout="inline" class={styles.searchForm} data-layout-toolbar>
                <FormItem label="预警等级" class={styles.searchItem}>
                  <Select v-model:value={filters.warningLevel} allowClear placeholder="全部等级" style={{ width: "120px" }}>
                    {WARNING_LEVEL_OPTIONS.map((item) => (
                      <SelectOption key={item.value || "all"} value={item.value}>
                        {item.label}
                      </SelectOption>
                    ))}
                  </Select>
                </FormItem>
                <FormItem label="推送状态" class={styles.searchItem}>
                  <Select v-model:value={filters.pushStatus} allowClear placeholder="全部状态" style={{ width: "130px" }}>
                    {PUSH_STATUS_OPTIONS.map((item) => (
                      <SelectOption key={item.value || "all"} value={item.value}>
                        {item.label}
                      </SelectOption>
                    ))}
                  </Select>
                </FormItem>
                <FormItem label="预警时间" class={styles.searchItem}>
                  <DateRangePicker
                    v-model:value={filters.timeRange}
                    showTime={{ format: "HH:mm" }}
                    format="YYYY-MM-DD HH:mm"
                    valueFormat="YYYY-MM-DD HH:mm"
                    allowClear
                  />
                </FormItem>
                <FormItem class={styles.searchItem}>
                  <Input
                    v-model:value={filters.keyword}
                    placeholder="搜索标题、摘要、关键词..."
                    allowClear
                    showCount={false}
                    onPressEnter={onSearch}
                    style={{ width: "240px" }}
                  />
                </FormItem>
                <FormItem class={styles.searchItem}>
                  <Button type="primary" onClick={onSearch}>
                    查询
                  </Button>
                  <Button style={{ marginLeft: "10px" }} onClick={onReset}>
                    重置
                  </Button>
                </FormItem>
              </Form>
              <div class={styles.list}>
                {loading.value ? (
                  <div class={styles.loading}>加载中...</div>
                ) : records.value.length ? (
                  records.value.map(renderAlertCard)
                ) : (
                  <Empty description="暂无预警" />
                )}
              </div>
              <Modal
                open={notificationVisible.value}
                title="预警通知人配置"
                width={640}
                confirmLoading={notificationLoading.value}
                onOk={() => void saveNotificationConfig()}
                onCancel={() => {
                  notificationVisible.value = false;
                }}
              >
                <div class={styles.configList}>
                  {configDrafts.value.map((item) => (
                    <div key={item.warningLevel} class={styles.configCard}>
                      <div class={styles.configTitle}>
                        {levelTag(item.warningLevel)}
                        <span>{item.warningLevel === "RED" ? "需立即响应" : item.warningLevel === "YELLOW" ? "核实关注" : "日常关注"}</span>
                      </div>
                      <Form layout="vertical">
                        <FormItem label="推送渠道">
                          <Select
                            v-model:value={item.channels}
                            mode="multiple"
                            placeholder={item.sceneCode ? "请选择消息中心已配置渠道" : "暂无可用消息渠道"}
                            loading={item.channelsLoading}
                            disabled={!item.sceneCode}
                            style={{ width: "100%" }}
                          >
                            {item.availableChannels.map((channel) => (
                              <SelectOption key={String(channel.channelCode)} value={String(channel.channelCode)}>
                                {channel.channelName}
                              </SelectOption>
                            ))}
                          </Select>
                        </FormItem>
                        <FormItem label="通知人">
                          <Select
                            v-model:value={item.receiverUserIds}
                            mode="multiple"
                            showSearch
                            filterOption={false}
                            placeholder="搜索姓名、手机号或组织"
                            loading={item.receiverState.loading}
                            style={{ width: "100%" }}
                            onSearch={(keyword: string) => searchDraftReceivers(item, keyword)}
                            onPopupScroll={(event: Event) => loadMoreDraftReceivers(item, event)}
                          >
                            {item.receiverState.options.map((receiver) => (
                              <SelectOption key={receiverKey(receiver)} value={receiverKey(receiver)} label={receiverLabel(receiver)}>
                                {receiverLabel(receiver)}
                              </SelectOption>
                            ))}
                          </Select>
                        </FormItem>
                        <div class={styles.receiverHint}>仅保存当前实际选择的渠道和通知人，不自动补默认渠道。</div>
                      </Form>
                    </div>
                  ))}
                </div>
              </Modal>
              <Modal
                open={manualPushVisible.value}
                title="手动推送预警"
                confirmLoading={Boolean(pushingId.value)}
                onOk={() => {
                  void submitManualPush();
                }}
                onCancel={() => {
                  manualPushVisible.value = false;
                }}
              >
                {manualPushTarget.value ? (
                  <div class={styles.manualPush}>
                    <div class={styles.manualTitle}>{manualPushTarget.value.title}</div>
                    <div class={styles.manualMeta}>
                      {levelTag(manualPushTarget.value.warningLevel, manualPushTarget.value.warningLevelText)}
                      <span>热度 {manualPushTarget.value.heatIndex ?? "-"}</span>
                    </div>
                    <Form layout="vertical">
                      <FormItem label="推送渠道" required>
                        <Select
                          v-model:value={manualForm.channels}
                          mode="multiple"
                          placeholder="请选择消息渠道"
                          loading={manualChannelsLoading.value}
                          disabled={!sceneCodeForAlert(manualPushTarget.value)}
                          style={{ width: "100%" }}
                        >
                          {manualChannels.value.map((channel) => (
                            <SelectOption key={String(channel.channelCode)} value={String(channel.channelCode)}>
                              {channel.channelName}
                            </SelectOption>
                          ))}
                        </Select>
                      </FormItem>
                      <FormItem label="通知人" required>
                        <Select
                          v-model:value={manualForm.receiverUserIds}
                          mode="multiple"
                          showSearch
                          filterOption={false}
                          placeholder="搜索姓名、手机号或组织"
                          loading={manualReceiverState.loading}
                          style={{ width: "100%" }}
                          onSearch={searchManualReceivers}
                          onPopupScroll={loadMoreManualReceivers}
                        >
                          {manualReceiverState.options.map((receiver) => (
                            <SelectOption key={receiverKey(receiver)} value={receiverKey(receiver)} label={receiverLabel(receiver)}>
                              {receiverLabel(receiver)}
                            </SelectOption>
                          ))}
                        </Select>
                      </FormItem>
                    </Form>
                  </div>
                ) : null}
              </Modal>
              <Modal
                open={recordsVisible.value}
                title="推送记录"
                width={760}
                footer={
                  <Button
                    onClick={() => {
                      recordsVisible.value = false;
                    }}
                  >
                    关闭
                  </Button>
                }
                onCancel={() => {
                  recordsVisible.value = false;
                }}
              >
                <Table
                  columns={pushRecordColumns}
                  dataSource={pushRecords.value}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: EVENT_TABLE_SCROLL_X }}
                  locale={{ emptyText: <Empty description="暂无推送记录" /> }}
                />
              </Modal>
              <Modal
                open={opinionDetailVisible.value}
                title="舆情详情"
                width={720}
                footer={
                  <Button
                    onClick={() => {
                      opinionDetailVisible.value = false;
                    }}
                  >
                    关闭
                  </Button>
                }
                onCancel={() => {
                  opinionDetailVisible.value = false;
                }}
              >
                {opinionDetailLoading.value ? (
                  <div class={styles.loading}>加载中...</div>
                ) : activeOpinion.value ? (
                  <div class={styles.opinionDetail}>
                    <h3 class={styles.opinionTitle}>{activeOpinion.value.title}</h3>
                    <div class={styles.opinionRow}>
                      <span>来源</span>
                      {activeOpinion.value.source || "-"}
                    </div>
                    <div class={styles.opinionRow}>
                      <span>作者</span>
                      {activeOpinion.value.author || "--"}
                    </div>
                    <div class={styles.opinionRow}>
                      <span>情感倾向</span>
                      <SentimentTag sentiment={activeOpinion.value.sentiment} />
                    </div>
                    <div class={styles.opinionRow}>
                      <span>热度指数</span>
                      {activeOpinion.value.heatIndex ?? "-"}
                    </div>
                    <div class={styles.opinionRow}>
                      <span>预警等级</span>
                      {levelTag(activeOpinion.value.warningLevel, activeOpinion.value.warningLevelText)}
                    </div>
                    <div class={styles.opinionRow}>
                      <span>推送状态</span>
                      {pushStatusTag(activeOpinion.value.pushStatus, activeOpinion.value.pushStatusText)}
                    </div>
                    <div class={styles.opinionRow}>
                      <span>采集时间</span>
                      {formatDateTime(activeOpinion.value.collectedAt)}
                    </div>
                    {activeOpinion.value.alertTime ? (
                      <div class={styles.opinionRow}>
                        <span>预警时间</span>
                        {formatDateTime(activeOpinion.value.alertTime)}
                      </div>
                    ) : null}
                    <div class={styles.opinionRow}>
                      <span>原文链接</span>
                      {activeOpinion.value.url ? (
                        <a href={activeOpinion.value.url} target="_blank" rel="noreferrer">
                          {activeOpinion.value.url}
                        </a>
                      ) : (
                        "-"
                      )}
                    </div>
                    <div class={styles.opinionRow}>
                      <span>关联关键词</span>
                      <Space wrap>
                        {activeOpinion.value.keywords?.length ? (
                          activeOpinion.value.keywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>)
                        ) : (
                          <span>-</span>
                        )}
                      </Space>
                    </div>
                    <div class={styles.opinionContent}>
                      <div class={styles.opinionLabel}>详细内容</div>
                      <pre class={styles.contentPre}>{activeOpinion.value.content || activeOpinion.value.summary || "-"}</pre>
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无舆情详情" />
                )}
              </Modal>
              <Modal
                open={eventVisible.value}
                title="预警事件详情"
                width={820}
                zIndex={1000}
                footer={
                  <Space>
                    <Button onClick={() => openArchive()} disabled={!activeEvent.value?.eventId}>
                      事件归档
                    </Button>
                    <Button
                      onClick={() => {
                        eventVisible.value = false;
                      }}
                    >
                      关闭
                    </Button>
                  </Space>
                }
                onCancel={() => {
                  eventVisible.value = false;
                }}
              >
                {eventLoading.value ? (
                  <div class={styles.loading}>加载中...</div>
                ) : activeEvent.value ? (
                  <div class={styles.eventDetail}>
                    <div class={styles.eventOverview}>
                      <span>事件编号：{activeEvent.value.eventCode || activeEvent.value.eventId}</span>
                      <span>等级：{levelTag(activeEvent.value.warningLevel, activeEvent.value.warningLevelText)}</span>
                      <span>热度：{eventHeatIndex(activeEvent.value) ?? "-"}</span>
                      <span>来源：{eventSource(activeEvent.value) || "-"}</span>
                      <span>预警时间：{formatDateTime(eventAlertTime(activeEvent.value))}</span>
                    </div>
                    <div class={styles.sectionTitle}>传播时间线</div>
                    <div class={styles.timeline}>
                      {(activeEvent.value.timeline ?? []).length ? (
                        activeEvent.value.timeline?.map((node, idx) => (
                          <div key={`${node.time}-${idx}`} class={styles.timelineItem}>
                            <div class={styles.timelineDot}></div>
                            <div>
                              <div class={styles.timelineTime}>{formatDateTime(node.actionTime || node.time)}</div>
                              <div class={styles.timelineText}>{nodeText(node)}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <Empty description="暂无时间线" />
                      )}
                    </div>
                    <div class={styles.sectionTitle}>应对记录</div>
                    <div class={styles.actionList}>
                      {(activeEvent.value.responseActions ?? []).length ? (
                        activeEvent.value.responseActions?.map((action, idx) => <div key={idx}>{actionText(action)}</div>)
                      ) : (
                        <span>暂无应对记录</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无事件详情" />
                )}
              </Modal>
              <Modal
                open={archiveVisible.value}
                title="事件归档"
                zIndex={1200}
                confirmLoading={archiveLoading.value}
                onOk={() => {
                  void submitArchive();
                }}
                onCancel={() => {
                  archiveVisible.value = false;
                }}
              >
                <Form layout="vertical">
                  <FormItem label="归档说明" required>
                    <Textarea v-model:value={archiveForm.archiveRemark} rows={3} placeholder="填写归档说明" />
                  </FormItem>
                  <FormItem label="应对时间" required>
                    <DatePicker
                      v-model:value={archiveForm.actionTime}
                      showTime
                      format="YYYY-MM-DD HH:mm:ss"
                      valueFormat="YYYY-MM-DD HH:mm:ss"
                      placeholder="请选择应对时间"
                      style={{ width: "100%" }}
                    />
                  </FormItem>
                  <FormItem label="应对类型" required>
                    <Input v-model:value={archiveForm.actionType} placeholder="如：发布公告/内部核查" allowClear />
                  </FormItem>
                  <FormItem label="应对内容" required>
                    <Textarea v-model:value={archiveForm.actionContent} rows={3} placeholder="填写本次归档补充的应对措施" />
                  </FormItem>
                  <FormItem label="操作人" required>
                    <Select
                      v-model:value={archiveForm.operatorUserId}
                      showSearch
                      allowClear
                      filterOption={false}
                      placeholder="搜索姓名、手机号或组织"
                      loading={archiveOperatorReceiverState.loading}
                      style={{ width: "100%" }}
                      onChange={(value) => {
                        if (typeof value === "string") selectArchiveOperator(value);
                      }}
                      onSearch={searchArchiveOperatorReceivers}
                      onPopupScroll={loadMoreArchiveOperatorReceivers}
                    >
                      {archiveOperatorReceiverState.options.map((receiver) => (
                        <SelectOption key={receiverKey(receiver)} value={receiverKey(receiver)} label={receiverLabel(receiver)}>
                          {receiverLabel(receiver)}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormItem>
                </Form>
              </Modal>
            </>
          ),
          "footer-page": () => (
            <GPagination total={total.value} current={pageNumber.value} pageSize={pageSize.value} onChange={onPageChange} />
          ),
        }}
      />
    );
  },
});
