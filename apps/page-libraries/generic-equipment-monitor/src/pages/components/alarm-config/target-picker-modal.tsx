import { Button, Input, Modal, Select, Space, Table } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref, watch, type PropType } from "vue";

import { normalizeAlarmPage } from "../../normalize-page";
import type { SelectEnum } from "./types";

type PickerRow = { id: string; name: string; mobile?: string; organizations?: { name: string }[]; gender?: string };

type OuaaPickerClient = {
  listUsers: (params?: Record<string, unknown>) => Promise<unknown>;
  getRoles: () => Promise<unknown>;
  getOrganizations: (params?: Record<string, unknown>) => Promise<unknown>;
};

function rowsFromList(raw: unknown, type: Exclude<SelectEnum, null>): PickerRow[] {
  const page = normalizeAlarmPage(raw);
  const list = page.records.length ? page.records : Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const id = String(row.id ?? row.userId ?? row.roleId ?? row.organizationId ?? "");
      const name = String(row.name ?? row.userName ?? row.roleName ?? row.organizationName ?? id);
      if (!id) return null;
      const orgs = Array.isArray(row.organizations) ? (row.organizations as { name: string }[]) : undefined;
      return {
        id,
        name,
        mobile: row.mobile != null ? String(row.mobile) : undefined,
        organizations: orgs,
        gender: row.gender != null ? String(row.gender) : undefined,
      };
    })
    .filter((item): item is PickerRow => !!item)
    .filter((item) => {
      if (type !== "ROLE") return true;
      return !!item.id;
    });
}

export default defineComponent({
  name: "GemTargetPickerModal",
  props: {
    open: { type: Boolean, default: false },
    type: { type: String as PropType<Exclude<SelectEnum, null>>, default: "USER" },
    selected: { type: Array as PropType<PickerRow[]>, default: () => [] },
    getOuaaClient: { type: Function as PropType<() => Promise<OuaaPickerClient>>, default: undefined },
  },
  emits: ["update:open", "confirm"],
  setup(props, { emit }) {
    const loading = ref(false);
    const keyword = ref("");
    const organizationId = ref<string | undefined>(undefined);
    const orgOptions = ref<{ label: string; value: string }[]>([]);
    const rows = ref<PickerRow[]>([]);
    const selectedKeys = ref<string[]>([]);
    const selectedMap = ref<Map<string, PickerRow>>(new Map());
    const query = reactive({ pageNumber: 1, pageSize: 10, total: 0 });

    function syncKeysFromMap(): void {
      selectedKeys.value = Array.from(selectedMap.value.keys());
    }

    watch(
      () => [props.open, props.type, props.selected] as const,
      ([open, , selected]) => {
        if (!open) return;
        selectedMap.value = new Map(selected.map((item) => [item.id, item]));
        syncKeysFromMap();
        keyword.value = "";
        organizationId.value = undefined;
        query.pageNumber = 1;
        void loadRows();
        if (props.type === "USER") {
          void loadOrganizations();
        }
      },
      { immediate: true },
    );

    async function loadOrganizations(): Promise<void> {
      if (!props.getOuaaClient) return;
      try {
        const client = await props.getOuaaClient();
        const raw = await client.getOrganizations({ enabled: true });
        orgOptions.value = rowsFromList(raw, "DEPARTMENT").map((item) => ({ label: item.name, value: item.id }));
      } catch {
        orgOptions.value = [];
      }
    }

    async function loadRows(): Promise<void> {
      if (!props.getOuaaClient) {
        rows.value = [];
        return;
      }
      loading.value = true;
      try {
        const client = await props.getOuaaClient();
        let raw: unknown;
        if (props.type === "USER") {
          raw = await client.listUsers({
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            keyword: keyword.value || undefined,
            organizationId: organizationId.value || "",
            enabled: true,
          });
          const page = normalizeAlarmPage(raw);
          rows.value = rowsFromList(raw, "USER");
          query.total = page.total;
        } else if (props.type === "ROLE") {
          raw = await client.getRoles();
          const all = rowsFromList(raw, "ROLE").filter((item) => (keyword.value ? item.name.includes(keyword.value) : true));
          query.total = all.length;
          const start = (query.pageNumber - 1) * query.pageSize;
          rows.value = all.slice(start, start + query.pageSize);
        } else {
          raw = await client.getOrganizations({ name: keyword.value || undefined, enabled: true });
          rows.value = rowsFromList(raw, "DEPARTMENT");
          query.total = rows.value.length;
        }
      } catch {
        rows.value = [];
      } finally {
        loading.value = false;
      }
    }

    const title = props.type === "DEPARTMENT" ? "选择部门" : props.type === "ROLE" ? "选择角色" : "选择人员";

    const columns =
      props.type === "USER"
        ? [
            { title: "名称", dataIndex: "name" },
            { title: "联系电话", dataIndex: "mobile", customRender: ({ text }: { text?: string }) => text || "--" },
            {
              title: "部门",
              dataIndex: "organizations",
              customRender: ({ record }: { record: PickerRow }) => record.organizations?.map((o) => o.name).join(",") || "--",
            },
            {
              title: "性别",
              dataIndex: "gender",
              customRender: ({ text }: { text?: string }) => (text === "MALE" ? "男" : text === "FEMALE" ? "女" : "--"),
            },
          ]
        : [{ title: props.type === "DEPARTMENT" ? "部门名称" : "角色名称", dataIndex: "name" }];

    const setPicked = (record: PickerRow, selected: boolean): void => {
      const next = new Map(selectedMap.value);
      if (selected) next.set(record.id, record);
      else next.delete(record.id);
      selectedMap.value = next;
      syncKeysFromMap();
    };

    return () => (
      <Modal
        open={props.open}
        title={title}
        width={800}
        maskClosable
        onCancel={() => emit("update:open", false)}
        onOk={() => {
          emit("confirm", Array.from(selectedMap.value.values()));
          emit("update:open", false);
        }}
      >
        <Space wrap style={{ marginBottom: 12, width: "100%", justifyContent: "space-between" }}>
          {props.type === "USER" ? (
            <Select
              style={{ width: 200 }}
              placeholder="请选择部门"
              allowClear
              options={orgOptions.value}
              value={organizationId.value}
              onUpdate:value={(v: string) => {
                organizationId.value = v;
              }}
            />
          ) : null}
          <Input
            style={{ width: props.type === "USER" ? 200 : 280 }}
            value={keyword.value}
            placeholder={props.type === "DEPARTMENT" ? "请输入部门名称" : props.type === "ROLE" ? "请输入角色名称" : "请输入人员名称"}
            allowClear
            onUpdate:value={(v: string) => {
              keyword.value = v;
            }}
          />
          <Space>
            <Button type="primary" loading={loading.value} onClick={() => void loadRows()}>
              查询
            </Button>
            <Button
              onClick={() => {
                keyword.value = "";
                organizationId.value = undefined;
                query.pageNumber = 1;
                void loadRows();
              }}
            >
              重置
            </Button>
          </Space>
        </Space>
        <Table
          rowKey="id"
          loading={loading.value}
          dataSource={rows.value}
          scroll={{ y: 400 }}
          pagination={props.type === "DEPARTMENT"}
          columns={columns}
          rowSelection={{
            selectedRowKeys: selectedKeys.value,
            preserveSelectedRowKeys: true,
            onChange: (keys: (string | number)[]) => {
              selectedKeys.value = keys.map(String);
            },
            onSelect: (record: PickerRow, selected: boolean) => setPicked(record, selected),
            onSelectAll: (selected: boolean, _keys: (string | number)[], picked: PickerRow[]) => {
              for (const row of picked) setPicked(row, selected);
            },
          }}
        />
        {props.type !== "DEPARTMENT" ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <span style={{ marginRight: 8, lineHeight: "32px" }}>共 {query.total} 条</span>
            <Button
              disabled={query.pageNumber <= 1}
              onClick={() => {
                query.pageNumber -= 1;
                void loadRows();
              }}
            >
              上一页
            </Button>
            <Button
              style={{ marginLeft: 8 }}
              disabled={query.pageNumber * query.pageSize >= query.total}
              onClick={() => {
                query.pageNumber += 1;
                void loadRows();
              }}
            >
              下一页
            </Button>
          </div>
        ) : null}
        {!props.getOuaaClient ? <div style={{ marginTop: 8, color: "#999" }}>未注入 getOuaaClient，无法加载对象列表</div> : null}
      </Modal>
    );
  },
});
