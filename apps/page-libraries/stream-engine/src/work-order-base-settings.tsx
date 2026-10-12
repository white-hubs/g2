import type { FormFlowGroup, StreamEngineClient, StreamEngineNamedTreeNode } from "@g2-client/stream-engine/client";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  PlusOutlined,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Table,
  Tag,
  message,
} from "@g2-platform/pc-ui";
import { computed, defineComponent, onBeforeUnmount, ref, watch, type PropType } from "vue";

import type { StreamEnginePageProps } from "./contract";
import { UserPickerControl } from "./form-controls";
import ProcessRolePicker, { type ProcessRoleChoice } from "./process-role-picker";
import {
  updateWorkOrderPermissions,
  workOrderChoices,
  type WorkOrderChoice,
  type WorkOrderPermissionType,
  type WorkOrderSettings,
} from "./work-order-model";

function flattenDepartments(rows: StreamEngineNamedTreeNode[]): WorkOrderChoice[] {
  return rows.flatMap((row) => [{ id: row.id, name: row.name }, ...flattenDepartments(row.children ?? [])]);
}

export default defineComponent({
  name: "WorkOrderBaseSettings",
  props: {
    name: { type: String, required: true },
    settings: { type: Object as PropType<WorkOrderSettings>, required: true },
    groups: { type: Array as PropType<FormFlowGroup[]>, default: () => [] },
    client: { type: Object as PropType<StreamEngineClient> },
    getOuaaClient: { type: Function as PropType<StreamEnginePageProps["getOuaaClient"]> },
  },
  emits: ["update:name"],
  setup(props, { emit }) {
    const departmentOpen = ref(false);
    const departmentLoading = ref(false);
    const departments = ref<WorkOrderChoice[]>([]);
    const pickedDepartments = ref<WorkOrderChoice[]>([]);
    const departmentKeyword = ref("");
    const departmentPage = ref(1);
    const departmentPageSize = ref(10);
    let departmentVersion = 0;
    const filteredDepartments = computed(() => departments.value.filter((row) => row.name.includes(departmentKeyword.value.trim())));

    const closeDepartments = (): void => {
      departmentOpen.value = false;
      departmentLoading.value = false;
      departmentVersion++;
    };
    onBeforeUnmount(closeDepartments);
    watch(() => props.settings.permissionType, closeDepartments);

    const openDepartments = async (): Promise<void> => {
      if (departmentOpen.value) return;
      const current = ++departmentVersion;
      pickedDepartments.value = [...props.settings.permissionList];
      departmentKeyword.value = "";
      departmentPage.value = 1;
      departmentOpen.value = true;
      departmentLoading.value = true;
      try {
        if (!props.client) throw new Error("部门服务未就绪");
        const result = await props.client.listProcessDepartments();
        if (current === departmentVersion) departments.value = flattenDepartments(result);
      } catch (error) {
        if (current === departmentVersion) message.error(error instanceof Error ? error.message : "部门加载失败");
      } finally {
        if (current === departmentVersion) departmentLoading.value = false;
      }
    };

    const updatePermissions = (value: WorkOrderChoice[]): void => updateWorkOrderPermissions(props.settings, value);
    const changePermissionType = (value: WorkOrderPermissionType): void => {
      if (value === props.settings.permissionType) return;
      props.settings.permissionType = value;
      updatePermissions([]);
    };

    return () => (
      <>
        <FormItem label="表单名称" required>
          <Input
            value={props.name}
            maxlength={20}
            showCount
            placeholder="请输入表单名称"
            onUpdate:value={(value: string) => emit("update:name", value)}
            onBlur={() => emit("update:name", props.name.trim())}
          />
        </FormItem>
        <FormItem label="表单分组" required>
          <Select
            value={props.settings.formGroupId ?? undefined}
            options={props.groups.map((group) => ({ label: group.name, value: group.id }))}
            placeholder="请选择表单分组"
            style={{ width: "100%" }}
            onUpdate:value={(value) => {
              props.settings.formGroupId = typeof value === "string" || typeof value === "number" ? value : null;
            }}
          />
        </FormItem>
        <FormItem label="表单简称" required>
          <Input
            value={props.settings.shortName}
            maxlength={20}
            showCount
            placeholder="请输入表单简称"
            onUpdate:value={(value: string) => {
              props.settings.shortName = value;
            }}
            onBlur={() => {
              props.settings.shortName = props.settings.shortName.trim();
            }}
          />
        </FormItem>
        <FormItem label="业务类型">
          <Input
            value={props.settings.businessType}
            placeholder="请输入业务类型"
            onUpdate:value={(value: string) => {
              props.settings.businessType = value;
            }}
          />
        </FormItem>
        <FormItem label="启用">
          <Switch
            checked={props.settings.enable}
            onUpdate:checked={(value) => {
              props.settings.enable = Boolean(value);
            }}
          />
        </FormItem>
        <FormItem label="谁可以使用" required>
          <RadioGroup
            value={props.settings.permissionType}
            onUpdate:value={(value) => changePermissionType(value as WorkOrderPermissionType)}
            style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: props.settings.permissionType === "ALL" ? "0" : "12px" }}
          >
            <Radio value="ALL">所有用户</Radio>
            <Radio value="USER">指定用户</Radio>
            <Radio value="ROLE">指定角色</Radio>
            <Radio value="DEPARTMENT">指定部门</Radio>
          </RadioGroup>
          {props.settings.permissionType === "USER" ? (
            <UserPickerControl
              value={props.settings.permissionList.map((item) => ({ id: String(item.id), name: item.name }))}
              client={props.client}
              getOuaaClient={props.getOuaaClient}
              multiple
              onUpdate:value={(value: ProcessRoleChoice[]) => updatePermissions(value)}
            />
          ) : null}
          {props.settings.permissionType === "ROLE" ? (
            <ProcessRolePicker
              value={props.settings.permissionList.map((item) => ({ id: String(item.id), name: item.name }))}
              client={props.client}
              multiple
              onUpdate:value={(value: ProcessRoleChoice[]) => updatePermissions(value)}
            />
          ) : null}
          {props.settings.permissionType === "DEPARTMENT" ? (
            <>
              <Button type="primary" onClick={() => void openDepartments()}>
                <PlusOutlined />
                选择部门
              </Button>
              {props.settings.permissionList.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                  {props.settings.permissionList.map((department) => (
                    <Tag
                      key={department.id}
                      closable
                      onClose={() => updatePermissions(props.settings.permissionList.filter((item) => item.id !== department.id))}
                    >
                      {department.name}
                    </Tag>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </FormItem>
        <Form.ItemRest>
          <Modal
            open={departmentOpen.value}
            title="部门列表"
            width={920}
            okText="确定"
            cancelText="取消"
            onCancel={closeDepartments}
            onOk={() => {
              updatePermissions(pickedDepartments.value);
              closeDepartments();
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
              <Input
                value={departmentKeyword.value}
                placeholder="请输入部门名称"
                style={{ width: "218px", maxWidth: "100%" }}
                onUpdate:value={(value: string) => {
                  departmentKeyword.value = value;
                  departmentPage.value = 1;
                }}
              />
              <Button
                onClick={() => {
                  departmentKeyword.value = "";
                  departmentPage.value = 1;
                }}
              >
                重置
              </Button>
            </div>
            <Table
              rowKey="id"
              dataSource={filteredDepartments.value}
              loading={departmentLoading.value}
              columns={[{ title: "部门名称", dataIndex: "name" }]}
              rowSelection={{
                type: "checkbox",
                preserveSelectedRowKeys: true,
                selectedRowKeys: pickedDepartments.value.map((item) => item.id),
                onChange: (keys: Array<string | number>, picked: WorkOrderChoice[]) => {
                  const choices = workOrderChoices(picked);
                  pickedDepartments.value = keys.flatMap((key) => {
                    const item =
                      choices.find((row) => String(row.id) === String(key)) ??
                      pickedDepartments.value.find((row) => String(row.id) === String(key));
                    return item ? [item] : [];
                  });
                },
              }}
              pagination={{
                current: departmentPage.value,
                pageSize: departmentPageSize.value,
                total: filteredDepartments.value.length,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 30, 40],
                onChange: (page: number, size: number) => {
                  departmentPage.value = page;
                  departmentPageSize.value = size;
                },
              }}
              scroll={{ y: 420 }}
            />
          </Modal>
        </Form.ItemRest>
      </>
    );
  },
});
