import type { OutsourceCompany, OutsourceTicket, OutsourceTicketQuery } from "@g2-client/outsource-repair/client";
import {
  Button,
  Form,
  FormItem,
  Modal,
  Page,
  PageLayout,
  type PcFormSchemaProp,
  type PcTableColumn,
  PopOver,
  RadioGroup,
  Rate,
  Textarea,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, markRaw, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { ImageUpload } from "./image-upload";
import { getOutsourceRepairClient, getOutsourceRepairRuntime } from "@/domain-context";
import { formatDateTime } from "@/utils/date";
import { TICKET_HANDLE_RESULT_TEXT, TICKET_STATUS_TABS, TICKET_STATUS_TEXT } from "@/utils/ticket-enum";

import styles from "./repair-order-list.module.css";

const ellipsisCell = (text: unknown): JSX.Element => (
  <PopOver placement="topLeft" content={text ? String(text) : ""}>
    {text ? String(text) : "--"}
  </PopOver>
);

interface AssessmentDraft {
  outsourceRepairTicketId: string;
  score: number;
  description: string;
  imageIdList: string[];
}

const emptyDraft = (): AssessmentDraft => ({ outsourceRepairTicketId: "", score: 0, description: "", imageIdList: [] });

export const OutsourceRepairOrderList = defineComponent({
  name: "OutsourceRepairOrderList",
  setup() {
    const client = getOutsourceRepairClient();
    const { basePath } = getOutsourceRepairRuntime();
    const router = useRouter();
    const title = "委外工单";
    const query = reactive({
      ticketStatus: "all",
      outsourceCompanyId: undefined as string | undefined,
      dateRange: undefined as string[] | undefined,
      name: "",
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const evaluateOpen = ref(false);
    const draft = reactive<AssessmentDraft>(emptyDraft());
    const saving = ref(false);
    let version = 0;

    const openDetails = (row: OutsourceTicket): void => {
      void router.push({ path: `${basePath}/repair-order-details`, query: { id: String(row.id ?? ""), type: "detail" } });
    };

    /** 旧 g-table `defaultDate: "period"`：起始补 00:00:00、结束补 23:59:59。 */
    const periodParam = (): string | undefined => {
      if (query.dateRange?.length !== 2) {
        return undefined;
      }
      return `${query.dateRange[0]} 00:00:00,${query.dateRange[1]} 23:59:59`;
    };

    const makeQuery = (): OutsourceTicketQuery => ({
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
      // 旧页「全部任务」提交空字符串，这里直接不带该参数。
      ...(query.ticketStatus === "all" ? {} : { ticketStatus: query.ticketStatus }),
      ...(query.outsourceCompanyId ? { outsourceCompanyId: query.outsourceCompanyId } : {}),
      ...(query.name ? { name: query.name } : {}),
      ...(periodParam() ? { period: periodParam() } : {}),
    });

    const load = async (): Promise<void> => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await client.pageTickets(makeQuery());
        if (current !== version) {
          return;
        }
        tableApi.setDataSource(result.records);
        page.total = result.total;
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : `${title}加载失败`);
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };

    const companySchema = (options: { label: string; value: string }[]): PcFormSchemaProp => ({
      component: "Select",
      fieldName: "outsourceCompanyId",
      label: "委外公司",
      defaultValue: undefined,
      componentProps: { allowClear: true, placeholder: "请选择委外公司", options },
    });

    const loadCompanies = async (): Promise<void> => {
      try {
        const rows = await client.listCompanies();
        formApi.updateFieldSchema(
          companySchema(rows.map((item: OutsourceCompany) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }))),
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : "委外公司加载失败");
      }
    };

    const openEvaluate = (row: OutsourceTicket): void => {
      Object.assign(draft, emptyDraft());
      draft.outsourceRepairTicketId = String(row.id ?? "");
      evaluateOpen.value = true;
    };

    const submitEvaluate = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      if (!draft.score) {
        message.warning("请填写工单评价");
        return;
      }
      saving.value = true;
      try {
        await client.submitTicketAssessment({
          outsourceRepairTicketId: draft.outsourceRepairTicketId,
          score: draft.score,
          description: draft.description,
          imageIdList: [...draft.imageIdList],
        });
        message.success("操作成功");
        evaluateOpen.value = false;
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "评价提交失败");
      } finally {
        saving.value = false;
      }
    };

    const statusCell = (text: unknown): JSX.Element | string => {
      const status = TICKET_STATUS_TEXT[String(text ?? "")];
      if (!status) {
        return "--";
      }
      return (
        <span class={styles.statusDot}>
          <i class={status.tone === "normal" ? styles.dotNormal : styles.dotAudit} />
          {status.label}
        </span>
      );
    };

    const columns: PcTableColumn[] = [
      { title: "工单编号", dataIndex: "code", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "维修对象", dataIndex: "deviceObjectName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "委外公司", dataIndex: "outsourceCompanyName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "委外模式", dataIndex: "outsourceModelName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      {
        title: "工单时间",
        dataIndex: "createTime",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(formatDateTime(text as string | number | undefined)),
      },
      { title: "状态", dataIndex: "ticketStatus", ellipsis: true, customRender: ({ text }) => statusCell(text) },
      {
        title: "处理结果",
        dataIndex: "handleResult",
        ellipsis: true,
        customRender: ({ text }) => TICKET_HANDLE_RESULT_TEXT[String(text ?? "")] ?? "--",
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 160,
        fixed: "right",
        customRender: ({ record }) => {
          const row = record as OutsourceTicket;
          return (
            <>
              <Button type="link" onClick={() => openDetails(row)}>
                详情
              </Button>
              <Button type="link" disabled={!row.isCanAssessmented} onClick={() => openEvaluate(row)}>
                评价
              </Button>
            </>
          );
        },
      },
    ];

    const [PcTable, tableApi] = usePcTable({ columns, tableCode: "OUTSOURCE_REPAIR_ORDER", rowKey: "id", autoFetch: false });

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      cache: true,
      cacheFields: ["ticketStatus", "outsourceCompanyId", "dateRange", "name"],
      syncStateRef: query,
      schema: [
        {
          component: markRaw(RadioGroup),
          fieldName: "ticketStatus",
          label: "",
          defaultValue: "all",
          componentProps: { buttonStyle: "solid", optionType: "button", options: TICKET_STATUS_TABS },
        },
        companySchema([]),
        {
          component: "RangePicker",
          fieldName: "dateRange",
          label: "工单时间",
          defaultValue: undefined,
          componentProps: { valueFormat: "YYYY-MM-DD" },
        },
        {
          component: "Input",
          fieldName: "name",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "名称" },
        },
      ],
      handleValuesChange(_values, _changed, meta) {
        if (meta?.fieldName !== "ticketStatus") {
          return;
        }
        query.ticketStatus = String(formApi.formValues.ticketStatus ?? "all");
        page.pageNumber = 1;
        void load();
      },
      handleSubmit(values) {
        query.ticketStatus = String(values.ticketStatus ?? "all");
        query.outsourceCompanyId = typeof values.outsourceCompanyId === "string" ? values.outsourceCompanyId : undefined;
        query.dateRange = Array.isArray(values.dateRange) ? values.dateRange.map(String) : undefined;
        query.name = String(values.name ?? "").trim();
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.ticketStatus = "all";
        query.outsourceCompanyId = undefined;
        query.dateRange = undefined;
        query.name = "";
        page.pageNumber = 1;
        void load();
      },
    });

    void load();
    void loadCompanies();

    const slots = {
      "layout-content": () => (
        <>
          <div class={styles.filterForm}>
            <PcForm />
          </div>
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          cachePageQuery={true}
          onPageChange={(pageNumber: number, pageSize: number) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            void load();
          }}
        />
      ),
    };

    return () => (
      <>
        <PageLayout title={title} v-slots={slots} />
        <Modal
          open={evaluateOpen.value}
          title="评价委外维修"
          centered
          okText="确定"
          cancelText="取消"
          confirmLoading={saving.value}
          onOk={() => void submitEvaluate()}
          onCancel={() => {
            evaluateOpen.value = false;
          }}
        >
          <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
            <FormItem label="工单评价" required>
              <Rate
                value={draft.score}
                onUpdate:value={(value: unknown) => {
                  draft.score = Number(value ?? 0);
                }}
              />
            </FormItem>
            <FormItem label="评价描述">
              <Textarea
                value={draft.description}
                maxlength={200}
                placeholder="评价描述"
                autoSize={{ minRows: 2, maxRows: 8 }}
                onUpdate:value={(value: unknown) => {
                  draft.description = String(value ?? "");
                }}
              />
            </FormItem>
            <FormItem label="评价图片">
              <ImageUpload
                value={draft.imageIdList}
                onUpdate:value={(ids: string[]) => {
                  draft.imageIdList = ids;
                }}
              />
            </FormItem>
          </Form>
        </Modal>
      </>
    );
  },
});
