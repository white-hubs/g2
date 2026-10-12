import type { AssetRow, EditableResource } from "@g2-contract/asset-management";
import type { SceneFile } from "@g2-contract/file";
import type { FormInstance } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, reactive, ref, watch } from "vue";

import { getClient, getFileClient } from "./domain-context";
import { FileField } from "./file-field";
import { errorText, fileIds } from "./model";
import { useOptions } from "./options";
import { loadPcUi } from "./runtime-modules";

import styles from "./styles.module.css";
const { Form, FormItem, Input, InputNumber, Modal, Textarea, TreeSelect, message } = await loadPcUi();
export const ConfigEditor = defineComponent({
  props: {
    open: Boolean,
    resource: { type: String as PropType<EditableResource>, required: true },
    row: Object as PropType<AssetRow>,
    parentId: String,
  },
  emits: { close: () => true, saved: () => true },
  setup(props, { emit }) {
    const draft = reactive<Record<string, unknown>>({});
    const files = ref<SceneFile[]>([]);
    const saving = ref(false);
    const form = ref<FormInstance>();
    const choices = useOptions();
    watch(
      () => props.open,
      (open) => {
        if (!open) {
          return;
        }
        Object.keys(draft).forEach((key) => {
          delete draft[key];
        });
        Object.assign(draft, props.row ?? {}, { parentId: props.row?.parentId || props.parentId || undefined });
        files.value = Array.isArray(props.row?.file) ? (props.row.file as SceneFile[]) : [];
        form.value?.clearValidate();
        if (props.resource === "consumable" || props.resource === "category") {
          void choices.load(["categories"]).catch((error: unknown) => message.error(errorText(error)));
        }
      },
    );
    const save = async () => {
      if (saving.value) {
        return;
      }
      try {
        await form.value?.validate();
      } catch {
        return;
      }
      saving.value = true;
      try {
        const body = {
          ...draft,
          name: String(draft.name ?? "").trim(),
          ...(props.resource === "consumable" ? { file: files.value.map((file) => file.id) } : {}),
        };
        if (props.resource === "consumable") {
          await (await getFileClient()).persistSceneFiles("PROPERTY_MANAGEMENT::CONSUMABLE", fileIds(body.file));
        }
        await getClient().save(props.resource, body, props.row?.id);
        message.success("保存成功");
        emit("saved");
        emit("close");
      } catch (error) {
        message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    };
    const field = (name: string, label: string, required = false, number = false) => (
      <FormItem label={label} name={name} rules={required ? [{ required: true, message: `请填写${label}` }] : undefined}>
        {number ? (
          <InputNumber
            placeholder={`请输入${label}`}
            value={draft[name] as number | undefined}
            min={0}
            precision={["stockMax", "stockMin", "useLimit", "qualityPeriod"].includes(name) ? 0 : undefined}
            onChange={(value) => {
              draft[name] = value;
            }}
          />
        ) : (
          <Input
            placeholder={`请输入${label}`}
            value={draft[name] as string | undefined}
            maxlength={20}
            onChange={(event) => {
              draft[name] = event.target.value;
            }}
          />
        )}
      </FormItem>
    );
    const categoryChoices = () => {
      const exclude = (items: typeof choices.data.categories): typeof items => {
        const result: typeof items = [];
        for (const item of items) {
          if (item.id !== props.row?.id) {
            result.push({ ...item, children: exclude(item.children ?? []) });
          }
        }
        return result;
      };
      return props.resource === "category" ? exclude(choices.data.categories) : choices.data.categories;
    };
    return () => (
      <Modal
        okText="确定"
        cancelText="取消"
        open={props.open}
        title={`${props.row ? "编辑" : "新增"}${{ warehouse: "仓库", consumable: "耗材", category: "耗材分类", assetType: "资产分类", assetSource: "资产来源", reasonForScrapping: "报废原因", abnormalType: "异常类型" }[props.resource]}`}
        width={props.resource === "consumable" ? 760 : 560}
        confirmLoading={saving.value}
        onOk={() => void save()}
        onCancel={() => emit("close")}
      >
        <Form ref={form} model={draft} layout="vertical" class={styles.editor}>
          {props.resource === "consumable" && (
            <FormItem label="耗材分类" name="categoryId" rules={[{ required: true, message: "请选择耗材分类" }]}>
              <TreeSelect
                value={draft.categoryId as string | undefined}
                treeData={categoryChoices()}
                fieldNames={{ label: "name", value: "id", children: "children" }}
                showSearch
                treeNodeFilterProp="name"
                allowClear
                onChange={(value) => {
                  draft.categoryId = value;
                }}
              />
            </FormItem>
          )}
          {props.resource === "category" && (
            <FormItem label="上级分类" name="parentId">
              <TreeSelect
                value={draft.parentId as string | undefined}
                treeData={categoryChoices()}
                fieldNames={{ label: "name", value: "id", children: "children" }}
                allowClear
                onChange={(value) => {
                  draft.parentId = value;
                }}
              />
            </FormItem>
          )}
          {field(
            "name",
            {
              warehouse: "仓库名称",
              consumable: "耗材名称",
              category: "分类名称",
              assetType: "资产类别名称",
              assetSource: "资产来源名称",
              reasonForScrapping: "报废原因名称",
              abnormalType: "类型名称",
            }[props.resource],
            true,
          )}
          {(props.resource === "warehouse" || props.resource === "consumable") &&
            field("code", props.resource === "warehouse" ? "仓库编码" : "耗材编码", true)}
          {props.resource === "consumable" && (
            <>
              {field("brand", "品牌")}
              {field("model", "规格型号")}
              {field("goodsCode", "商品码")}
              {field("unit", "单位", true)}
              {field("qualityPeriod", "质保期限(月)", false, true)}
              {field("stockMax", "库存上限", false, true)}
              {field("stockMin", "库存下限", false, true)}
              {field("useLimit", "限领数量(人/月)", false, true)}
              <FormItem label="附件" class={styles.full}>
                <FileField
                  scene="PROPERTY_MANAGEMENT::CONSUMABLE"
                  value={files.value}
                  onChange={(value) => {
                    files.value = value;
                  }}
                />
              </FormItem>
            </>
          )}
          {props.resource !== "consumable" && (
            <FormItem label="备注说明" name={props.resource === "warehouse" ? "remark" : "remarks"} class={styles.full}>
              <Textarea
                value={draft[props.resource === "warehouse" ? "remark" : "remarks"] as string | undefined}
                maxlength={200}
                placeholder="请输入备注说明"
                rows={4}
                showCount
                onChange={(event) => {
                  draft[props.resource === "warehouse" ? "remark" : "remarks"] = event.target.value;
                }}
              />
            </FormItem>
          )}
        </Form>
      </Modal>
    );
  },
});
