import type { MemberGroup, MemberUser, PageResult, Reader } from "@g2-contract/user-center";
import { defineComponent, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import defaultReaderImage from "../assets/default-reader.png";
import { getUserCenterClient } from "../domain-context";
import {
  Button,
  Descriptions,
  DescriptionsItem,
  Image,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  PopOver,
  Spin,
  dayjs,
  message,
  usePcForm,
  usePcTable,
  type PcFormSchemaProp,
  type PcTableColumn,
} from "../pc-ui-runtime";

type Row = Reader & MemberGroup & MemberUser;
type PageKind = "reader" | "group" | "user";

const text = (value: unknown): string => (value === undefined || value === null || value === "" ? "--" : String(value));
const cell = (value: unknown) => <PopOver content={text(value)}>{text(value)}</PopOver>;
const dateCell = (value: unknown) => cell(value ? dayjs(value as string).format("YYYY-MM-DD HH:mm:ss") : "--");
const gender = (value: unknown): string =>
  ({ MALE: "男", FEMALE: "女", NONE: "保密" })[String(value) as "MALE" | "FEMALE" | "NONE"] ?? "--";
const positiveQueryNumber = (value: unknown, fallback: number): number => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
};

function createListPage(kind: PageKind) {
  return defineComponent({
    name: "UserCenter" + kind + "List",
    setup() {
      const client = getUserCenterClient();
      const route = useRoute();
      const router = useRouter();
      const page = reactive({
        pageNumber: positiveQueryNumber(route.query.pageNumber, 1),
        pageSize: positiveQueryNumber(route.query.pageSize, 10),
        total: 0,
      });
      const query = reactive({ keyword: "", mobile: "", createTime: [] as string[] });
      const visible = ref(false);
      const detailLoading = ref(false);
      const reader = ref<Reader>();
      const deletingId = ref<string>();
      let listVersion = 0;
      let detailVersion = 0;

      const openDetail = (id: number): void => {
        visible.value = true;
        reader.value = undefined;
        detailLoading.value = true;
        const version = ++detailVersion;
        void client
          .getReader(id)
          .then((value) => {
            if (version === detailVersion) reader.value = value;
          })
          .catch((error: unknown) => {
            if (version === detailVersion) message.error(error instanceof Error ? error.message : "读者详情加载失败");
          })
          .finally(() => {
            if (version === detailVersion) detailLoading.value = false;
          });
      };
      const closeDetail = (): void => {
        visible.value = false;
        ++detailVersion;
        detailLoading.value = false;
      };
      const remove = async (row: Row): Promise<void> => {
        const id = String(row.id ?? "");
        if (!id || deletingId.value) return;
        deletingId.value = id;
        try {
          if (kind === "group") await client.deleteGroup(id);
          else if (kind === "user") await client.deleteUser(id);
          message.success("操作成功");
          page.pageNumber = 1;
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "删除失败");
        } finally {
          deletingId.value = undefined;
        }
      };

      const action: PcTableColumn = {
        title: "操作",
        key: "action",
        width: kind === "reader" ? 180 : 120,
        customRender: ({ record }) =>
          kind === "reader" ? (
            <Button type="link" size="small" onClick={() => openDetail(Number((record as Row).id))}>
              详情
            </Button>
          ) : (
            <PopConfirm title="确认删除该项？" okText="确定" cancelText="取消" onConfirm={() => void remove(record as Row)}>
              <Button type="link" size="small" danger disabled={Boolean(deletingId.value)}>
                删除
              </Button>
            </PopConfirm>
          ),
      };
      const columns: PcTableColumn[] =
        kind === "reader"
          ? [
              {
                title: "姓名",
                dataIndex: "name",
                ellipsis: true,
                width: 180,
                fixed: "left",
                customRender: ({ text: value }) => cell(value),
              },
              { title: "手机号", dataIndex: "mobile", ellipsis: true, width: 180, customRender: ({ text: value }) => cell(value) },
              { title: "性别", dataIndex: "gender", ellipsis: true, width: 180, customRender: ({ text: value }) => cell(gender(value)) },
              action,
            ]
          : kind === "group"
            ? [
                { title: "组织名称", dataIndex: "groupName", ellipsis: true, customRender: ({ text: value }) => cell(value) },
                { title: "创建时间", dataIndex: "createTime", ellipsis: true, customRender: ({ text: value }) => dateCell(value) },
                { title: "用户数", dataIndex: "userCount", ellipsis: true, customRender: ({ text: value }) => cell(value) },
                { title: "管理者", dataIndex: "memberUserName", ellipsis: true, customRender: ({ text: value }) => cell(value) },
                action,
              ]
            : [
                { title: "用户编号", dataIndex: "id", ellipsis: true, customRender: ({ text: value }) => cell(value) },
                { title: "姓名（微信昵称）", dataIndex: "name", ellipsis: true, customRender: ({ text: value }) => cell(value) },
                { title: "手机号", dataIndex: "mobile", ellipsis: true, customRender: ({ text: value }) => cell(value) },
                { title: "注册时间", dataIndex: "createTime", ellipsis: true, customRender: ({ text: value }) => dateCell(value) },
                { title: "注册地", dataIndex: "registerAddress", ellipsis: true, customRender: ({ text: value }) => cell(value) },
                { title: "最后登录时间", dataIndex: "lastLoginTime", ellipsis: true, customRender: ({ text: value }) => dateCell(value) },
                { title: "所属用户组织", dataIndex: "groups", ellipsis: true, customRender: ({ text: value }) => cell(value) },
                action,
              ];
      const title = kind === "reader" ? "读者列表" : kind === "group" ? "组织管理" : "用户列表";
      const tableCode =
        kind === "reader" ? "d/user-center/reader-list" : kind === "group" ? "d/user-center/group-list" : "d/user-center/user-list";
      const [PcTable, tableApi] = usePcTable({ columns, tableCode, rowKey: "id", pagination: false, autoFetch: false });

      async function load(): Promise<void> {
        const version = ++listVersion;
        tableApi.loading.value = true;
        try {
          let result: PageResult<Reader | MemberGroup | MemberUser>;
          if (kind === "reader")
            result = await client.pageReaders({
              pageNumber: page.pageNumber,
              pageSize: page.pageSize,
              keyword: query.keyword,
              mobile: query.mobile,
            });
          else if (kind === "group")
            result = await client.pageGroups({
              pageNumber: page.pageNumber,
              pageSize: page.pageSize,
              keyword: query.keyword,
              createTime: query.createTime.join(","),
            });
          else
            result = await client.pageUsers({
              pageNumber: page.pageNumber,
              pageSize: page.pageSize,
              keyword: query.keyword,
              createTime: query.createTime.join(","),
            });
          if (version === listVersion) {
            tableApi.setDataSource(result.records);
            page.total = result.total;
          }
        } catch (error) {
          if (version === listVersion) message.error(error instanceof Error ? error.message : title + "加载失败");
        } finally {
          if (version === listVersion) tableApi.loading.value = false;
        }
      }

      const schema: PcFormSchemaProp[] =
        kind === "reader"
          ? [
              {
                component: "Input",
                fieldName: "keyword",
                label: "姓名",
                defaultValue: "",
                componentProps: { placeholder: "请输入姓名", allowClear: true },
              },
              {
                component: "Input",
                fieldName: "mobile",
                label: "手机号",
                defaultValue: "",
                componentProps: { placeholder: "请输入手机号", allowClear: true },
              },
            ]
          : [
              {
                component: "Input",
                fieldName: "keyword",
                label: "",
                defaultValue: "",
                componentProps: {
                  placeholder: kind === "group" ? "组织名称、管理者/普通成员名称" : "名称、手机号",
                  allowClear: true,
                  style: kind === "group" ? { width: "300px" } : undefined,
                },
              },
              {
                component: "RangePicker",
                fieldName: "createTime",
                label: kind === "group" ? "创建时间" : "注册时间",
                defaultValue: [],
                componentProps: { valueFormat: "YYYY-MM-DD", allowClear: false },
              },
            ];
      const [PcForm] = usePcForm({
        layout: "horizontal",
        schema,
        syncStateRef: query,
        handleSubmit: () => {
          page.pageNumber = 1;
          void load();
        },
        handleReset: () => {
          page.pageNumber = 1;
          page.pageSize = 10;
          query.keyword = "";
          query.mobile = "";
          query.createTime = [];
          void router.replace({ query: {} });
          void load();
        },
      });
      void load();
      const slots = {
        "layout-content": () => (
          <>
            <PcForm />
            <PcTable />
          </>
        ),
        "footer-page": () => (
          <Page
            current={page.pageNumber}
            pageSize={page.pageSize}
            total={page.total}
            cachePageQuery={true}
            onPageChange={(number: number, size: number) => {
              page.pageNumber = number;
              page.pageSize = size;
              void load();
            }}
          />
        ),
      };
      return () => (
        <>
          <PageLayout title={title} v-slots={slots} />
          {kind === "reader" && (
            <Modal
              open={visible.value}
              title="读者详情"
              width={600}
              okText="确定"
              cancelText="取消"
              onOk={closeDetail}
              onCancel={closeDetail}
            >
              <Spin spinning={detailLoading.value}>
                <div style={{ minHeight: "120px", display: "flex", gap: "20px" }}>
                  <Image src={reader.value?.fileVO?.path ?? defaultReaderImage} width={100} />
                  <Descriptions column={1}>
                    <DescriptionsItem label="姓名">{text(reader.value?.name)}</DescriptionsItem>
                    <DescriptionsItem label="手机号">{text(reader.value?.mobile)}</DescriptionsItem>
                    <DescriptionsItem label="性别">{gender(reader.value?.gender)}</DescriptionsItem>
                  </Descriptions>
                </div>
              </Spin>
            </Modal>
          )}
        </>
      );
    },
  });
}

export const ReaderList = createListPage("reader");
export const GroupList = createListPage("group");
export const UserList = createListPage("user");
