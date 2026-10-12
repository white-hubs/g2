import type { OutsourceCompany, OutsourceMode } from "@g2-client/outsource-repair/client";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  PageLayout,
  type PcTableColumn,
  PopConfirm,
  PopOver,
  Select,
  TreeSelect,
  message,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getOutsourceRepairClient } from "@/domain-context";
import { toText, toTextArray } from "@/utils/form-value";
import { PRODUCT_CATEGORY_TREE_FIELD_NAMES, loadProductCategoryTree, type ProductCategoryNode } from "@/utils/product-category";

/** 旧页手机号校验规则。 */
const PHONE_PATTERN = /^1[3-9]\d{9}$/u;

const ellipsisCell = (text: unknown): JSX.Element => (
  <PopOver placement="topLeft" content={text ? String(text) : ""}>
    {text ? String(text) : "--"}
  </PopOver>
);

/** 列表把关联对象数组渲染为「名称 | 名称」。 */
function joinNames(value: unknown): string {
  return Array.isArray(value)
    ? value
        .map((item) => String((item as { name?: unknown })?.name ?? ""))
        .filter(Boolean)
        .join(" | ")
    : "";
}

/** 详情接口可能只回关联对象数组，这里统一取出提交所需的 ID 列表。 */
function toIdList(idList: unknown, objects: unknown): string[] {
  if (Array.isArray(idList) && idList.length > 0) {
    return idList.map((item) => String(item));
  }
  return Array.isArray(objects) ? objects.map((item) => String((item as { id?: unknown })?.id ?? "")).filter(Boolean) : [];
}

interface CompanyDraft {
  id?: string | number;
  name: string;
  outsourceModelIdList: string[];
  outsourceScopeIdList: string[];
  responsiblePerson: string;
  responsiblePersonPhone: string;
}

const emptyDraft = (): CompanyDraft => ({
  name: "",
  outsourceModelIdList: [],
  outsourceScopeIdList: [],
  responsiblePerson: "",
  responsiblePersonPhone: "",
});

export const OutsourceCompanyList = defineComponent({
  name: "OutsourceCompanyList",
  setup() {
    const client = getOutsourceRepairClient();
    const draft = reactive<CompanyDraft>(emptyDraft());
    const open = ref(false);
    /** 详情弹窗只读，与旧 g-table `detail` 一致。 */
    const readonly = ref(false);
    const saving = ref(false);
    const deleting = ref(false);
    const detailLoading = ref(false);
    const modeOptions = ref<{ label: string; value: string }[]>([]);
    const scopeOptions = ref<ProductCategoryNode[]>([]);
    let version = 0;
    let detailToken = 0;

    const load = async (): Promise<void> => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const rows = await client.listCompanies();
        if (current === version) {
          tableApi.setDataSource(rows);
        }
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : "委外公司加载失败");
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };

    const loadOptions = async (): Promise<void> => {
      try {
        const [modes, categories] = await Promise.all([client.listModes(), loadProductCategoryTree()]);
        modeOptions.value = modes.map((item: OutsourceMode) => ({ label: item.name, value: String(item.id ?? "") }));
        scopeOptions.value = categories;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "下拉选项加载失败");
      }
    };

    const applyDetail = (detail: OutsourceCompany): void => {
      draft.name = String(detail.name ?? "");
      draft.outsourceModelIdList = toIdList(detail.outsourceModelIdList, detail.outsourceModel);
      draft.outsourceScopeIdList = toIdList(detail.outsourceScopeIdList, detail.outsourceScope);
      draft.responsiblePerson = String(detail.responsiblePerson ?? "");
      draft.responsiblePersonPhone = String(detail.responsiblePersonPhone ?? "");
    };

    /** 弹窗先同步打开并用列表行回显，再异步加载详情覆盖；请求 token 忽略迟到响应。 */
    const openModal = (item?: OutsourceCompany, asReadonly = false): void => {
      Object.assign(draft, emptyDraft());
      readonly.value = asReadonly;
      open.value = true;
      if (!item) {
        detailLoading.value = false;
        return;
      }
      draft.id = item.id;
      applyDetail(item);
      if (item.id === undefined) {
        return;
      }
      const token = ++detailToken;
      detailLoading.value = true;
      client
        .getCompany(item.id)
        .then((detail) => {
          if (token === detailToken && detail) {
            applyDetail(detail);
          }
        })
        .catch((error: unknown) => {
          if (token === detailToken) {
            message.error(error instanceof Error ? error.message : "委外公司详情加载失败");
          }
        })
        .finally(() => {
          if (token === detailToken) {
            detailLoading.value = false;
          }
        });
    };

    const remove = async (item: OutsourceCompany): Promise<void> => {
      if (deleting.value || item.id === undefined) {
        return;
      }
      deleting.value = true;
      try {
        await client.deleteCompany(item.id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        deleting.value = false;
      }
    };

    const save = async (): Promise<void> => {
      if (saving.value || readonly.value) {
        return;
      }
      const name = draft.name.trim();
      const responsiblePerson = draft.responsiblePerson.trim();
      const responsiblePersonPhone = draft.responsiblePersonPhone.trim();
      if (!name) {
        message.warning("请输入委外公司");
        return;
      }
      if (draft.outsourceModelIdList.length === 0) {
        message.warning("请选择委外模式");
        return;
      }
      if (draft.outsourceScopeIdList.length === 0) {
        message.warning("请选择委外范围");
        return;
      }
      if (!responsiblePerson) {
        message.warning("请输入委外责任人");
        return;
      }
      if (!responsiblePersonPhone) {
        message.warning("请输入手机号码");
        return;
      }
      if (!PHONE_PATTERN.test(responsiblePersonPhone)) {
        message.warning("请输入正确的电话号码");
        return;
      }
      saving.value = true;
      try {
        const payload: OutsourceCompany = {
          name,
          outsourceModelIdList: draft.outsourceModelIdList,
          outsourceScopeIdList: draft.outsourceScopeIdList,
          responsiblePerson,
          responsiblePersonPhone,
        };
        if (draft.id === undefined) {
          await client.createCompany(payload);
        } else {
          await client.updateCompany({ ...payload, id: draft.id });
        }
        open.value = false;
        message.success("操作成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    const columns: PcTableColumn[] = [
      { title: "委外公司", dataIndex: "name", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "委外模式", dataIndex: "outsourceModel", ellipsis: true, customRender: ({ text }) => ellipsisCell(joinNames(text)) },
      { title: "委外范围", dataIndex: "outsourceScope", ellipsis: true, customRender: ({ text }) => ellipsisCell(joinNames(text)) },
      { title: "委外责任人", dataIndex: "responsiblePerson", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "责任人手机号码", dataIndex: "responsiblePersonPhone", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      {
        title: "操作",
        dataIndex: "action",
        width: 200,
        customRender: ({ record }) => (
          <>
            <Button type="link" onClick={() => openModal(record as OutsourceCompany, true)}>
              详情
            </Button>
            <Button type="link" onClick={() => openModal(record as OutsourceCompany)}>
              编辑
            </Button>
            <PopConfirm
              title="确认删除该委外公司？"
              okText="确定"
              cancelText="取消"
              onConfirm={() => void remove(record as OutsourceCompany)}
            >
              <Button type="link" danger disabled={deleting.value}>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({ columns, tableCode: "REPAIR_OUTSOURCE_COMPANY", rowKey: "id", autoFetch: false });

    void load();
    void loadOptions();

    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={() => openModal()}>
          新增
        </Button>
      ),
      "layout-content": () => <PcTable />,
    };

    return () => (
      <>
        <PageLayout title="委外公司" showFooter={false} v-slots={slots} />
        <Modal
          open={open.value}
          title="委外公司"
          okText="确定"
          cancelText="取消"
          confirmLoading={saving.value || detailLoading.value}
          footer={readonly.value ? null : undefined}
          onOk={() => void save()}
          onCancel={() => {
            open.value = false;
          }}
        >
          <Form layout="vertical">
            <FormItem label="委外公司" required>
              <Input
                value={draft.name}
                maxlength={20}
                placeholder="请输入委外公司"
                disabled={readonly.value}
                onUpdate:value={(value: string) => {
                  draft.name = value;
                }}
              />
            </FormItem>
            <FormItem label="委外模式" required>
              <Select
                mode="multiple"
                value={draft.outsourceModelIdList}
                options={modeOptions.value}
                placeholder="请选择委外模式"
                allowClear
                disabled={readonly.value}
                onUpdate:value={(raw: unknown) => {
                  draft.outsourceModelIdList = toTextArray(raw);
                }}
              />
            </FormItem>
            <FormItem label="委外范围" required>
              <TreeSelect
                multiple
                treeCheckable={false}
                value={draft.outsourceScopeIdList}
                treeData={scopeOptions.value}
                fieldNames={PRODUCT_CATEGORY_TREE_FIELD_NAMES}
                placeholder="请选择委外范围"
                allowClear
                disabled={readonly.value}
                treeNodeFilterProp="categoryName"
                style={{ width: "100%" }}
                onUpdate:value={(raw: unknown) => {
                  draft.outsourceScopeIdList = toTextArray(raw);
                }}
              />
            </FormItem>
            <FormItem label="委外责任人" required>
              <Input
                value={draft.responsiblePerson}
                placeholder="请输入委外责任人"
                disabled={readonly.value}
                onUpdate:value={(value: string) => {
                  draft.responsiblePerson = value;
                }}
              />
            </FormItem>
            <FormItem label="手机号码" required>
              <Input
                value={draft.responsiblePersonPhone}
                maxlength={11}
                placeholder="请输入手机号码"
                disabled={readonly.value}
                onUpdate:value={(value: unknown) => {
                  draft.responsiblePersonPhone = toText(value);
                }}
              />
            </FormItem>
          </Form>
        </Modal>
      </>
    );
  },
});
