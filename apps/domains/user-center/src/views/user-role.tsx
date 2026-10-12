import { defineComponent } from "vue";

import { PageLayout, PopOver, usePcTable, type PcTableColumn } from "../pc-ui-runtime";

const roles = [
  { code: "MANAGER", name: "管理者", remark: "" },
  { code: "MEMBER", name: "普通成员", remark: "" },
];
const cell = (value: unknown) => <PopOver content={String(value || "--")}>{String(value || "--")}</PopOver>;
const columns: PcTableColumn[] = [
  { title: "角色名称", dataIndex: "name", width: 180, ellipsis: true, customRender: ({ text }) => cell(text) },
  { title: "备注", dataIndex: "remark", width: 180, ellipsis: true, customRender: ({ text }) => cell(text) },
];

export const UserRole = defineComponent({
  name: "UserCenterRole",
  setup() {
    const [PcTable] = usePcTable({
      columns,
      tableCode: "d/user-center/user-role",
      rowKey: "code",
      dataSource: roles,
      pagination: false,
      autoFetch: false,
    });
    return () => <PageLayout title="用户角色" showFooter={false} v-slots={{ "layout-content": () => <PcTable /> }} />;
  },
});
