import type { TypeKind, TypeRow } from "@g2-contract/work-report";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Space,
  Switch,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { getClient } from "../domain-context";
import { errorText, positiveInt } from "../shared";

import styles from "../styles.module.css";
function createTypePage(kind: TypeKind) {
  const title = kind === "report" ? "汇报类型" : "安排类型";
  return defineComponent({
    name: `WorkReport${kind}TypePage`,
    setup() {
      const route = useRoute();
      const query = reactive({ keyword: "", name: "" });
      const pager = reactive({
        pageNumber: positiveInt(route.query.pageNumber, 1),
        pageSize: positiveInt(route.query.pageSize, 10),
        total: 0,
      });
      const open = ref(false);
      const saving = ref(false);
      const draft = reactive({ id: "", name: "", enabled: false });
      const changing = ref<string[]>([]);
      const deleting = ref<string[]>([]);
      let version = 0;
      const edit = (row?: TypeRow) => {
        Object.assign(draft, { id: row?.id ?? "", name: row?.name ?? "", enabled: Boolean(row?.status) });
        open.value = true;
      };
      const changeStatus = async (row: TypeRow, checked: boolean) => {
        if (changing.value.includes(row.id)) {
          return;
        }
        changing.value.push(row.id);
        try {
          await getClient().setTypeStatus(kind, row.id, kind === "report" ? Number(checked) : checked);
          row.status = kind === "report" ? Number(checked) : checked;
          message.success("切换成功");
        } catch (error) {
          message.error(errorText(error, "切换失败"));
        } finally {
          changing.value = changing.value.filter((id) => id !== row.id);
        }
      };
      const remove = async (row: TypeRow) => {
        if (deleting.value.includes(row.id)) {
          return;
        }
        deleting.value.push(row.id);
        try {
          await getClient().deleteType(kind, row.id);
          message.success("删除成功");
          pager.pageNumber = 1;
          await load();
        } catch (error) {
          message.error(errorText(error, "删除失败"));
        } finally {
          deleting.value = deleting.value.filter((id) => id !== row.id);
        }
      };
      const [PcTable, tableApi] = usePcTable({
        rowKey: "id",
        tableCode: kind === "report" ? "WORK_REPORT_TYPE" : "WORK_REPORT_NOTICE_TYPE",
        autoFetch: false,
        pagination: false,
        columns: [
          { title: "类型名称", dataIndex: "name", ellipsis: true },
          {
            title: "类型状态",
            dataIndex: "status",
            customRender: ({ record }) => {
              const row = record as TypeRow;
              return (
                <Switch
                  checked={Boolean(row.status)}
                  loading={changing.value.includes(row.id)}
                  onChange={(checked) => void changeStatus(row, Boolean(checked))}
                />
              );
            },
          },
          {
            title: "操作",
            dataIndex: "action",
            customRender: ({ record }) => (
              <Space>
                <Button type="link" size="small" onClick={() => edit(record as TypeRow)}>
                  编辑
                </Button>
                <PopConfirm title={`确定要删除该${title}？`} okText="确定" cancelText="取消" onConfirm={() => remove(record as TypeRow)}>
                  <Button type="link" size="small" danger loading={deleting.value.includes((record as TypeRow).id)}>
                    删除
                  </Button>
                </PopConfirm>
              </Space>
            ),
          },
        ],
      });
      const load = async () => {
        const current = ++version;
        tableApi.loading.value = true;
        try {
          const result = await getClient().pageTypes(kind, {
            pageNumber: pager.pageNumber,
            pageSize: pager.pageSize,
            ...(kind === "report" ? { keyword: query.keyword } : { name: query.name }),
          });
          if (current === version) {
            tableApi.setDataSource(result.records);
            pager.total = result.total;
          }
        } catch (error) {
          if (current === version) {
            message.error(errorText(error, "类型加载失败"));
          }
        } finally {
          if (current === version) {
            tableApi.loading.value = false;
          }
        }
      };
      const [PcForm] = usePcForm({
        layout: "horizontal",
        syncStateRef: query,
        cache: true,
        showCollapseButton: false,
        actionsInline: true,
        schema: [
          {
            component: "Input",
            fieldName: kind === "report" ? "keyword" : "name",
            label: "",
            defaultValue: "",
            componentProps: { placeholder: `${title}名称`, allowClear: true },
          },
        ],
        handleSubmit() {
          pager.pageNumber = 1;
          void load();
        },
        handleReset() {
          query.keyword = "";
          query.name = "";
          pager.pageNumber = 1;
          void load();
        },
      });
      const save = async () => {
        if (saving.value) {
          return;
        }
        const name = draft.name.replace(/\s+/gu, "");
        if (!name) {
          message.warning(`请输入${title}名称`);
          return;
        }
        if (!/^[a-zA-Z0-9\u4E00-\u9FE5]+$/u.test(name)) {
          message.warning("只能输入中文英文及数字");
          return;
        }
        saving.value = true;
        try {
          const body = { name, status: kind === "report" ? Number(draft.enabled) : draft.enabled };
          if (draft.id) {
            await getClient().updateType(kind, draft.id, body);
          } else {
            await getClient().createType(kind, body);
          }
          open.value = false;
          message.success("保存成功");
          await load();
        } catch (error) {
          message.error(errorText(error, "保存失败"));
        } finally {
          saving.value = false;
        }
      };
      onMounted(() => void load());
      onUnmounted(() => {
        version += 1;
      });
      return () => (
        <PageLayout
          title={title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" onClick={() => edit()}>
                新增
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.content}>
                <PcForm />
                <PcTable />
                <Modal
                  open={open.value}
                  title={`${draft.id ? "编辑" : "新增"}${title}`}
                  width={600}
                  centered
                  okText="确定"
                  cancelText="取消"
                  confirmLoading={saving.value}
                  onOk={() => void save()}
                  onCancel={() => {
                    open.value = false;
                  }}
                >
                  <Form labelCol={{ style: { width: "80px" } }}>
                    <FormItem label="类型名称" required>
                      <Input
                        value={draft.name}
                        maxlength={20}
                        placeholder={`请输入${title}名称`}
                        onUpdate:value={(value) => {
                          draft.name = value.replace(/\s+/gu, "");
                        }}
                      />
                    </FormItem>
                    <FormItem label="类型状态">
                      <Switch v-model:checked={draft.enabled} />
                    </FormItem>
                  </Form>
                </Modal>
              </div>
            ),
            "footer-page": () => (
              <Page
                current={pager.pageNumber}
                pageSize={pager.pageSize}
                total={pager.total}
                cachePageQuery={true}
                onPageChange={(page, size) => {
                  pager.pageNumber = page;
                  pager.pageSize = size;
                  void load();
                }}
              />
            ),
          }}
        />
      );
    },
  });
}
export const ReportTypePage = createTypePage("report");
export const ArrangeTypePage = createTypePage("arrange");
