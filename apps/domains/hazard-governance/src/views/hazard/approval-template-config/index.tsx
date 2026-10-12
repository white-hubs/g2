import type { HazardApprovalTemplateVO } from "@g2-contract/hazard-governance";
import { defineComponent, reactive, ref } from "vue";

import { useLayoutTitle } from "../shared/page";
import { TemplateFormModal, type TemplateFormModalOpenOptions } from "./components/template-form-modal";
import { useAuthRequest } from "@/api/request";
import { deleteHazardApprovalTemplate, pageHazardApprovalTemplates } from "@/api/server";
import { PageLayout as PcLayout, usePcTable } from "@/pc-ui-runtime";
import { AntModal, Button, DeleteOutlined, EditOutlined, Page, PlusOutlined, Space, Tag, message } from "@/pc-ui-runtime";
import type { ColumnType } from "@/pc-ui-runtime";

import "./index.less";

const pageState = reactive({
  pageNumber: 1,
  pageSize: 10,
  total: 0,
});

const templateNodes = (record?: HazardApprovalTemplateVO): HazardApprovalTemplateVO["nodes"] =>
  Array.isArray(record?.nodes) ? record.nodes : [];

const renderTemplateChain = (record: HazardApprovalTemplateVO): JSX.Element => {
  const nodes = templateNodes(record);
  if (nodes.length === 0) {
    return <span class="hazard-muted">未配置审批节点</span>;
  }
  return (
    <div class="hazard-template-chain">
      {nodes.map((node, index) => (
        <>
          {index > 0 ? <span class="hazard-template-chain-arrow">→</span> : null}
          <span class="hazard-template-chain-node" title={node.approverType}>
            {node.nodeName || "未配置节点"}
          </span>
        </>
      ))}
      <span class="hazard-template-chain-arrow">→</span>
      <span class="hazard-muted">结束</span>
    </div>
  );
};

export const ApprovalTemplateConfig = defineComponent({
  name: "ApprovalTemplateConfig",
  setup: () => {
    const modalRef = ref<{ openModal: (options: TemplateFormModalOpenOptions) => void }>();

    const openCreateModal = (): void => {
      modalRef.value?.openModal({ mode: "create" });
    };

    const openEditModal = (record: HazardApprovalTemplateVO): void => {
      modalRef.value?.openModal({ mode: "update", template: record });
    };

    const removeTemplate = (record: HazardApprovalTemplateVO): void => {
      AntModal.confirm({
        title: "确认删除审批链模板",
        content: `删除「${record.name}」后，后续类型配置将不能继续选择该模板，是否继续？`,
        onOk: async () => {
          try {
            await useAuthRequest(() => deleteHazardApprovalTemplate(record.id));
            tableApi.query();
            message.success("审批链模板已删除");
          } catch {
            message.error("审批链模板删除失败");
          }
        },
      });
    };

    const handleSaved = (): void => {
      pageState.pageNumber = 1;
      tableApi.query();
    };

    const columns: ColumnType[] = [
      { title: "模板名称", dataIndex: "name", width: 220 },
      {
        title: "节点数",
        dataIndex: "nodes",
        width: 100,
        customRender: ({ record }: { record: HazardApprovalTemplateVO }) => `${templateNodes(record).length} 个节点`,
      },
      {
        title: "审批链",
        dataIndex: "approvalChain",
        customRender: ({ record }: { record: HazardApprovalTemplateVO }) => renderTemplateChain(record),
      },
      {
        title: "模板类型",
        dataIndex: "builtIn",
        width: 100,
        customRender: ({ record }: { record: HazardApprovalTemplateVO }) =>
          record.builtIn ? <Tag color="blue">内置</Tag> : <Tag>自定义</Tag>,
      },
      { title: "版本", dataIndex: "version", width: 90, customRender: ({ text }: { text?: number }) => text ?? "-" },
      {
        title: "操作",
        dataIndex: "action",
        width: 130,
        customRender: ({ record }: { record: HazardApprovalTemplateVO }) => (
          <Space size={4}>
            <Button class="hazard-icon-action" type="link" size="small" title="编辑模板" onClick={() => openEditModal(record)}>
              <EditOutlined />
            </Button>
            <Button
              class="hazard-icon-action"
              type="link"
              size="small"
              danger
              title="删除模板"
              disabled={record.builtIn}
              onClick={() => removeTemplate(record)}
            >
              <DeleteOutlined />
            </Button>
          </Space>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "HAZARD_APPROVAL_TEMPLATE_CONFIG",
      rowKey: "id",
      fetchApi: async () =>
        useAuthRequest(() =>
          pageHazardApprovalTemplates({
            pageNumber: pageState.pageNumber,
            pageSize: pageState.pageSize,
          }),
        ),
      fetchLoaded: (data) => {
        pageState.total = data.total;
      },
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      pageState.pageNumber = pageNumber;
      pageState.pageSize = pageSize;
      tableApi.query();
    };

    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={openCreateModal}>
          <PlusOutlined />
          新增审批链模板
        </Button>
      ),
      "layout-content": () => (
        <div class="hazard-approval-template-config">
          <PcTable />
          <TemplateFormModal ref={modalRef} onSaved={handleSaved} />
        </div>
      ),
      "footer-page": () =>
        pageState.total > 0 ? (
          <Page current={pageState.pageNumber} pageSize={pageState.pageSize} total={pageState.total} onPageChange={handlePageChange} />
        ) : null,
    };

    return () => <PcLayout title={useLayoutTitle("审批链模板管理")} v-slots={slots} />;
  },
});
