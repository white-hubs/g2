import type { OuaaClient } from "@g2-client/ouaa/client";
import { Modal, Page, Table, usePcForm } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref, type PropType } from "vue";

import {
  flattenOrganizations,
  formatUserGender,
  formatUserPositions,
  formatWorkStatus,
  mapUsersToAssignRows,
  type AssignUserRow,
} from "../alarm-assign.model";
import { normalizeAlarmPage } from "../normalize-page";

export type { AssignUserRow };

const WORK_STATUS_OPTIONS = [
  { label: "休息", value: "REST" },
  { label: "在岗", value: "WORKING" },
  { label: "离岗", value: "LEAVE_POST" },
  { label: "出差", value: "AWAY_BUSINESS" },
  { label: "请假", value: "ASK_LEAVE" },
];

type TenantUserRow = Record<string, unknown>;

function normalizeTenantUser(raw: unknown): TenantUserRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as TenantUserRow;
  const positions = Array.isArray(row.positions)
    ? row.positions
    : String(row.positionName ?? row.positionNames ?? row.postNames ?? "")
        .split(/[、,，]/)
        .filter(Boolean)
        .map((name) => ({ name }));
  return {
    ...row,
    name: row.name ?? row.userName ?? "--",
    mobile: row.mobile ?? row.phone ?? row.mobilePhone ?? "--",
    positions,
    workStatus: row.workStatus ?? (row.onDuty === true ? "WORKING" : row.onDuty === false ? "LEAVE_POST" : undefined),
  };
}

function tenantUserPage(raw: unknown): { records: TenantUserRow[]; total: number } {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" ? root.data : raw;
  const page = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const source = Array.isArray(data) ? data : (page.records ?? page.list ?? page.content ?? page.rows ?? []);
  const records = (Array.isArray(source) ? source : []).map(normalizeTenantUser).filter((row): row is TenantUserRow => !!row);
  return { total: Number(page.total ?? page.totalElements ?? records.length) || 0, records };
}

export default defineComponent({
  name: "GemAlarmAssignUsersModal",
  props: {
    getOuaaClient: { type: Function as PropType<() => Promise<OuaaClient>>, default: undefined },
  },
  emits: {
    ok: (_users: AssignUserRow[]) => true,
  },
  setup(props, { emit, expose }) {
    const visible = ref(false);
    const loading = ref(false);
    const rows = ref<TenantUserRow[]>([]);
    const selectedKeys = ref<string[]>([]);
    const selectedRows = ref<TenantUserRow[]>([]);
    const organizationSelectProps = reactive({
      allowClear: true,
      placeholder: "请选择部门",
      options: [] as { label: string; value: string }[],
      style: { minWidth: 160 },
    });
    const positionSelectProps = reactive({
      allowClear: true,
      placeholder: "请选择职位",
      options: [] as { label: string; value: string }[],
      style: { minWidth: 140 },
    });
    const search = reactive({
      organizationId: "",
      positionId: "",
      workStatus: "",
      keyword: "",
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });

    async function loadFilterOptions(): Promise<void> {
      if (!props.getOuaaClient) {
        return;
      }
      try {
        const client = await props.getOuaaClient();
        const [orgs, positionsRaw] = await Promise.all([
          client.getOrganizations({ enabled: true }),
          client.listPositions({ pageNumber: 1, pageSize: 200, enabled: true }),
        ]);
        organizationSelectProps.options = flattenOrganizations(orgs);
        const page = normalizeAlarmPage(positionsRaw);
        const list = page.records.length ? page.records : Array.isArray(positionsRaw) ? (positionsRaw as unknown[]) : [];
        positionSelectProps.options = list
          .map((item) => {
            const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
            const value = String(row.id ?? row.value ?? "");
            const label = String(row.name ?? row.label ?? value);
            return value ? { label, value } : null;
          })
          .filter((x): x is { label: string; value: string } => !!x);
      } catch {
        organizationSelectProps.options = [];
        positionSelectProps.options = [];
      }
    }

    async function loadUsers(): Promise<void> {
      if (!props.getOuaaClient) {
        rows.value = [];
        return;
      }
      loading.value = true;
      try {
        const client = await props.getOuaaClient();
        const raw = await client.listTenantUsers({
          enabled: true,
          pageNumber: search.pageNumber,
          pageSize: search.pageSize,
          keyword: search.keyword.trim(),
          // 旧系统以 cascaderIds 传递部门筛选值；为空时也保留该参数。
          cascaderIds: search.organizationId,
          anyMatchedAreaId: "",
          positionId: search.positionId || undefined,
          workStatus: search.workStatus || undefined,
        });
        const page = tenantUserPage(raw);
        rows.value = page.records;
        search.total = page.total;
      } catch {
        rows.value = [];
        search.total = 0;
      } finally {
        loading.value = false;
      }
    }

    const open = () => {
      selectedKeys.value = [];
      selectedRows.value = [];
      search.organizationId = "";
      search.positionId = "";
      search.workStatus = "";
      search.keyword = "";
      search.pageNumber = 1;
      search.pageSize = 10;
      visible.value = true;
      void loadFilterOptions();
      void loadUsers();
    };

    const cancel = () => {
      visible.value = false;
    };

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          fieldName: "positionId",
          label: "职位",
          defaultValue: undefined,
          componentProps: positionSelectProps,
        },
        {
          component: "Select",
          fieldName: "organizationId",
          label: "部门",
          defaultValue: undefined,
          componentProps: organizationSelectProps,
        },
        {
          component: "Select",
          fieldName: "workStatus",
          label: "工作状态",
          defaultValue: undefined,
          componentProps: {
            allowClear: true,
            placeholder: "请选择工作状态",
            options: WORK_STATUS_OPTIONS,
            style: { minWidth: 140 },
          },
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "请输入人员名称", allowClear: true },
        },
      ],
      handleSubmit: (values) => {
        search.organizationId = String(values.organizationId || "");
        search.positionId = String(values.positionId || "");
        search.workStatus = String(values.workStatus || "");
        search.keyword = String(values.keyword || "");
        search.pageNumber = 1;
        void loadUsers();
      },
      handleReset: () => {
        search.organizationId = "";
        search.positionId = "";
        search.workStatus = "";
        search.keyword = "";
        search.pageNumber = 1;
        void loadUsers();
      },
    });

    expose({ open });

    return () => (
      <Modal
        title="选择人员"
        open={visible.value}
        width={1300}
        onCancel={cancel}
        onOk={() => {
          const users = mapUsersToAssignRows(selectedRows.value);
          if (!users.length) {
            return;
          }
          emit("ok", users);
          cancel();
        }}
      >
        <PcForm />
        <Table
          rowKey={(record: TenantUserRow) => String(record.id ?? record.userId ?? "")}
          loading={loading.value}
          dataSource={rows.value}
          pagination={false}
          tableLayout="fixed"
          scroll={{ y: 420 }}
          columns={[
            { title: "名称", dataIndex: "name", width: "20%", ellipsis: true },
            {
              title: "联系电话",
              dataIndex: "mobile",
              width: "20%",
              ellipsis: true,
              customRender: ({ text }: { text: unknown }) => String(text || "--"),
            },
            {
              title: "性别",
              dataIndex: "gender",
              width: "20%",
              ellipsis: true,
              customRender: ({ text }: { text: unknown }) => formatUserGender(text),
            },
            {
              title: "职位",
              dataIndex: "positions",
              width: "20%",
              ellipsis: true,
              customRender: ({ text }: { text: unknown }) => formatUserPositions(text),
            },
            {
              title: "工作状态",
              dataIndex: "workStatus",
              width: "20%",
              ellipsis: true,
              customRender: ({ text }: { text: unknown }) => formatWorkStatus(text),
            },
          ]}
          rowSelection={{
            selectedRowKeys: selectedKeys.value,
            onChange: (keys: (string | number)[], picked: TenantUserRow[]) => {
              selectedKeys.value = keys.map(String);
              selectedRows.value = picked;
            },
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <Page
            current={search.pageNumber}
            pageSize={search.pageSize}
            total={search.total}
            showSizeChanger
            pageSizeOptions={["10", "20", "50", "100"]}
            showTotal={(total: number) => `共 ${total} 条数据`}
            onPageChange={(pageNumber: number, pageSize: number) => {
              search.pageNumber = pageNumber;
              search.pageSize = pageSize;
              void loadUsers();
            }}
          />
        </div>
        {!props.getOuaaClient ? <div style={{ marginTop: 8, color: "#999" }}>未注入 getOuaaClient，无法加载人员列表</div> : null}
      </Modal>
    );
  },
});
