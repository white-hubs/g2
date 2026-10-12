import { defineComponent, reactive, ref } from "vue";

import { createMeasureExecutionRecord, pageMeasureExecutions } from "@/api/server";
import { uploadRiskControlFile } from "@/api/upload-risk-file";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import {
  FILE_SCENE_CODE,
  LIST_ACTION_LINK_PROPS,
  MAX_MEASURE_EXECUTION_ATTACHMENTS,
  TABLE_PAGE_SIZE,
  RISK_MODAL_BODY_STYLE,
} from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Modal,
  Page,
  PageLayout as PcLayout,
  Tag,
  Textarea,
  Upload,
  message,
  usePcForm,
  usePcTable,
  type ColumnType,
  type UploadChangeParam,
  type UploadFile,
  type UploadRequestOption,
} from "@/pc-ui-runtime";
import type { ControlMeasureVO, RiskLevel } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { mapMeasureFromApi, mapRiskLevelFromApi, type RiskControlMeasureApiVO } from "@/utils/risk-control-mapper";

const LEVEL_ORDER: Record<RiskLevel, number> = {
  MAJOR: 4,
  SIGNIFICANT: 3,
  GENERAL: 2,
  LOW: 1,
};

const EXEC_STATUS = {
  PENDING: { label: "待执行", color: "default" },
  EXECUTING: { label: "执行中", color: "processing" },
  DONE: { label: "已执行", color: "success" },
  OVERDUE: { label: "超期", color: "error" },
} as const;

const DEFAULT_EXECUTION_RESULT = "COMPLETED";

interface PendingMeasureRow extends ControlMeasureVO {
  unitName: string;
  objectName: string;
  inherentRiskLevel?: RiskLevel;
  controlRiskLevel?: RiskLevel;
  levelOrder: number;
}

export const MeasureExecutionPage = defineComponent({
  name: "MeasureExecutionPage",
  setup() {
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
    });
    const executeVisible = ref(false);
    const activeMeasure = ref<PendingMeasureRow | null>(null);
    const execRemark = ref("");
    const fileList = ref<UploadFile[]>([]);
    const fileIds = ref<string[]>([]);
    const submitting = ref(false);

    const stringValue = (value: unknown): string => {
      if (typeof value === "string" || typeof value === "number") return String(value).trim();
      return "";
    };

    const buildRows = (items: ControlMeasureVO[], rawRecords: RiskControlMeasureApiVO[]): PendingMeasureRow[] =>
      items
        .map((measure, idx) => {
          const raw = rawRecords[idx] ?? {};
          const inherentRiskLevel = mapRiskLevelFromApi(raw.inherentRiskLevel);
          const controlRiskLevel = mapRiskLevelFromApi(raw.controlRiskLevel ?? raw.riskLevel);
          const sortLevel = controlRiskLevel ?? inherentRiskLevel;
          return {
            ...measure,
            unitName: stringValue(raw.unitName) || stringValue(raw.unit?.name) || "未关联风险单元",
            objectName: stringValue(raw.objectName) || stringValue(raw.name) || measure.objectId || "--",
            deadline: measure.deadline || stringValue(raw.deadline),
            inherentRiskLevel,
            controlRiskLevel,
            levelOrder: sortLevel ? LEVEL_ORDER[sortLevel] : 0,
          };
        })
        .filter((measure) => measure.execStatus === "PENDING" || measure.execStatus === "EXECUTING" || measure.execStatus === "OVERDUE")
        .sort((a, b) => b.levelOrder - a.levelOrder);

    const resetExecuteForm = (): void => {
      execRemark.value = "";
      fileList.value = [];
      fileIds.value = [];
    };

    const openExecute = (record: PendingMeasureRow): void => {
      activeMeasure.value = record;
      resetExecuteForm();
      executeVisible.value = true;
    };

    const customRequest = async (options: UploadRequestOption): Promise<void> => {
      const { file, onSuccess, onError } = options;
      const blob = file as File;
      if (fileIds.value.length >= MAX_MEASURE_EXECUTION_ATTACHMENTS) {
        message.warning(`最多上传 ${MAX_MEASURE_EXECUTION_ATTACHMENTS} 个附件`);
        onError?.(new Error("attachment limit exceeded"));
        return;
      }
      try {
        const result = await useAuthRequest(() => uploadRiskControlFile(blob, FILE_SCENE_CODE.MEASURE_EXECUTION_ATTACHMENT));
        const id = stringValue(result.id);
        if (id) fileIds.value = [...fileIds.value, id];
        onSuccess?.({ url: result.path, fileId: id });
        message.success(`附件 ${blob.name ?? ""} 上传成功`);
      } catch (e) {
        showApiError(e);
        onError?.(e as Error);
      }
    };

    const onUploadChange = (info: UploadChangeParam): void => {
      fileList.value = info.fileList;
      const nextFileIds = info.fileList
        .map((file) => stringValue((file.response as { fileId?: string | number } | undefined)?.fileId))
        .filter(Boolean);
      if (nextFileIds.length > 0 || info.fileList.length === 0) fileIds.value = nextFileIds;
    };

    const confirmExecute = async (): Promise<void> => {
      if (!activeMeasure.value) return;
      if (!execRemark.value.trim()) {
        message.warning("请填写执行情况说明");
        return;
      }
      submitting.value = true;
      try {
        await useAuthRequest(() =>
          createMeasureExecutionRecord(activeMeasure.value!.id, {
            executionDesc: execRemark.value.trim(),
            executionResult: DEFAULT_EXECUTION_RESULT,
            executorUserId: activeMeasure.value!.executorId || undefined,
            fileIds: fileIds.value,
          }),
        );
        message.success("执行反馈已提交");
        executeVisible.value = false;
        activeMeasure.value = null;
        tableApi.query();
      } catch (e) {
        showApiError(e);
      } finally {
        submitting.value = false;
      }
    };

    const fieldLabel = (text: string, required = false): JSX.Element => (
      <div style={{ marginBottom: 8, color: "rgba(0,0,0,0.85)", lineHeight: "22px", whiteSpace: "nowrap" }}>
        {required && <span style={{ marginRight: 4, color: "#ff4d4f" }}>*</span>}
        {text}
      </div>
    );

    const columns: ColumnType[] = [
      { title: "风险单元", dataIndex: "unitName", width: 160, ellipsis: true },
      { title: "风险对象", dataIndex: "objectName", width: 150, ellipsis: true },
      {
        title: "固有风险",
        dataIndex: "inherentRiskLevel",
        width: 110,
        customRender: ({ text }: { text: RiskLevel | undefined }) => <RiskLevelTag level={text} />,
      },
      {
        title: "控制评估风险",
        dataIndex: "controlRiskLevel",
        width: 120,
        customRender: ({ text }: { text: RiskLevel | undefined }) => <RiskLevelTag level={text} />,
      },
      { title: "管控类型", dataIndex: "controlType", width: 100, customRender: ({ text }: { text?: string }) => text || "--" },
      { title: "措施内容", dataIndex: "content", width: 260, ellipsis: true, customRender: ({ text }: { text?: string }) => text || "--" },
      { title: "管控层级", dataIndex: "controlLevel", width: 90, customRender: ({ text }: { text?: string }) => text || "--" },
      { title: "执行人", dataIndex: "executor", width: 90, ellipsis: true, customRender: ({ text }: { text?: string }) => text || "--" },
      {
        title: "状态",
        dataIndex: "execStatus",
        width: 90,
        customRender: ({ text }: { text: ControlMeasureVO["execStatus"] }) => {
          const s = EXEC_STATUS[text] ?? EXEC_STATUS.PENDING;
          return <Tag color={s.color}>{s.label}</Tag>;
        },
      },
      {
        title: "操作",
        fixed: "right",
        dataIndex: "action",
        width: 80,
        customRender: ({ record }: { record: PendingMeasureRow }) => (
          <Button {...LIST_ACTION_LINK_PROPS} onClick={() => openExecute(record)}>
            执行
          </Button>
        ),
      },
    ];

    const fetchMeasurePage = async () => {
      const result = await useAuthRequest(() =>
        pageMeasureExecutions({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          status: "PENDING,EXECUTING,OVERDUE",
        }),
      );
      const rawRecords = result?.records ?? [];
      const records = buildRows(rawRecords.map(mapMeasureFromApi), rawRecords);
      return {
        total: result?.total ?? records.length,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_MEASURE_EXECUTION",
      rowKey: "id",
      fetchApi: fetchMeasurePage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          componentProps: { placeholder: "单元/对象/措施/执行人", allowClear: true, maxlength: 100 },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const slots = {
      "layout-header": () => <span style={{ color: "#666" }}>按控制评估风险等级从高到低排序，共 {page.total} 条待执行措施</span>,
      "layout-content": () => (
        <div class="risk-stack risk-table-page">
          <PcForm />
          <PcTable />
          <Modal
            wrapClassName="risk-modal"
            bodyStyle={RISK_MODAL_BODY_STYLE}
            title="措施执行"
            open={executeVisible.value}
            width={720}
            confirmLoading={submitting.value}
            okText="提交执行反馈"
            cancelText="取消"
            onOk={() => {
              void confirmExecute();
            }}
            onCancel={() => {
              executeVisible.value = false;
              activeMeasure.value = null;
            }}
          >
            {activeMeasure.value && (
              <>
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Descriptions column={2} size="small">
                    <DescriptionsItem label="风险单元">{activeMeasure.value.unitName}</DescriptionsItem>
                    <DescriptionsItem label="风险对象">{activeMeasure.value.objectName}</DescriptionsItem>
                    <DescriptionsItem label="固有风险">
                      <RiskLevelTag level={activeMeasure.value.inherentRiskLevel} />
                    </DescriptionsItem>
                    <DescriptionsItem label="控制评估风险">
                      <RiskLevelTag level={activeMeasure.value.controlRiskLevel} />
                    </DescriptionsItem>
                    <DescriptionsItem label="管控类型">{activeMeasure.value.controlType || "--"}</DescriptionsItem>
                    <DescriptionsItem label="管控层级">{activeMeasure.value.controlLevel || "--"}</DescriptionsItem>
                    <DescriptionsItem label="执行人">{activeMeasure.value.executor || "--"}</DescriptionsItem>
                  </Descriptions>
                  <div style={{ marginTop: 12, color: "rgba(0,0,0,0.88)", lineHeight: "22px" }}>
                    <strong>措施内容：</strong>
                    {activeMeasure.value.content || "--"}
                  </div>
                </Card>
                <Form layout="vertical">
                  <FormItem>
                    {fieldLabel("执行情况说明", true)}
                    <Textarea v-model:value={execRemark.value} rows={3} maxlength={500} placeholder="填写执行情况说明" />
                  </FormItem>
                  <FormItem>
                    {fieldLabel(`执行附件（最多 ${MAX_MEASURE_EXECUTION_ATTACHMENTS} 个）`)}
                    <Upload
                      customRequest={customRequest}
                      fileList={fileList.value}
                      maxCount={MAX_MEASURE_EXECUTION_ATTACHMENTS}
                      onChange={onUploadChange}
                    >
                      <Button disabled={fileIds.value.length >= MAX_MEASURE_EXECUTION_ATTACHMENTS}>上传附件</Button>
                    </Upload>
                  </FormItem>
                </Form>
              </>
            )}
          </Modal>
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("措施执行")} v-slots={slots} />;
  },
});
