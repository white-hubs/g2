import type { HazardApprovalTemplateCommand, HazardApprovalTemplateNodeVO, HazardApprovalTemplateVO } from "@g2-contract/hazard-governance";
import { defineComponent, reactive, shallowRef, type VNode } from "vue";

import { HazardUserSelect as RoleUserSelect } from "../../../shared/user-select";
import { useAuthRequest } from "@/api/request";
import { createHazardApprovalTemplate, updateHazardApprovalTemplate } from "@/api/server";
import { usePcModal } from "@/pc-ui-runtime";
import { Button, DeleteOutlined, HolderOutlined, Input, PlusOutlined, message } from "@/pc-ui-runtime";

type ModalMode = "create" | "update";

export interface TemplateFormModalOpenOptions {
  mode: ModalMode;
  template?: HazardApprovalTemplateVO;
}

interface RoleUserValue {
  roleId?: string;
  userId?: string | string[];
  roleName?: string;
  userName?: string | string[];
}

interface EditableApprovalTemplateNode {
  key: string;
  roleId: string;
  personId: string;
  roleName?: string | undefined;
  personName?: string | undefined;
}

interface ApproverValue {
  roleId?: string | undefined;
  personId?: string | undefined;
  roleName?: string | undefined;
  personName?: string | undefined;
}

const createNodeKey = (): string => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const createEmptyNode = (): EditableApprovalTemplateNode => ({ key: createNodeKey(), roleId: "", personId: "" });

const parseApproverValue = (value: string): ApproverValue => {
  try {
    const parsed = JSON.parse(value) as Partial<ApproverValue>;
    return {
      roleId: parsed.roleId ? String(parsed.roleId) : undefined,
      personId: parsed.personId ? String(parsed.personId) : undefined,
      roleName: parsed.roleName,
      personName: parsed.personName,
    };
  } catch {
    return { personId: value };
  }
};

const cloneNodes = (nodes: HazardApprovalTemplateNodeVO[]): EditableApprovalTemplateNode[] => {
  const next = nodes
    .toSorted((prev, nextNode) => prev.sequenceNo - nextNode.sequenceNo)
    .map((node) => {
      const approver = node.approverValue ? parseApproverValue(node.approverValue) : undefined;
      const roleId = node.approverType === "ROLE" ? (node.approverTypeValue ?? "") : (approver?.roleId ?? "");
      const roleApproverId = node.approverId ?? "";
      return {
        key: createNodeKey(),
        roleId,
        personId:
          node.approverType === "ROLE" ? (roleApproverId === roleId ? "" : roleApproverId) : (node.approverId ?? approver?.personId ?? ""),
        roleName: approver?.roleName,
        personName: approver?.personName ?? node.nodeName,
      };
    });
  return next.length > 0 ? next : [createEmptyNode()];
};

const toTemplateCommand = (name: string, nodes: EditableApprovalTemplateNode[]): HazardApprovalTemplateCommand => ({
  name,
  nodes: nodes.map((node, index) => {
    return {
      nodeName: node.personName || node.roleName || `第${index + 1}组`,
      sequenceNo: index + 1,
      approverId: node.personId,
      approverType: "ROLE",
      approverTypeValue: node.roleId,
    };
  }),
});

export const TemplateFormModal = defineComponent({
  name: "TemplateFormModal",
  emits: ["saved"],
  setup: (_, { expose, emit }) => {
    const formState = reactive<{
      mode: ModalMode;
      id: string;
      name: string;
      nodes: EditableApprovalTemplateNode[];
    }>({
      mode: "create",
      id: "",
      name: "",
      nodes: [createEmptyNode()],
    });
    const draggingIndex = shallowRef<number | undefined>();

    const resetForm = (options: TemplateFormModalOpenOptions): void => {
      formState.mode = options.mode;
      formState.id = options.template?.id ?? "";
      formState.name = options.template?.name ?? "";
      formState.nodes = options.template ? cloneNodes(options.template.nodes) : [createEmptyNode()];
      modalApi.setState({ title: options.mode === "create" ? "新增审批链模板" : "编辑审批链模板" });
    };

    const openModal = (options: TemplateFormModalOpenOptions): void => {
      resetForm(options);
      modalApi.open();
    };

    const addNode = (): void => {
      formState.nodes.push(createEmptyNode());
    };

    const removeNode = (index: number): void => {
      if (formState.nodes.length <= 1) {
        message.warning("审批链路至少保留一个审批节点");
        return;
      }
      formState.nodes.splice(index, 1);
    };

    const moveNode = (fromIndex: number, toIndex: number): void => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
        return;
      }
      const [node] = formState.nodes.splice(fromIndex, 1);
      formState.nodes.splice(toIndex, 0, node);
    };

    const handleDragStart = (index: number, event: DragEvent): void => {
      draggingIndex.value = index;
      event.dataTransfer?.setData("text/plain", String(index));
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    };

    const handleDrop = (index: number, event: DragEvent): void => {
      event.preventDefault();
      const fromIndex = draggingIndex.value ?? Number(event.dataTransfer?.getData("text/plain"));
      if (Number.isFinite(fromIndex)) {
        moveNode(fromIndex, index);
      }
      draggingIndex.value = undefined;
    };

    const validate = (): boolean => {
      if (!formState.name.trim()) {
        message.warning("请填写审批链模板名称");
        return false;
      }
      if (formState.nodes.length === 0) {
        message.warning("请至少添加一个审批节点");
        return false;
      }
      const emptyRoleIndex = formState.nodes.findIndex((node) => !node.roleId);
      if (emptyRoleIndex >= 0) {
        message.warning(`请选择第 ${emptyRoleIndex + 1} 组审批角色`);
        return false;
      }
      const emptyPersonIndex = formState.nodes.findIndex((node) => !node.personId);
      if (emptyPersonIndex >= 0) {
        message.warning(`请选择第 ${emptyPersonIndex + 1} 组审批人`);
        return false;
      }
      return true;
    };

    const save = async (): Promise<void> => {
      if (!validate()) {
        return;
      }
      modalApi.setConfirmLoading(true);
      try {
        const payload = toTemplateCommand(formState.name.trim(), formState.nodes);
        if (formState.mode === "update" && formState.id) {
          await useAuthRequest(() => updateHazardApprovalTemplate(formState.id, payload));
        } else {
          await useAuthRequest(() => createHazardApprovalTemplate(payload));
        }
        emit("saved");
        modalApi.close();
        message.success("审批链模板已保存");
      } catch {
        message.error("审批链模板保存失败");
      } finally {
        modalApi.setConfirmLoading(false);
      }
    };

    const [PcModal, modalApi] = usePcModal({
      title: "新增审批链模板",
      width: "720px",
      onConfirm: () => {
        void save();
      },
      onCancel: () => modalApi.close(),
    });

    expose({ openModal });

    const slots = {
      default: (): VNode => (
        <div class="hazard-template-form-modal">
          <div class="hazard-template-form-field">
            <span>模板名称</span>
            <Input v-model:value={formState.name} placeholder="请输入模板名称" maxlength={40} />
          </div>
          <div class="hazard-template-form-preview">
            <span>链路关系</span>
            <div class="hazard-template-form-chain">
              {formState.nodes.map((node, index) => (
                <>
                  {index > 0 ? <span class="hazard-template-chain-arrow">→</span> : null}
                  <strong>{node.personName || node.roleName || `第${index + 1}组`}</strong>
                </>
              ))}
              <span class="hazard-template-chain-arrow">→</span>
              <em>结束</em>
            </div>
          </div>
          <div class="hazard-template-form-toolbar">
            <span>审批节点</span>
            <Button type="link" size="small" onClick={addNode}>
              <PlusOutlined />
              添加一组
            </Button>
          </div>
          <div class="hazard-template-form-nodes">
            {formState.nodes.map((node, index) => (
              <div
                class="hazard-template-form-node"
                key={node.key}
                draggable
                onDragstart={(event: DragEvent) => handleDragStart(index, event)}
                onDragover={(event: DragEvent) => event.preventDefault()}
                onDrop={(event: DragEvent) => handleDrop(index, event)}
              >
                <span class="hazard-template-form-drag" title="拖动排序">
                  <HolderOutlined />
                  {index + 1}
                </span>
                <RoleUserSelect
                  roleId={node.roleId}
                  userId={node.personId}
                  onUpdate:value={(value?: RoleUserValue) => {
                    node.roleId = value?.roleId ?? "";
                    node.personId = Array.isArray(value?.userId) ? (value?.userId[0] ?? "") : (value?.userId ?? "");
                    node.roleName = value?.roleName;
                    node.personName = Array.isArray(value?.userName) ? value?.userName[0] : value?.userName;
                  }}
                />
                <span title="移除">
                  <Button class="hazard-icon-action" type="link" size="small" danger onClick={() => removeNode(index)}>
                    <DeleteOutlined />
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    };

    return (): VNode => <PcModal v-slots={slots} />;
  },
});
