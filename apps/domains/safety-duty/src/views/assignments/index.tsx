import type {
  DutyAssignmentDetailVO,
  DutyAssignmentItemGroupVO,
  DutyAssignmentItemVO,
  DutyDateTime,
  DutyMyAssignmentCurrentParam,
  DutyRecordSummaryVO,
} from "@g2-contract/safety-personnel";
import type { UploadChangeParam, UploadFile, UploadRequestOption } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import type { JSX } from "vue/jsx-runtime";

import { useAuthRequest } from "@/api/request";
import { createDutyManualRecord, getCurrentDutyAssignment, listCurrentDutyAssignmentItemRecords } from "@/api/server";
import { uploadDutyEvidence } from "@/api/upload";
import { DUTY_RECORD_ATTACHMENT_SCENE_CODE, INDUSTRY_OPTIONS } from "@/constants";
import { PageLayout } from "@/pc-ui-runtime";
import { Button, Empty, Input, Modal, Select, SelectOption, Space, Tag, Textarea, Upload, message } from "@/pc-ui-runtime";
import { formatDutyPeriodRange, formatPercent, formatText, periodLabel, showApiError, statusTag, toPercentNumber } from "@/utils";
import { usePageName } from "@/utils/page";

import styles from "./index.module.css";

const STATUS_FILTERS = [
  { value: "", label: "全部" },
  { value: "PENDING", label: "待执行" },
  { value: "COMPLETED", label: "已完成" },
  { value: "OVERDUE", label: "已超期" },
];

const PERIOD_FILTERS = [
  { value: "", label: "全部周期" },
  { value: "MONTH", label: "月" },
  { value: "QUARTER", label: "季" },
  { value: "YEAR", label: "年" },
];

const isCompleted = (item: DutyAssignmentItemVO): boolean => item.status === "COMPLETED";
const isPending = (item: DutyAssignmentItemVO): boolean => item.status === "PENDING" || item.status === "PEDING";
const isOverdue = (item: DutyAssignmentItemVO): boolean => item.status === "OVERDUE";
const isMandatory = (item: DutyAssignmentItemVO): boolean => item.itemType === "MANDATORY";
const isStatusMatched = (status?: string, filterStatus?: string): boolean =>
  !filterStatus || status === filterStatus || (filterStatus === "PENDING" && status === "PEDING");
const industryLabelMap = new Map(INDUSTRY_OPTIONS.map((item) => [item.value, item.label]));

const industryLabel = (industryType?: string, industryTypeLabel?: string): string => {
  if (industryTypeLabel) {
    return industryTypeLabel;
  }
  return industryType ? (industryLabelMap.get(industryType) ?? industryType) : "--";
};

const formatDateTimeText = (value?: DutyDateTime | null): string => {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  if (typeof value === "number") {
    return formatText(value);
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/);
  if (!match) {
    return formatText(text);
  }
  return `${match[1]} ${match[2].length === 5 ? `${match[2]}:00` : match[2]}`;
};

const datePart = (value?: DutyDateTime | null): string => {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
};

const groupKey = (group: DutyAssignmentItemGroupVO): string =>
  `${group.periodType ?? ""}-${group.periodStartTime ?? ""}-${group.periodEndTime ?? ""}`;

const groupTitle = (group: DutyAssignmentItemGroupVO): string => {
  const start = datePart(group.periodStartTime);
  if (group.periodType === "MONTH" && start) {
    return `月度任务（${Number(start.slice(5, 7))}月）`;
  }
  if (group.periodType === "QUARTER" && start) {
    return `季度任务（Q${Math.floor((Number(start.slice(5, 7)) - 1) / 3) + 1}）`;
  }
  if (group.periodType === "YEAR" && start) {
    return `年度任务（${start.slice(0, 4)}）`;
  }
  return `${periodLabel(group.periodType)}任务`;
};

const stringValue = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return "";
};

export const DutyAssignmentsPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const loading = ref(false);
    const saving = ref(false);
    const detail = ref<DutyAssignmentDetailVO>();
    const recordsOpen = ref(false);
    const itemRecords = ref<DutyRecordSummaryVO[]>([]);
    const manualOpen = ref(false);
    const manualItem = ref<DutyAssignmentItemVO>();
    const manualText = ref("");
    const manualFiles = ref<UploadFile[]>([]);
    const manualFileIds = ref<string[]>([]);
    const filters = reactive({
      status: "",
      periodType: "",
      lawNameCode: "",
      keyword: "",
    });
    const appliedFilters = reactive({
      status: "",
      periodType: "",
      lawNameCode: "",
      keyword: "",
    });

    const allItems = computed(() => (detail.value?.groups ?? []).flatMap((group) => group.items ?? []));
    const periodStatPrefix = computed(() => {
      const periodType = appliedFilters.periodType;
      const map: Record<string, string> = { MONTH: "本月", QUARTER: "本季度", YEAR: "本年" };
      return periodType ? (map[periodType] ?? periodLabel(periodType)) : "全部周期";
    });
    const profileIndustryText = computed(() => industryLabel(detail.value?.industryType, detail.value?.industryTypeLabel));
    const profilePeriodText = computed(() => {
      const range = formatDutyPeriodRange(detail.value?.periodStartTime, detail.value?.periodEndTime);
      if (range) {
        return range;
      }
      return appliedFilters.periodType ? formatText(detail.value?.periodLabel || periodLabel(appliedFilters.periodType)) : "全部周期";
    });

    const lawOptions = computed(() => {
      const map = new Map<string, string>();
      allItems.value.forEach((item) => {
        const code = item.lawNameCode || item.lawNameLabel || item.clauseNo;
        if (code) {
          map.set(code, item.lawNameLabel || item.lawNameCode || item.clauseNo || code);
        }
      });
      return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    });

    const filteredGroups = computed<DutyAssignmentItemGroupVO[]>(() => {
      const keyword = appliedFilters.keyword.trim();
      return (detail.value?.groups ?? [])
        .map((group) => {
          if (appliedFilters.periodType && group.periodType !== appliedFilters.periodType) {
            return { ...group, items: [] };
          }
          const items = (group.items ?? []).filter((item) => {
            if (!isStatusMatched(item.status, appliedFilters.status)) {
              return false;
            }
            if (appliedFilters.lawNameCode) {
              const lawKey = item.lawNameCode || item.lawNameLabel || item.clauseNo;
              if (lawKey !== appliedFilters.lawNameCode) {
                return false;
              }
            }
            if (!keyword) {
              return true;
            }
            return [item.taskDescription, item.clauseNo, item.lawNameLabel, item.lawNameCode].some((value) =>
              String(value || "").includes(keyword),
            );
          });
          return { ...group, items, itemCount: items.length, completedItemCount: items.filter(isCompleted).length };
        })
        .filter((group) => (group.items ?? []).length > 0);
    });
    const filteredItems = computed(() => filteredGroups.value.flatMap((group) => group.items ?? []));
    const visibleStats = computed(() => {
      const totalItemCount = filteredItems.value.length;
      const completedItemCount = filteredItems.value.filter(isCompleted).length;
      const pendingItemCount = filteredItems.value.filter(isPending).length;
      const overdueItemCount = filteredItems.value.filter(isOverdue).length;
      return {
        totalItemCount,
        completedItemCount,
        pendingItemCount,
        overdueItemCount,
        completionRate: totalItemCount > 0 ? completedItemCount / totalItemCount : 0,
      };
    });

    const currentQuery = (): DutyMyAssignmentCurrentParam | undefined => {
      const query: DutyMyAssignmentCurrentParam = {};
      if (appliedFilters.periodType) {
        query.periodType = appliedFilters.periodType;
      }
      if (appliedFilters.status) {
        query.itemStatus = appliedFilters.status;
      }
      return Object.keys(query).length > 0 ? query : undefined;
    };

    const loadDetail = async (): Promise<void> => {
      loading.value = true;
      try {
        detail.value = await useAuthRequest(() => getCurrentDutyAssignment(currentQuery()));
      } catch (e) {
        showApiError(e, "查询个人责任清单失败");
        detail.value = undefined;
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void loadDetail();
    });

    const resetFilters = (): void => {
      filters.status = "";
      filters.periodType = "";
      filters.lawNameCode = "";
      filters.keyword = "";
      appliedFilters.status = "";
      appliedFilters.periodType = "";
      appliedFilters.lawNameCode = "";
      appliedFilters.keyword = "";
      void loadDetail();
    };

    const queryFilters = (): void => {
      appliedFilters.status = filters.status;
      appliedFilters.periodType = filters.periodType;
      appliedFilters.lawNameCode = filters.lawNameCode;
      appliedFilters.keyword = filters.keyword.trim();
      void loadDetail();
    };

    const openRecords = async (item: DutyAssignmentItemVO): Promise<void> => {
      const assignmentItemId = item.assignmentItemId;
      if (!assignmentItemId) {
        return;
      }
      try {
        itemRecords.value = await useAuthRequest(() => listCurrentDutyAssignmentItemRecords(assignmentItemId));
        recordsOpen.value = true;
      } catch (e) {
        showApiError(e, "查询关联记录失败");
      }
    };

    const openManual = (item: DutyAssignmentItemVO): void => {
      if (!item.assignmentItemId) {
        return;
      }
      if (item.manualFillAllowed === false || isOverdue(item)) {
        message.warning("已超期，不允许手动填报");
        return;
      }
      manualItem.value = item;
      manualText.value = "";
      manualFiles.value = [];
      manualFileIds.value = [];
      manualOpen.value = true;
    };

    const uploadManualEvidence = async (options: UploadRequestOption): Promise<void> => {
      const { file, onSuccess, onError } = options;
      try {
        const result = await uploadDutyEvidence({
          file: file as File,
          businessKey: "maintain",
          sceneCode: DUTY_RECORD_ATTACHMENT_SCENE_CODE,
        });
        const fileId = stringValue((result as { id?: unknown }).id);
        onSuccess?.({ fileId, id: fileId, url: (result as { path?: unknown }).path });
      } catch (e) {
        showApiError(e, "上传附件失败");
        onError?.(e as Error);
      }
    };

    const onManualUploadChange = (info: UploadChangeParam): void => {
      manualFiles.value = info.fileList;
      const nextFileIds = info.fileList
        .map((file) => {
          const response = file.response as { fileId?: unknown; id?: unknown } | undefined;
          return stringValue(response?.fileId ?? response?.id);
        })
        .filter(Boolean);
      if (nextFileIds.length > 0 || info.fileList.length === 0) {
        manualFileIds.value = nextFileIds;
      }
    };

    const submitManual = async (): Promise<void> => {
      const assignmentItemId = manualItem.value?.assignmentItemId;
      if (!assignmentItemId) {
        return;
      }
      if (!manualText.value.trim()) {
        message.warning("请填写执行说明");
        return;
      }
      if (manualFiles.value.some((file) => file.status === "uploading")) {
        message.warning("附件上传中，请稍后提交");
        return;
      }
      if (manualFiles.value.some((file) => file.status === "error")) {
        message.warning("请删除上传失败的附件后再提交");
        return;
      }
      saving.value = true;
      try {
        await useAuthRequest(() =>
          createDutyManualRecord({
            assignmentItemId,
            executionDescription: manualText.value.trim(),
            fileIds: manualFileIds.value,
          }),
        );
        message.success("手动填报提交成功");
        manualOpen.value = false;
        await loadDetail();
      } catch (e) {
        showApiError(e, "提交失败");
      } finally {
        saving.value = false;
      }
    };

    const renderStatus = (item: DutyAssignmentItemVO): JSX.Element => (
      <Space>
        <span class={[styles.statusDot, isCompleted(item) ? styles.successDot : isOverdue(item) ? styles.dangerDot : styles.warningDot]} />
        {statusTag(item.status)}
        {isOverdue(item) && typeof item.overdueDays === "number" ? <span class={styles.dangerText}>超期{item.overdueDays}天</span> : null}
      </Space>
    );

    const renderItem = (item: DutyAssignmentItemVO): JSX.Element => (
      <div
        class={[styles.taskItem, isMandatory(item) ? styles.mandatoryItem : "", isOverdue(item) ? styles.overdueItem : ""]}
        key={item.assignmentItemId}
      >
        <input class={styles.itemCheckbox} type="checkbox" checked={isCompleted(item)} disabled />
        <div class={styles.itemMain}>
          <div class={[styles.itemTitle, isCompleted(item) ? styles.completedTitle : ""]}>{formatText(item.taskDescription)}</div>
          <div class={styles.meta}>
            <span class={styles.lawTag}>{formatText(item.lawNameLabel || item.clauseNo)}</span>
            <span>截止 {formatDateTimeText(item.deadlineTime)}</span>
          </div>
        </div>
        <div class={styles.itemActions}>
          {isMandatory(item) ? <Tag color="red">强制</Tag> : null}
          {item.recordCount ? (
            <Tag color="green" onClick={() => void openRecords(item)}>
              已完成 · {item.recordCount}条
            </Tag>
          ) : null}
          {renderStatus(item)}
          <Button
            size="small"
            type={item.manualFillAllowed === false || isOverdue(item) ? "default" : "primary"}
            disabled={item.manualFillAllowed === false || isOverdue(item)}
            onClick={() => openManual(item)}
          >
            手动填报
          </Button>
        </div>
      </div>
    );

    const renderFilterBar = (): JSX.Element => (
      <div class={styles.filterBar}>
        <span class={styles.filterLabel}>筛选：</span>
        {STATUS_FILTERS.map((item) => (
          <button
            class={[styles.filterButton, filters.status === item.value ? styles.filterButtonActive : ""]}
            key={item.value || "ALL"}
            onClick={() => (filters.status = item.value)}
          >
            {item.label}
          </button>
        ))}
        <Select
          style={{ width: "120px" }}
          value={filters.periodType}
          onUpdate:value={(value) => (filters.periodType = typeof value === "string" ? value : "")}
        >
          {PERIOD_FILTERS.map((item) => (
            <SelectOption key={item.value || "ALL"} value={item.value}>
              {item.label}
            </SelectOption>
          ))}
        </Select>
        <Select
          style={{ width: "150px" }}
          value={filters.lawNameCode}
          onUpdate:value={(value) => (filters.lawNameCode = typeof value === "string" ? value : "")}
        >
          <SelectOption value="">全部法规来源</SelectOption>
          {lawOptions.value.map((item) => (
            <SelectOption key={item.value} value={item.value}>
              {item.label}
            </SelectOption>
          ))}
        </Select>
        <Input
          style={{ width: "180px" }}
          value={filters.keyword}
          placeholder="搜索任务..."
          allowClear
          showCount={false}
          onUpdate:value={(value: string) => (filters.keyword = value)}
          onPressEnter={queryFilters}
        />
        <Space size={10}>
          <Button type="primary" onClick={queryFilters}>
            查询
          </Button>
          <Button onClick={resetFilters}>重置</Button>
        </Space>
      </div>
    );

    const layoutSlots = {
      "layout-header": (): JSX.Element => (
        <Button loading={loading.value} onClick={() => void loadDetail()}>
          刷新
        </Button>
      ),
      "layout-content": (): JSX.Element => (
        <>
          {!detail.value && !loading.value ? <Empty description="暂无责任清单" /> : null}
          {detail.value ? (
            <div class={styles.assignmentContent}>
              <div class={styles.profileCard}>
                <div class={styles.avatar}>{formatText(detail.value.responsibleUserName).slice(0, 1)}</div>
                <div>
                  <div class={styles.profileTitle}>
                    {formatText(detail.value.responsibleUserName)} · {formatText(detail.value.roleName)}
                  </div>
                  <div class={styles.meta}>
                    {profileIndustryText.value} · {profilePeriodText.value}
                  </div>
                </div>
              </div>
              {renderFilterBar()}
              <div class="statGrid">
                <div class="statCard">
                  <div class="statLabel">{periodStatPrefix.value}总计</div>
                  <div class="statValue">
                    {visibleStats.value.totalItemCount}
                    <span> 项</span>
                  </div>
                </div>
                <div class="statCard">
                  <div class="statLabel">已完成</div>
                  <div class="statValue">
                    {visibleStats.value.completedItemCount}
                    <span> 项</span>
                  </div>
                </div>
                <div class="statCard">
                  <div class="statLabel">待执行</div>
                  <div class="statValue">
                    {visibleStats.value.pendingItemCount}
                    <span> 项</span>
                  </div>
                </div>
                <div class="statCard">
                  <div class="statLabel">已超期</div>
                  <div class="statValue">
                    {visibleStats.value.overdueItemCount}
                    <span> 项</span>
                  </div>
                </div>
              </div>
              <div class={styles.progressCard}>
                <div class={styles.progressHeader}>
                  <span>{periodStatPrefix.value}完成率</span>
                  <strong>{formatPercent(visibleStats.value.completionRate)}</strong>
                </div>
                <div class={styles.progressTrack}>
                  <div
                    class={styles.progressBar}
                    style={{ width: `${Math.max(0, Math.min(100, Math.round(toPercentNumber(visibleStats.value.completionRate) ?? 0)))}%` }}
                  />
                </div>
              </div>
              {filteredGroups.value.length === 0 ? (
                <Empty description="暂无匹配任务" />
              ) : (
                filteredGroups.value.map((group) => (
                  <div class={styles.group} key={groupKey(group)}>
                    <div class={styles.groupTitle}>
                      <span>{groupTitle(group)}</span>
                      <span>
                        {group.itemCount ?? group.items?.length ?? 0}项 · 完成{group.completedItemCount ?? 0}项
                      </span>
                    </div>
                    {(group.items ?? []).map((item) => renderItem(item))}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </>
      ),
    };

    return (): JSX.Element => (
      <>
        <PageLayout title={pageTitle} showFooter={false} v-slots={layoutSlots} />
        <Modal
          open={recordsOpen.value}
          title="关联记录"
          width={720}
          centered
          footer={null}
          onUpdate:open={(value: boolean) => (recordsOpen.value = value)}
        >
          <div class={styles.recordList}>
            {itemRecords.value.length === 0 ? (
              <Empty description="暂无记录" />
            ) : (
              itemRecords.value.map((record) => (
                <div class={styles.recordItem} key={record.recordId}>
                  <Space>
                    <Tag color={record.sourceType === "SYSTEM_COLLECT" ? "blue" : "green"}>
                      {record.sourceTypeLabel || record.sourceType}
                    </Tag>
                    <strong>{formatText(record.title)}</strong>
                    <span>{formatText(record.occurredTime)}</span>
                  </Space>
                  <div class={styles.meta}>{formatText(record.summary)}</div>
                </div>
              ))
            )}
          </div>
        </Modal>
        <Modal
          open={manualOpen.value}
          title="手动填报"
          width={520}
          okText="确认提交"
          cancelText="取消"
          confirmLoading={saving.value}
          onUpdate:open={(value: boolean) => (manualOpen.value = value)}
          onOk={() => void submitManual()}
        >
          <div class={styles.manualForm}>
            <div class={styles.manualIntro}>填写已完成但系统未自动捕获的履职行为，提交后标记为“已完成”</div>
            <div class={styles.manualField}>
              <div class={styles.manualLabel}>关联清单项</div>
              <div class={styles.readonlyField}>{formatText(manualItem.value?.taskDescription)}</div>
            </div>
            <div class={styles.manualField}>
              <div class={styles.manualLabel}>
                执行说明 <span class={styles.required}>*</span>
              </div>
              <Textarea
                class={styles.manualTextarea}
                value={manualText.value}
                rows={4}
                placeholder="简述执行情况，如：已于6月10日现场制止了XX车间的违章动火作业"
                onUpdate:value={(value: string) => (manualText.value = value)}
              />
            </div>
            <div class={styles.manualField}>
              <div class={styles.manualLabel}>证据附件</div>
              <div class={styles.manualUpload}>
                <Upload
                  customRequest={uploadManualEvidence}
                  fileList={manualFiles.value}
                  multiple
                  maxCount={9}
                  onChange={onManualUploadChange}
                >
                  <div class={styles.manualUploadBox}>
                    <div class={styles.uploadPlus}>+</div>
                    <div class={styles.uploadText}>点击上传照片或文件（支持多张）</div>
                  </div>
                </Upload>
              </div>
            </div>
          </div>
        </Modal>
      </>
    );
  },
});
