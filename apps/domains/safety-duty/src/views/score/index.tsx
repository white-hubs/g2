import type {
  DutyPersonalScoreReportVO,
  DutyScoreDashboardSummaryVO,
  DutyScoreDepartmentSummaryVO,
  DutyId,
  DutyScoreLevelRuleVO,
  DutyScoreModelVO,
  DutyScoreNotifyTargetVO,
  DutyScoreNotifyTargetCandidateVO,
  DutyScoreNotifyTargetItemVO,
  DutyScoreNotifyTargetItemParam,
  DutyScorePublicityPersonVO,
  DutyScorePublicityRankingItemVO,
  DutyScorePublicityVO,
  DutyScoreRankingExportParam,
  DutyScoreRankingItemVO,
} from "@g2-contract/safety-personnel";
import { markRaw } from "vue";
import { computed, defineComponent, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { JSX } from "vue/jsx-runtime";

import { dutyMessageService } from "@/api/message-center-service";
import { useAuthRequest } from "@/api/request";
import {
  exportDutyScoreRankings,
  getDutyAppPersonalScoreReport,
  getDutyPersonalScoreReport,
  getDutyScoreDashboardSummary,
  getDutyScoreModel,
  getDutyScorePublicity,
  listDutyRoleAssignments,
  listDutyScoreDepartmentSummaries,
  listDutyScoreNotifyTargets,
  pageDutyScoreNotifyTargetCandidates,
  pageDutyScorePublicityRankings,
  pageDutyScoreRankings,
  saveDutyScoreModel,
  saveDutyScoreNotifyTargets,
} from "@/api/server";
import { PeriodValuePicker, currentPeriodValue } from "@/components/period-value-picker";
import { INDUSTRY_OPTIONS, PERIOD_OPTIONS, SCORE_LEVELS, TABLE_PAGE_SIZE } from "@/constants";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import {
  Button,
  RadioGroup,
  CheckboxGroup,
  Empty,
  Input,
  InputNumber,
  Modal,
  Page,
  Select,
  SelectOption,
  Space,
  Tag,
  message,
} from "@/pc-ui-runtime";
import { formatPercent, formatText, periodLabel, showApiError, statusTag } from "@/utils";
import {
  configuredNoticeWays,
  DUTY_SCORE_LEVEL_MESSAGE_SCENE,
  findSceneConfig,
  normalizeNoticeWayOptions,
  type NoticeWayOption,
  SAFETY_DUTY_MESSAGE_BUSINESS_TYPE,
  toNoticeWaysDTO,
} from "@/utils/message-scene";
import { usePageName } from "@/utils/page";

import styles from "./index.module.css";

const MODEL_PUBLICITY_OPTIONS = [
  { value: "NONE", label: "—" },
  { value: "RED", label: "红榜公示" },
  { value: "BLACK", label: "黑榜公示" },
];

const levelTag = (level?: string): JSX.Element => {
  const colors: Record<string, string> = { A: "green", B: "blue", C: "orange", D: "red" };
  return <Tag color={level ? colors[level] : undefined}>{level || "--"}</Tag>;
};

type ScorePageKey = "dashboard" | "publicity" | "model" | "notify" | "report";

const notifyLevelMeta = [
  { level: "A", title: "A级 · 优秀", desc: "建议项完成率 ≥ 90%", tagColor: "green", tagClass: "notifyTargetGreen" },
  { level: "B", title: "B级 · 正常", desc: "建议项完成率 70%-89%", tagColor: "blue", tagClass: "notifyTargetBlue" },
  { level: "C", title: "C级 · 关注", desc: "建议项完成率 50%-69%", tagColor: "orange", tagClass: "notifyTargetOrange" },
  { level: "D", title: "D级 · 不合格", desc: "强制项有未完成", tagColor: "red", tagClass: "notifyTargetRed" },
];

const DEFAULT_MODEL_LEVELS: DutyScoreLevelRuleVO[] = [
  {
    level: "A",
    mandatoryRequirement: "全部强制项已完成",
    minCompletionRate: 90,
    maxCompletionRate: 100,
    label: "优秀",
    publicityType: "RED",
    editable: true,
  },
  {
    level: "B",
    mandatoryRequirement: "全部强制项已完成",
    minCompletionRate: 75,
    maxCompletionRate: 89.99,
    label: "良好",
    publicityType: "NONE",
    editable: true,
  },
  {
    level: "C",
    mandatoryRequirement: "全部强制项已完成",
    minCompletionRate: 0,
    maxCompletionRate: 74.99,
    label: "待提升",
    publicityType: "NONE",
    editable: true,
  },
  {
    level: "D",
    mandatoryRequirement: "存在强制项缺失",
    minCompletionRate: 0,
    maxCompletionRate: 100,
    label: "强制项缺失",
    publicityType: "BLACK",
    editable: false,
  },
];

const notifyTargetTypeTabs = [
  { value: "POST", label: "岗位", tagLabel: "岗位" },
  { value: "POSITION", label: "职位", tagLabel: "职位" },
  { value: "DEPARTMENT", label: "部门", tagLabel: "部门" },
  { value: "USER", label: "人员", tagLabel: "人员" },
];

const notifyTargetTypeLabel = (targetType?: string): string =>
  notifyTargetTypeTabs.find((item) => item.value === targetType)?.tagLabel ?? formatText(targetType);

const industryTypeLabel = (industryType?: string, industryTypeLabelValue?: string): string => {
  if (industryTypeLabelValue) {
    return industryTypeLabelValue;
  }
  return INDUSTRY_OPTIONS.find((item) => item.value === industryType)?.label ?? formatText(industryType);
};

const normalizeNotifyTargetGroups = (value: unknown): DutyScoreNotifyTargetVO[] => {
  if (Array.isArray(value)) {
    return value as DutyScoreNotifyTargetVO[];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  const record = value as {
    data?: unknown;
    records?: unknown;
    list?: unknown;
    groups?: unknown;
    targets?: unknown;
    level?: unknown;
  };
  const nested = [record.records, record.data, record.list, record.groups].find((item) => Array.isArray(item));
  if (Array.isArray(nested)) {
    return nested as DutyScoreNotifyTargetVO[];
  }
  if (Array.isArray(record.targets) || typeof record.level === "string") {
    return [record as DutyScoreNotifyTargetVO];
  }
  return [];
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim()) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
  }
  return undefined;
};

const normalizeModelPublicityType = (value?: string): string => {
  if (!value) {
    return "NONE";
  }
  const text = value.toUpperCase();
  if (text === "NONE" || value.includes("无") || value === "—") {
    return "NONE";
  }
  if (text.includes("RED") || value.includes("红")) {
    return "RED";
  }
  if (text.includes("BLACK") || value.includes("黑")) {
    return "BLACK";
  }
  return value;
};

const normalizeScoreModelLevels = (model?: DutyScoreModelVO): DutyScoreLevelRuleVO[] => {
  const source = Array.isArray(model?.levels) && model.levels.length > 0 ? model.levels : DEFAULT_MODEL_LEVELS;
  return source.map((item) => {
    const record = item as DutyScoreLevelRuleVO;
    return {
      ...record,
      level: record.level ? String(record.level) : undefined,
      minCompletionRate: toOptionalNumber(record.minCompletionRate),
      maxCompletionRate: toOptionalNumber(record.maxCompletionRate),
      publicityType: normalizeModelPublicityType(record.publicityType),
    };
  });
};

const createDutyScorePage = (pageKey: ScorePageKey, fallbackTitle: string): ReturnType<typeof defineComponent> =>
  defineComponent({
    setup() {
      const route = useRoute();
      const router = useRouter();
      const { pageTitle } = usePageName();
      const activeKey = ref<ScorePageKey>(pageKey);
      const loading = ref(false);
      const summary = ref<DutyScoreDashboardSummaryVO>({});
      const departments = ref<DutyScoreDepartmentSummaryVO[]>([]);
      const selectedDeptId = ref<number>();
      const rankings = ref<DutyScoreRankingItemVO[]>([]);
      const rankingTotal = ref(0);
      const rankingPage = ref(1);
      const rankingPageSize = ref(TABLE_PAGE_SIZE);
      const roleOptions = ref<string[]>([]);
      const publicity = ref<DutyScorePublicityVO>({});
      const publicityRankings = ref<DutyScorePublicityRankingItemVO[]>([]);
      const publicityTotal = ref(0);
      const publicityPage = ref(1);
      const publicityPageSize = ref(TABLE_PAGE_SIZE);
      const modelLevels = ref<DutyScoreLevelRuleVO[]>([]);
      const modelEditing = ref(false);
      const targetCandidates = ref<DutyScoreNotifyTargetCandidateVO[]>([]);
      const notifyTargetsByLevel = reactive<Record<string, DutyScoreNotifyTargetItemVO[]>>({
        A: [],
        B: [],
        C: [],
        D: [],
      });
      const scoreNoticeWayOptions = ref<NoticeWayOption[]>([]);
      const scoreNoticeConfig = reactive({
        label: "评分等级通知",
        sceneCode: DUTY_SCORE_LEVEL_MESSAGE_SCENE,
        noticeWays: [] as string[],
      });
      const notifyModalOpen = ref(false);
      const notifyModalLevel = ref("A");
      const notifyModalTargetType = ref("POST");
      const notifyCandidateKeyword = ref("");
      const selectedCandidateKeys = ref<string[]>([]);
      const selectedCandidateMap = ref<Record<string, DutyScoreNotifyTargetCandidateVO>>({});
      const notifyCandidatePage = ref(1);
      const notifyCandidatePageSize = ref(TABLE_PAGE_SIZE);
      const notifyCandidateTotal = ref(0);
      const notifyCandidateLoading = ref(false);
      const notifySaving = ref(false);
      const scoreNoticeSaving = ref(false);
      const personReport = ref<DutyPersonalScoreReportVO>();

      const filters = reactive({
        periodType: "MONTH",
        periodValue: currentPeriodValue("MONTH"),
        keyword: "",
        roleName: "",
      });
      const scoreQuery = (): { periodType?: string; periodValue?: string } => {
        const query: { periodType?: string; periodValue?: string } = {
          periodType: filters.periodType,
        };
        const periodValue = filters.periodValue.trim();
        if (periodValue) {
          query.periodValue = periodValue;
        }
        return query;
      };

      const rankingQuery = (pageNumber: number, includeDept = false): Parameters<typeof pageDutyScoreRankings>[0] => {
        const query = {
          pageNumber,
          pageSize: rankingPageSize.value,
          ...scoreQuery(),
        } as Parameters<typeof pageDutyScoreRankings>[0];
        const keyword = filters.keyword.trim();
        if (includeDept && selectedDeptId.value != null) {
          query.deptId = selectedDeptId.value;
        }
        if (keyword) {
          query.keyword = keyword;
        }
        if (filters.roleName) {
          query.roleName = filters.roleName;
        }
        return query;
      };

      const selectedDeptName = computed(() => {
        if (selectedDeptId.value == null) {
          return "全公司";
        }
        return departments.value.find((item) => item.deptId === selectedDeptId.value)?.deptName || "部门";
      });

      const loadRoles = async (): Promise<void> => {
        try {
          const roles = await useAuthRequest(() => listDutyRoleAssignments());
          roleOptions.value = roles.map((item) => item.roleName).filter((role): role is string => !!role);
        } catch {
          roleOptions.value = [];
        }
      };

      const loadDashboard = async (): Promise<void> => {
        loading.value = true;
        try {
          const query = scoreQuery();
          const [sum, deptList, userPage] = await useAuthRequest(() =>
            Promise.all([
              getDutyScoreDashboardSummary(query),
              listDutyScoreDepartmentSummaries(query),
              pageDutyScoreRankings(rankingQuery(rankingPage.value, true)),
            ]),
          );
          summary.value = sum;
          departments.value = deptList;
          rankings.value = userPage.records ?? [];
          rankingTotal.value = userPage.total ?? 0;
        } catch (e) {
          showApiError(e, "查询评分看板失败");
          summary.value = {};
          departments.value = [];
          rankings.value = [];
          rankingTotal.value = 0;
        } finally {
          loading.value = false;
        }
      };

      const loadPublicity = async (): Promise<void> => {
        loading.value = true;
        try {
          const query = scoreQuery();
          const publicityRankingQuery = {
            pageNumber: publicityPage.value,
            pageSize: publicityPageSize.value,
            ...query,
          } as Parameters<typeof pageDutyScorePublicityRankings>[0];
          const [publicityData, page] = await useAuthRequest(() =>
            Promise.all([getDutyScorePublicity(query), pageDutyScorePublicityRankings(publicityRankingQuery)]),
          );
          publicity.value = publicityData;
          publicityRankings.value = page.records ?? [];
          publicityTotal.value = page.total ?? 0;
        } catch (e) {
          showApiError(e, "查询公示数据失败");
          publicity.value = {};
          publicityRankings.value = [];
          publicityTotal.value = 0;
        } finally {
          loading.value = false;
        }
      };

      const loadModel = async (): Promise<void> => {
        try {
          const model = await useAuthRequest(() => getDutyScoreModel({ periodType: filters.periodType }));
          modelLevels.value = normalizeScoreModelLevels(model);
        } catch (e) {
          showApiError(e, "查询评分模型失败");
          modelLevels.value = normalizeScoreModelLevels(undefined);
        }
      };

      const refresh = (): void => {
        if (activeKey.value === "dashboard") {
          rankingPage.value = 1;
          void loadDashboard();
        }
        if (activeKey.value === "publicity") {
          publicityPage.value = 1;
          void loadPublicity();
        }
        if (activeKey.value === "model") {
          void loadModel();
        }
        if (activeKey.value === "notify") {
          void loadNotifyPage();
        }
        if (activeKey.value === "report") {
          void loadPersonalReportPage();
        }
      };

      onMounted(() => {
        void loadRoles();
        refresh();
      });

      const saveModel = async (): Promise<void> => {
        try {
          await useAuthRequest(() =>
            saveDutyScoreModel({
              periodType: filters.periodType,
              levels: modelLevels.value.map((item) => ({ ...item, publicityType: normalizeModelPublicityType(item.publicityType) })),
            }),
          );
          message.success("评分模型已保存");
          modelEditing.value = false;
          void loadModel();
        } catch (e) {
          showApiError(e, "保存评分模型失败");
        }
      };

      const cancelModelEdit = (): void => {
        modelEditing.value = false;
        void loadModel();
      };

      const exportRanking = async (): Promise<void> => {
        try {
          const payload: DutyScoreRankingExportParam = { ...scoreQuery() };
          const keyword = filters.keyword.trim();
          if (keyword) {
            payload.keyword = keyword;
          }
          if (filters.roleName) {
            payload.roleName = filters.roleName;
          }
          if (selectedDeptId.value != null) {
            payload.deptId = selectedDeptId.value;
          }
          const blob = await useAuthRequest(() => exportDutyScoreRankings(payload));
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `评分看板-${selectedDeptName.value}-${filters.periodValue || "全部"}.xlsx`;
          link.click();
          URL.revokeObjectURL(url);
        } catch (e) {
          showApiError(e, "导出失败");
        }
      };

      const loadPersonalReportPage = async (): Promise<void> => {
        loading.value = true;
        try {
          const rawUserId = Array.isArray(route.query.userId) ? route.query.userId[0] : route.query.userId;
          const queryUserId = rawUserId == null || rawUserId === "" ? "" : String(rawUserId);
          personReport.value = queryUserId
            ? await useAuthRequest(() => getDutyPersonalScoreReport(queryUserId, scoreQuery()))
            : ((await useAuthRequest(() => getDutyAppPersonalScoreReport(scoreQuery()))) as DutyPersonalScoreReportVO);
        } catch (e) {
          showApiError(e, "查询个人履职报告失败");
          personReport.value = undefined;
        } finally {
          loading.value = false;
        }
      };

      const loadNotifyTargets = async (): Promise<void> => {
        try {
          const response = (await useAuthRequest(() => listDutyScoreNotifyTargets())) as unknown;
          const groups = normalizeNotifyTargetGroups(response);
          SCORE_LEVELS.forEach((level) => {
            notifyTargetsByLevel[level] = [];
          });
          groups.forEach((group) => {
            const level = String(group.level || "");
            if (SCORE_LEVELS.includes(level)) {
              notifyTargetsByLevel[level] = (group.targets ?? []).map((item, index) => ({ ...item, sortNo: item.sortNo ?? index + 1 }));
            }
          });
        } catch (e) {
          showApiError(e, "查询通知对象失败");
          SCORE_LEVELS.forEach((level) => {
            notifyTargetsByLevel[level] = [];
          });
        }
      };

      const loadScoreNoticeConfig = async (): Promise<void> => {
        try {
          const [sceneConfigs, sceneOptions] = await Promise.all([
            dutyMessageService.getMessageConfig({ businessType: SAFETY_DUTY_MESSAGE_BUSINESS_TYPE }),
            dutyMessageService.sceneNotificationMethod(DUTY_SCORE_LEVEL_MESSAGE_SCENE),
          ]);
          scoreNoticeWayOptions.value = normalizeNoticeWayOptions(sceneOptions);
          const sceneConfig = findSceneConfig(sceneConfigs, DUTY_SCORE_LEVEL_MESSAGE_SCENE);
          scoreNoticeConfig.label = sceneConfig?.label || scoreNoticeConfig.label;
          scoreNoticeConfig.sceneCode = sceneConfig?.sceneCode || DUTY_SCORE_LEVEL_MESSAGE_SCENE;
          scoreNoticeConfig.noticeWays = configuredNoticeWays(sceneConfigs, DUTY_SCORE_LEVEL_MESSAGE_SCENE, scoreNoticeWayOptions.value);
        } catch (e) {
          showApiError(e, "查询评分通知方式失败");
          scoreNoticeWayOptions.value = [];
          scoreNoticeConfig.noticeWays = [];
        }
      };

      const loadNotifyPage = async (): Promise<void> => {
        await Promise.all([loadNotifyTargets(), loadScoreNoticeConfig()]);
      };

      const loadNotifyCandidates = async (): Promise<void> => {
        notifyCandidateLoading.value = true;
        try {
          const keyword = notifyCandidateKeyword.value.trim();
          const query = {
            pageNumber: notifyCandidatePage.value,
            pageSize: notifyCandidatePageSize.value,
            targetType: notifyModalTargetType.value,
          } as Parameters<typeof pageDutyScoreNotifyTargetCandidates>[0];
          if (keyword) {
            query.keyword = keyword;
          }
          const page = await useAuthRequest(() => pageDutyScoreNotifyTargetCandidates(query));
          targetCandidates.value = page.records ?? [];
          notifyCandidateTotal.value = page.total ?? 0;
        } catch (e) {
          showApiError(e, "查询候选对象失败");
          targetCandidates.value = [];
          notifyCandidateTotal.value = 0;
        } finally {
          notifyCandidateLoading.value = false;
        }
      };

      const candidateId = (item: DutyScoreNotifyTargetCandidateVO): string | undefined => {
        const record = item as DutyScoreNotifyTargetCandidateVO & {
          id?: string | number;
          targetId?: string | number;
          userId?: string | number;
        };
        const value = record.targetId ?? record.userId ?? record.id;
        return value == null || value === "" ? undefined : String(value);
      };

      const candidateTargetName = (item: DutyScoreNotifyTargetCandidateVO): string => {
        const record = item as DutyScoreNotifyTargetCandidateVO & { name?: string; organizationName?: string };
        return formatText(
          item.targetName ??
            item.userName ??
            item.postName ??
            item.positionName ??
            item.deptName ??
            item.roleName ??
            record.organizationName ??
            record.name,
        );
      };

      const targetIdentity = (targetType?: string, targetId?: string | number, targetName?: string): string =>
        `${targetType || ""}-${targetId ?? ""}-${targetName || ""}`;

      const candidateKey = (item: DutyScoreNotifyTargetCandidateVO): string =>
        targetIdentity(notifyModalTargetType.value, candidateId(item), candidateTargetName(item));

      const notifyCandidateRows = computed(() =>
        targetCandidates.value.map((item) => ({
          ...item,
          __candidateKey: candidateKey(item),
        })),
      );

      const toNotifyTargetParam = (item: DutyScoreNotifyTargetItemVO, index: number): DutyScoreNotifyTargetItemParam => {
        const target: DutyScoreNotifyTargetItemParam = {
          targetType: item.targetType || notifyModalTargetType.value,
          sortNo: index + 1,
        };
        if (item.targetId != null) {
          target.targetId = item.targetId as unknown as number;
        }
        if (item.targetName) {
          target.targetName = item.targetName;
        }
        if (item.targetSnapshot) {
          target.targetSnapshot = item.targetSnapshot;
        }
        return target;
      };

      const saveNotifyLevel = async (level: string, targets: DutyScoreNotifyTargetItemVO[]): Promise<void> => {
        notifySaving.value = true;
        try {
          await useAuthRequest(() =>
            saveDutyScoreNotifyTargets({
              level,
              targets: targets.map((item, index) => toNotifyTargetParam(item, index)),
            }),
          );
        } catch (e) {
          showApiError(e, "保存通知对象失败");
          throw e;
        } finally {
          notifySaving.value = false;
        }
      };

      const saveScoreNoticeConfig = async (): Promise<void> => {
        if (scoreNoticeWayOptions.value.length > 0 && scoreNoticeConfig.noticeWays.length === 0) {
          message.warning("请选择通知方式");
          return;
        }
        scoreNoticeSaving.value = true;
        try {
          await dutyMessageService.addMessageConfig({
            businessType: SAFETY_DUTY_MESSAGE_BUSINESS_TYPE,
            sceneConfigDTOS: [
              {
                label: scoreNoticeConfig.label,
                sceneCode: DUTY_SCORE_LEVEL_MESSAGE_SCENE,
                value: "",
                config: "",
                noticeWays: toNoticeWaysDTO(scoreNoticeConfig.noticeWays),
                noticeObjs: [],
              },
            ],
          });
          await loadScoreNoticeConfig();
          message.success("通知方式已保存");
        } catch (e) {
          showApiError(e, "保存评分通知方式失败");
        } finally {
          scoreNoticeSaving.value = false;
        }
      };

      const openNotifyTargetModal = (level: string): void => {
        notifyModalLevel.value = level;
        notifyModalTargetType.value = "POST";
        notifyCandidateKeyword.value = "";
        notifyCandidateFormApi.setFormValues({ keyword: "" });
        notifyCandidatePage.value = 1;
        notifyCandidatePageSize.value = TABLE_PAGE_SIZE;
        notifyCandidateTotal.value = 0;
        selectedCandidateKeys.value = [];
        selectedCandidateMap.value = {};
        notifyModalOpen.value = true;
        void loadNotifyCandidates();
      };

      const switchNotifyTargetType = (targetType: string): void => {
        notifyModalTargetType.value = targetType;
        notifyCandidateKeyword.value = "";
        notifyCandidateFormApi.setFormValues({ keyword: "" });
        notifyCandidatePage.value = 1;
        notifyCandidatePageSize.value = TABLE_PAGE_SIZE;
        notifyCandidateTotal.value = 0;
        selectedCandidateKeys.value = [];
        selectedCandidateMap.value = {};
        void loadNotifyCandidates();
      };

      const closeNotifyTargetModal = (): void => {
        notifyModalOpen.value = false;
        selectedCandidateKeys.value = [];
        selectedCandidateMap.value = {};
      };

      const confirmAddNotifyTargets = async (): Promise<void> => {
        if (selectedCandidateKeys.value.length === 0) {
          message.warning("请至少选择一个通知人");
          return;
        }
        const currentTargets = notifyTargetsByLevel[notifyModalLevel.value] ?? [];
        const existing = new Set(currentTargets.map((item) => targetIdentity(item.targetType, item.targetId, item.targetName)));
        const additions = selectedCandidateKeys.value
          .map((key) => selectedCandidateMap.value[key])
          .filter((item): item is DutyScoreNotifyTargetCandidateVO => !!item)
          .map((item): DutyScoreNotifyTargetItemVO => {
            const target: DutyScoreNotifyTargetItemVO = {
              targetType: notifyModalTargetType.value,
              targetName: candidateTargetName(item),
            };
            const targetId = candidateId(item);
            if (targetId) {
              target.targetId = targetId as unknown as number;
            }
            return target;
          })
          .filter((item) => !existing.has(targetIdentity(item.targetType, item.targetId, item.targetName)));

        if (additions.length === 0) {
          message.warning("所选对象已添加");
          return;
        }
        const nextTargets = [...currentTargets, ...additions].map((item, index) => ({ ...item, sortNo: index + 1 }));
        await saveNotifyLevel(notifyModalLevel.value, nextTargets);
        notifyTargetsByLevel[notifyModalLevel.value] = nextTargets;
        closeNotifyTargetModal();
        message.success(`已添加通知人到 ${notifyModalLevel.value} 级`);
      };

      const removeNotifyTarget = async (level: string, index: number): Promise<void> => {
        const nextTargets = (notifyTargetsByLevel[level] ?? [])
          .filter((_, i) => i !== index)
          .map((item, i) => ({ ...item, sortNo: i + 1 }));
        await saveNotifyLevel(level, nextTargets);
        notifyTargetsByLevel[level] = nextTargets;
        message.success("通知人已移除");
      };

      const dashboardRankingColumns = [
        { key: "排名", title: "排名", dataIndex: "rankNo", width: 70 },
        { key: "姓名", title: "姓名", dataIndex: "userName", width: 120, ellipsis: true },
        { key: "部门", title: "部门", dataIndex: "deptName", width: 140, ellipsis: true },
        { key: "角色", title: "角色", dataIndex: "roleName", width: 170, ellipsis: true },
        {
          key: "完成率",
          title: "完成率",
          dataIndex: "completionRate",
          width: 110,
          customRender: ({ text }: { text?: number }) => formatPercent(text),
        },
        {
          key: "强制项",
          title: "强制项",
          width: 110,
          customRender: ({ record }: { record: DutyScoreRankingItemVO }) =>
            record.mandatoryCompleted ? <Tag color="green">已完成</Tag> : <Tag color="red">缺 {record.mandatoryMissingCount ?? 0} 项</Tag>,
        },
        { key: "等级", title: "等级", dataIndex: "level", width: 80, customRender: ({ text }: { text?: string }) => levelTag(text) },
        {
          key: "环比",
          title: "环比",
          dataIndex: "momChangeRate",
          width: 90,
          customRender: ({ text }: { text?: number }) => formatPercent(text),
        },
      ];

      const openPersonalReport = (userId?: DutyId): void => {
        const queryUserId = userId == null || userId === "" ? "" : String(userId);
        if (!queryUserId) {
          return;
        }
        void router.push({ name: "dutyScorePersonalReport", query: { userId: queryUserId } });
      };

      const publicityToneClass = (level?: string): string => {
        if (level === "A") {
          return styles.publicityToneGreen;
        }
        if (level === "C") {
          return styles.publicityToneOrange;
        }
        if (level === "D") {
          return styles.publicityToneRed;
        }
        return "";
      };

      const publicityColumns = [
        {
          key: "排名",
          title: "排名",
          dataIndex: "rankNo",
          width: 70,
          align: "center" as const,
          customRender: ({ record }: { record: DutyScorePublicityRankingItemVO }) => {
            const toneClass = publicityToneClass(record.level);
            return toneClass ? (
              <span class={[styles.publicityRankBadge, toneClass]}>{record.rankNo ?? "--"}</span>
            ) : (
              <span class={styles.publicityRankText}>{record.rankNo ?? "--"}</span>
            );
          },
        },
        { key: "姓名", title: "姓名", dataIndex: "userName", ellipsis: true },
        { key: "部门", title: "部门", dataIndex: "deptName", ellipsis: true },
        {
          key: "完成率",
          title: "完成率",
          dataIndex: "completionRate",
          width: 110,
          align: "center" as const,
          customRender: ({ record }: { record: DutyScorePublicityRankingItemVO }) => (
            <span class={publicityToneClass(record.level)}>{formatPercent(record.completionRate)}</span>
          ),
        },
        {
          key: "等级",
          title: "等级",
          dataIndex: "level",
          width: 80,
          align: "center" as const,
          customRender: ({ text }: { text?: string }) => levelTag(text),
        },
      ];

      const modelMandatoryText = (rule: DutyScoreLevelRuleVO): string => {
        if (rule.mandatoryRequirement) {
          return rule.mandatoryRequirement;
        }
        return rule.level === "D" ? "有未完成" : "全部完成";
      };

      const modelCompletionText = (rule: DutyScoreLevelRuleVO): string => {
        if (rule.level === "D") {
          return "—（不适用）";
        }
        if (typeof rule.minCompletionRate === "number" && (rule.maxCompletionRate == null || rule.maxCompletionRate >= 100)) {
          return `≥ ${rule.minCompletionRate}%`;
        }
        if (typeof rule.minCompletionRate === "number" && typeof rule.maxCompletionRate === "number") {
          return `${rule.minCompletionRate}% - ${rule.maxCompletionRate}%`;
        }
        return "--";
      };

      const modelLabelTag = (rule: DutyScoreLevelRuleVO): JSX.Element => {
        const colors: Record<string, string> = { A: "green", B: "blue", C: "orange", D: "red" };
        return <Tag color={rule.level ? colors[rule.level] : undefined}>{formatText(rule.label)}</Tag>;
      };

      const modelPublicityLabel = (value?: string): string => {
        const normalized = normalizeModelPublicityType(value);
        if (normalized === "NONE") {
          return "—";
        }
        if (normalized === "RED") {
          return "红榜公示";
        }
        if (normalized === "BLACK") {
          return "黑榜公示";
        }
        return formatText(normalized);
      };

      const modelPublicityClass = (value?: string): string => {
        const normalized = normalizeModelPublicityType(value);
        if (normalized === "RED") {
          return styles.successText;
        }
        if (normalized === "BLACK") {
          return styles.dangerText;
        }
        return styles.muted;
      };

      const modelRuleColumns = [
        {
          key: "等级",
          title: "等级",
          dataIndex: "level",
          width: 100,
          customRender: ({ record }: { record: DutyScoreLevelRuleVO }) => levelTag(record.level),
        },
        {
          key: "强制项",
          title: "强制项",
          width: 150,
          customRender: ({ record }: { record: DutyScoreLevelRuleVO }) => (
            <span class={record.level === "D" ? styles.dangerText : styles.successText}>{modelMandatoryText(record)}</span>
          ),
        },
        {
          key: "完成率",
          title: "完成率",
          width: 210,
          customRender: ({ record }: { record: DutyScoreLevelRuleVO }) => {
            if (record.level === "D" || !modelEditing.value) {
              return <span>{modelCompletionText(record)}</span>;
            }
            if (record.level === "A") {
              return (
                <div class={styles.modelRateEditor}>
                  <InputNumber min={0} max={100} precision={0} v-model:value={record.minCompletionRate} />
                  <span>% 以上</span>
                </div>
              );
            }
            return (
              <div class={styles.modelRateEditor}>
                <InputNumber min={0} max={100} precision={0} v-model:value={record.minCompletionRate} />
                <span>-</span>
                <InputNumber min={0} max={100} precision={0} v-model:value={record.maxCompletionRate} />
                <span>%</span>
              </div>
            );
          },
        },
        {
          key: "标签",
          title: "标签",
          width: 160,
          customRender: ({ record }: { record: DutyScoreLevelRuleVO }) =>
            modelEditing.value ? (
              <Input value={record.label} showCount={false} onUpdate:value={(v: string) => (record.label = v)} />
            ) : (
              modelLabelTag(record)
            ),
        },
        {
          key: "公示",
          title: "公示",
          width: 160,
          customRender: ({ record }: { record: DutyScoreLevelRuleVO }) =>
            modelEditing.value ? (
              <Select
                style={{ width: "130px" }}
                value={normalizeModelPublicityType(record.publicityType)}
                onUpdate:value={(v) => (record.publicityType = normalizeModelPublicityType(typeof v === "string" ? v : undefined))}
              >
                {MODEL_PUBLICITY_OPTIONS.map((item) => (
                  <SelectOption key={item.value} value={item.value}>
                    {item.label}
                  </SelectOption>
                ))}
              </Select>
            ) : (
              <span class={[styles.modelPublicityText, modelPublicityClass(record.publicityType)]}>
                {modelPublicityLabel(record.publicityType)}
              </span>
            ),
        },
      ];

      const trendChangeText = (value?: number): JSX.Element => {
        if (typeof value !== "number") {
          return <span>--</span>;
        }
        const positive = value >= 0;
        return (
          <span class={positive ? styles.successText : styles.dangerText}>
            {positive ? "↑" : "↓"}
            {formatPercent(Math.abs(value))}
          </span>
        );
      };

      const rankTrendColumns = [
        {
          key: "周期",
          title: "周期",
          dataIndex: "periodLabel",
          width: 140,
          customRender: ({ text }: { text?: string }) => formatText(text),
        },
        {
          key: "完成率",
          title: "完成率",
          dataIndex: "completionRate",
          width: 120,
          align: "center" as const,
          customRender: ({ text }: { text?: number }) => <strong class={styles.successText}>{formatPercent(text)}</strong>,
        },
        {
          key: "全公司排名",
          title: "全公司排名",
          dataIndex: "companyRankNo",
          width: 120,
          align: "center" as const,
          customRender: ({ text }: { text?: number }) => (text ? `#${text}` : "--"),
        },
        {
          key: "部门排名",
          title: "部门排名",
          dataIndex: "deptRankNo",
          width: 120,
          align: "center" as const,
          customRender: ({ text }: { text?: number }) => (text ? `#${text}` : "--"),
        },
        {
          key: "环比变化",
          title: "环比变化",
          dataIndex: "momChangeRate",
          width: 120,
          align: "center" as const,
          customRender: ({ text }: { text?: number }) => trendChangeText(text),
        },
        {
          key: "等级",
          title: "等级",
          dataIndex: "level",
          width: 90,
          align: "center" as const,
          customRender: ({ text }: { text?: string }) => levelTag(text),
        },
      ];

      const rankTrendRows = computed(() =>
        (personReport.value?.rankTrends ?? []).map((item) => ({
          ...item,
          __rowKey: item.periodLabel || `${item.companyRankNo ?? ""}-${item.deptRankNo ?? ""}`,
        })),
      );

      const commonFilterSchema = () => [
        {
          component: markRaw(RadioGroup),
          label: "周期",
          fieldName: "periodType",
          defaultValue: "MONTH",
          componentProps: {
            buttonStyle: "solid",
            options: PERIOD_OPTIONS,
          },
        },
        {
          component: markRaw(PeriodValuePicker),
          label: "",
          fieldName: "periodValue",
          defaultValue: currentPeriodValue("MONTH"),
          componentProps: {
            periodType: filters.periodType,
          },
        },
      ];

      const [CommonFilterForm, commonFilterApi] = usePcForm({
        cache: false,
        layout: "horizontal",
        syncStateRef: filters,
        schema: commonFilterSchema(),
        handleValuesChange: (values, _changedValues, meta) => {
          if (meta?.fieldName !== "periodType") {
            return;
          }
          const periodType = String(values.periodType || "MONTH");
          const nextPeriodValue = currentPeriodValue(periodType);
          filters.periodType = periodType;
          filters.periodValue = nextPeriodValue;
          commonFilterApi.setFieldValue("periodValue", nextPeriodValue);
          commonFilterApi.updateSchema(commonFilterSchema());
        },
        handleSubmit: (values) => {
          filters.periodType = String(values.periodType || "MONTH");
          filters.periodValue = String(values.periodValue || currentPeriodValue(filters.periodType));
          refresh();
        },
        handleReset: () => {
          filters.periodType = "MONTH";
          filters.periodValue = currentPeriodValue("MONTH");
          commonFilterApi.updateSchema(commonFilterSchema());
          refresh();
        },
      });

      watch(
        () => filters.periodType,
        () => {
          commonFilterApi.updateSchema(commonFilterSchema());
        },
      );

      const commonFilter = (): JSX.Element => (
        <div class="toolbar">
          <CommonFilterForm />
        </div>
      );

      const queryDashboardUsers = (): void => {
        rankingPage.value = 1;
        void loadDashboard();
      };

      const dashboardUserFilterSchema = () => [
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          defaultValue: "",
          componentProps: {
            style: { width: "220px" },
            placeholder: "搜索人员姓名",
            allowClear: true,
            showCount: false,
          },
        },
        {
          component: "Select",
          label: "",
          fieldName: "roleName",
          defaultValue: "",
          componentProps: {
            style: { width: "180px" },
            allowClear: true,
            placeholder: "全部角色",
            options: roleOptions.value.map((role) => ({ value: role, label: role })),
          },
        },
      ];

      const [DashboardUserForm, dashboardUserFormApi] = usePcForm({
        cache: false,
        layout: "horizontal",
        syncStateRef: filters,
        schema: dashboardUserFilterSchema(),
        handleSubmit: (values) => {
          filters.keyword = String(values.keyword ?? "");
          filters.roleName = String(values.roleName ?? "");
          queryDashboardUsers();
        },
        handleReset: () => {
          filters.keyword = "";
          filters.roleName = "";
          queryDashboardUsers();
        },
      });

      watch(
        roleOptions,
        () => {
          dashboardUserFormApi.updateSchema(dashboardUserFilterSchema());
        },
        { deep: true },
      );

      const dashboardUserFilter = (): JSX.Element => (
        <div class={[styles.userToolbar, "safety-duty-compact-form"]}>
          <DashboardUserForm />
        </div>
      );

      const selectDashboardDept = (deptId?: number): void => {
        selectedDeptId.value = deptId;
        rankingPage.value = 1;
        void loadDashboard();
      };

      const renderDeptItem = (dept: DutyScoreDepartmentSummaryVO, active: boolean): JSX.Element => (
        <button
          type="button"
          class={[styles.deptItem, active ? styles.deptItemActive : ""]}
          onClick={() => selectDashboardDept(dept.deptId)}
        >
          <div class={styles.deptTop}>
            <span>{formatText(dept.deptName)}</span>
            <strong>{formatPercent(dept.avgCompletionRate)}</strong>
          </div>
          <div class={styles.deptMeta}>
            {dept.participantCount ?? 0}人
            {typeof dept.momChangeRate === "number" ? (
              <span class={dept.momChangeRate >= 0 ? styles.successText : styles.dangerText}>
                {" "}
                · {dept.momChangeRate >= 0 ? "↑" : "↓"}
                {formatPercent(Math.abs(dept.momChangeRate))}
              </span>
            ) : null}
          </div>
        </button>
      );

      const renderPublicityCardList = (
        titleText: string,
        list?: DutyScorePublicityPersonVO[],
        type: "red" | "black" = "red",
      ): JSX.Element => {
        const people = list ?? [];
        return (
          <div class={styles.publicitySection}>
            <div class={styles.publicityTitle}>
              <span class={type === "red" ? styles.successText : styles.dangerText}>{titleText}</span>
            </div>
            <div class={[styles.publicityCards, type === "black" ? styles.publicityCardsBlack : ""]}>
              {people.length === 0 ? (
                <div class={styles.publicityEmptyCard}>
                  <Empty description="暂无公示人员" />
                </div>
              ) : (
                people.map((item) => {
                  const isTop = type === "red" && item.rankNo === 1;
                  return (
                    <div
                      class={[
                        styles.publicityCard,
                        type === "red" ? styles.publicityCardRed : styles.publicityCardBlack,
                        isTop ? styles.publicityCardTop : "",
                      ]}
                      key={`${type}-${item.userId}`}
                    >
                      <div
                        class={[
                          styles.publicityRank,
                          type === "red" ? styles.publicityRankRed : styles.publicityRankBlack,
                          isTop ? styles.publicityRankTop : "",
                        ]}
                      >
                        {item.rankNo ?? "--"}
                      </div>
                      <div class={[styles.publicityScore, type === "red" ? styles.publicityScoreRed : styles.publicityScoreBlack]}>
                        {formatPercent(item.completionRate)}
                      </div>
                      <div class={styles.publicityName}>{formatText(item.userName)}</div>
                      <div class={styles.publicityDept}>
                        {formatText(item.deptName)} · #{item.rankNo ?? "--"}
                      </div>
                      <div class={styles.publicityMeta}>
                        完成率 {formatPercent(item.completionRate)} · 完成{item.completedItemCount ?? 0}项/应执行{item.totalItemCount ?? 0}
                        项 · 强制项缺 {item.mandatoryMissingCount ?? 0}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      };

      const renderNotifyTargetTag = (level: string, target: DutyScoreNotifyTargetItemVO, index: number, tagClass: string): JSX.Element => (
        <span
          class={[styles.notifyTargetTag, (styles as Record<string, string>)[tagClass]]}
          key={`${level}-${target.targetType}-${target.targetId}-${target.targetName}-${index}`}
        >
          <span>{formatText(target.targetName)}</span>
          <span class={styles.notifyTargetType}>{notifyTargetTypeLabel(target.targetType)}</span>
          <button
            type="button"
            class={styles.notifyTargetRemove}
            onClick={() => void removeNotifyTarget(level, index)}
            aria-label="移除通知人"
          >
            x
          </button>
        </span>
      );

      const renderNotifyLevelCard = (meta: (typeof notifyLevelMeta)[number]): JSX.Element => {
        const targets = notifyTargetsByLevel[meta.level] ?? [];
        return (
          <div class={styles.notifyLevelCard} key={meta.level}>
            <div class={styles.notifyLevelHeader}>
              <div>
                <div class={styles.notifyLevelTitle}>
                  <Tag color={meta.tagColor}>{meta.title}</Tag>
                </div>
                <div class={styles.notifyLevelDesc}>{meta.desc}</div>
              </div>
              <Button size="small" onClick={() => openNotifyTargetModal(meta.level)}>
                + 添加通知人
              </Button>
            </div>
            <div class={styles.notifyTargetList}>
              {targets.length === 0 ? (
                <span class={styles.notifyEmptyText}>暂未配置通知人</span>
              ) : (
                targets.map((target, index) => renderNotifyTargetTag(meta.level, target, index, meta.tagClass))
              )}
            </div>
          </div>
        );
      };

      const notifyCandidateColumns = computed(() => {
        if (notifyModalTargetType.value === "USER") {
          return [
            {
              key: "姓名",
              title: "姓名",
              width: 160,
              ellipsis: true,
              customRender: ({ record }: { record: DutyScoreNotifyTargetCandidateVO }) => candidateTargetName(record),
            },
            {
              key: "部门",
              title: "部门",
              dataIndex: "deptName",
              width: 220,
              ellipsis: true,
              customRender: ({ text }: { text?: string }) => formatText(text),
            },
            {
              key: "岗位/职位",
              title: "岗位/职位",
              width: 200,
              ellipsis: true,
              customRender: ({ record }: { record: DutyScoreNotifyTargetCandidateVO }) =>
                formatText(record.postName ?? record.positionName ?? record.roleName),
            },
          ];
        }
        if (notifyModalTargetType.value === "DEPARTMENT") {
          return [
            {
              key: "部门名称",
              title: "部门名称",
              ellipsis: true,
              customRender: ({ record }: { record: DutyScoreNotifyTargetCandidateVO }) => candidateTargetName(record),
            },
          ];
        }
        if (notifyModalTargetType.value === "POSITION") {
          return [
            {
              key: "职位名称",
              title: "职位名称",
              ellipsis: true,
              customRender: ({ record }: { record: DutyScoreNotifyTargetCandidateVO }) => candidateTargetName(record),
            },
          ];
        }
        return [
          {
            key: "岗位名称",
            title: "岗位名称",
            ellipsis: true,
            customRender: ({ record }: { record: DutyScoreNotifyTargetCandidateVO }) => candidateTargetName(record),
          },
        ];
      });

      const [NotifyCandidateForm, notifyCandidateFormApi] = usePcForm({
        cache: false,
        layout: "horizontal",
        schema: [
          {
            component: "Input",
            label: "",
            fieldName: "keyword",
            defaultValue: "",
            componentProps: {
              class: styles.notifyPersonSearch,
              allowClear: true,
              showCount: false,
              placeholder: `搜索${notifyTargetTypeLabel(notifyModalTargetType.value)}`,
            },
          },
        ],
        handleSubmit: (values) => {
          notifyCandidateKeyword.value = String(values.keyword ?? "");
          notifyCandidatePage.value = 1;
          void loadNotifyCandidates();
        },
        handleReset: () => {
          notifyCandidateKeyword.value = "";
          notifyCandidatePage.value = 1;
          void loadNotifyCandidates();
        },
      });

      watch(
        () => notifyModalTargetType.value,
        () => {
          notifyCandidateFormApi.updateSchema([
            {
              ...notifyCandidateFormApi.state.schema[0],
              componentProps: {
                ...notifyCandidateFormApi.state.schema[0].componentProps,
                placeholder: `搜索${notifyTargetTypeLabel(notifyModalTargetType.value)}`,
              },
            },
          ]);
        },
      );

      const handleNotifyCandidateSelectionChange = (keys: (string | number)[], rows: unknown[]): void => {
        const nextKeys = keys.map(String);
        const nextMap = { ...selectedCandidateMap.value };
        Object.keys(nextMap).forEach((key) => {
          if (!nextKeys.includes(key)) {
            delete nextMap[key];
          }
        });
        [...(rows as DutyScoreNotifyTargetCandidateVO[]), ...targetCandidates.value].forEach((row) => {
          const key = candidateKey(row);
          if (nextKeys.includes(key)) {
            nextMap[key] = row;
          }
        });
        selectedCandidateKeys.value = nextKeys;
        selectedCandidateMap.value = nextMap;
      };

      const [NotifyCandidateTable, notifyCandidateTableApi] = usePcTable({
        tableCode: "safety-duty-score-1",
        autoScrollY: false,
        autoFetch: false,
        columns: notifyCandidateColumns.value,
        dataSource: notifyCandidateRows.value,
        rowKey: "__candidateKey",
        rowSelection: "checkbox",
        rowSelectionChange: handleNotifyCandidateSelectionChange,
        scrollY: 430,
      });

      watch(
        notifyCandidateColumns,
        (columns) => {
          notifyCandidateTableApi.setColumns(columns);
        },
        { deep: true },
      );

      watch(
        notifyCandidateRows,
        (rows) => {
          notifyCandidateTableApi.setDataSource(rows);
        },
        { deep: true },
      );

      watch(
        notifyCandidateLoading,
        (tableLoading) => {
          notifyCandidateTableApi.loading.value = tableLoading;
        },
        { immediate: true },
      );

      watch(
        selectedCandidateKeys,
        (keys) => {
          notifyCandidateTableApi.setSelectedRowKeys(keys);
        },
        { deep: true, immediate: true },
      );

      const [RankTrendTable, rankTrendTableApi] = usePcTable({
        tableCode: "safety-duty-score-2",
        autoScrollY: false,
        autoFetch: false,
        columns: rankTrendColumns,
        dataSource: rankTrendRows.value,
        rowKey: "__rowKey",
      });

      watch(
        rankTrendRows,
        (rows) => {
          rankTrendTableApi.setDataSource(rows);
        },
        { deep: true },
      );

      const [DashboardRankingTable, dashboardRankingTableApi] = usePcTable({
        tableCode: "safety-duty-score-3",
        autoScrollY: false,
        autoFetch: false,
        columns: dashboardRankingColumns,
        customRow: (record) => ({
          class: styles.clickableTableRow,
          onClick: () => openPersonalReport((record as DutyScoreRankingItemVO).userId),
        }),
        dataSource: rankings.value,
        rowKey: "userId",
      });

      watch(
        rankings,
        (rows) => {
          dashboardRankingTableApi.setDataSource(rows);
        },
        { deep: true },
      );

      watch(
        loading,
        (tableLoading) => {
          dashboardRankingTableApi.loading.value = tableLoading;
        },
        { immediate: true },
      );

      const [PublicityTable, publicityTableApi] = usePcTable({
        tableCode: "safety-duty-score-4",
        autoScrollY: false,
        autoFetch: false,
        columns: publicityColumns,
        dataSource: publicityRankings.value,
        rowKey: "userId",
      });

      watch(
        publicityRankings,
        (rows) => {
          publicityTableApi.setDataSource(rows);
        },
        { deep: true },
      );

      watch(
        loading,
        (tableLoading) => {
          publicityTableApi.loading.value = tableLoading;
        },
        { immediate: true },
      );

      const [ModelRuleTable, modelRuleTableApi] = usePcTable({
        tableCode: "safety-duty-score-5",
        autoScrollY: false,
        autoFetch: false,
        columns: modelRuleColumns,
        dataSource: modelLevels.value,
        rowKey: "level",
      });

      watch(
        modelLevels,
        (rows) => {
          modelRuleTableApi.setDataSource(rows);
        },
        { deep: true },
      );

      watch(
        loading,
        (tableLoading) => {
          modelRuleTableApi.loading.value = tableLoading;
        },
        { immediate: true },
      );

      watch(modelEditing, () => {
        modelRuleTableApi.setColumns([...modelRuleColumns]);
        modelRuleTableApi.setDataSource([...modelLevels.value]);
      });

      const handleNotifyCandidatePageChange = (page: number, pageSize: number): void => {
        if (notifyCandidatePage.value === page && notifyCandidatePageSize.value === pageSize) {
          return;
        }
        notifyCandidatePage.value = page;
        notifyCandidatePageSize.value = pageSize;
        void loadNotifyCandidates();
      };

      const handleRankingPageChange = (page: number, pageSize: number): void => {
        if (rankingPage.value === page && rankingPageSize.value === pageSize) {
          return;
        }
        rankingPage.value = page;
        rankingPageSize.value = pageSize;
        void loadDashboard();
      };

      const handlePublicityPageChange = (page: number, pageSize: number): void => {
        if (publicityPage.value === page && publicityPageSize.value === pageSize) {
          return;
        }
        publicityPage.value = page;
        publicityPageSize.value = pageSize;
        void loadPublicity();
      };

      const renderNotifyCandidates = (): JSX.Element => {
        return (
          <div class={styles.notifyCandidateTable}>
            <div class="person-picker-table">
              <NotifyCandidateTable />
            </div>
          </div>
        );
      };

      const renderNotifyModal = (): JSX.Element => (
        <Modal
          open={notifyModalOpen.value}
          title={`添加通知人 — ${notifyModalLevel.value}级`}
          width={920}
          confirmLoading={notifySaving.value}
          onOk={() => void confirmAddNotifyTargets()}
          onCancel={closeNotifyTargetModal}
          okText="保存"
          cancelText="取消"
        >
          <div class={styles.notifyModalBody}>
            <div class={styles.notifyModalLabel}>选择方式</div>
            <div class={styles.notifyTypeTabs}>
              {notifyTargetTypeTabs.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  class={[styles.notifyTypeTab, notifyModalTargetType.value === item.value ? styles.notifyTypeTabActive : ""]}
                  onClick={() => switchNotifyTargetType(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div class={styles.notifyModalLabel}>{`选择${notifyTargetTypeLabel(notifyModalTargetType.value)}（可多选）`}</div>
            <div class={[styles.notifyCandidateToolbar, "safety-duty-compact-form"]}>
              <NotifyCandidateForm />
            </div>
            {renderNotifyCandidates()}
            <div class={styles.notifyCandidateFooter}>
              <span>已选 {selectedCandidateKeys.value.length} 项</span>
              <Page
                current={notifyCandidatePage.value}
                pageSize={notifyCandidatePageSize.value}
                total={notifyCandidateTotal.value}
                onPageChange={handleNotifyCandidatePageChange}
                onShowSizeChange={handleNotifyCandidatePageChange}
              />
            </div>
          </div>
        </Modal>
      );

      const renderPersonalReportPage = (): JSX.Element => (
        <>
          {commonFilter()}
          {!personReport.value ? (
            <div class={styles.panel}>
              <Empty description={loading.value ? "加载中..." : "暂无个人履职报告"} />
            </div>
          ) : (
            <>
              <div class={styles.reportHeader}>
                <div class={styles.reportPerson}>
                  <div class={styles.reportAvatar}>{formatText(personReport.value.person?.userName).slice(0, 1)}</div>
                  <div>
                    <div class={styles.reportName}>
                      {formatText(personReport.value.person?.userName)}
                      <Tag color="blue">{formatText(personReport.value.person?.roleName)}</Tag>
                    </div>
                    <div class={styles.muted}>
                      {formatText(personReport.value.person?.deptName)} ·{" "}
                      {industryTypeLabel(personReport.value.person?.industryType, personReport.value.person?.industryTypeLabel)} ·{" "}
                      {formatText(personReport.value.person?.periodLabel)}
                    </div>
                  </div>
                </div>
                <div class={styles.reportHeaderStats}>
                  <div>
                    <strong>{formatPercent(personReport.value.summary?.completionRate)}</strong>
                    <span>完成率</span>
                  </div>
                  <div>
                    <strong>#{personReport.value.summary?.companyRankNo ?? "--"}</strong>
                    <span>全公司排名</span>
                  </div>
                  <div>
                    <strong class={(personReport.value.summary?.momChangeRate ?? 0) >= 0 ? styles.successText : styles.dangerText}>
                      {formatPercent(personReport.value.summary?.momChangeRate)}
                    </strong>
                    <span>环比上期</span>
                  </div>
                </div>
              </div>

              <div class={styles.reportStats}>
                <div class={styles.panel}>
                  <div class={styles.statLabel}>应执行项总数</div>
                  <div class={styles.statValue}>{personReport.value.summary?.totalItemCount ?? 0}</div>
                </div>
                <div class={styles.panel}>
                  <div class={styles.statLabel}>已完成</div>
                  <div class={styles.statValue}>{personReport.value.summary?.completedItemCount ?? 0}</div>
                </div>
                <div class={styles.panel}>
                  <div class={styles.statLabel}>强制项未完成</div>
                  <div class={[styles.statValue, styles.dangerText]}>{personReport.value.summary?.mandatoryMissingCount ?? 0}</div>
                </div>
                <div class={styles.panel}>
                  <div class={styles.statLabel}>等级</div>
                  <div class={styles.statValue}>{levelTag(personReport.value.summary?.level)}</div>
                </div>
              </div>

              <div class={styles.reportSection}>
                <div class={styles.panelHeader}>责任清单完成明细</div>
                <div class={styles.reportItemList}>
                  {(personReport.value.assignmentItems ?? []).length === 0 ? (
                    <Empty description="暂无明细" />
                  ) : (
                    (personReport.value.assignmentItems ?? []).map((item) => (
                      <div class={[styles.reportItem, item.overdue ? styles.reportItemDanger : ""]} key={item.itemId}>
                        <div>
                          <strong>{formatText(item.taskDescription)}</strong>
                          <div class={styles.muted}>
                            {formatText(item.lawNameLabel)} · {formatText(item.lawClauseNo)} · 截止 {formatText(item.deadlineTime)}
                          </div>
                        </div>
                        <div class={styles.reportItemStatus}>{statusTag(item.status)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div class={styles.reportSection}>
                <div class={styles.panelHeader}>排名变化追踪</div>
                <div class={styles.trendTable}>
                  <RankTrendTable />
                </div>
              </div>
            </>
          )}
        </>
      );

      const renderContent = (): JSX.Element => {
        if (activeKey.value === "report") {
          return renderPersonalReportPage();
        }

        if (activeKey.value === "dashboard") {
          return (
            <>
              {commonFilter()}
              <div class={styles.summary}>
                <div class={styles.panel}>
                  <div class={styles.statLabel}>参评总人数</div>
                  <div class={styles.statValue}>{summary.value.participantCount ?? 0}</div>
                </div>
                <div class={styles.panel}>
                  <div class={styles.statLabel}>全公司平均完成率</div>
                  <div class={styles.statValue}>{formatPercent(summary.value.avgCompletionRate)}</div>
                </div>
                <div class={styles.panel}>
                  <div class={styles.statLabel}>最高完成率 / 最低完成率</div>
                  <div class={styles.statValue}>
                    {formatPercent(summary.value.maxCompletionRate)} <span class={styles.statDivider}>/</span>{" "}
                    <span class={styles.dangerText}>{formatPercent(summary.value.minCompletionRate)}</span>
                  </div>
                </div>
              </div>
              <div class={styles.dashboardGrid}>
                <div class={styles.departmentPanel}>
                  <div class={styles.panelHeader}>部门评分汇总</div>
                  <div class={styles.departmentList}>
                    <button
                      type="button"
                      class={[styles.deptItem, selectedDeptId.value == null ? styles.deptItemActive : ""]}
                      onClick={() => selectDashboardDept(undefined)}
                    >
                      <div class={styles.deptTop}>
                        <span>全公司</span>
                        <strong>{formatPercent(summary.value.avgCompletionRate)}</strong>
                      </div>
                      <div class={styles.deptMeta}>{summary.value.participantCount ?? 0}人</div>
                    </button>
                    {departments.value.map((dept) => renderDeptItem(dept, selectedDeptId.value === dept.deptId))}
                  </div>
                </div>
                <div class={styles.userPanel}>
                  {dashboardUserFilter()}
                  <div class="safety-duty-table">
                    <DashboardRankingTable />
                  </div>
                  <div class={styles.userPagination}>
                    <Page
                      current={rankingPage.value}
                      pageSize={rankingPageSize.value}
                      total={rankingTotal.value}
                      onPageChange={handleRankingPageChange}
                      onShowSizeChange={handleRankingPageChange}
                    />
                  </div>
                </div>
              </div>
            </>
          );
        }

        if (activeKey.value === "publicity") {
          return (
            <>
              {commonFilter()}
              {renderPublicityCardList(`${periodLabel(filters.periodType)}示范`, publicity.value.redList, "red")}
              {renderPublicityCardList("不合规人员", publicity.value.blackList, "black")}
              <div class={styles.publicityTableSection}>
                <div class={styles.publicityTableHeader}>
                  <span>完整排名</span>
                  <Tag>共{publicity.value.participantCount ?? publicityTotal.value}人参评</Tag>
                </div>
                <PublicityTable />
                <div class={styles.publicityTablePagination}>
                  <Page
                    current={publicityPage.value}
                    pageSize={publicityPageSize.value}
                    total={publicityTotal.value}
                    onPageChange={handlePublicityPageChange}
                    onShowSizeChange={handlePublicityPageChange}
                  />
                </div>
              </div>
            </>
          );
        }

        if (activeKey.value === "model") {
          return (
            <>
              <div class={styles.modelIntro}>
                <h2>评分模型配置</h2>
                <p>两阶段评分：强制项核验（一票否决）→ 完成率评分（考核排名）。</p>
              </div>
              <div class={styles.modelStageGrid}>
                <div class={[styles.modelStageCard, styles.modelStageDanger]}>
                  <div class={styles.modelStageTitle}>阶段一：强制项核验（一票否决）</div>
                  <ul class={styles.modelStageList}>
                    <li>强制项 = 法律法规明确要求且设有罚则的条款</li>
                    <li>
                      当月有任意强制项未完成 → 直接判定 <span class={styles.dangerText}>D级（不合格）</span>
                    </li>
                    <li>D级 = 黑榜公示</li>
                    <li class={styles.modelStageHighlight}>一票否决：强制项缺一条就不合格</li>
                  </ul>
                </div>
                <div class={[styles.modelStageCard, styles.modelStageSuccess]}>
                  <div class={styles.modelStageTitle}>阶段二：完成率评分（考核排名）</div>
                  <ul class={styles.modelStageList}>
                    <li>完成率 = 已完成责任清单项 ÷ 应执行责任清单项 × 100</li>
                    <li>强制项全部完成 → 按总体完成率精细打分</li>
                    <li>口径与责任清单完成率一致</li>
                    <li class={styles.modelStageHighlight}>完成率高 = 排名靠前，决定红榜归属</li>
                  </ul>
                </div>
              </div>
              <div class={styles.modelRulePanel}>
                <div class={styles.modelRuleHeader}>
                  <span>等级判定规则</span>
                  {modelEditing.value ? (
                    <Space>
                      <Button size="small" onClick={cancelModelEdit}>
                        取消
                      </Button>
                      <Button size="small" type="primary" onClick={() => void saveModel()}>
                        保存
                      </Button>
                    </Space>
                  ) : (
                    <Button size="small" onClick={() => (modelEditing.value = true)}>
                      编辑
                    </Button>
                  )}
                </div>
                <ModelRuleTable />
              </div>
              <div class={styles.modelExamplePanel}>
                <span>判定示例</span>
                <div class={styles.modelExampleList}>
                  <p>
                    示例1：张总本月强制项全部完成，责任清单完成率达到 90% → <Tag color="green">A级</Tag> 红榜公示
                  </p>
                  <p>
                    示例2：李工本月强制项缺 1 项 → <Tag color="red">D级</Tag> 直接不合格，黑榜公示
                  </p>
                  <p>
                    示例3：王工本月强制项全部完成，责任清单完成率 50% → <Tag color="orange">C级</Tag> 关注
                  </p>
                </div>
              </div>
            </>
          );
        }

        return (
          <>
            <div class={styles.notifyScenePanel}>
              <div class={styles.notifySceneHeader}>
                <div>
                  <div class={styles.notifySceneTitle}>消息场景配置</div>
                  <div class={styles.notifySceneDesc}>评分等级通知</div>
                </div>
                <Button size="small" type="primary" loading={scoreNoticeSaving.value} onClick={() => void saveScoreNoticeConfig()}>
                  保存
                </Button>
              </div>
              <div class={styles.notifyWayRow}>
                <span class={styles.notifyWayLabel}>通知方式</span>
                {scoreNoticeWayOptions.value.length > 0 ? (
                  <CheckboxGroup v-model:value={scoreNoticeConfig.noticeWays} options={scoreNoticeWayOptions.value} />
                ) : (
                  <span class={styles.notifyEmptyText}>当前场景未配置可用通知方式</span>
                )}
              </div>
            </div>
            <div class={styles.notifyIntro}>
              按等级配置通知人——评分计算完成后，按等级向配置的通知人发送消息。支持按岗位、职位、部门、具体人员选择。
            </div>
            <div class={styles.notifyLevelList}>{notifyLevelMeta.map((meta) => renderNotifyLevelCard(meta))}</div>
          </>
        );
      };

      const layoutSlots = {
        "layout-header": (): JSX.Element | null => {
          if (activeKey.value !== "dashboard") {
            return null;
          }
          return <Button onClick={() => void exportRanking()}>导出</Button>;
        },
        "layout-content": renderContent,
      };

      return (): JSX.Element => (
        <>
          <PageLayout title={pageTitle || fallbackTitle} showFooter={false} v-slots={layoutSlots} />
          {renderNotifyModal()}
        </>
      );
    },
  });

export const DutyScoreDashboardPage = createDutyScorePage("dashboard", "评分看板");
export const DutyScorePersonalReportPage = createDutyScorePage("report", "个人履职报告");
export const DutyScorePublicityPage = createDutyScorePage("publicity", "排名公示");
export const DutyScoreModelPage = createDutyScorePage("model", "评分模型配置");
export const DutyScoreNotifyTargetsPage = createDutyScorePage("notify", "通知人配置");
