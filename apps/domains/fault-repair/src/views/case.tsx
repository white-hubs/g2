import type { FaultAttachment, FaultCategory, FaultRecord, FaultType } from "@g2-client/fault-repair/client";
import {
  Button,
  Cascader,
  Form,
  FormItem,
  Input,
  Page,
  PageLayout,
  type PcTableColumn,
  PlusOutlined,
  PopConfirm,
  Select,
  Spin,
  TabPane,
  Tabs,
  Tree,
  Upload,
  type UploadFile,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { RichTextEditor } from "@g2-platform/pc-ui";
import { computed, defineComponent, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getFaultMaintainRuntime, getFaultRepairClient } from "../domain-context";
import { CaseTrendChart } from "./case-trend-chart";

import styles from "./case.module.css";

interface CaseTreeNode {
  key: string;
  title: string;
  children?: CaseTreeNode[];
}
export const FaultCaseList = defineComponent({
  name: "FaultCaseList",
  setup() {
    const { basePath, applicationCode } = getFaultMaintainRuntime();
    const client = getFaultRepairClient();
    const router = useRouter();
    const query = reactive({
      keyword: "",
      faultTypeId: undefined as string | undefined,
      productCategoryCode: undefined as string | undefined,
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const types = ref<{ label: string; value: string }[]>([]);
    const categories = ref<FaultCategory[]>([]);
    const deleting = ref(false);
    let version = 0;
    const go = (mode: string, item?: FaultRecord) => {
      void router.push({ path: `${basePath}/fault-case-operate`, query: { type: mode, ...(item?.id ? { id: String(item.id) } : {}) } });
    };
    const remove = async (item: FaultRecord) => {
      if (deleting.value || !item.id) {
        return;
      }
      deleting.value = true;
      try {
        await client.deleteCase(item.id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        deleting.value = false;
      }
    };
    const columns: PcTableColumn[] = [
      { title: "故障类型", dataIndex: "faultTypeName", ellipsis: true },
      { title: "故障名称", dataIndex: "name", ellipsis: true },
      { title: "产品品类", dataIndex: "productCategoryName", ellipsis: true },
      {
        title: "操作",
        dataIndex: "action",
        width: 210,
        customRender: ({ record }) => (
          <>
            <Button type="link" onClick={() => go("detail", record as FaultRecord)}>
              详情
            </Button>
            <Button type="link" onClick={() => go("edit", record as FaultRecord)}>
              编辑
            </Button>
            <PopConfirm title="确认删除故障案例？" okText="确定" cancelText="取消" onConfirm={() => void remove(record as FaultRecord)}>
              <Button type="link" danger disabled={deleting.value}>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];
    const [PcTable, tableApi] = usePcTable({ columns, tableCode: "FAULT_CASE_LIST", rowKey: "id", autoFetch: false });
    async function load() {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await client.pageCases({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: query.keyword,
          faultTypeId: query.faultTypeId,
          productCategoryCode: query.productCategoryCode,
        });
        if (current === version) {
          tableApi.setDataSource(result.records);
          page.total = result.total;
        }
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : "案例加载失败");
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    }
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Select",
          fieldName: "faultTypeId",
          label: "故障类型",
          componentProps: { options: types, allowClear: true, placeholder: "请选择故障类型" },
          defaultValue: undefined,
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          componentProps: { placeholder: "名称", allowClear: true },
          defaultValue: "",
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        query.faultTypeId = typeof values.faultTypeId === "string" ? values.faultTypeId : undefined;
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.keyword = "";
        query.faultTypeId = undefined;
        page.pageNumber = 1;
        void load();
      },
    });
    const categoryNodes = (items: FaultCategory[]): CaseTreeNode[] =>
      items.map((item) => ({
        key: item.categoryCode,
        title: `${item.categoryName}【${item.deviceNum ?? 0}】`,
        ...(item.children?.length ? { children: categoryNodes(item.children) } : {}),
      }));
    void client
      .listTypes({ applicationCode })
      .then((rows) => {
        types.value = rows.map((item) => ({ label: item.name, value: String(item.id) }));
      })
      .catch((error) => message.error(String(error)));
    void client
      .listCaseCategories({ applicationCode })
      .then((rows) => {
        categories.value = rows;
      })
      .catch((error) => message.error(String(error)));
    void load();
    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={() => go("add")}>
          新增
        </Button>
      ),
      "layout-content": () => (
        <div class={styles.listLayout}>
          <aside class={styles.categoryTree}>
            <Tree
              key={categories.value.length}
              treeData={categoryNodes(categories.value)}
              defaultExpandAll
              selectedKeys={query.productCategoryCode ? [query.productCategoryCode] : []}
              onSelect={(keys: (string | number)[]) => {
                query.productCategoryCode = keys.length ? String(keys[0]) : undefined;
                page.pageNumber = 1;
                void load();
              }}
            />
          </aside>
          <div class={styles.listMain}>
            <PcForm />
            <PcTable />
          </div>
        </div>
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
    return () => <PageLayout title="故障案例" v-slots={slots} />;
  },
});

export const FaultCaseOperate = defineComponent({
  name: "FaultCaseOperate",
  setup() {
    const { basePath, applicationCode } = getFaultMaintainRuntime();
    const client = getFaultRepairClient();
    const route = useRoute();
    const router = useRouter();
    const mode = String(route.query.type ?? "add");
    const readonly = mode === "detail";
    const model = reactive<FaultRecord>({
      name: "",
      faultTypeId: undefined,
      faultTypeName: "",
      productCategoryCode: undefined,
      faultPhenomenon: "",
      faultReason: "",
      treatmentMeasures: "",
      fileIds: [],
    });
    const types = ref<FaultType[]>([]);
    const categories = ref<FaultCategory[]>([]);
    const loading = ref(false);
    const saving = ref(false);
    const uploading = ref(false);
    const tab = ref("detail");
    let version = 0;
    const trend = ref<{ total: number; months: { timeFlag: string; num: number }[] }>();
    const back = () => {
      void router.push(`${basePath}/fault-case`);
    };
    const load = async () => {
      const id = route.query.id;
      if (!id) {
        return;
      }
      const current = ++version;
      loading.value = true;
      try {
        const result = await client.getCase(String(id));
        if (current === version) {
          Object.assign(model, result, {
            fileIds: Array.isArray(result.files) ? result.files.map((file) => (file as { id: string | number }).id) : result.fileIds,
          });
        }
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : "案例详情加载失败");
        }
      } finally {
        if (current === version) {
          loading.value = false;
        }
      }
    };
    const save = async () => {
      if (saving.value) {
        return;
      }
      const hasRichText = (value: unknown) => {
        const html = String(value ?? "");
        return (
          /<img\b/i.test(html) ||
          html
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .trim().length > 0
        );
      };
      if (
        !String(model.name ?? "").trim() ||
        !model.faultTypeId ||
        !model.productCategoryCode ||
        !hasRichText(model.faultPhenomenon) ||
        !hasRichText(model.faultReason) ||
        !hasRichText(model.treatmentMeasures) ||
        !model.fileIds ||
        (Array.isArray(model.fileIds) && model.fileIds.length === 0)
      ) {
        message.warning("请填写案例名称、故障类型、产品品类、现象、原因、处理措施并上传附件");
        return;
      }
      saving.value = true;
      try {
        const payload = {
          id: model.id,
          name: model.name,
          faultTypeId: model.faultTypeId,
          faultPhenomenon: model.faultPhenomenon,
          faultReason: model.faultReason,
          treatmentMeasures: model.treatmentMeasures,
          fileIds: model.fileIds,
          applicationCode,
          faultTypeName: types.value.find((item) => String(item.id) === String(model.faultTypeId))?.name,
          productCategoryCode: Array.isArray(model.productCategoryCode) ? model.productCategoryCode.join("-") : model.productCategoryCode,
        };
        if (model.id) {
          await client.updateCase(payload as FaultRecord & { id: string | number });
        } else {
          await client.createCase(payload);
        }
        message.success("操作成功");
        back();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };
    const files = computed<FaultAttachment[]>(() => (Array.isArray(model.files) ? (model.files as FaultAttachment[]) : []));
    const uploadFiles = computed<UploadFile[]>(() =>
      files.value.map((file) => ({
        uid: String(file.id),
        name: file.name ?? "附件",
        status: "done",
        url: file.url ?? file.path,
      })),
    );
    const removeFile = (file: UploadFile) => {
      model.files = files.value.filter((item) => String(item.id) !== file.uid);
      model.fileIds = (Array.isArray(model.fileIds) ? model.fileIds : []).filter((id) => String(id) !== file.uid);
      return true;
    };
    const previewFile = (file: UploadFile) => {
      if (!file.url) {
        message.warning("该附件暂无预览地址");
        return;
      }
      window.open(file.url, "_blank", "noopener,noreferrer");
    };
    const upload = async (file: File) => {
      if (uploading.value) {
        return false;
      }
      uploading.value = true;
      try {
        const result = await client.uploadCaseFile(file);
        model.fileIds = [
          ...(Array.isArray(model.fileIds)
            ? model.fileIds
            : typeof model.fileIds === "string"
              ? model.fileIds.split(",").filter(Boolean)
              : []),
          result.id,
        ];
        model.files = [...files.value, { ...result, name: result.name ?? file.name }];
      } catch (error) {
        message.error(error instanceof Error ? error.message : "附件上传失败");
      } finally {
        uploading.value = false;
      }
      return false;
    };
    void client
      .listTypes({ applicationCode })
      .then((rows) => {
        types.value = rows;
      })
      .catch((error) => message.error(String(error)));
    void client
      .listProductCategories()
      .then((rows) => {
        categories.value = rows;
      })
      .catch((error) => message.error(String(error)));
    void load();
    if (readonly && route.query.id) {
      void client
        .getCaseTrend(String(route.query.id))
        .then((value) => {
          trend.value = value;
        })
        .catch((error) => message.error(String(error)));
    }
    const editor = (label: string, key: "faultPhenomenon" | "faultReason" | "treatmentMeasures") => (
      <div class={styles.richRow}>
        <label class={styles.richLabel}>
          <span class={styles.required}>*</span>
          {label}：
        </label>
        <div class={styles.richContent}>
          {readonly ? (
            <div class={styles.richReadonly} innerHTML={String(model[key] ?? "")} />
          ) : (
            <RichTextEditor
              modelValue={String(model[key] ?? "")}
              placeholder={`请填写${label}`}
              onUpdate:modelValue={(value: string) => {
                model[key] = value;
              }}
            />
          )}
        </div>
      </div>
    );
    const caseForm = () => (
      <Form class={styles.caseForm} layout="horizontal">
        <div class={styles.firstRow}>
          <FormItem label="案例名称" required>
            {readonly ? (
              <span>{String(model.name ?? "--")}</span>
            ) : (
              <Input
                value={String(model.name ?? "")}
                maxlength={20}
                placeholder="案例名称"
                showCount
                onUpdate:value={(value: string) => {
                  model.name = value;
                }}
              />
            )}
          </FormItem>
          <FormItem label="故障类型" required>
            {readonly ? (
              <span>{String(model.faultTypeName ?? "--")}</span>
            ) : (
              <Select
                value={model.faultTypeId as string | number | undefined}
                placeholder="请选择"
                options={types.value.map((item) => ({ label: item.name, value: item.id }))}
                onChange={(value) => {
                  model.faultTypeId = typeof value === "string" || typeof value === "number" ? value : undefined;
                }}
              />
            )}
          </FormItem>
          <FormItem label="产品品类" required>
            {readonly ? (
              <span>{String(model.productCategoryName ?? "--")}</span>
            ) : (
              <Cascader
                value={
                  Array.isArray(model.productCategoryCode)
                    ? model.productCategoryCode
                    : String(model.productCategoryCode ?? "")
                        .split("-")
                        .filter(Boolean)
                }
                options={categories.value}
                fieldNames={{ label: "categoryName", value: "categoryCode", children: "children" }}
                placeholder="请选择"
                onChange={(value) => {
                  model.productCategoryCode = Array.isArray(value) ? value.map(String) : [];
                }}
              />
            )}
          </FormItem>
        </div>
        {editor("现象", "faultPhenomenon")}
        {editor("原因", "faultReason")}
        {editor("处理措施", "treatmentMeasures")}
        <FormItem label="附件" required class={styles.attachmentRow}>
          <Upload
            listType="picture-card"
            fileList={uploadFiles.value}
            beforeUpload={upload}
            isImageUrl={() => false}
            showUploadList={{ showPreviewIcon: true, showRemoveIcon: !readonly }}
            onPreview={previewFile}
            onRemove={removeFile}
          >
            {!readonly && (
              <div class={styles.uploadTrigger}>
                <PlusOutlined />
                <span>{uploading.value ? "上传中" : "上传"}</span>
              </div>
            )}
          </Upload>
        </FormItem>
      </Form>
    );
    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          {readonly ? (
            <Tabs
              activeKey={tab.value}
              onChange={(value) => {
                tab.value = String(value);
              }}
            >
              <TabPane key="detail" tab="案例详情">
                {caseForm()}
              </TabPane>
              <TabPane key="frequency" tab="频次">
                <div style={{ padding: "16px" }}>
                  <div class={styles.trendLayout}>
                    <div class={styles.trendTotal}>
                      <span>总数</span>
                      <strong>{trend.value?.total ?? 0}</strong>
                      <span>次</span>
                    </div>
                    <CaseTrendChart months={trend.value?.months ?? []} />
                  </div>
                </div>
              </TabPane>
            </Tabs>
          ) : (
            caseForm()
          )}
        </Spin>
      ),
      "footer-page": () => (
        <>
          <Button onClick={back}>返回</Button>
          {!readonly && (
            <Button type="primary" loading={saving.value} onClick={() => void save()}>
              保存
            </Button>
          )}
        </>
      ),
    };
    return () => <PageLayout title={readonly ? "案例详情" : mode === "add" ? "案例新增" : "案例编辑"} v-slots={slots} />;
  },
});
