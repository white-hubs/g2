import type { Organization } from "@g2-contract/ouaa";
import type { DutyRoleAssignmentVO, DutyRoleUserCandidateVO } from "@g2-contract/safety-personnel";
import { markRaw } from "vue";
import { defineComponent, onMounted, reactive, ref, watch } from "vue";
import type { JSX } from "vue/jsx-runtime";

import { getOrganizationTree } from "@/api/organization";
import { useAuthRequest } from "@/api/request";
import { listDutyRoleAssignments, pageDutyRoleUserCandidates, saveDutyRoleAssignments } from "@/api/server";
import { TABLE_PAGE_SIZE } from "@/constants";
import { PageLayout, usePcForm, usePcTable, Button, Empty, Modal, Page, Tag, TreeSelect, message } from "@/pc-ui-runtime";
import { showApiError } from "@/utils";
import { usePageName } from "@/utils/page";

import styles from "./index.module.css";

interface OrganizationTreeNode {
  value: string;
  title: string;
  children?: OrganizationTreeNode[];
}

interface CandidateRow {
  personId: string;
  name: string;
  dept: string;
  post: string;
  phone: string;
}

type LooseCandidate = DutyRoleUserCandidateVO & {
  id?: string | number;
  name?: string;
  phone?: string;
};

const mapOrganizationsToTreeData = (orgs: Organization[]): OrganizationTreeNode[] =>
  orgs
    .filter((org) => org.id != null)
    .map((org) => ({
      value: String(org.id),
      title: org.name ?? "",
      children: org.children?.length ? mapOrganizationsToTreeData(org.children) : undefined,
    }));

const maskPhone = (phone: string): string => {
  const value = phone.trim();
  return value.length === 11 ? `${value.slice(0, 3)}****${value.slice(7)}` : value;
};

const mapCandidateRow = (row: LooseCandidate): CandidateRow => ({
  personId: String(row.userId ?? row.id ?? ""),
  name: row.userName ?? row.name ?? "",
  dept: row.deptName ?? "",
  post: row.positionName ?? row.postName ?? "",
  phone: row.mobile ?? row.phone ?? "",
});

const isCandidateRow = (row: unknown): row is CandidateRow =>
  row != null && typeof row === "object" && "personId" in row && String((row as CandidateRow).personId ?? "").trim() !== "";

export const DutyRoleAssignmentsPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const roles = ref<DutyRoleAssignmentVO[]>([]);
    const editOpen = ref(false);
    const saving = ref(false);
    const candidateLoading = ref(false);
    const deptTree = ref<OrganizationTreeNode[]>([]);
    const selectedUserMap = ref(new Map<string, CandidateRow>());
    const candidates = ref<CandidateRow[]>([]);
    const candidateKeyword = ref("");
    const candidateOrganizationId = ref<string | undefined>();
    const candidatePage = ref(1);
    const candidatePageSize = ref(TABLE_PAGE_SIZE);
    const candidateTotal = ref(0);
    const editState = reactive({
      roleName: "",
      roleDisplayName: "",
      userIds: [] as string[],
    });

    const loadRoles = async (): Promise<void> => {
      try {
        roles.value = await useAuthRequest(() => listDutyRoleAssignments());
      } catch (e) {
        showApiError(e, "查询法定角色失败");
        roles.value = [];
      }
    };

    const loadDepts = async (): Promise<void> => {
      try {
        const orgs = await useAuthRequest(() => getOrganizationTree({ enabled: true }));
        deptTree.value = mapOrganizationsToTreeData(orgs);
      } catch (e) {
        showApiError(e, "查询部门失败");
        deptTree.value = [];
      }
    };

    const loadCandidates = async (): Promise<void> => {
      candidateLoading.value = true;
      try {
        const page = await useAuthRequest(() =>
          pageDutyRoleUserCandidates({
            pageNumber: candidatePage.value,
            pageSize: candidatePageSize.value,
            keyword: candidateKeyword.value.trim() || undefined,
            organizationId: candidateOrganizationId.value,
          }),
        );
        candidates.value = (page.records ?? []).map((row) => mapCandidateRow(row as LooseCandidate)).filter((row) => row.personId);
        candidateTotal.value = page.total ?? 0;
      } catch (e) {
        showApiError(e, "查询候选人员失败");
        candidates.value = [];
        candidateTotal.value = 0;
      } finally {
        candidateLoading.value = false;
      }
    };

    onMounted(() => {
      void loadRoles();
      void loadDepts();
    });

    const openEdit = async (role: DutyRoleAssignmentVO): Promise<void> => {
      editState.roleName = role.roleName ?? "";
      editState.roleDisplayName = role.roleDisplayName || role.roleName || "";
      const selected = (role.users ?? []).map((user) => mapCandidateRow(user as LooseCandidate)).filter((row) => row.personId);
      selectedUserMap.value = new Map(selected.map((row) => [row.personId, row]));
      editState.userIds = selected.map((row) => row.personId);
      editOpen.value = true;
      candidateKeyword.value = "";
      candidateOrganizationId.value = undefined;
      candidateFormApi.setFormValues({ keyword: "", organizationId: undefined });
      candidatePage.value = 1;
      candidatePageSize.value = TABLE_PAGE_SIZE;
      await loadCandidates();
    };

    const saveRole = async (): Promise<void> => {
      saving.value = true;
      try {
        const savedRoles = await useAuthRequest(() =>
          saveDutyRoleAssignments({
            assignments: [
              {
                roleName: editState.roleName,
                userIds: editState.userIds,
              },
            ],
          }),
        );
        roles.value = Array.isArray(savedRoles) ? savedRoles : roles.value;
        message.success("保存成功");
        editOpen.value = false;
      } catch (e) {
        showApiError(e, "保存失败");
      } finally {
        saving.value = false;
      }
    };

    const candidateColumns = [
      {
        key: "名称",
        title: "名称",
        width: 160,
        ellipsis: true,
        customRender: ({ record }: { record: CandidateRow }) => record.name || "--",
      },
      {
        key: "联系电话",
        title: "联系电话",
        width: 140,
        ellipsis: true,
        customRender: ({ record }: { record: CandidateRow }) => maskPhone(record.phone) || "--",
      },
      {
        key: "部门",
        title: "部门",
        width: 220,
        ellipsis: true,
        customRender: ({ record }: { record: CandidateRow }) => record.dept || "--",
      },
      {
        key: "岗位",
        title: "岗位",
        width: 200,
        ellipsis: true,
        customRender: ({ record }: { record: CandidateRow }) => record.post || "--",
      },
    ];

    const candidateFormSchema = () => [
      {
        component: markRaw(TreeSelect),
        label: "",
        fieldName: "organizationId",
        componentProps: {
          class: styles.deptSelect,
          placeholder: "请选择部门",
          allowClear: true,
          showSearch: true,
          treeDefaultExpandAll: true,
          treeData: deptTree.value,
          treeNodeFilterProp: "title",
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        defaultValue: "",
        componentProps: {
          class: styles.nameInput,
          placeholder: "请输入人员名称",
          allowClear: true,
          showCount: false,
        },
      },
    ];

    const [CandidateForm, candidateFormApi] = usePcForm({
      cache: false,
      layout: "horizontal",
      schema: candidateFormSchema(),
      handleSubmit: (values) => {
        candidateOrganizationId.value = values.organizationId ? String(values.organizationId) : undefined;
        candidateKeyword.value = String(values.keyword ?? "");
        candidatePage.value = 1;
        void loadCandidates();
      },
      handleReset: () => {
        candidateKeyword.value = "";
        candidateOrganizationId.value = undefined;
        candidatePage.value = 1;
        void loadCandidates();
      },
    });

    watch(
      deptTree,
      () => {
        candidateFormApi.updateSchema(candidateFormSchema());
      },
      { deep: true },
    );

    const [CandidateTable, candidateTableApi] = usePcTable({
      tableCode: "safety-duty-role-assignments-1",
      autoScrollY: false,
      autoFetch: false,
      columns: candidateColumns,
      dataSource: candidates.value,
      rowKey: "personId",
      rowSelection: "checkbox",
      rowSelectionChange: (keys, rows) => {
        const nextKeys = keys.map(String).filter(Boolean);
        const currentPageMap = new Map(candidates.value.map((row) => [row.personId, row]));
        const emittedRowMap = new Map((rows ?? []).filter(isCandidateRow).map((row) => [row.personId, row]));
        const nextMap = new Map<string, CandidateRow>();
        for (const id of nextKeys) {
          const row = emittedRowMap.get(id) ?? currentPageMap.get(id) ?? selectedUserMap.value.get(id);
          if (row) {
            nextMap.set(id, { ...row, personId: id });
          }
        }
        editState.userIds = Array.from(nextMap.keys());
        selectedUserMap.value = nextMap;
      },
      scrollY: 430,
    });

    watch(
      candidates,
      (rows) => {
        candidateTableApi.setDataSource(rows);
      },
      { deep: true },
    );

    watch(
      candidateLoading,
      (loading) => {
        candidateTableApi.loading.value = loading;
      },
      { immediate: true },
    );

    watch(
      () => editState.userIds,
      (keys) => {
        candidateTableApi.setSelectedRowKeys(keys);
      },
      { deep: true, immediate: true },
    );

    const handleCandidatePageChange = (page: number, pageSize: number): void => {
      if (candidatePage.value === page && candidatePageSize.value === pageSize) {
        return;
      }
      candidatePage.value = page;
      candidatePageSize.value = pageSize;
      void loadCandidates();
    };

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class={styles.content}>
          {roles.value.length === 0 ? (
            <Empty description="暂无数据" />
          ) : (
            <div class={styles.roleGrid}>
              {roles.value.map((role) => (
                <div class={styles.roleCard} key={role.roleName}>
                  <div class={styles.roleHeader}>
                    <div>
                      <h3 class={styles.roleTitle}>{role.roleDisplayName || role.roleName}</h3>
                      <div class={styles.roleMeta}>{role.legalBasis || "--"}</div>
                      <div class={styles.roleMeta}>{role.dutySummary || "--"}</div>
                    </div>
                    <Button type="primary" size="small" onClick={() => void openEdit(role)}>
                      关联人员
                    </Button>
                  </div>
                  {(role.users ?? []).length > 0 ? (
                    <div class={styles.userList}>
                      {(role.users ?? []).map((user) => (
                        <Tag key={`${role.roleName}-${user.userId}`} color="blue">
                          {user.userName || "--"} {user.deptName ? `/${user.deptName}` : ""}
                        </Tag>
                      ))}
                    </div>
                  ) : (
                    <div class={styles.empty}>未关联人员</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    };

    return (): JSX.Element => (
      <>
        <PageLayout title={pageTitle} showFooter={false} v-slots={layoutSlots} />
        <Modal
          open={editOpen.value}
          title={`关联人员 - ${editState.roleDisplayName}`}
          width={860}
          centered
          footer={
            <div class={styles.modalFooter}>
              <Button
                onClick={() => {
                  editOpen.value = false;
                }}
              >
                取消
              </Button>
              <Button type="primary" loading={saving.value} onClick={() => void saveRole()}>
                保存
              </Button>
            </div>
          }
          onUpdate:open={(v: boolean) => {
            editOpen.value = v;
          }}
          onCancel={() => {
            editOpen.value = false;
          }}
        >
          <div class={styles.candidateModal}>
            <div class={[styles.candidateToolbar, "safety-duty-compact-form"]}>
              <CandidateForm />
            </div>
            <div class={styles.tableWrap}>
              <div class="person-picker-table">
                <CandidateTable />
              </div>
            </div>
            <div class={styles.candidateFooter}>
              <Page
                current={candidatePage.value}
                pageSize={candidatePageSize.value}
                total={candidateTotal.value}
                onPageChange={handleCandidatePageChange}
                onShowSizeChange={handleCandidatePageChange}
              />
            </div>
          </div>
        </Modal>
      </>
    );
  },
});
