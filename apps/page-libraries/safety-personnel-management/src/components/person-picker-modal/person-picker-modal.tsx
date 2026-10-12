import type { OrgUserCandidateVO, PersonPoolUserVO } from "@g2-contract/safety-personnel";
import { Button, Empty, Input, Modal, Table, TreeSelect } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { type PropType, defineComponent, nextTick, ref, watch } from "vue";

import { getOrganizationTree } from "../../api/ouaa";
import { pageOrgUserCandidates, pagePersonPool } from "../../api/safety-personnel";
import { TABLE_PAGE_SIZE } from "../../constants";
import { useAuthRequest } from "../../hooks/use-auth-request";
import { usePickerTableScroll } from "../../hooks/use-picker-table-scroll";
import type { PoolPersonUI } from "../../types/ui";
import { showApiError } from "../../utils/api-error";
import { mapPoolPerson } from "../../utils/mappers";
import { maskPhone } from "../../utils/mask-phone";
import { type OrganizationTreeNode, mapOrganizationsToTreeData } from "../../utils/organization-tree";
import { GPagination } from "../common/pagination";

import styles from "./person-picker-modal.module.css";

const PICKER_TABLE_CLASS = "person-picker-table";

function mapOrgCandidate(row: OrgUserCandidateVO): PoolPersonUI {
  return {
    personId: String(row.userId ?? ""),
    name: row.userName ?? "",
    dept: row.deptName ?? "",
    post: row.postName ?? "",
    phone: row.mobile ?? "",
  };
}

function isPoolPersonRow(row: unknown): row is PoolPersonUI {
  return row != null && typeof row === "object" && String((row as PoolPersonUI).personId ?? "").trim() !== "";
}

export const PersonPickerModal = defineComponent({
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: "选择人员" },
    mode: { type: String as () => "single" | "multiple", default: "multiple" },
    source: { type: String as () => "person-pool" | "org-candidates", default: "person-pool" },
    typeCode: { type: String, default: undefined },
    okText: { type: String, default: "确定" },
    initialSelected: {
      type: Array as PropType<PoolPersonUI[]>,
      default: () => [],
    },
  },
  emits: ["update:open", "confirm", "cancel"],
  setup(props, { emit }) {
    const keyword = ref("");
    const organizationId = ref<string | undefined>();
    const deptTree = ref<OrganizationTreeNode[]>([]);
    const loading = ref(false);
    const selectedKeys = ref<string[]>([]);
    const selectedPersonMap = ref(new Map<string, PoolPersonUI>());
    const records = ref<PoolPersonUI[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const pageSize = ref(TABLE_PAGE_SIZE);
    const tableWrapRef = ref<HTMLElement | null>(null);
    const { scrollY: tableScrollY, recalc: recalcTableScroll } = usePickerTableScroll(tableWrapRef);

    const scheduleRecalcTableScroll = (): void => {
      void nextTick(() => {
        recalcTableScroll();
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
        const query = {
          pageNumber: pageNumber.value,
          pageSize: pageSize.value,
          keyword: keyword.value.trim() || undefined,
          organizationId: organizationId.value,
        };
        const page = await useAuthRequest(() =>
          props.source === "org-candidates"
            ? pageOrgUserCandidates(query)
            : pagePersonPool({
                ...query,
                typeCode: props.typeCode,
              }),
        );
        records.value =
          props.source === "org-candidates"
            ? page.records.map((r) => mapOrgCandidate(r as OrgUserCandidateVO))
            : page.records.map((r) => mapPoolPerson(r as PersonPoolUserVO));
        total.value = page.total ?? 0;
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

    const onPageChange = (page: number, size: number): void => {
      pageNumber.value = page;
      pageSize.value = size;
      void load();
    };

    const applyInitialSelection = (): void => {
      const map = new Map<string, PoolPersonUI>();
      const keys: string[] = [];
      for (const row of props.initialSelected) {
        const id = String(row.personId ?? "").trim();
        if (!id) {
          continue;
        }
        map.set(id, { ...row, personId: id });
        keys.push(id);
      }
      if (props.mode === "single") {
        selectedKeys.value = keys.slice(0, 1);
        selectedPersonMap.value = keys.length > 0 ? new Map([[keys[0], map.get(keys[0])!]]) : new Map();
        return;
      }
      selectedKeys.value = keys;
      selectedPersonMap.value = map;
    };

    const resetQueryState = (): void => {
      keyword.value = "";
      organizationId.value = undefined;
      pageNumber.value = 1;
      pageSize.value = TABLE_PAGE_SIZE;
    };

    watch(
      () => props.open,
      (v) => {
        if (v) {
          resetQueryState();
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
        dataIndex: "dept",
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

    const onOk = (): void => {
      if (props.mode === "single" && selectedKeys.value.length === 0) {
        return;
      }
      const selected = selectedKeys.value.map((id) => selectedPersonMap.value.get(id)).filter((row): row is PoolPersonUI => row != null);
      emit("confirm", selected);
      emit("update:open", false);
    };

    return () => (
      <Modal
        open={props.open}
        title={props.title}
        width={860}
        footer={
          <div class={styles.modalFooter}>
            <Button
              onClick={() => {
                emit("update:open", false);
              }}
            >
              取消
            </Button>
            <Button type="primary" loading={loading.value} onClick={onOk}>
              {props.okText}
            </Button>
          </div>
        }
        onCancel={() => {
          emit("update:open", false);
        }}
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
              onUpdate:value={(value) => {
                const v = typeof value === "string" ? value : undefined;
                organizationId.value = v;
              }}
            />
            <Input
              class={styles.nameInput}
              placeholder="请输入人员名称"
              showCount={false}
              value={keyword.value}
              onUpdate:value={(value) => {
                const v = String(value ?? "");
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
              rowKey="personId"
              columns={columns}
              dataSource={records.value}
              loading={loading.value}
              pagination={false}
              tableLayout="fixed"
              scroll={{ y: tableScrollY.value }}
              rowSelection={{
                type: props.mode === "single" ? "radio" : "checkbox",
                selectedRowKeys: selectedKeys.value,
                preserveSelectedRowKeys: true,
                onChange: (keys: (string | number)[], rows: (PoolPersonUI | undefined)[]) => {
                  const nextKeys = keys.map(String).filter(Boolean);
                  const currentPageMap = new Map(records.value.map((row) => [row.personId, row]));
                  const emittedRowMap = new Map((rows ?? []).filter(isPoolPersonRow).map((row) => [row.personId, row]));
                  const nextMap = new Map<string, PoolPersonUI>();
                  const normalizedKeys = props.mode === "single" ? nextKeys.slice(-1) : nextKeys;
                  for (const id of normalizedKeys) {
                    const row = emittedRowMap.get(id) ?? currentPageMap.get(id) ?? selectedPersonMap.value.get(id);
                    if (row) {
                      nextMap.set(id, { ...row, personId: id });
                    }
                  }
                  selectedKeys.value = Array.from(nextMap.keys());
                  selectedPersonMap.value = nextMap;
                },
              }}
              locale={{ emptyText: <Empty description="暂无可添加的人员" /> }}
            />
          </div>
          <div class={styles.pagination}>
            <GPagination total={total.value} current={pageNumber.value} pageSize={pageSize.value} onChange={onPageChange} />
          </div>
        </div>
      </Modal>
    );
  },
});
