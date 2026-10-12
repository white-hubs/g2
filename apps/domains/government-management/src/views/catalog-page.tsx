import type { OfficialRow } from "@g2-contract/government-management";
import {
  Button,
  Input,
  Modal,
  Page,
  PageLayout,
  type PcTableColumn,
  PopConfirm,
  Textarea,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getGovernmentClient } from "../domain-context";
import { can, display, errorText } from "./shared";

import styles from "./page.module.css";

export function createCatalogPage(kind: "seal" | "category") {
  return defineComponent({
    name: kind === "seal" ? "GovernmentSealPage" : "GovernmentCategoryPage",
    setup() {
      const seal = kind === "seal";
      const title = seal ? "印章管理" : "事项分类";
      const nameKey = seal ? "sealName" : "name";
      const descKey = seal ? "sealDesc" : "remark";
      const filter = reactive<Record<string, string | undefined>>({ [nameKey]: undefined });
      const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const visible = ref(false);
      const saving = ref(false);
      const editingId = ref<string>();
      const form = reactive({ name: "", desc: "" });
      let version = 0;
      const columns: PcTableColumn[] = [
        {
          title: seal ? "印章名称" : "事项类型",
          dataIndex: nameKey,
          align: "center",
          ellipsis: true,
          customRender: ({ text }) => display(text),
        },
        {
          title: seal ? "印章描述" : "事项描述",
          dataIndex: descKey,
          align: "center",
          ellipsis: true,
          customRender: ({ text }) => display(text),
        },
        {
          title: "操作",
          dataIndex: "action",
          align: "center",
          width: seal ? 220 : 180,
          customRender: ({ record }) => (
            <>
              {(!seal || can("official:sealManage:edit")) && (
                <Button type="link" size="small" onClick={() => open(record as OfficialRow)}>
                  编辑
                </Button>
              )}
              {(!seal || can("official:sealManage:delete")) && (
                <PopConfirm
                  title={`确定要删除该${seal ? "印章" : "事项类型"}？`}
                  okText="确定"
                  cancelText="取消"
                  onConfirm={() => void remove(String((record as OfficialRow).id))}
                >
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </PopConfirm>
              )}
            </>
          ),
        },
      ];
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: seal ? "SEAL_MANAGE" : "EVENT_TYPE",
        rowKey: "id",
        autoFetch: false,
        pagination: false,
      });
      const load = async () => {
        const current = ++version;
        tableApi.loading.value = true;
        try {
          const client = getGovernmentClient();
          const result = seal
            ? await client.pageSeals({ pageNumber: pager.pageNumber, pageSize: pager.pageSize, sealName: filter[nameKey] })
            : await client.pageCategories({ pageNumber: pager.pageNumber, pageSize: pager.pageSize, name: filter[nameKey] });
          if (current !== version) {
            return;
          }
          tableApi.setDataSource(result.records);
          pager.total = result.total;
        } catch (error) {
          if (current !== version) {
            return;
          }
          message.error(errorText(error, "列表加载失败"));
          tableApi.setDataSource([]);
          pager.total = 0;
        } finally {
          if (current === version) {
            tableApi.loading.value = false;
          }
        }
      };
      const [PcForm] = usePcForm({
        layout: "horizontal",
        schema: [
          {
            component: "Input",
            fieldName: nameKey,
            label: "",
            componentProps: { placeholder: seal ? "印章名称" : "请输入事项类型", allowClear: true },
          },
        ],
        syncStateRef: filter,
        showCollapseButton: false,
        cache: true,
        handleSubmit(values) {
          filter[nameKey] = typeof values[nameKey] === "string" ? values[nameKey] : undefined;
          pager.pageNumber = 1;
          void load();
        },
        handleReset() {
          filter[nameKey] = undefined;
          pager.pageNumber = 1;
          void load();
        },
      });
      const open = (row?: OfficialRow) => {
        editingId.value = row?.id;
        form.name = row ? String(row[nameKey] ?? "") : "";
        form.desc = row ? String(row[descKey] ?? "") : "";
        visible.value = true;
      };
      const save = async () => {
        if (!form.name.trim()) {
          message.warning(`请输入${seal ? "印章名称" : "事项类型"}`);
          return;
        }
        if (!/^[a-zA-Z0-9\u4E00-\u9FE5]+$/u.test(form.name.trim())) {
          message.warning("只能输入中文英文及数字");
          return;
        }
        saving.value = true;
        try {
          const client = getGovernmentClient();
          const body = { [nameKey]: form.name.trim(), [descKey]: form.desc.trim() };
          if (seal) {
            if (editingId.value) {
              await client.updateSeal(editingId.value, body as { sealName: string; sealDesc: string });
            } else {
              await client.addSeal(body as { sealName: string; sealDesc: string });
            }
          } else if (editingId.value) {
            await client.updateCategory(editingId.value, body as { name: string; remark: string });
          } else {
            await client.addCategory(body as { name: string; remark: string });
          }
          message.success(editingId.value ? "编辑成功" : "新增成功");
          visible.value = false;
          void load();
        } catch (error) {
          message.error(errorText(error, "保存失败"));
        } finally {
          saving.value = false;
        }
      };
      const remove = async (id: string) => {
        try {
          if (seal) {
            await getGovernmentClient().deleteSeal(id);
          } else {
            await getGovernmentClient().deleteCategory(id);
          }
          message.success("删除成功");
          pager.pageNumber = 1;
          void load();
        } catch (error) {
          message.error(errorText(error, "删除失败"));
        }
      };
      onMounted(() => void load());
      return () => (
        <>
          <PageLayout
            title={title}
            v-slots={{
              "layout-header": () =>
                !seal || can("official:sealManage:add") ? (
                  <Button type="primary" onClick={() => open()}>
                    新增
                  </Button>
                ) : null,
              "layout-content": () => (
                <div class={styles.content}>
                  <div class={styles.filterRow}>
                    <PcForm />
                  </div>
                  <PcTable />
                </div>
              ),
              "footer-page": () =>
                pager.total > 0 ? (
                  <Page
                    current={pager.pageNumber}
                    pageSize={pager.pageSize}
                    total={pager.total}
                    cachePageQuery={true}
                    onPageChange={(number: number, size: number) => {
                      pager.pageNumber = number;
                      pager.pageSize = size;
                      void load();
                    }}
                  />
                ) : null,
            }}
          />
          <Modal
            open={visible.value}
            title={`${editingId.value ? "编辑" : "新增"}${seal ? "印章" : "事项"}`}
            width={600}
            confirmLoading={saving.value}
            onOk={() => void save()}
            onCancel={() => {
              visible.value = false;
            }}
          >
            <div style="display:flex;flex-direction:column;gap:16px">
              <label>
                {seal ? "印章名称" : "事项类型"}{" "}
                <Input
                  value={form.name}
                  maxlength={20}
                  onUpdate:value={(value: string) => {
                    form.name = value.replace(/\s+/gu, "");
                  }}
                />
              </label>
              <label>
                {seal ? "印章描述" : "事项描述"}{" "}
                <Textarea
                  value={form.desc}
                  maxlength={200}
                  rows={5}
                  placeholder={seal ? "请输入印章描述" : "请输入事项描述"}
                  onUpdate:value={(value: string) => {
                    form.desc = value.replace(/\s+/gu, "");
                  }}
                />
              </label>
            </div>
          </Modal>
        </>
      );
    },
  });
}
