import type { ColumnType, PcFormSchemaProp } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { CONFIG } from "./config";
import { getClient, getOuaa, loadUi, useNavigation } from "./context";
import { LABELS, type Row, allowedAction, dateValue, download, errorText, number, object, options, rows, text } from "./model";

import styles from "./styles.module.css";
const {
  Button,
  Input,
  Textarea,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Space,
  Upload,
  message,
  dayjs,
  usePcForm,
  usePcTable,
  generateQrCode,
} = await loadUi();
export function createList(slug: string) {
  const config = CONFIG[slug];
  return defineComponent({
    name: `SecureEdu${slug}`,
    setup() {
      const route = useRoute();
      const navigation = useNavigation();
      const BASE = navigation.basePath;

      const filter = reactive<Record<string, unknown>>({});
      const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const choices = reactive<Record<string, { label: string; value: string }[]>>({ themes: [], departments: [] });
      let version = 0;
      const loadingExport = ref(false);
      const mutating = reactive(new Set<string>());
      const themeOpen = ref(false);
      const themeRow = reactive({ id: "", name: "", remark: "" });
      const themeSaving = ref(false);
      const importOpen = ref(false);
      const importing = ref(false);
      const importFile = ref<File>();
      const importResult = ref<Record<string, unknown>>();
      const qrOpen = ref(false);
      const qrImage = ref("");
      const qrName = ref("");
      const navigate = (row?: Row, action = "detail") => {
        if (slug === "theme") {
          Object.assign(themeRow, { id: row?.id ?? "", name: text(row?.name), remark: text(row?.remark) });
          themeOpen.value = true;
          return;
        }
        void navigation.push({
          path: `${BASE}/${slug}-form`,
          query: { id: row?.id, action: row ? action : "add", returnPath: route.fullPath },
        });
      };
      const query = () => {
        const result = { ...filter };
        if (slug === "exam-task" && result.period) {
          const date = dayjs(text(result.period));
          result.period = `${date.startOf("day").format("YYYY-MM-DD HH:mm:ss")},${date.endOf("day").format("YYYY-MM-DD HH:mm:ss")}`;
        }
        if (slug.endsWith("details")) {
          result[slug === "training-details" ? "cultivateTaskId" : "examTaskId"] = route.query.id;
          const type = text(route.query.type);
          if (slug === "training-details") {
            if (type === "迟到") {
              result.belated = true;
            } else if (type) {
              result.userSignStatus = type === "缺勤" ? "UNSIGNED" : "SIGNED";
            }
          } else if (type === "不及格") {
            result.passed = false;
          } else if (type) {
            result.examStatus = type === "缺考" ? "MISS_EXAM" : "EXAMINED";
          }
        }
        return result;
      };
      async function load() {
        const current = ++version;
        table.loading.value = true;
        try {
          const response = await getClient().page(config.resource, { ...query(), pageNumber: pager.pageNumber, pageSize: pager.pageSize });
          if (current === version) {
            table.setDataSource(response.records);
            pager.total = response.total;
          }
        } catch (error) {
          message.error(errorText(error));
        } finally {
          if (current === version) {
            table.loading.value = false;
          }
        }
      }
      async function remove(row: Row) {
        if (mutating.has(row.id)) {
          return;
        }
        mutating.add(row.id);
        try {
          await getClient().remove(config.resource, row.id);
          message.success("删除成功");
          if (pager.pageNumber > 1 && pager.total % pager.pageSize === 1) {
            pager.pageNumber--;
          }
          await load();
        } catch (error) {
          message.error(errorText(error));
        } finally {
          mutating.delete(row.id);
        }
      }
      async function publish(row: Row, published: boolean) {
        if (slug !== "training-task" && slug !== "exam-task") {
          return;
        }
        if (mutating.has(row.id)) {
          return;
        }
        mutating.add(row.id);
        try {
          await getClient().setPublished(slug, row.id, published);
          message.success(published ? "发布成功" : "撤回成功");
          await load();
        } catch (error) {
          message.error(errorText(error));
        } finally {
          mutating.delete(row.id);
        }
      }
      async function showQr(row: Row) {
        try {
          qrName.value = text(row.name);
          qrImage.value = await generateQrCode(
            slug === "training-task"
              ? row.id
              : `${location.origin}/apps/secure-edu/h5/#/secure-exam/detail?id=${encodeURIComponent(row.id)}`,
          );
          qrOpen.value = true;
        } catch (error) {
          message.error(errorText(error));
        }
      }
      const countLink = (row: Row, type: string) => {
        const training = slug === "training-count" && ["实际参加人数", "缺勤", "迟到"].includes(type);
        void navigation.push({
          path: `${BASE}/${training ? "training-details" : slug === "training-count" ? "training-exam-details" : "exam-details"}`,
          query: { id: training ? row.id : slug === "training-count" ? text(row.examTaskId) : row.id, type, returnPath: route.fullPath },
        });
      };
      const columns: ColumnType<Row>[] = [
        {
          title: "序号",
          dataIndex: "sequence",
          width: 70,
          align: "center",
          customRender: ({ index }) => (pager.pageNumber - 1) * pager.pageSize + index + 1,
        },
        ...config.columns.map(
          (item): ColumnType<Row> => ({
            title: item.label,
            dataIndex: item.field,
            width: item.width,
            ellipsis: true,
            customRender: ({ record }) => {
              const value = record[item.field];
              if (item.link) {
                return (
                  <Button type="link" size="small" onClick={() => countLink(record, item.link!)}>
                    {text(value) || "0"}
                  </Button>
                );
              }
              if (item.field === "file") {
                const file = object(value);
                return (
                  <Button
                    type="link"
                    size="small"
                    disabled={!file.path}
                    onClick={async () => {
                      try {
                        const link = document.createElement("a");
                        link.href = text(file.path);
                        link.download = text(file.name) || "课件";
                        link.target = "_blank";
                        link.rel = "noopener noreferrer";
                        link.click();
                      } catch (error) {
                        message.error(errorText(error));
                      }
                    }}
                  >
                    {text(file.name) || "—"}
                  </Button>
                );
              }
              if (item.field === "fileSize") {
                const size = object(record.file).size ?? value;
                return size ? `${(number(size) / 1024).toFixed(2)} KB` : "—";
              }
              if (item.field === "duration") {
                const seconds = number(value);
                return seconds
                  ? `${Math.floor(seconds / 3600)
                      .toString()
                      .padStart(2, "0")}:${Math.floor((seconds % 3600) / 60)
                      .toString()
                      .padStart(2, "0")}:${Math.floor(seconds % 60)
                      .toString()
                      .padStart(2, "0")}`
                  : "—";
              }
              if (item.field === "examPapers") {
                return (
                  <Space direction="vertical">
                    {rows(value).map((paper) => (
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          void navigation.push({
                            path: `${BASE}/exam-paper-detail`,
                            query: { id: record.id, examPaperId: paper.id, action: "detail", returnPath: route.fullPath },
                          })
                        }
                      >
                        {text(paper.name)}
                      </Button>
                    ))}
                  </Space>
                );
              }
              if (item.field === "sourceCode") {
                return value === "HEADQUARTERS" ? "集团下发" : "自建任务";
              }
              if (item.field === "hasExam") {
                return value ? "是" : "否";
              }
              if (item.field === "passingRate") {
                return `${text(value) || "0"}%`;
              }
              if (item.field === "userSignStatus") {
                return `${value === "SIGNED" ? "已签" : "未签"}${record.belated ? "（迟到）" : ""}`;
              }
              if (item.field.endsWith("Time")) {
                const time = value ?? record.editTime ?? record.updatedAt;
                return time ? dayjs(dateValue(time)).format("YYYY-MM-DD HH:mm:ss") : "—";
              }
              return LABELS[text(value)] ?? (text(value) || "—");
            },
          }),
        ),
      ];
      if (config.editable) {
        columns.push({
          title: "操作",
          dataIndex: "action",
          width: slug.endsWith("task") ? 400 : 190,
          fixed: "right",
          customRender: ({ record }) => {
            const task = slug.endsWith("task");
            const training = slug === "training-task";
            return (
              <Space size={0}>
                {slug !== "theme" && (
                  <Button size="small" type="link" onClick={() => navigate(record)}>
                    详情
                  </Button>
                )}
                <Button
                  size="small"
                  type="link"
                  disabled={task && !allowedAction(record, "edit", training)}
                  onClick={() => navigate(record, "edit")}
                >
                  编辑
                </Button>
                {task && (
                  <>
                    <Button
                      size="small"
                      type="link"
                      disabled={mutating.has(record.id) || !allowedAction(record, "publish", training)}
                      onClick={() =>
                        Modal.confirm({ title: "确认发布任务？", okText: "发布", cancelText: "取消", onOk: () => publish(record, true) })
                      }
                    >
                      发布
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      disabled={mutating.has(record.id) || !allowedAction(record, "withdraw", training)}
                      onClick={() =>
                        Modal.confirm({ title: "确认撤回任务？", okText: "撤回", cancelText: "取消", onOk: () => publish(record, false) })
                      }
                    >
                      撤回
                    </Button>
                    <Button size="small" type="link" onClick={() => void showQr(record)}>
                      {training ? "二维码" : record.examTaskType === "STAFF_EXAM" ? "员工二维码" : "商户二维码"}
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      onClick={() =>
                        Modal.info({
                          title: "分享链接",
                          okText: "关闭",
                          content: (
                            <Space direction="vertical" style={{ width: "100%" }}>
                              <Input
                                readonly
                                value={`${location.origin}/apps/secure-edu/h5/#/${training ? "train-list" : "secure-exam"}`}
                              />
                              <Button
                                type="primary"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      `${location.origin}/apps/secure-edu/h5/#/${training ? "train-list" : "secure-exam"}`,
                                    );
                                    message.success("复制成功");
                                  } catch (error) {
                                    message.error(errorText(error));
                                  }
                                }}
                              >
                                复制链接
                              </Button>
                            </Space>
                          ),
                        })
                      }
                    >
                      分享
                    </Button>
                  </>
                )}
                <PopConfirm title="确定删除？" okText="确定" cancelText="取消" onConfirm={() => remove(record)}>
                  <Button
                    size="small"
                    type="link"
                    danger
                    loading={mutating.has(record.id)}
                    disabled={task && !allowedAction(record, "delete", training)}
                  >
                    删除
                  </Button>
                </PopConfirm>
              </Space>
            );
          },
        });
      }
      const [PcTable, table] = usePcTable({
        rowKey: "id",
        tableCode: `SECURE_EDU_MARKET_${slug}`,
        columns,
        autoFetch: false,
        pagination: false,
      });
      const schema = (): PcFormSchemaProp[] =>
        config.filters.map((item) => ({
          component: item.kind ?? "Input",
          fieldName: item.field,
          label: item.label,
          defaultValue: item.kind === "Input" ? "" : undefined,
          componentProps: {
            placeholder: item.kind === "Input" ? item.options?.[0]?.label : `请选择${item.label}`,
            allowClear: true,
            options: item.remote ? choices[item.remote] : item.options,
            valueFormat: item.kind === "DatePicker" ? "YYYY-MM-DD" : undefined,
          },
        }));
      const [PcForm, form] = usePcForm({
        layout: "horizontal",
        syncStateRef: filter,
        cache: false,
        actionsInline: true,
        showCollapseButton: false,
        schema: schema(),
        handleSubmit: () => {
          pager.pageNumber = 1;
          void load();
        },
        handleReset: () => {
          pager.pageNumber = 1;
          void load();
        },
      });
      onMounted(() => {
        void load();
        for (const remote of new Set(config.filters.flatMap((item) => (item.remote ? [item.remote] : [])))) {
          void (async () => {
            try {
              const value =
                remote === "themes" ? await getClient().themes() : await (await getOuaa()).listFlowDepartmentOptions({ enabled: true });
              const data = value && typeof value === "object" && "data" in value ? value.data : value;
              choices[remote] = options(rows(data));
              form.updateSchema(schema());
            } catch (error) {
              message.error(errorText(error));
            }
          })();
        }
      });
      onUnmounted(() => {
        version++;
      });
      async function exportList() {
        loadingExport.value = true;
        try {
          download(await getClient().export(config.resource, query()), `${config.title}.xlsx`);
        } catch (error) {
          message.error(errorText(error));
        } finally {
          loadingExport.value = false;
        }
      }
      return () => (
        <>
          <PageLayout
            title={config.title}
            showFooter
            v-slots={{
              "layout-header": () => (
                <Space>
                  {config.resource === "question" && (
                    <>
                      <Button
                        onClick={async () => {
                          try {
                            download(await getClient().questionTemplate(), "考题库模板.xlsx");
                          } catch (error) {
                            message.error(errorText(error));
                          }
                        }}
                      >
                        下载模版
                      </Button>
                      <Button
                        onClick={() => {
                          importOpen.value = true;
                          importFile.value = undefined;
                          importResult.value = undefined;
                        }}
                      >
                        批量导入
                      </Button>
                    </>
                  )}
                  {config.editable && (
                    <Button type="primary" onClick={() => navigate()}>
                      新增
                    </Button>
                  )}
                  {config.export && (
                    <Button loading={loadingExport.value} onClick={() => void exportList()}>
                      导出
                    </Button>
                  )}
                </Space>
              ),
              "layout-content": () => (
                <div class={styles.main}>
                  {config.filters.length > 0 && <PcForm />}
                  <PcTable />
                </div>
              ),
              "footer-page": () => (
                <>
                  <Page
                    cachePageQuery={false}
                    syncToUrl={false}
                    current={pager.pageNumber}
                    pageSize={pager.pageSize}
                    total={pager.total}
                    onPageChange={(n: number, s: number) => {
                      pager.pageNumber = n;
                      pager.pageSize = s;
                      void load();
                    }}
                  />
                  {slug.endsWith("details") && (
                    <Button
                      style={{ marginLeft: "auto" }}
                      onClick={() =>
                        void navigation.push(
                          text(route.query.returnPath) || `${BASE}/${slug === "training-details" ? "training-count" : "exam-count"}`,
                        )
                      }
                    >
                      返回
                    </Button>
                  )}
                </>
              ),
            }}
          />
          <Modal
            title={themeRow.id ? "编辑主题" : "新增主题"}
            open={themeOpen.value}
            okText="保存"
            cancelText="取消"
            confirmLoading={themeSaving.value}
            onCancel={() => {
              themeOpen.value = false;
            }}
            onOk={async () => {
              if (!themeRow.name.trim()) {
                message.warning("请输入主题名称");
                return;
              }
              themeSaving.value = true;
              try {
                await getClient().save("theme", { name: themeRow.name, remark: themeRow.remark }, themeRow.id || undefined);
                themeOpen.value = false;
                message.success("保存成功");
                await load();
              } catch (error) {
                message.error(errorText(error));
              } finally {
                themeSaving.value = false;
              }
            }}
          >
            <div class={styles.section}>
              <label>主题名称</label>
              <Input
                maxlength={20}
                value={themeRow.name}
                onUpdate:value={(v: string) => {
                  themeRow.name = v;
                }}
              />
              <label>主题描述</label>
              <Textarea
                rows={4}
                maxlength={200}
                value={themeRow.remark}
                onUpdate:value={(v: string) => {
                  themeRow.remark = v;
                }}
              />
            </div>
          </Modal>
          <Modal
            title="批量导入考题"
            open={importOpen.value}
            okText={importResult.value ? "完成" : "开始导入"}
            cancelText="取消"
            confirmLoading={importing.value}
            onCancel={() => {
              importOpen.value = false;
            }}
            onOk={async () => {
              if (importResult.value) {
                importOpen.value = false;
                return;
              }
              if (!importFile.value) {
                message.warning("请选择 Excel 文件");
                return;
              }
              importing.value = true;
              try {
                importResult.value = await getClient().importQuestions(importFile.value);
                await load();
              } catch (error) {
                message.error(errorText(error));
              } finally {
                importing.value = false;
              }
            }}
          >
            {importResult.value ? (
              <>
                <p>
                  导入完成：成功 {text(importResult.value.success) || "0"} 条，失败 {text(importResult.value.fail) || "0"} 条
                </p>
                {Array.isArray(importResult.value.errorMsg) && (
                  <ul>
                    {importResult.value.errorMsg.map((detail) => (
                      <li>{text(detail)}</li>
                    ))}
                  </ul>
                )}
                <Button
                  onClick={async () => {
                    try {
                      download(await getClient().exportImportErrors(rows(importResult.value?.importErrorList)), "考题导入错误.xlsx");
                    } catch (error) {
                      message.error(errorText(error));
                    }
                  }}
                >
                  下载错误数据
                </Button>
              </>
            ) : (
              <Upload
                accept=".xls,.xlsx"
                maxCount={1}
                beforeUpload={(file: File) => {
                  importFile.value = file;
                  return false;
                }}
                onRemove={() => {
                  importFile.value = undefined;
                }}
              >
                <Button>选择 Excel 文件</Button>
              </Upload>
            )}
          </Modal>
          <Modal
            title={qrName.value}
            open={qrOpen.value}
            okText="下载二维码"
            cancelText="关闭"
            onCancel={() => {
              qrOpen.value = false;
            }}
            onOk={() => {
              const link = document.createElement("a");
              link.href = qrImage.value;
              link.download = `${qrName.value}.png`;
              link.click();
            }}
          >
            <img style={{ display: "block", margin: "0 auto", width: "280px" }} src={qrImage.value} alt="任务二维码" />
          </Modal>
        </>
      );
    },
  });
}
