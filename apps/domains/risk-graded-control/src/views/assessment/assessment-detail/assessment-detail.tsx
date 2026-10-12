import { computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { createAssessment, getUnit, listObjectAssessments, pageAssessmentMethods, pageRiskObjects, patchAssessment } from "@/api/server";
import { AssessmentDimensionForm } from "@/components/assessment-dimension-form/assessment-dimension-form";
import { ObjectStatusTag } from "@/components/object-status-tag/object-status-tag";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { LIST_ACTION_LINK_PROPS, RISK_LEVEL_LABEL, RISK_MODAL_BODY_STYLE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Modal,
  PageLayout as PcLayout,
  Select,
  SelectOption,
  Table,
  Tag,
  message,
} from "@/pc-ui-runtime";
import type { AssessmentMethodVO, ObjectStatus, RiskLevel, RiskObjectVO, UnitVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { calcAssessmentTotalScore, formatAssessmentScore } from "@/utils/assessment-score";
import { useLayoutTitle } from "@/utils/page-title";
import {
  mapAssessmentMethodFromApi,
  mapRiskLevelFromApi,
  mapRiskObjectFromApi,
  mapUnitFromApi,
  type RiskAssessmentRecordApiVO,
} from "@/utils/risk-control-mapper";

import formStyles from "@/styles/form-page.module.less";

type AssessmentType = "INHERENT" | "CONTROL";
type ObjectAssessmentRecords = {
  inherent?: RiskAssessmentRecordApiVO;
  control?: RiskAssessmentRecordApiVO;
  inherentDraft?: RiskAssessmentRecordApiVO;
  controlDraft?: RiskAssessmentRecordApiVO;
};

const ASSESSMENT_STATUS = {
  PENDING: { label: "待评估", color: "gold" },
  ASSESSING: { label: "评估中", color: "blue" },
  COMPLETED: { label: "已完成", color: "green" },
} as const;

const TABLE_SCROLL_X = 1180;
const RISK_LEVEL_ORDER: RiskLevel[] = ["MAJOR", "SIGNIFICANT", "GENERAL", "LOW"];

export const AssessmentDetailPage = defineComponent({
  setup() {
    const layoutTitle = useLayoutTitle("风险评估详情");
    const route = useRoute();
    const router = useRouter();
    const unit = ref<UnitVO | null>(null);
    const objects = ref<RiskObjectVO[]>([]);
    const methods = ref<AssessmentMethodVO[]>([]);
    const modalInherentMethodId = ref("");
    const modalControlMethodId = ref("");
    const loading = ref(false);
    const modalVisible = ref(false);
    const submitting = ref(false);
    const activeObject = ref<RiskObjectVO | null>(null);
    const recordsMap = ref<Record<string, ObjectAssessmentRecords>>({});
    const inherentScoresMap = ref<Record<string, Record<string, number>>>({});
    const controlScoresMap = ref<Record<string, Record<string, number>>>({});

    const unitId = computed(() => {
      const raw = route.query.unitId;
      return Array.isArray(raw) ? (raw[0] ?? "") : String(raw ?? "");
    });

    const methodNameById = (methodId?: string | number): string => {
      if (methodId == null || methodId === "") return "--";
      const id = String(methodId);
      return methods.value.find((item) => item.id === id)?.name ?? "--";
    };

    const parseScoreDetail = (value: unknown): Record<string, number> | undefined => {
      if (!value || typeof value !== "string") return undefined;
      try {
        const parsed = JSON.parse(value) as Record<string, number>;
        return parsed && typeof parsed === "object" ? parsed : undefined;
      } catch {
        return undefined;
      }
    };

    const scoreText = (scores?: Record<string, number>): string => {
      if (!scores || Object.keys(scores).length === 0) return "";
      return Object.entries(scores)
        .map(([code, value]) => `${code}:${value}`)
        .join(" ");
    };

    const draftAssessmentRecord = (objectId: string, type: AssessmentType): RiskAssessmentRecordApiVO | undefined => {
      return type === "INHERENT" ? recordsMap.value[objectId]?.inherentDraft : recordsMap.value[objectId]?.controlDraft;
    };

    const latestAssessmentRecord = (objectId: string, type: AssessmentType): RiskAssessmentRecordApiVO | undefined => {
      return type === "INHERENT" ? recordsMap.value[objectId]?.inherent : recordsMap.value[objectId]?.control;
    };

    const shouldHideHistoryForCurrentCycle = (status: ObjectStatus, type: AssessmentType): boolean => {
      if (type === "INHERENT") {
        return status === "INHERENT_EVAL" || status === "INNATE_EVAL" || status === "RE_EVAL";
      }
      return status === "INHERENT_EVAL" || status === "INNATE_EVAL" || status === "RE_EVAL" || status === "CONTROL_EVAL";
    };

    const assessmentRecord = (object: RiskObjectVO, type: AssessmentType): RiskAssessmentRecordApiVO | undefined => {
      const draft = draftAssessmentRecord(object.id, type);
      if (draft) return draft;
      if (shouldHideHistoryForCurrentCycle(object.status, type)) return undefined;
      return latestAssessmentRecord(object.id, type);
    };

    const resolveObjectMethodName = (object: RiskObjectVO): string => {
      const inherentMethodId = assessmentRecord(object, "INHERENT")?.methodId;
      const controlMethodId = assessmentRecord(object, "CONTROL")?.methodId;
      if (inherentMethodId && controlMethodId && String(inherentMethodId) !== String(controlMethodId)) {
        return `${methodNameById(inherentMethodId)} / ${methodNameById(controlMethodId)}`;
      }
      return methodNameById(inherentMethodId ?? controlMethodId);
    };

    const maxRiskLevel = (levels: Array<RiskLevel | undefined>): RiskLevel | undefined => {
      for (const level of RISK_LEVEL_ORDER) {
        if (levels.includes(level)) return level;
      }
      return undefined;
    };

    const assessmentLevel = (object: RiskObjectVO, type: AssessmentType): RiskLevel | undefined => {
      if (shouldHideHistoryForCurrentCycle(object.status, type)) {
        return mapRiskLevelFromApi(assessmentRecord(object, type)?.riskLevel);
      }
      return (
        mapRiskLevelFromApi(assessmentRecord(object, type)?.riskLevel) ?? (type === "INHERENT" ? object.innateLevel : object.controlLevel)
      );
    };

    const assessmentLevelLabel = (object: RiskObjectVO, type: AssessmentType): string => {
      const level = assessmentLevel(object, type);
      return level ? RISK_LEVEL_LABEL[level] : "未评估";
    };

    const assessmentCell = (object: RiskObjectVO, type: AssessmentType): JSX.Element => {
      const record = assessmentRecord(object, type);
      const scores = type === "INHERENT" ? inherentScoresMap.value[object.id] : controlScoresMap.value[object.id];
      const level = assessmentLevel(object, type);
      if (!level) {
        return <span style={{ color: "#999" }}>未评估</span>;
      }
      const detail = scoreText(scores);
      return (
        <div>
          <RiskLevelTag level={level} />
          {(detail || record?.totalScore != null) && (
            <div style={{ color: "#999", fontSize: 12, marginTop: 2 }}>
              {detail}
              {record?.totalScore != null ? ` = ${formatAssessmentScore(record.totalScore)}` : ""}
            </div>
          )}
        </div>
      );
    };

    const unitInherentRiskLevel = computed(() => {
      return maxRiskLevel(objects.value.map((object) => assessmentLevel(object, "INHERENT"))) ?? unit.value?.inherentRiskLevel;
    });

    const unitControlRiskLevel = computed(() => {
      return maxRiskLevel(objects.value.map((object) => assessmentLevel(object, "CONTROL"))) ?? unit.value?.controlRiskLevel;
    });

    const resolveObjectAssessmentStatus = (status: ObjectStatus): keyof typeof ASSESSMENT_STATUS => {
      if (status === "INHERENT_EVAL" || status === "INNATE_EVAL" || status === "RE_EVAL") return "PENDING";
      if (status === "CONTROL_EVAL") return "ASSESSING";
      return "COMPLETED";
    };

    const loadAssessments = async (targetObjects: RiskObjectVO[]): Promise<void> => {
      const nextRecords: Record<string, ObjectAssessmentRecords> = {};
      const nextInherentScores: Record<string, Record<string, number>> = {};
      const nextControlScores: Record<string, Record<string, number>> = {};
      await Promise.all(
        targetObjects.map(async (obj) => {
          const page = await useAuthRequest(() => listObjectAssessments(obj.id));
          const inherent = page.records.find((record) => record.assessmentType === "INHERENT");
          const control = page.records.find((record) => record.assessmentType === "CONTROL");
          const inherentDraft = page.records.find((record) => record.assessmentType === "INHERENT" && record.submitted === false);
          const controlDraft = page.records.find((record) => record.assessmentType === "CONTROL" && record.submitted === false);
          const displayInherent = inherentDraft ?? (shouldHideHistoryForCurrentCycle(obj.status, "INHERENT") ? undefined : inherent);
          const displayControl = controlDraft ?? (shouldHideHistoryForCurrentCycle(obj.status, "CONTROL") ? undefined : control);
          nextRecords[obj.id] = { inherent, control, inherentDraft, controlDraft };
          const inherentScores = displayInherent?.dimensionScores ?? parseScoreDetail(displayInherent?.scoreDetailJson);
          const controlScores = displayControl?.dimensionScores ?? parseScoreDetail(displayControl?.scoreDetailJson);
          if (inherentScores) nextInherentScores[obj.id] = inherentScores;
          if (controlScores) nextControlScores[obj.id] = controlScores;
        }),
      );
      recordsMap.value = nextRecords;
      inherentScoresMap.value = nextInherentScores;
      controlScoresMap.value = nextControlScores;
    };

    const loadData = async (): Promise<void> => {
      if (!unitId.value) return;
      loading.value = true;
      try {
        const [unitVo, methodPage] = await Promise.all([
          useAuthRequest(() => getUnit(unitId.value)),
          useAuthRequest(() => pageAssessmentMethods({ pageNumber: 1, pageSize: 500, enabled: true })),
        ]);
        unit.value = mapUnitFromApi(unitVo);
        methods.value = methodPage.records.map(mapAssessmentMethodFromApi);
        let objectList = (unitVo.objects ?? []).map(mapRiskObjectFromApi);
        if (objectList.length === 0) {
          const objectPage = await useAuthRequest(() =>
            pageRiskObjects({
              unitId: unitId.value,
              pageNumber: 1,
              pageSize: 500,
            }),
          );
          objectList = objectPage.records.map(mapRiskObjectFromApi);
        }
        objects.value = objectList;
        await loadAssessments(objectList);
      } catch (e) {
        showApiError(e);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void loadData();
    });

    const getScores = (objectId: string, type: AssessmentType): Record<string, number> => {
      const target = type === "INHERENT" ? inherentScoresMap : controlScoresMap;
      if (!target.value[objectId]) {
        target.value[objectId] = {};
      }
      return target.value[objectId];
    };

    const setScores = (objectId: string, type: AssessmentType, scores: Record<string, number>): void => {
      if (type === "INHERENT") {
        inherentScoresMap.value = { ...inherentScoresMap.value, [objectId]: scores };
      } else {
        controlScoresMap.value = { ...controlScoresMap.value, [objectId]: scores };
      }
    };

    const editableType = computed<AssessmentType | undefined>(() => {
      const status = activeObject.value?.status;
      if (status === "INHERENT_EVAL" || status === "INNATE_EVAL" || status === "RE_EVAL") return "INHERENT";
      if (status === "CONTROL_EVAL") return "CONTROL";
      return undefined;
    });

    const modalInherentMethod = computed(() => methods.value.find((item) => item.id === modalInherentMethodId.value) ?? null);
    const modalControlMethod = computed(() => methods.value.find((item) => item.id === modalControlMethodId.value) ?? null);

    const methodForType = (type: AssessmentType): AssessmentMethodVO | null =>
      type === "INHERENT" ? modalInherentMethod.value : modalControlMethod.value;

    const pickScoresForMethod = (scores: Record<string, number>, method: AssessmentMethodVO): Record<string, number> => {
      const picked: Record<string, number> = {};
      method.dimensions.forEach((dimension) => {
        if (scores[dimension.code] != null) {
          picked[dimension.code] = scores[dimension.code];
        }
      });
      return picked;
    };

    const validateScores = (objectId: string, type: AssessmentType): boolean => {
      const method = methodForType(type);
      if (!method) {
        message.warning(`请选择${type === "INHERENT" ? "固有" : "控制"}风险评估方法`);
        return false;
      }
      const scores = pickScoresForMethod(getScores(objectId, type), method);
      const missing = method.dimensions.some((dimension) => scores[dimension.code] == null);
      if (missing) {
        message.warning(`请完善${type === "INHERENT" ? "固有" : "控制"}风险评估维度`);
        return false;
      }
      return true;
    };

    const submitAssessment = async (): Promise<void> => {
      if (!activeObject.value || !editableType.value) {
        modalVisible.value = false;
        return;
      }
      const objectId = activeObject.value.id;
      const type = editableType.value;
      const method = methodForType(type);
      if (!method) {
        message.warning(`请选择${type === "INHERENT" ? "固有" : "控制"}风险评估方法`);
        return;
      }
      if (!validateScores(objectId, type)) return;
      submitting.value = true;
      try {
        const scores = pickScoresForMethod(getScores(objectId, type), method);
        const payload = {
          objectId,
          unitId: unitId.value,
          methodId: method.id,
          assessmentType: type,
          dimensionScores: scores,
          totalScore: calcAssessmentTotalScore(scores, method.dimensions),
          submitted: true,
        };
        const existingId = draftAssessmentRecord(objectId, type)?.id;
        if (existingId) {
          await useAuthRequest(() => patchAssessment(existingId, payload));
        } else {
          await useAuthRequest(() => createAssessment(payload));
        }
        message.success(type === "INHERENT" ? "固有风险评估已提交" : "控制风险评估已提交");
        modalVisible.value = false;
        await loadData();
      } catch (e) {
        showApiError(e);
      } finally {
        submitting.value = false;
      }
    };

    const resolveMethodId = (record: RiskObjectVO, type: AssessmentType): string => {
      const methodId = assessmentRecord(record, type)?.methodId;
      if (methodId != null && methods.value.some((item) => item.id === String(methodId))) {
        return String(methodId);
      }
      // 无历史记录时预填首项；固有风险与控制风险 methodId 各自独立，不做交叉回填
      return methods.value[0]?.id ?? "";
    };

    const onMethodChange = (type: AssessmentType, methodId: string): void => {
      if (type === "INHERENT") {
        modalInherentMethodId.value = methodId;
      } else {
        modalControlMethodId.value = methodId;
      }
      if (!activeObject.value || editableType.value !== type) return;
      setScores(activeObject.value.id, type, {});
    };

    const renderMethodSelect = (type: AssessmentType): JSX.Element => {
      const methodId = type === "INHERENT" ? modalInherentMethodId.value : modalControlMethodId.value;
      const editable = editableType.value === type;
      return (
        <Form layout="vertical" style={{ marginBottom: 12 }}>
          <FormItem label="评估方法" required={editable}>
            <Select
              value={methodId || undefined}
              placeholder="请选择评估方法"
              disabled={!editable}
              style={{ width: "100%" }}
              onChange={(value: unknown) => onMethodChange(type, String(value ?? ""))}
            >
              {methods.value.map((item) => (
                <SelectOption key={item.id} value={item.id}>
                  {item.name}（{item.formula}）
                </SelectOption>
              ))}
            </Select>
          </FormItem>
        </Form>
      );
    };

    const openModal = (record: RiskObjectVO): void => {
      activeObject.value = record;
      modalInherentMethodId.value = resolveMethodId(record, "INHERENT");
      modalControlMethodId.value = resolveMethodId(record, "CONTROL");
      modalVisible.value = true;
    };

    const columns = [
      { title: "风险对象", dataIndex: "name", width: 180, ellipsis: true },
      { title: "危险源", dataIndex: "hazardDesc", width: 280, ellipsis: true },
      {
        title: "评估方法",
        width: 130,
        ellipsis: true,
        customRender: ({ record }: { record: RiskObjectVO }) => resolveObjectMethodName(record),
      },
      {
        title: "固有评估",
        width: 180,
        customRender: ({ record }: { record: RiskObjectVO }): JSX.Element => assessmentCell(record, "INHERENT"),
      },
      {
        title: "控制评估",
        width: 180,
        customRender: ({ record }: { record: RiskObjectVO }): JSX.Element => assessmentCell(record, "CONTROL"),
      },
      {
        title: "评估状态",
        width: 110,
        customRender: ({ record }: { record: RiskObjectVO }): JSX.Element => {
          const status = ASSESSMENT_STATUS[resolveObjectAssessmentStatus(record.status)];
          return <Tag color={status.color}>{status.label}</Tag>;
        },
      },
      {
        title: "操作",
        fixed: "right" as const,
        width: 80,
        customRender: ({ record }: { record: RiskObjectVO }): JSX.Element => {
          const completed = resolveObjectAssessmentStatus(record.status) === "COMPLETED";
          return (
            <Button {...LIST_ACTION_LINK_PROPS} onClick={() => openModal(record)}>
              {completed ? "查看" : "评估"}
            </Button>
          );
        },
      },
    ];

    const modalFooter = (): JSX.Element[] => {
      if (!editableType.value) {
        return [
          <Button
            key="close"
            onClick={() => {
              modalVisible.value = false;
            }}
          >
            关闭
          </Button>,
        ];
      }
      return [
        <Button
          key="cancel"
          onClick={() => {
            modalVisible.value = false;
          }}
        >
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting.value}
          onClick={() => {
            void submitAssessment();
          }}
        >
          提交评估
        </Button>,
      ];
    };

    return (): JSX.Element => (
      <PcLayout
        title={layoutTitle}
        v-slots={{
          "layout-content": () =>
            unit.value && methods.value.length > 0 ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Descriptions column={6} size="small">
                    <DescriptionsItem label="编号">{unit.value.code || "--"}</DescriptionsItem>
                    <DescriptionsItem label="单元名称">{unit.value.name}</DescriptionsItem>
                    <DescriptionsItem label="单元类型">{unit.value.unitType || "--"}</DescriptionsItem>
                    <DescriptionsItem label="所属区域">{unit.value.zoneName || "--"}</DescriptionsItem>
                    <DescriptionsItem label="固有风险等级">
                      <RiskLevelTag level={unitInherentRiskLevel.value} />
                    </DescriptionsItem>
                    <DescriptionsItem label="现状风险等级">
                      <RiskLevelTag level={unitControlRiskLevel.value} />
                    </DescriptionsItem>
                  </Descriptions>
                </div>
                <div class="tableWrap">
                  <Table
                    columns={columns}
                    dataSource={objects.value}
                    rowKey="id"
                    pagination={false}
                    loading={loading.value}
                    scroll={{ x: TABLE_SCROLL_X }}
                    tableLayout="fixed"
                  />
                </div>
                <Modal
                  wrapClassName="risk-modal"
                  bodyStyle={RISK_MODAL_BODY_STYLE}
                  title={`风险评估 - ${activeObject.value?.name ?? ""}`}
                  open={modalVisible.value}
                  width={760}
                  footer={modalFooter()}
                  onCancel={() => {
                    modalVisible.value = false;
                  }}
                >
                  {activeObject.value && (
                    <>
                      <Card size="small" style={{ marginBottom: 16 }}>
                        <p>
                          <strong>风险对象：</strong>
                          {activeObject.value.name}
                        </p>
                        <p>
                          <strong>危险源：</strong>
                          {activeObject.value.hazardDesc || "--"}
                        </p>
                        <p>
                          <strong>事故类型：</strong>
                          {activeObject.value.accidentTypes.join("、") || "--"}
                        </p>
                        <p>
                          <strong>当前状态：</strong>
                          <ObjectStatusTag status={activeObject.value.status} />
                        </p>
                      </Card>
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ marginBottom: 8 }}>固有风险评估</h4>
                        {renderMethodSelect("INHERENT")}
                        {modalInherentMethod.value ? (
                          <AssessmentDimensionForm
                            method={modalInherentMethod.value}
                            modelValue={getScores(activeObject.value.id, "INHERENT")}
                            disabled={editableType.value !== "INHERENT"}
                            onUpdate:modelValue={(scores: Record<string, number>) => setScores(activeObject.value!.id, "INHERENT", scores)}
                          />
                        ) : (
                          <p style={{ color: "#999" }}>请选择评估方法</p>
                        )}
                      </div>
                      <div>
                        <h4 style={{ marginBottom: 4 }}>控制风险评估</h4>
                        <p style={{ color: "#999", marginBottom: 8 }}>在现有管控措施基础上重新评估</p>
                        {renderMethodSelect("CONTROL")}
                        {modalControlMethod.value ? (
                          <AssessmentDimensionForm
                            method={modalControlMethod.value}
                            modelValue={getScores(activeObject.value.id, "CONTROL")}
                            disabled={editableType.value !== "CONTROL"}
                            onUpdate:modelValue={(scores: Record<string, number>) => setScores(activeObject.value!.id, "CONTROL", scores)}
                          />
                        ) : (
                          <p style={{ color: "#999" }}>请选择评估方法</p>
                        )}
                      </div>
                      {!editableType.value && (
                        <p style={{ color: "#666", marginTop: 12 }}>
                          当前对象评估已完成，固有风险为
                          {assessmentLevelLabel(activeObject.value, "INHERENT")}
                          ，控制风险为
                          {assessmentLevelLabel(activeObject.value, "CONTROL")}。
                        </p>
                      )}
                    </>
                  )}
                </Modal>
              </>
            ) : (
              <Card loading={loading.value}>
                <p>未找到评估单元或评估方法</p>
              </Card>
            ),
          "footer-page": () => (
            <div class={formStyles.footerActions}>
              <Button onClick={() => router.push({ name: "assessments" })}>返回列表</Button>
            </div>
          ),
        }}
      />
    );
  },
});
