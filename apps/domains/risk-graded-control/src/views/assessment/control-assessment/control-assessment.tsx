import { defineComponent, onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { createAssessment, getUnit, listObjectAssessments, pageAssessmentMethods, pageRiskObjects, patchAssessment } from "@/api/server";
import { AssessmentDimensionForm } from "@/components/assessment-dimension-form/assessment-dimension-form";
import { ObjectStatusTag } from "@/components/object-status-tag/object-status-tag";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { RISK_LEVEL_LABEL } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { Alert, Button, Card, Descriptions, DescriptionsItem, PageLayout as PcLayout, Space, Table, Tag, message } from "@/pc-ui-runtime";
import type { AssessmentMethodVO, RiskLevel, RiskObjectVO, UnitVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { useLayoutTitle } from "@/utils/page-title";
import { mapAssessmentMethodFromApi, mapRiskObjectFromApi, mapUnitFromApi } from "@/utils/risk-control-mapper";

const LEVEL_ORDER: Record<RiskLevel, number> = {
  MAJOR: 4,
  SIGNIFICANT: 3,
  GENERAL: 2,
  LOW: 1,
};

export const ControlAssessmentPage = defineComponent({
  setup() {
    const layoutTitle = useLayoutTitle("控制风险评估");
    const route = useRoute();
    const router = useRouter();
    const unit = ref<UnitVO | null>(null);
    const objects = ref<RiskObjectVO[]>([]);
    const method = ref<AssessmentMethodVO | null>(null);
    const scoresMap = ref<Record<string, Record<string, number>>>({});
    const assessmentIds = ref<Record<string, string>>({});
    const loading = ref(false);
    const submitting = ref(false);

    const unitId = computed(() => (route.query.unitId as string) ?? "");

    const loadData = async (): Promise<void> => {
      if (!unitId.value) return;
      loading.value = true;
      try {
        const [unitVo, methodPage] = await Promise.all([
          useAuthRequest(() => getUnit(unitId.value)),
          useAuthRequest(() => pageAssessmentMethods({ pageNumber: 1, pageSize: 1, enabled: true })),
        ]);
        unit.value = mapUnitFromApi(unitVo);
        method.value = methodPage.records[0] ? mapAssessmentMethodFromApi(methodPage.records[0]) : null;
        objects.value = (unitVo.objects ?? []).map(mapRiskObjectFromApi);
        if (objects.value.length === 0) {
          const riskPage = await useAuthRequest(() =>
            pageRiskObjects({
              unitId: unitId.value,
              pageNumber: 1,
              pageSize: 500,
            }),
          );
          objects.value = riskPage.records.map(mapRiskObjectFromApi);
        }

        for (const obj of objects.value) {
          const assessPage = await useAuthRequest(() =>
            listObjectAssessments(obj.id, {
              assessmentType: "CONTROL",
            }),
          );
          const existing = assessPage.records?.[0];
          if (existing?.id) {
            assessmentIds.value[obj.id] = String(existing.id);
          }
          const existingScores = existing?.dimensionScores ?? parseScoreDetail(existing?.scoreDetailJson);
          if (existingScores) {
            scoresMap.value[obj.id] = existingScores;
          }
        }
      } catch (e) {
        showApiError(e);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void loadData();
    });

    const parseScoreDetail = (value: unknown): Record<string, number> | undefined => {
      if (!value || typeof value !== "string") return undefined;
      try {
        const parsed = JSON.parse(value) as Record<string, number>;
        return parsed && typeof parsed === "object" ? parsed : undefined;
      } catch {
        return undefined;
      }
    };

    const getScores = (objectId: string): Record<string, number> => {
      if (!scoresMap.value[objectId]) {
        scoresMap.value[objectId] = {};
      }
      return scoresMap.value[objectId];
    };

    const setScores = (objectId: string, scores: Record<string, number>): void => {
      scoresMap.value = { ...scoresMap.value, [objectId]: scores };
    };

    const compareRows = computed(() =>
      objects.value.map((obj) => {
        const innate = obj.innateLevel;
        const control = obj.controlLevel ?? innate;
        const reduced = innate && control && LEVEL_ORDER[control] < LEVEL_ORDER[innate];
        const upgraded = innate && control && LEVEL_ORDER[control] > LEVEL_ORDER[innate];
        return { ...obj, innate, control, reduced, upgraded };
      }),
    );

    const reducedCount = computed(() => compareRows.value.filter((r) => r.reduced).length);
    const pendingObjects = computed(() => objects.value.filter((obj) => obj.status === "CONTROL_EVAL"));

    const validateScores = (): boolean => {
      if (!method.value) {
        message.warning("未找到评估方法");
        return false;
      }
      if (pendingObjects.value.length === 0) {
        message.warning("当前单元没有待控制评估对象");
        return false;
      }
      for (const obj of pendingObjects.value) {
        const scores = scoresMap.value[obj.id] ?? {};
        const missing = method.value.dimensions.some((dim) => scores[dim.code] == null);
        if (missing) {
          message.warning(`请完善 ${obj.name} 的控制风险评估维度`);
          return false;
        }
      }
      return true;
    };

    const submit = async (): Promise<void> => {
      if (!validateScores() || !method.value) return;
      submitting.value = true;
      try {
        for (const obj of pendingObjects.value) {
          const scores = scoresMap.value[obj.id] ?? {};
          const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
          const payload = {
            objectId: obj.id,
            unitId: unitId.value,
            assessmentType: "CONTROL",
            dimensionScores: scores,
            totalScore,
            submitted: true,
          };
          const existingId = assessmentIds.value[obj.id];
          if (existingId) {
            await useAuthRequest(() => patchAssessment(existingId, payload));
          } else {
            const created = await useAuthRequest(() => createAssessment(payload));
            if (created.id) assessmentIds.value[obj.id] = String(created.id);
          }
        }
        message.success("控制风险评估已提交");
        void router.push({ name: "measure-config", query: { unitId: unitId.value } });
      } catch (e) {
        showApiError(e);
      } finally {
        submitting.value = false;
      }
    };

    const columns = [
      { title: "风险对象", dataIndex: "name", width: 160, ellipsis: true },
      {
        title: "固有风险等级",
        dataIndex: "innate",
        width: 120,
        customRender: ({ text }: { text: RiskLevel | undefined }) => <RiskLevelTag level={text} />,
      },
      {
        title: "现状风险等级",
        dataIndex: "control",
        width: 120,
        customRender: ({ text }: { text: RiskLevel | undefined }) => <RiskLevelTag level={text} />,
      },
      {
        title: "对比结果",
        width: 140,
        customRender: ({ record }: { record: { reduced?: boolean; upgraded?: boolean; innate?: RiskLevel; control?: RiskLevel } }) => {
          if (!record.innate || !record.control) return "--";
          if (record.reduced) return <Tag color="green">风险降低</Tag>;
          if (record.upgraded) return <Tag color="red">风险升高</Tag>;
          return <Tag>等级不变</Tag>;
        },
      },
      {
        title: "说明",
        customRender: ({ record }: { record: { innate?: RiskLevel; control?: RiskLevel } }) => {
          if (!record.innate || !record.control) return "--";
          if (record.innate === record.control) {
            return `固有风险与现状均为${RISK_LEVEL_LABEL[record.innate]}`;
          }
          return `由${RISK_LEVEL_LABEL[record.innate]}变为${RISK_LEVEL_LABEL[record.control]}`;
        },
      },
    ];

    return (): JSX.Element => (
      <PcLayout
        title={layoutTitle}
        showFooter={false}
        v-slots={{
          "layout-content": () =>
            unit.value && method.value ? (
              <>
                <Card title="单元概要" size="small" style={{ marginBottom: 16 }} loading={loading.value}>
                  <Descriptions column={3} size="small">
                    <DescriptionsItem label="单元名称">{unit.value.name}</DescriptionsItem>
                    <DescriptionsItem label="所属区域">{unit.value.zoneName}</DescriptionsItem>
                    <DescriptionsItem label="对象数">{objects.value.length}</DescriptionsItem>
                  </Descriptions>
                </Card>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message={`共 ${objects.value.length} 个对象，${reducedCount.value} 个经管控措施后风险等级降低`}
                />
                <div class="tableWrap">
                  <Table
                    columns={columns}
                    dataSource={compareRows.value}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    loading={loading.value}
                  />
                </div>
                {pendingObjects.value.map((obj) => (
                  <div key={obj.id} style={{ marginTop: 16 }}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <span>{obj.name}</span>
                          <ObjectStatusTag status={obj.status} />
                          {obj.innateLevel && <RiskLevelTag level={obj.innateLevel} />}
                        </Space>
                      }
                    >
                      <p style={{ color: "#666", marginBottom: 12 }}>{obj.hazardDesc}</p>
                      <AssessmentDimensionForm
                        method={method.value!}
                        modelValue={getScores(obj.id)}
                        onUpdate:modelValue={(v: Record<string, number>) => setScores(obj.id, v)}
                      />
                    </Card>
                  </div>
                ))}
                <Space style={{ marginTop: 16 }}>
                  <Button
                    type="primary"
                    loading={submitting.value}
                    onClick={() => {
                      void submit();
                    }}
                  >
                    提交控制评估并配置措施
                  </Button>
                  <Button onClick={() => router.back()}>返回</Button>
                </Space>
              </>
            ) : (
              <Card loading={loading.value}>
                <p>未找到评估单元或评估方法</p>
                <Button onClick={() => router.push({ name: "assessments" })}>返回列表</Button>
              </Card>
            ),
        }}
      />
    );
  },
});
