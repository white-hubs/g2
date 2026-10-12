import type { CommitteeModifyParam } from "@g2-contract/safety-personnel";
import { Button, Drawer, Empty, Form, FormItem, Input, Spin, Table, Textarea, TreeSelect, message } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { computed, defineComponent, onMounted, reactive, ref } from "vue";

import { committeeAttachmentsToOssFiles } from "../../api/file-service";
import { getOrganizationTree } from "../../api/ouaa";
import { createCommittee, getCommittee, updateCommittee } from "../../api/safety-personnel";
import { FileUpload, type OSSFile } from "../../components/file-upload";
import { PersonPickerModal } from "../../components/person-picker-modal/person-picker-modal";
import { COMMITTEE_ATTACHMENT_TYPES, FILE_BUCKET, FILE_SCENE_CODE } from "../../constants";
import { useAuthRequest } from "../../hooks/use-auth-request";
import type { PoolPersonUI } from "../../types/ui";
import { showApiError } from "../../utils/api-error";
import { withPreviewPaths } from "../../utils/file-url";
import { type OrganizationTreeNode, mapOrganizationsToTreeData } from "../../utils/organization-tree";

import styles from "./committee-form-drawer.module.css";

export const CommitteeFormDrawer = defineComponent({
  emits: ["saved"],
  setup(_, { expose, emit }) {
    const open = ref(false);
    const loading = ref(false);
    const mode = ref<"create" | "edit">("create");
    const committeeId = ref<string | null>(null);
    const saving = ref(false);
    const memberPickerOpen = ref(false);
    const deptTree = ref<OrganizationTreeNode[]>([]);
    const form = reactive({
      committeeName: "",
      deptId: undefined as string | undefined,
      contactPhone: "",
      intro: "",
      attachmentFiles: [] as OSSFile[],
    });
    const members = ref<{ userId: string; name: string; phone: string; dept: string; post: string }[]>([]);

    const drawerTitle = computed(() => (mode.value === "create" ? "新增安委会" : "编辑安委会"));

    const memberPickerInitialSelected = computed((): PoolPersonUI[] =>
      members.value.map((m) => ({
        personId: m.userId,
        name: m.name,
        dept: m.dept,
        post: m.post,
        phone: m.phone,
      })),
    );

    const loadDeptTree = async (): Promise<void> => {
      try {
        const orgs = await useAuthRequest(() => getOrganizationTree({ enabled: true }));
        deptTree.value = mapOrganizationsToTreeData(orgs);
      } catch {
        deptTree.value = [];
      }
    };

    onMounted(() => {
      void loadDeptTree();
    });

    const resetForm = (): void => {
      form.committeeName = "";
      form.deptId = undefined;
      form.contactPhone = "";
      form.intro = "";
      members.value = [];
      form.attachmentFiles = [];
    };

    const fillFromDetail = async (id: string): Promise<void> => {
      const detail = await useAuthRequest(() => getCommittee(id));
      form.committeeName = detail.committeeName ?? "";
      form.deptId = detail.deptId != null ? String(detail.deptId) : undefined;
      form.contactPhone = detail.contactPhone ?? "";
      form.intro = detail.introduction ?? "";
      members.value = (detail.members ?? []).map((m) => ({
        userId: String(m.userId ?? ""),
        name: m.userName ?? "",
        phone: m.phone ?? "",
        dept: m.deptName ?? "",
        post: m.postName ?? "",
      }));
      form.attachmentFiles = await committeeAttachmentsToOssFiles(detail.attachments ?? []);
    };

    const show = async (m: "create" | "edit", id?: string): Promise<void> => {
      mode.value = m;
      committeeId.value = id ?? null;
      resetForm();
      open.value = true;
      if (deptTree.value.length === 0) {
        await loadDeptTree();
      }
      if (m === "edit" && id != null) {
        loading.value = true;
        try {
          await fillFromDetail(id);
        } catch (e) {
          showApiError(e);
          open.value = false;
        } finally {
          loading.value = false;
        }
      }
    };

    expose({
      openCreate: () => {
        void show("create");
      },
      openEdit: (id: string) => {
        void show("edit", id);
      },
    });

    const memberColumns = [
      { title: "姓名", dataIndex: "name", width: 96, ellipsis: true },
      { title: "手机号", dataIndex: "phone", width: 124 },
      { title: "部门", dataIndex: "dept", width: 120, ellipsis: true },
      { title: "岗位", dataIndex: "post", width: 100, ellipsis: true },
      {
        title: "操作",
        width: 80,
        fixed: "right" as const,
        customRender: ({ index }: { index: number }) => (
          <Button
            type="link"
            size="small"
            danger
            onClick={() => {
              members.value.splice(index, 1);
            }}
          >
            移除
          </Button>
        ),
      },
    ];

    const canSave = computed(() => Boolean(form.committeeName.trim() && form.deptId != null && members.value.length > 0));

    const buildPayload = (): CommitteeModifyParam => ({
      committeeName: form.committeeName.trim(),
      deptId: form.deptId!,
      contactPhone: form.contactPhone.trim() || undefined,
      introduction: form.intro.trim() || undefined,
      userIds: members.value.map((m) => m.userId),
      fileIds: form.attachmentFiles.map((f) => String(f.id)).filter((id) => id.length > 0),
    });

    const onSave = async (): Promise<void> => {
      if (!canSave.value) {
        return;
      }
      saving.value = true;
      try {
        const payload = buildPayload();
        if (mode.value === "create") {
          await useAuthRequest(() => createCommittee(payload));
          message.success("新增成功");
        } else if (committeeId.value != null) {
          await useAuthRequest(() => updateCommittee(committeeId.value!, payload));
          message.success("保存成功");
        }
        open.value = false;
        emit("saved");
      } catch (e) {
        showApiError(e, "保存失败");
      } finally {
        saving.value = false;
      }
    };

    const onPickMembers = (rows: PoolPersonUI[]): void => {
      members.value = rows.map((r) => ({
        userId: r.personId,
        name: r.name,
        phone: r.phone,
        dept: r.dept,
        post: r.post,
      }));
    };

    return () => (
      <>
        <Drawer
          open={open.value}
          title={drawerTitle.value}
          width={640}
          onClose={() => {
            open.value = false;
          }}
          v-slots={{
            footer: () =>
              !loading.value && (
                <div class={styles.drawerFooter}>
                  <Button
                    class={styles.cancelBtn}
                    onClick={() => {
                      open.value = false;
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    disabled={!canSave.value}
                    loading={saving.value}
                    onClick={() => {
                      void onSave();
                    }}
                  >
                    保存
                  </Button>
                </div>
              ),
          }}
        >
          {loading.value ? (
            <Spin />
          ) : (
            <Form layout="vertical">
              <FormItem label="安委会名称" required>
                <Input
                  maxlength={30}
                  showCount={false}
                  value={form.committeeName}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.committeeName = v;
                  }}
                />
              </FormItem>
              <FormItem label="负责单位/部门" required>
                <TreeSelect
                  showSearch
                  treeDefaultExpandAll
                  allowClear
                  placeholder="请选择"
                  style={{ width: "100%" }}
                  treeData={deptTree.value}
                  treeNodeFilterProp="title"
                  value={form.deptId}
                  onUpdate:value={(value) => {
                    const v = typeof value === "string" ? value : undefined;
                    form.deptId = v;
                  }}
                />
              </FormItem>
              <FormItem label="联系电话">
                <Input
                  showCount={false}
                  value={form.contactPhone}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.contactPhone = v;
                  }}
                />
              </FormItem>
              <FormItem label="简介">
                <Textarea
                  maxlength={200}
                  rows={3}
                  value={form.intro}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.intro = v;
                  }}
                />
              </FormItem>
              <FormItem label="附件">
                <FileUpload
                  sceneCode={FILE_SCENE_CODE.COMMITTEE_ATTACHMENT}
                  businessKey={FILE_BUCKET}
                  useTemporaryUpload
                  value={form.attachmentFiles}
                  onUpdate:value={(files: OSSFile[]) => {
                    form.attachmentFiles = withPreviewPaths(files);
                  }}
                  multiple
                  maxCount={10}
                  type="picture-card"
                  showText
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png,.PDF,.DOC,.DOCX,.XLS,.XLSX,.JPG,.PNG"
                  typeList={COMMITTEE_ATTACHMENT_TYPES}
                  size={50}
                  customText="支持 pdf/doc/xlsx/jpg/png 等，单个不超过 50MB"
                />
              </FormItem>
              <FormItem label="安委会成员" required>
                <Button
                  type="dashed"
                  block
                  onClick={() => {
                    memberPickerOpen.value = true;
                  }}
                >
                  + 添加成员
                </Button>
                <Table
                  class={styles.memberTable}
                  rowKey="userId"
                  columns={memberColumns}
                  dataSource={members.value}
                  scroll={{ x: 520 }}
                  tableLayout="fixed"
                  pagination={false}
                  locale={{ emptyText: <Empty description="请至少添加一名成员" /> }}
                />
              </FormItem>
            </Form>
          )}
        </Drawer>
        <PersonPickerModal
          open={memberPickerOpen.value}
          source="org-candidates"
          initialSelected={memberPickerInitialSelected.value}
          onUpdate:open={(v: boolean) => {
            memberPickerOpen.value = v;
          }}
          title="添加安委会成员"
          onConfirm={onPickMembers}
        />
      </>
    );
  },
});
