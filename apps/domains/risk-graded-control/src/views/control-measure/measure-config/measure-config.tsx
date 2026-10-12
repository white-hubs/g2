import type { RiskControlMeasureParam } from "@g2-contract/risk-graded-control";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  generateControlMeasuresByAi,
  getUnit,
  listObjectControlMeasures,
  pageAreas,
  pageRiskObjects,
  pageUnitInventory,
  pageUnitTypes,
  saveObjectControlMeasures,
} from "@/api/server";
import { MeasureCardList, type MeasureFormItem } from "@/components/measure-card-list/measure-card-list";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import {
  CONTROL_LEVELS,
  CONTROL_TYPES,
  LIST_ACTION_LINK_PROPS,
  TABLE_CODE_COLUMN_WIDTH,
  TABLE_PAGE_SIZE,
  RISK_MODAL_BODY_STYLE,
} from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Modal,
  Page,
  PageLayout as PcLayout,
  Space,
  Tag,
  Tooltip,
  message,
  usePcForm,
  usePcTable,
  type ColumnType,
} from "@/pc-ui-runtime";
import type { ControlMeasureVO, ObjectStatus, RiskObjectVO, UnitInventoryRowVO, UnitTypeVO, UnitVO, ZoneVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { canConfigureObjectMeasures, measureConfigDisabledReason } from "@/utils/object-measure-eligibility";
import { unwrapListRecords } from "@/utils/page-records";
import { useLayoutTitle } from "@/utils/page-title";
import {
  mapMeasureFromApi,
  mapMeasureToApi,
  mapRiskObjectFromApi,
  mapUnitFromApi,
  mapUnitInventoryRowFromApi,
  mapUnitTypeFromApi,
  mapZoneFromApi,
} from "@/utils/risk-control-mapper";

import styles from "./measure-config.module.less";
import formStyles from "@/styles/form-page.module.less";

const CONTROL_STATUS = {
  CONTROL_SET: { label: "待配置", color: "gold" },
  EXECUTING: { label: "执行中", color: "blue" },
  ACTIVE: { label: "已完成", color: "green" },
} as const;

export const MeasureConfigPage = defineComponent({
  name: "MeasureConfigPage",
  setup() {
    const layoutTitle = useLayoutTitle("管控措施配置");
    const route = useRoute();
    const router = useRouter();
    const routeUnitId = Array.isArray(route.query.unitId) ? route.query.unitId[0] : route.query.unitId;
    const selectedUnitId = ref(typeof routeUnitId === "string" ? routeUnitId : "");
    const workflowEntry = Boolean(selectedUnitId.value);
    const detailMode = ref(Boolean(selectedUnitId.value));

    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
      zoneId: "",
      status: "" as ObjectStatus | "",
    });
    const zones = ref<ZoneVO[]>([]);
    const unitTypes = ref<UnitTypeVO[]>([]);

    const unit = ref<UnitVO | null>(null);
    const objects = ref<RiskObjectVO[]>([]);
    const objectMeasureMap = ref<Record<string, ControlMeasureVO[]>>({});
    const loading = ref(false);
    const detailLoaded = ref(false);
    const objectId = ref("");
    const activeObject = ref<RiskObjectVO | null>(null);
    const measureModalVisible = ref(false);
    const modalSubmitting = ref(false);
    const aiMeasureGenerating = ref(false);
    const measures = ref<MeasureFormItem[]>([{ id: "m-new-1", controlType: "", content: "", controlLevel: "", executor: "" }]);

    const resetMeasureForm = (): void => {
      measures.value = [{ id: `m-new-${Date.now()}`, controlType: "", content: "", controlLevel: "", executor: "" }];
    };

    const hydrateRow = (row: UnitInventoryRowVO): UnitInventoryRowVO => ({
      ...row,
      unit: {
        ...row.unit,
        zoneName: row.unit.zoneName || zones.value.find((zone) => zone.id === row.unit.zoneId)?.name || "--",
        unitType: row.unit.unitType || unitTypes.value.find((type) => type.id === row.unit.unitTypeId)?.name || "--",
      },
    });

    const resolveControlStatus = (row: UnitInventoryRowVO): keyof typeof CONTROL_STATUS => {
      const status = row.unit.controlStatus;
      if (status === "CONTROL_SET" || status === "EXECUTING" || status === "ACTIVE") return status;
      if ((row.measureCount ?? 0) === 0) return "CONTROL_SET";
      if ((row.completedMeasureCount ?? 0) >= (row.measureCount ?? 0)) return "ACTIVE";
      return "EXECUTING";
    };

    const loadZones = async (): Promise<void> => {
      try {
        const result = await useAuthRequest(() => pageAreas({ pageNumber: 1, pageSize: 500, view: "option" }));
        zones.value = (result?.records ?? []).map(mapZoneFromApi);
      } catch {
        zones.value = [];
      }
    };

    const loadUnitTypes = async (): Promise<void> => {
      try {
        const result = await useAuthRequest(() => pageUnitTypes({ pageNumber: 1, pageSize: 500, view: "option" }));
        unitTypes.value = (result?.records ?? []).map(mapUnitTypeFromApi);
      } catch {
        unitTypes.value = [];
      }
    };

    const fetchMeasuresForObject = async (targetObjectId: string): Promise<ControlMeasureVO[]> => {
      const measureList = await useAuthRequest(() => listObjectControlMeasures(targetObjectId));
      return unwrapListRecords(measureList).map(mapMeasureFromApi);
    };

    const loadMeasureSummaries = async (targetObjects: RiskObjectVO[]): Promise<void> => {
      const entries = await Promise.all(
        targetObjects.map(async (object) => {
          try {
            return [object.id, await fetchMeasuresForObject(object.id)] as const;
          } catch (e) {
            showApiError(e);
            return [object.id, []] as const;
          }
        }),
      );
      objectMeasureMap.value = Object.fromEntries(entries);
    };

    const loadMeasuresForObject = async (targetObjectId: string): Promise<void> => {
      if (!targetObjectId) {
        resetMeasureForm();
        return;
      }
      const items = await fetchMeasuresForObject(targetObjectId);
      objectMeasureMap.value = {
        ...objectMeasureMap.value,
        [targetObjectId]: items,
      };
      measures.value =
        items.length > 0
          ? items.map((m) => ({
              id: m.id,
              controlType: m.controlType,
              content: m.content,
              controlLevel: m.controlLevel,
              executor: m.executorId,
              executorName: m.executor,
            }))
          : [{ id: "m-new-1", controlType: "", content: "", controlLevel: "", executor: "" }];
    };

    const loadData = async (): Promise<void> => {
      if (!selectedUnitId.value) return;
      loading.value = true;
      detailLoaded.value = false;
      try {
        const unitVo = await useAuthRequest(() => getUnit(selectedUnitId.value));
        unit.value = mapUnitFromApi(unitVo);
        let objectList = (unitVo.objects ?? []).map(mapRiskObjectFromApi);
        if (objectList.length === 0) {
          const riskPage = await useAuthRequest(() =>
            pageRiskObjects({
              unitId: selectedUnitId.value,
              pageNumber: 1,
              pageSize: 500,
            }),
          );
          objectList = (riskPage?.records ?? []).map(mapRiskObjectFromApi);
        }
        objects.value = objectList;
        await loadMeasureSummaries(objects.value);
        objectId.value = "";
        activeObject.value = null;
        resetMeasureForm();
      } catch (e) {
        showApiError(e);
        unit.value = null;
        objects.value = [];
        objectMeasureMap.value = {};
      } finally {
        detailLoaded.value = true;
        loading.value = false;
      }
    };

    const openUnitControl = async (row: UnitInventoryRowVO): Promise<void> => {
      selectedUnitId.value = row.unit.id;
      detailMode.value = true;
      detailLoaded.value = false;
      unit.value = null;
      objects.value = [];
      objectMeasureMap.value = {};
      objectId.value = "";
      resetMeasureForm();
      await loadData();
    };

    const columns: ColumnType[] = [
      {
        title: "编号",
        dataIndex: ["unit", "code"],
        width: TABLE_CODE_COLUMN_WIDTH,
        ellipsis: true,
        customRender: ({ text }: { text?: string }) => text || "--",
      },
      { title: "单元名称", dataIndex: ["unit", "name"], width: 180, ellipsis: true },
      { title: "单元类型", dataIndex: ["unit", "unitType"], width: 120, customRender: ({ text }: { text?: string }) => text || "--" },
      { title: "所属区域", dataIndex: ["unit", "zoneName"], width: 150, ellipsis: true },
      {
        title: "管控状态",
        width: 100,
        customRender: ({ record }: { record: UnitInventoryRowVO }): JSX.Element => {
          const status = CONTROL_STATUS[resolveControlStatus(record)];
          return <Tag color={status.color}>{status.label}</Tag>;
        },
      },
      {
        title: "措施总数",
        dataIndex: "measureCount",
        width: 90,
        align: "center",
        customRender: ({ text }: { text?: number }) => text ?? 0,
      },
      {
        title: "已执行",
        dataIndex: "completedMeasureCount",
        width: 90,
        align: "center",
        customRender: ({ text }: { text?: number }) => text ?? 0,
      },
      {
        title: "操作",
        fixed: "right",
        width: 90,
        customRender: ({ record }: { record: UnitInventoryRowVO }): JSX.Element => (
          <Button
            {...LIST_ACTION_LINK_PROPS}
            onClick={() => {
              void openUnitControl(record);
            }}
          >
            管控
          </Button>
        ),
      },
    ];

    const fetchOverviewPage = async () => {
      const result = await useAuthRequest(() =>
        pageUnitInventory({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          areaId: search.zoneId || undefined,
          controlStatus: search.status || undefined,
        }),
      );
      const records = (result?.records ?? [])
        .map(mapUnitInventoryRowFromApi)
        .map(hydrateRow)
        .map((row) => ({
          ...row,
          id: row.unit.id,
        }));
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_MEASURE_CONFIG",
      rowKey: "id",
      fetchApi: fetchOverviewPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const buildFilterSchema = () => [
      {
        component: "Select",
        label: "所属区域",
        fieldName: "zoneId",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          placeholder: "全部区域",
          options: [{ label: "全部区域", value: "" }, ...zones.value.map((zone) => ({ label: zone.name, value: zone.id }))],
        },
      },
      {
        component: "Select",
        label: "管控状态",
        fieldName: "status",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          placeholder: "全部状态",
          options: [
            { label: "全部状态", value: "" },
            ...Object.entries(CONTROL_STATUS).map(([value, option]) => ({ label: option.label, value })),
          ],
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        componentProps: { placeholder: "搜索单元名称", allowClear: true, maxlength: 100 },
      },
    ];

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      schema: buildFilterSchema(),
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
        zoneId: (values.zoneId as string | undefined) ?? "",
        status: (values.status as ObjectStatus | "" | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        if (!detailMode.value) tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.zoneId = (values.zoneId as string | undefined) ?? "";
        search.status = (values.status as ObjectStatus | "" | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.zoneId = "";
        search.status = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
      collapsedVisibleCount: 2,
    });

    const backToOverview = async (): Promise<void> => {
      if (workflowEntry) {
        router.back();
        return;
      }
      detailMode.value = false;
      detailLoaded.value = false;
      selectedUnitId.value = "";
      unit.value = null;
      objects.value = [];
      objectMeasureMap.value = {};
      objectId.value = "";
      page.pageNumber = 1;
      tableApi.query();
    };

    onMounted(async () => {
      await Promise.all([loadZones(), loadUnitTypes()]);
      formApi.updateSchema(buildFilterSchema());
      if (detailMode.value) {
        await loadData();
      }
    });

    const openMeasureModal = async (record: RiskObjectVO): Promise<void> => {
      if (!canConfigureObjectMeasures(record)) {
        message.warning(measureConfigDisabledReason(record) ?? "请先完成风险评估");
        return;
      }
      activeObject.value = record;
      objectId.value = record.id;
      measureModalVisible.value = true;
      resetMeasureForm();
      try {
        await loadMeasuresForObject(record.id);
      } catch (e) {
        showApiError(e);
      }
    };

    const completeMeasures = (): MeasureFormItem[] => {
      const filled = measures.value.filter((m) => Boolean(m.controlType || m.content.trim() || m.controlLevel || m.executor));
      const invalid = filled.some((m) => !m.controlType || !m.content.trim() || !m.controlLevel || !m.executor);
      if (invalid) {
        message.error("请完善所有措施的必填项");
        return [];
      }
      if (filled.length === 0) {
        message.warning("请至少填写一条管控措施");
        return [];
      }
      return filled;
    };

    const normalizeAiOption = (value: unknown, options: readonly string[]): string => {
      const text = String(value ?? "").trim();
      return options.includes(text) ? text : "";
    };

    const mapAiMeasureDraft = (draft: RiskControlMeasureParam, index: number): MeasureFormItem => ({
      id: `m-ai-${Date.now()}-${index}`,
      controlType: normalizeAiOption(draft.controlType, CONTROL_TYPES),
      content: String(draft.content ?? ""),
      controlLevel: normalizeAiOption(draft.controlLevel, CONTROL_LEVELS),
      executor: String(draft.executorUserId ?? ""),
    });

    const isBlankMeasure = (item: MeasureFormItem): boolean =>
      !item.controlType && !item.content.trim() && !item.controlLevel && !item.executor;

    const generateAiMeasures = async (): Promise<void> => {
      const target = activeObject.value;
      if (!target) {
        message.warning("请先选择风险对象");
        return;
      }
      aiMeasureGenerating.value = true;
      try {
        const result = await useAuthRequest(() =>
          generateControlMeasuresByAi(target.id, {
            requirement: [
              target.name ? `风险对象：${target.name}` : "",
              target.hazardDesc ? `危险源：${target.hazardDesc}` : "",
              target.accidentTypes.length ? `事故类型：${target.accidentTypes.join("、")}` : "",
            ]
              .filter(Boolean)
              .join("；"),
            count: 3,
            existingMeasures: measures.value.filter((item) => !isBlankMeasure(item)).map(mapMeasureToApi),
          }),
        );
        const mapped = (result.measures ?? [])
          .map(mapAiMeasureDraft)
          .filter((item) => item.controlType || item.content.trim() || item.controlLevel);
        if (!mapped.length) {
          message.warning("AI未返回可用措施");
          return;
        }
        measures.value = measures.value.length === 1 && isBlankMeasure(measures.value[0]) ? mapped : [...measures.value, ...mapped];
        message.success(`已生成 ${mapped.length} 条措施草稿`);
      } catch (e) {
        showApiError(e);
      } finally {
        aiMeasureGenerating.value = false;
      }
    };

    const submit = async (): Promise<void> => {
      if (!objectId.value) {
        message.warning("当前未选择风险对象");
        return;
      }
      const targetObject = objects.value.find((object) => object.id === objectId.value) ?? activeObject.value;
      if (targetObject && !canConfigureObjectMeasures(targetObject)) {
        message.warning(measureConfigDisabledReason(targetObject) ?? "请先完成风险评估");
        return;
      }
      const payloadMeasures = completeMeasures();
      if (payloadMeasures.length === 0) return;
      modalSubmitting.value = true;
      try {
        const savedMeasures = await useAuthRequest(() =>
          saveObjectControlMeasures(objectId.value, {
            measures: payloadMeasures.map(mapMeasureToApi),
            submitted: true,
          }),
        );
        const submittedObjectId = objectId.value;
        objectMeasureMap.value = {
          ...objectMeasureMap.value,
          [submittedObjectId]: unwrapListRecords(savedMeasures).map(mapMeasureFromApi),
        };
        objects.value = objects.value.map((object) =>
          object.id === submittedObjectId && object.status === "CONTROL_SET" ? { ...object, status: "EXECUTING" } : object,
        );
        measureModalVisible.value = false;
        activeObject.value = null;
        const unconfiguredObjects = objects.value.filter((object) => (objectMeasureMap.value[object.id] ?? []).length === 0);
        message.success(unconfiguredObjects.length > 0 ? "当前对象措施已保存，请继续配置剩余风险对象" : "管控措施已保存");
        if (workflowEntry) {
          if (unconfiguredObjects.length === 0) {
            void router.push({ name: "measure-execution" });
            return;
          }
        }
        objectId.value = "";
        resetMeasureForm();
      } catch (e) {
        showApiError(e);
      } finally {
        modalSubmitting.value = false;
      }
    };

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const objectRiskTags = (record: RiskObjectVO): JSX.Element => (
      <div class={styles.objectRiskSummary}>
        <span class={styles.riskPair}>
          <span class={styles.riskLabel}>固有</span>
          <RiskLevelTag level={record.innateLevel} />
        </span>
        <span class={styles.riskPair}>
          <span class={styles.riskLabel}>现状</span>
          <RiskLevelTag level={record.controlLevel} />
        </span>
      </div>
    );

    const objectMeasures = (record: RiskObjectVO): ControlMeasureVO[] => objectMeasureMap.value[record.id] ?? [];

    const measureStatusMeta = (status: ControlMeasureVO["execStatus"]): { label: string; className: string } => {
      if (status === "DONE") return { label: "已执行", className: styles.measureChipDone };
      if (status === "OVERDUE") return { label: "已逾期", className: styles.measureChipOverdue };
      if (status === "EXECUTING") return { label: "执行中", className: styles.measureChipDoing };
      return { label: "待执行", className: styles.measureChipPending };
    };

    const measureSummary = (record: RiskObjectVO): JSX.Element => {
      const items = objectMeasures(record);
      if (items.length === 0) {
        return (
          <div class={styles.measureSummary}>
            <p class={styles.measureSummaryTitle}>暂未配置措施</p>
            <p class={styles.measureSummaryEmpty}>尚未配置管控措施，请点击“配置措施”开始配置</p>
          </div>
        );
      }
      return (
        <div class={styles.measureSummary}>
          <p class={styles.measureSummaryTitle}>已配置措施（{items.length}条）</p>
          <div class={styles.measureTags}>
            {items.slice(0, 4).map((measure) => {
              const meta = measureStatusMeta(measure.execStatus);
              const measureText = `【${measure.controlType || "--"}】${measure.content || "--"}`;
              return (
                <span key={measure.id} class={[styles.measureChip, meta.className].join(" ")} title={`${meta.label} ${measureText}`}>
                  <span class={styles.measureStatus}>{meta.label}</span>
                  <span class={styles.measureText}>{measureText}</span>
                </span>
              );
            })}
            {items.length > 4 && <span class={styles.measureMore}>{`+${items.length - 4}`}</span>}
          </div>
        </div>
      );
    };

    const renderMeasureAction = (object: RiskObjectVO): JSX.Element => {
      const disabled = !canConfigureObjectMeasures(object);
      const reason = measureConfigDisabledReason(object);
      const button = (
        <Button
          class={styles.objectAction}
          type="primary"
          size="small"
          disabled={disabled}
          onClick={() => {
            void openMeasureModal(object);
          }}
        >
          {objectMeasures(object).length > 0 ? "编辑措施" : "配置措施"}
        </Button>
      );
      if (!disabled || !reason) return button;
      return (
        <Tooltip title={reason}>
          <span class={styles.objectActionWrap}>{button}</span>
        </Tooltip>
      );
    };

    const overview = (): JSX.Element => (
      <div class="risk-stack risk-table-page">
        <PcForm />
        <PcTable />
      </div>
    );

    const detail = (): JSX.Element => {
      if (!detailLoaded.value || loading.value) {
        return <Card loading />;
      }
      return unit.value ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <Descriptions column={3} size="small">
              <DescriptionsItem label="单元名称">{unit.value.name}</DescriptionsItem>
              <DescriptionsItem label="所属区域">{unit.value.zoneName}</DescriptionsItem>
              <DescriptionsItem label="单元类型">{unit.value.unitType}</DescriptionsItem>
              <DescriptionsItem label="风险对象">{objects.value.length}</DescriptionsItem>
            </Descriptions>
          </div>
          {objects.value.length > 0 ? (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {objects.value.map((object) => (
                <Card key={object.id} class={styles.objectCard}>
                  <div class={styles.objectHeader}>
                    <div class={styles.objectMain}>
                      <div class={styles.objectTitleLine}>
                        <strong class={styles.objectName}>{object.name}</strong>
                        {objectRiskTags(object)}
                      </div>
                      <div class={styles.objectMeta}>
                        <span>危险源：{object.hazardDesc || "--"}</span>
                        <span class={styles.metaSeparator}>·</span>
                        <span>责任人员：{object.responsibleUser || "--"}</span>
                      </div>
                    </div>
                    {renderMeasureAction(object)}
                  </div>
                  {measureSummary(object)}
                </Card>
              ))}
            </Space>
          ) : (
            <Card size="small">
              <p>当前单元没有风险对象</p>
            </Card>
          )}
          <Modal
            wrapClassName="risk-modal"
            bodyStyle={RISK_MODAL_BODY_STYLE}
            title={`配置管控措施 - ${activeObject.value?.name ?? ""}`}
            open={measureModalVisible.value}
            width={780}
            confirmLoading={modalSubmitting.value}
            okText="保存措施"
            cancelText="取消"
            onOk={() => {
              void submit();
            }}
            onCancel={() => {
              measureModalVisible.value = false;
              activeObject.value = null;
              objectId.value = "";
            }}
          >
            {activeObject.value && (
              <>
                <div style={{ background: "#f5f7fa", padding: 12, marginBottom: 16, borderRadius: 4, lineHeight: "24px" }}>
                  <div>
                    <strong>风险对象：</strong>
                    {activeObject.value.name}
                  </div>
                  <div>
                    <strong>危险源：</strong>
                    {activeObject.value.hazardDesc || "--"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <strong>风险等级：</strong>
                    {objectRiskTags(activeObject.value)}
                  </div>
                </div>
                <MeasureCardList
                  modelValue={measures.value}
                  showAiGenerate
                  aiGenerateLoading={aiMeasureGenerating.value}
                  onUpdate:modelValue={(v: MeasureFormItem[]) => {
                    measures.value = v;
                  }}
                  onAiGenerate={() => {
                    void generateAiMeasures();
                  }}
                />
              </>
            )}
          </Modal>
        </>
      ) : (
        <Card>
          <p>未找到风险单元</p>
        </Card>
      );
    };

    const detailFooter = (): JSX.Element => (
      <div class={formStyles.footerActions}>
        <Button
          onClick={() => {
            void backToOverview();
          }}
        >
          返回列表
        </Button>
      </div>
    );

    return (): JSX.Element => (
      <PcLayout
        title={layoutTitle}
        v-slots={{
          "layout-content": () => (detailMode.value ? detail() : overview()),
          "footer-page": () =>
            detailMode.value ? (
              detailFooter()
            ) : (
              <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />
            ),
        }}
      />
    );
  },
});
