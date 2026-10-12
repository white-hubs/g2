import type { User } from "@g2-contract/ouaa";
import { defineComponent, nextTick, type PropType, ref, watch } from "vue";

import { listUsers, getOrganizationTree } from "@/api/ouaa";
import { TABLE_PAGE_SIZE, RISK_MODAL_BODY_STYLE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { usePickerTableScroll } from "@/hooks/use-picker-table-scroll";
import { Modal, Table, Input, Empty, Button, Page, TreeSelect } from "@/pc-ui-runtime";
import type { OrgUserVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { maskPhone } from "@/utils/mask-phone";
import { mapOrganizationsToTreeData, type OrganizationTreeNode } from "@/utils/organization-tree";
import { resolvePageNumberWhenCurrentEmpty } from "@/utils/pagination";

import styles from "./person-picker-modal.module.less";

const PICKER_TABLE_CLASS = "person-picker-table";

type UserRow = User & {
  organizationName?: string;
  organization?: { name?: string };
  organizations?: Array<{ id?: string; name?: string }>;
  departmentName?: string;
  departmentNames?: string;
  positions?: Array<{ name?: string }>;
  positionName?: string;
  postName?: string;
};

function resolveUserDepartment(row: UserRow): string {
  if (row.organizationName?.trim()) return row.organizationName.trim();
  if (row.organization?.name?.trim()) return row.organization.name.trim();
  if (row.departmentName?.trim()) return row.departmentName.trim();
  if (row.departmentNames?.trim()) return row.departmentNames.trim();
  const fromOrgs = (row.organizations ?? []).map((o) => o.name?.trim()).filter(Boolean);
  if (fromOrgs.length) return fromOrgs.join("、");
  return "";
}

function mapUser(row: UserRow): OrgUserVO {
  const post = row.positionName ?? row.postName ?? row.positions?.[0]?.name ?? "";
  return {
    id: String(row.id ?? ""),
    name: row.name ?? row.username ?? "",
    department: resolveUserDepartment(row),
    phone: row.mobile ?? row.phone ?? "",
    post,
  };
}

export const PersonPickerModal = defineComponent({
  props: {
    visible: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    title: { type: String, default: "选择人员" },
    initialSelected: {
      type: Array as PropType<OrgUserVO[]>,
      default: () => [],
    },
  },
  emits: ["update:visible", "confirm"],
  setup(props, { emit }) {
    const keyword = ref("");
    const organizationId = ref<string | undefined>();
    const deptTree = ref<OrganizationTreeNode[]>([]);
    const loading = ref(false);
    const selectedKeys = ref<string[]>([]);
    const selectedUserMap = ref(new Map<string, OrgUserVO>());
    const records = ref<OrgUserVO[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const pageSize = ref(TABLE_PAGE_SIZE);
    const tableWrapRef = ref<HTMLElement | null>(null);
    const { scrollY: tableScrollY, recalc: recalcTableScroll } = usePickerTableScroll(tableWrapRef);

    const scheduleRecalcTableScroll = (): void => {
      void nextTick(() => {
        recalcTableScroll();
        setTimeout(recalcTableScroll, 0);
        setTimeout(recalcTableScroll, 150);
      });
    };

    const loadDepts = async (): Promise<void> => {
      try {
        const orgs = await useAuthRequest(() => getOrganizationTree({ enabled: true }));
        deptTree.value = mapOrganizationsToTreeData(orgs);
      } catch (e) {
        showApiError(e);
        deptTree.value = [];
      }
    };

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const page = await useAuthRequest(() =>
          listUsers({
            pageNumber: pageNumber.value,
            pageSize: pageSize.value,
            keyword: keyword.value.trim() || undefined,
            organizationId: organizationId.value,
            enabled: true,
          } as Parameters<typeof listUsers>[0]),
        );
        records.value = page.records.map((row) => mapUser(row as UserRow));
        total.value = page.total ?? 0;
        const nextPage = resolvePageNumberWhenCurrentEmpty(pageNumber.value, records.value.length, total.value, pageSize.value);
        if (nextPage !== pageNumber.value) {
          pageNumber.value = nextPage;
          await load();
          return;
        }
      } catch (e) {
        showApiError(e);
        records.value = [];
        total.value = 0;
      } finally {
        loading.value = false;
        scheduleRecalcTableScroll();
      }
    };

    const onSearch = (): void => {
      pageNumber.value = 1;
      void load();
    };

    const onReset = (): void => {
      keyword.value = "";
      organizationId.value = undefined;
      onSearch();
    };

    const applyInitialSelection = (): void => {
      const map = new Map<string, OrgUserVO>();
      const keys: string[] = [];
      for (const row of props.initialSelected) {
        const id = String(row.id ?? "").trim();
        if (!id) continue;
        map.set(id, { ...row, id });
        keys.push(id);
      }
      if (props.multiple) {
        selectedKeys.value = keys;
        selectedUserMap.value = map;
        return;
      }
      selectedKeys.value = keys.slice(0, 1);
      selectedUserMap.value = keys.length > 0 ? new Map([[keys[0], map.get(keys[0])!]]) : new Map();
    };

    watch(
      () => props.visible,
      (v) => {
        if (v) {
          keyword.value = "";
          organizationId.value = undefined;
          pageNumber.value = 1;
          pageSize.value = TABLE_PAGE_SIZE;
          applyInitialSelection();
          void loadDepts();
          void load();
          scheduleRecalcTableScroll();
        }
      },
    );

    const columns = [
      { title: "名称", dataIndex: "name", ellipsis: true },
      {
        title: "联系电话",
        dataIndex: "phone",
        ellipsis: true,
        customRender: ({ text }: { text?: string }) => maskPhone(text ?? ""),
      },
      {
        title: "部门",
        dataIndex: "department",
        ellipsis: true,
        customRender: ({ text }: { text?: string }) => text || "--",
      },
      {
        title: "岗位",
        dataIndex: "post",
        ellipsis: true,
        customRender: ({ text }: { text?: string }) => text || "--",
      },
    ];

    const onPageChange = (page: number, size: number): void => {
      pageNumber.value = page;
      pageSize.value = size;
      void load();
    };

    const onOk = (): void => {
      if (selectedKeys.value.length === 0) return;
      const users = selectedKeys.value.map((id) => selectedUserMap.value.get(id)).filter((u): u is OrgUserVO => u != null);
      emit("confirm", props.multiple ? users : users[0]);
      emit("update:visible", false);
    };

    return (): JSX.Element => (
      <Modal
        wrapClassName="risk-modal"
        bodyStyle={RISK_MODAL_BODY_STYLE}
        open={props.visible}
        title={props.title}
        width={860}
        footer={
          <div class={styles.modalFooter}>
            <Button onClick={() => emit("update:visible", false)}>取消</Button>
            <Button type="primary" loading={loading.value} onClick={onOk}>
              确定
            </Button>
          </div>
        }
        onCancel={() => emit("update:visible", false)}
      >
        <div class={styles.modalBody}>
          <div class={styles.toolbar}>
            <TreeSelect
              class={styles.deptSelect}
              placeholder="请选择部门"
              allowClear
              showSearch
              treeDefaultExpandAll
              treeData={deptTree.value}
              treeNodeFilterProp="title"
              value={organizationId.value}
              onUpdate:value={(v: string | undefined) => {
                organizationId.value = v;
              }}
            />
            <Input
              class={styles.nameInput}
              placeholder="请输入人员名称"
              showCount={false}
              value={keyword.value}
              onUpdate:value={(v: string) => {
                keyword.value = v;
              }}
              allowClear
              onPressEnter={onSearch}
            />
            <Button type="primary" onClick={onSearch}>
              查询
            </Button>
            <Button onClick={onReset}>重置</Button>
          </div>
          <div class={styles.tableWrap} ref={tableWrapRef}>
            <Table
              class={PICKER_TABLE_CLASS}
              rowKey="id"
              columns={columns}
              dataSource={records.value}
              loading={loading.value}
              pagination={false}
              tableLayout="fixed"
              scroll={{ y: tableScrollY.value }}
              rowSelection={{
                type: props.multiple ? "checkbox" : "radio",
                selectedRowKeys: selectedKeys.value,
                preserveSelectedRowKeys: true,
                onChange: (keys: (string | number)[], rows: OrgUserVO[]) => {
                  const nextKeys = keys.map(String);
                  const nextMap = new Map(selectedUserMap.value);
                  for (const id of nextMap.keys()) {
                    if (!nextKeys.includes(id)) nextMap.delete(id);
                  }
                  for (const row of rows) {
                    nextMap.set(row.id, row);
                  }
                  selectedKeys.value = nextKeys;
                  selectedUserMap.value = nextMap;
                },
              }}
              locale={{ emptyText: <Empty description="暂无可选人员" /> }}
            />
          </div>
          <div class={styles.pagination}>
            <Page total={total.value} current={pageNumber.value} pageSize={pageSize.value} syncToUrl={false} onPageChange={onPageChange} />
          </div>
        </div>
      </Modal>
    );
  },
});
