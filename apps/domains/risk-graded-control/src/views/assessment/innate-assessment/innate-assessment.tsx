import { defineComponent, onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { createAssessment, getUnit, listObjectAssessments, pageAssessmentMethods, pageRiskObjects, patchAssessment } from "@/api/server";
import { AssessmentDimensionForm } from "@/components/assessment-dimension-form/assessment-dimension-form";
import { ObjectStatusTag } from "@/components/object-status-tag/object-status-tag";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { Button, Card, Descriptions, DescriptionsItem, PageLayout as PcLayout, Space, message } from "@/pc-ui-runtime";
import type { AssessmentMethodVO, RiskLevel, RiskObjectVO, UnitVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { useLayoutTitle } from "@/utils/page-title";
import { mapAssessmentMethodFromApi, mapRiskLevelToApi, mapRiskObjectFromApi, mapUnitFromApi } from "@/utils/risk-control-mapper";

export const InnateAssessmentPage = defineComponent({
  setup() {
    const layoutTitle = useLayoutTitle("固有风险评估");
    const route = useRoute();
    const router = useRouter();
    const method = ref<AssessmentMethodVO | null>(null);
    const scoresMap = ref<Record<string, Record<string, number>>>({});
    const assessmentIds = ref<Record<string, string>>({});
    const unit = ref<UnitVO | null>(null);
    const objects = ref<RiskObjectVO[]>([]);
    const loading = ref(false);

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
              assessmentType: "INHERENT",
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

    const pendingObjects = computed(() => objects.value.filter((obj) => obj.status === "INHERENT_EVAL" || obj.status === "INNATE_EVAL"));

    const validateScores = (): boolean => {
      if (!method.value) {
        message.warning("未找到评估方法");
        return false;
      }
      if (pendingObjects.value.length === 0) {
        message.warning("当前单元没有待评估对象");
        return false;
      }
      for (const obj of pendingObjects.value) {
        const scores = scoresMap.value[obj.id] ?? {};
        const missing = method.value.dimensions.some((dim) => scores[dim.code] == null);
        if (missing) {
          message.warning(`请完善 ${obj.name} 的固有风险评估维度`);
          return false;
        }
      }
      return true;
    };

    const submit = async (): Promise<void> => {
      if (!validateScores() || !method.value) return;
      try {
        for (const obj of pendingObjects.value) {
          const scores = scoresMap.value[obj.id] ?? {};
          const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
          const payload = {
            objectId: obj.id,
            unitId: unitId.value,
            methodId: method.value.id,
            assessmentType: "INHERENT",
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
        message.success("固有风险评估已保存");
        void router.push({ name: "assessments" });
      } catch (e) {
        showApiError(e);
      }
    };

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
                    <DescriptionsItem label="单元类型">{unit.value.unitType}</DescriptionsItem>
                    <DescriptionsItem label="管控责任人">{unit.value.responsibleUser}</DescriptionsItem>
                    <DescriptionsItem label="单元风险等级">
                      <RiskLevelTag level={unit.value.riskLevel} />
                    </DescriptionsItem>
                    <DescriptionsItem label="风险对象数">{objects.value.length}</DescriptionsItem>
                  </Descriptions>
                </Card>
                {pendingObjects.value.map((obj) => (
                  <div key={obj.id} style={{ marginBottom: 16 }}>
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
                        onScoreChange={({ level }: { level?: RiskLevel }) => {
                          if (level) {
                            message.info(`${obj.name} 评估等级：${mapRiskLevelToApi(level)}`);
                          }
                        }}
                      />
                    </Card>
                  </div>
                ))}
                <Space>
                  <Button
                    type="primary"
                    onClick={() => {
                      void submit();
                    }}
                  >
                    保存评估
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
