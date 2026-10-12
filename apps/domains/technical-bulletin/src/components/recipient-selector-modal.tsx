import type { PageResult, PersonnelType, RecipientOption } from "@g2-contract/technical-bulletin";
import { type PropType, defineComponent, reactive, ref, watch } from "vue";

import { getTechnicalBulletinClient } from "../domain-context";
import { Button, Input, Modal, Page, Tag, message, usePcTable } from "../pc-ui-runtime";
import { errorMessage, text } from "../shared";

import styles from "../styles.module.less";

const titles: Record<PersonnelType, string> = {
  department: "选择部门",
  position: "选择职位",
  role: "选择角色",
  user: "选择用户",
};

const names: Record<PersonnelType, string> = {
  department: "部门",
  position: "职位",
  role: "角色",
  user: "用户",
};

export const RecipientSelectorModal = defineComponent({
  name: "TechnicalBulletinRecipientSelectorModal",
  props: {
    open: Boolean,
    kind: { type: String as PropType<PersonnelType>, default: "department" },
    value: { type: Array as PropType<RecipientOption[]>, default: () => [] },
  },
  emits: ["update:open", "confirm"],
  setup(props, { emit }) {
    const query = reactive({ keyword: "", pageNumber: 1, pageSize: 10, total: 0 });
    const selected = ref(new Map<string, RecipientOption>());

    const load = async (): Promise<PageResult<RecipientOption>> => {
      const client = getTechnicalBulletinClient();
      const common = { pageNumber: query.pageNumber, pageSize: query.pageSize };
      try {
        if (props.kind === "department") {
          const allRecords = await client.listDepartments({ ...common, name: query.keyword || undefined });
          const start = (query.pageNumber - 1) * query.pageSize;
          const records = allRecords.slice(start, start + query.pageSize);
          query.total = allRecords.length;
          return { records, total: allRecords.length, pages: Math.ceil(allRecords.length / query.pageSize) };
        }
        const params = { ...common, keyword: query.keyword || undefined, name: query.keyword || undefined };
        const result =
          props.kind === "position"
            ? await client.pagePositions(params)
            : props.kind === "role"
              ? await client.pageRoles(params)
              : await client.pageUsers(params);
        query.total = result.total;
        return result;
      } catch (error) {
        message.error(errorMessage(error, `${titles[props.kind]}数据加载失败`));
        return { records: [], total: 0, pages: 0 };
      }
    };

    const columns = () => [
      { title: titles[props.kind].replace("选择", "") + "名称", dataIndex: "name", width: 220, fixed: "left" as const, ellipsis: true },
      ...(props.kind === "user"
        ? [
            { title: "联系电话", dataIndex: "mobile", width: 160, customRender: ({ text: value }: { text?: string }) => text(value) },
            {
              title: "部门",
              dataIndex: "organizationName",
              width: 220,
              customRender: ({ record }: { record: RecipientOption }) => text(record.organizations?.[0]?.name),
            },
          ]
        : []),
    ];

    const [PcTable, tableApi] = usePcTable({
      tableCode: "TECHNICAL_BULLETIN_RECIPIENT",
      rowKey: "id",
      rowSelection: "checkbox",
      autoScrollY: false,
      scrollY: 420,
      autoFetch: false,
      columns: columns(),
      rowSelectionChange(keys) {
        const currentRows = (tableApi.getDataSource() as RecipientOption[] | undefined) ?? [];
        const currentIds = new Set(currentRows.map((item) => String(item.id)));
        const kept = new Set(keys.map(String));
        const next = new Map(selected.value);
        for (const id of currentIds) {
          if (!kept.has(id)) {
            next.delete(id);
          }
        }
        for (const row of currentRows) {
          if (kept.has(String(row.id))) {
            next.set(String(row.id), row);
          }
        }
        selected.value = next;
        tableApi.setSelectedRowKeys(Array.from(selected.value.keys()));
      },
      fetchApi: load,
    });

    watch(
      () => props.open,
      (open) => {
        if (!open) {
          return;
        }
        query.keyword = "";
        query.pageNumber = 1;
        selected.value = new Map(props.value.map((item) => [String(item.id), item]));
        tableApi.setColumns(columns());
        tableApi.setSelectedRowKeys(Array.from(selected.value.keys()));
        tableApi.query();
      },
    );

    const removeSelected = (id: string): void => {
      const next = new Map(selected.value);
      next.delete(String(id));
      selected.value = next;
      tableApi.setSelectedRowKeys(Array.from(next.keys()));
    };

    const clearSelected = (): void => {
      selected.value = new Map();
      tableApi.setSelectedRowKeys([]);
    };

    return () => (
      <Modal
        open={props.open}
        title={
          <div class={styles.recipientModalTitle}>
            <span>{titles[props.kind]}</span>
            <span class={styles.recipientModalTitleTip}>支持跨页勾选</span>
          </div>
        }
        width={960}
        okText="确定"
        cancelText="取消"
        onCancel={() => emit("update:open", false)}
        onOk={() => {
          emit("confirm", Array.from(selected.value.values()));
          emit("update:open", false);
        }}
      >
        <div class={styles.recipientModalLead}>从列表中勾选需要接收公告的{names[props.kind]}，已选结果会在下方实时汇总。</div>
        <div class={styles.modalSearch}>
          <Input
            value={query.keyword}
            allowClear
            class={styles.recipientSearchInput}
            placeholder={`请输入${titles[props.kind].replace("选择", "")}名称`}
            onUpdate:value={(value: string) => (query.keyword = value)}
            onPressEnter={() => {
              query.pageNumber = 1;
              tableApi.query();
            }}
          />
          <Button
            type="primary"
            onClick={() => {
              query.pageNumber = 1;
              tableApi.query();
            }}
          >
            查询
          </Button>
          <Button
            onClick={() => {
              query.keyword = "";
              query.pageNumber = 1;
              tableApi.query();
            }}
          >
            重置
          </Button>
        </div>
        <div class={styles.selectedRecipientPanel}>
          <div class={styles.selectedRecipientHeader}>
            <div>
              <span class={styles.selectedRecipientTitle}>已选{names[props.kind]}</span>
              <span class={styles.selectedRecipientCount}>{selected.value.size} 项</span>
            </div>
            {selected.value.size > 0 ? (
              <Button type="link" onClick={clearSelected}>
                清空已选
              </Button>
            ) : null}
          </div>
          <div class={styles.selectedRecipientTags}>
            {selected.value.size === 0 ? (
              <span class={styles.selectedRecipientEmpty}>暂未选择，请在下方列表中勾选</span>
            ) : (
              Array.from(selected.value.values()).map((item) => (
                <Tag key={item.id} closable onClose={() => removeSelected(item.id)}>
                  {item.name}
                </Tag>
              ))
            )}
          </div>
        </div>
        <PcTable />
        {query.total > 0 ? (
          <div class={styles.modalPager}>
            <Page
              current={query.pageNumber}
              pageSize={query.pageSize}
              total={query.total}
              syncToUrl={false}
              cachePageQuery={false}
              onPageChange={(pageNumber: number, pageSize: number) => {
                query.pageNumber = pageNumber;
                query.pageSize = pageSize;
                tableApi.query();
              }}
            />
          </div>
        ) : null}
      </Modal>
    );
  },
});
