// @ts-nocheck
/**
 * Port of legacy planDocuments/detail.vue using pc-ui Form/PageLayout (not g-detail).
 * Word download needs: jszip, file-saver (already listed in domain package.json).
 */
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { GeneratedAttachmentUpload } from "./generated-attachment-upload";
import { GeneratedContentEditor } from "./generated-content-editor";
import { sanitizeRichText } from "./rich-text";
import { getEmergencyManagementClient } from "@/domain-context";
import { Button, DatePicker, Form, FormItem, Image, Input, PageLayout, Select, Textarea, getDayjs, message } from "@/pc-ui-runtime";

import styles from "./plan-document-detail.module.css";

/** Matches ghcloud GLOBAL_SCENE_CODE.emergencyFile */
const EMERGENCY_FILE_SCENE_CODE = "EMERGENCY::FILE";

type FileVO = {
  id?: string | number;
  name?: string;
  path?: string;
  url?: string;
  suffix?: string;
  type?: string;
};

type PlanForm = {
  id?: string | number;
  name?: string;
  emergencyFileTypeId?: string | number;
  emergencyFileTypeName?: string;
  levelCode?: string;
  expirationDate?: string | null;
  emergencyEventTypeCode?: string;
  emergencyEventTypeName?: string;
  remark?: string;
  generated?: boolean;
  contentHtml?: string;
  contentFileIds?: string;
  contentFileVOS?: FileVO[];
  documentFileId?: string | number | null;
  documentFileVOS?: FileVO[];
  processFileId?: string | number | null;
  processFileVOS?: FileVO[];
};

type Option = { label: string; value: string | number };

function asList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.records)) return obj.records as Record<string, unknown>[];
    if (Array.isArray(obj.list)) return obj.list as Record<string, unknown>[];
    if (Array.isArray(obj.content)) return obj.content as Record<string, unknown>[];
  }
  return [];
}

function toOptions(raw: unknown, labelKeys: string[], valueKeys: string[]): Option[] {
  return asList(raw)
    .map((item) => {
      const label = labelKeys.map((k) => item[k]).find((v) => v != null && v !== "") ?? "";
      const value = valueKeys.map((k) => item[k]).find((v) => v != null && v !== "");
      if (value == null) return null;
      return { label: String(label || value), value: value as string | number };
    })
    .filter(Boolean) as Option[];
}

function normalizeFileVos(list: FileVO[] | undefined): FileVO[] {
  return (list || []).map((item) => ({ ...item, url: item.url || item.path }));
}

function normalizeUploaded(raw: unknown, fallbackName: string): FileVO | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const id = data.id ?? data.ossId;
  if (id == null || id === "") return null;
  return {
    ...data,
    id: id as string | number,
    name: String(data.name ?? fallbackName),
    path: data.path != null ? String(data.path) : undefined,
    url: String(data.path ?? data.url ?? ""),
  };
}

const SingleFileUpload = defineComponent({
  name: "PlanDocSingleFileUpload",
  props: {
    fileId: { type: [String, Number], default: null },
    files: { type: Array as () => FileVO[], default: () => [] },
    accept: { type: String, default: "" },
    readonly: { type: Boolean, default: false },
    imagePreview: { type: Boolean, default: false },
  },
  emits: ["update:fileId", "update:files"],
  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null);
    const uploading = ref(false);
    const fileList = computed(() => normalizeFileVos(props.files as FileVO[]));

    const clear = () => {
      emit("update:fileId", null);
      emit("update:files", []);
    };

    const onPick = async (event: Event) => {
      const element = event.target as HTMLInputElement;
      const file = element.files?.[0];
      element.value = "";
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) {
        message.warning("文件不能超过20MB");
        return;
      }
      uploading.value = true;
      try {
        const form = new FormData();
        form.append("sceneCode", EMERGENCY_FILE_SCENE_CODE);
        form.append("businessKey", "emergency");
        form.append("file", file);
        const uploaded = normalizeUploaded(await getEmergencyManagementClient().uploadFile(form), file.name);
        if (!uploaded) {
          message.error("上传失败");
          return;
        }
        emit("update:fileId", uploaded.id);
        emit("update:files", [uploaded]);
      } catch {
        message.error("上传失败");
      } finally {
        uploading.value = false;
      }
    };

    return () => {
      const first = fileList.value[0];
      if (props.readonly) {
        if (props.imagePreview && first?.url) {
          return <Image src={first.url} width={100} />;
        }
        return <span>{first?.name || (props.fileId ? String(props.fileId) : "—")}</span>;
      }
      return (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <Button loading={uploading.value} onClick={() => inputRef.value?.click()}>
              上传文件
            </Button>
            {first ? (
              <Button type="link" danger onClick={clear}>
                删除
              </Button>
            ) : null}
            {first ? <span>{first.name}</span> : null}
          </div>
          <input ref={inputRef} type="file" accept={props.accept} style={{ display: "none" }} onChange={(e) => void onPick(e)} />
        </div>
      );
    };
  },
});

function generatedMetadata(record: PlanForm) {
  const level = record.levelCode === "IMPORTANT" ? "重要" : record.levelCode === "ORDINARY" ? "普通" : "";
  return [record.emergencyFileTypeName, level, record.emergencyEventTypeName].filter(Boolean).join(" | ");
}

function canDownloadWord(record: PlanForm | null | undefined) {
  return Boolean(record?.generated && record?.contentHtml);
}

function escapeXml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeFileName(value: string) {
  const name = String(value || "预案正文")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_");
  return name || "预案正文";
}

function paragraphXml(text: string, options: { align?: string; bold?: boolean; size?: number } = {}) {
  const content = escapeXml(text).replace(/\n/g, "<w:br/>");
  const justify = options.align ? `<w:jc w:val="${options.align}"/>` : "";
  const bold = options.bold ? "<w:b/>" : "";
  const size = options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : "";
  const paragraphProps = justify ? `<w:pPr>${justify}</w:pPr>` : "";
  const runProps = bold || size ? `<w:rPr>${bold}${size}</w:rPr>` : "";
  return `<w:p>${paragraphProps}<w:r>${runProps}<w:t xml:space="preserve">${content}</w:t></w:r></w:p>`;
}

function collectText(node: Node): string {
  return Array.from(node.childNodes || [])
    .map((child) => {
      if (child.nodeType === Node.TEXT_NODE) return child.textContent || "";
      if (child.nodeName === "BR") return "\n";
      return collectText(child);
    })
    .join("")
    .replace(/\u00a0/g, " ")
    .trim();
}

function tableXml(table: Element) {
  const rows = Array.from(table.querySelectorAll("tr"))
    .map((row) => {
      const cells = Array.from(row.children).filter((cell) => ["TD", "TH"].includes(cell.nodeName));
      const cellXml = cells
        .map((cell) => {
          const text = collectText(cell);
          return `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${paragraphXml(text, { bold: cell.nodeName === "TH" })}</w:tc>`;
        })
        .join("");
      return `<w:tr>${cellXml}</w:tr>`;
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:left w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:right w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/></w:tblBorders></w:tblPr>${rows}</w:tbl>`;
}

function nodeToWordXml(node: Node): string {
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  if (el.nodeName === "TABLE") return tableXml(el);
  if (el.querySelector?.("table")) {
    return Array.from(el.childNodes).map(nodeToWordXml).join("");
  }
  const text = collectText(el);
  if (!text) return "";
  if (el.nodeName === "H1") return paragraphXml(text, { align: "center", bold: true, size: 32 });
  if (el.nodeName === "H2") return paragraphXml(text, { bold: true, size: 28 });
  if (el.nodeName === "H3") return paragraphXml(text, { bold: true, size: 24 });
  if (el.nodeName === "LI") return paragraphXml(`• ${text}`);
  return paragraphXml(text);
}

function contentToWordBodyXml(record: PlanForm) {
  const content = sanitizeRichText(record?.contentHtml || "");
  const document = new DOMParser().parseFromString(`<body>${content}</body>`, "text/html");
  const metadata = generatedMetadata(record);
  const metadataXml = metadata ? paragraphXml(metadata, { align: "center", size: 20 }) : "";
  const contentXml = Array.from(document.body.childNodes).map(nodeToWordXml).join("");
  return `${metadataXml}${contentXml}`;
}

function buildDocumentXml(record: PlanForm) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${contentToWordBodyXml(record)}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;
}

async function buildDocxBlob(record: PlanForm) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder("_rels")!.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.folder("word")!.file("document.xml", buildDocumentXml(record));
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export const PlanDocumentDetail = defineComponent({
  name: "PlanDocumentDetail",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const type = computed(() => String(route.query.type || "add"));
    const id = computed(() => String(route.query.id || ""));
    const readonly = computed(() => type.value === "detail");
    const saveLoading = ref(false);
    const formRef = ref();
    const fileTypeOptions = ref<Option[]>([]);
    const eventTypeOptions = ref<Option[]>([]);

    const form = reactive<PlanForm>({
      name: "",
      emergencyFileTypeId: undefined,
      levelCode: undefined,
      expirationDate: null,
      emergencyEventTypeCode: undefined,
      remark: "",
      generated: false,
      contentHtml: "",
      contentFileIds: "",
      contentFileVOS: [],
      documentFileId: null,
      documentFileVOS: [],
      processFileId: null,
      processFileVOS: [],
    });

    const title = computed(() => {
      if (type.value === "edit") return "编辑";
      if (type.value === "detail") return "详情";
      return "新增";
    });

    const pageTitle = computed(() => `预案文件-${title.value}`);

    const rules = computed(() => {
      const generated = Boolean(form.generated);
      const validateManual = (msg: string) => ({
        validator: async (_rule: unknown, value: unknown) => {
          if (generated || value) return;
          throw new Error(msg);
        },
        trigger: "change",
      });
      return {
        name: [{ required: true, message: "请输入文件名称" }],
        emergencyEventTypeCode: [{ required: true, message: "请选择事件分类" }],
        levelCode: [{ required: true, message: "请选择文件级别" }],
        emergencyFileTypeId: [{ required: true, message: "请选择文件类型" }],
        documentFileId: [validateManual("请上传附件文件")],
        processFileId: [validateManual("请上传处理流程")],
      };
    });

    const levelOptions = [
      { label: "重要", value: "IMPORTANT" },
      { label: "普通", value: "ORDINARY" },
    ];

    const afterGet = (res: PlanForm) => {
      Object.assign(form, {
        ...res,
        documentFileVOS: normalizeFileVos(res.documentFileVOS),
        processFileVOS: normalizeFileVos(res.processFileVOS),
        contentFileVOS: normalizeFileVos(res.contentFileVOS),
        contentFileIds: res.contentFileIds || "",
        contentHtml: res.contentHtml || "",
        expirationDate: res.expirationDate ? getDayjs()(res.expirationDate).format("YYYY-MM-DD") : null,
        generated: Boolean(res.generated),
      });
    };

    const syncTypeNames = () => {
      form.emergencyFileTypeName = fileTypeOptions.value.find((o) => String(o.value) === String(form.emergencyFileTypeId))?.label;
      form.emergencyEventTypeName = eventTypeOptions.value.find((o) => String(o.value) === String(form.emergencyEventTypeCode))?.label;
    };

    const downloadWord = async () => {
      if (!canDownloadWord(form)) {
        message.warning("暂无可下载的预案正文");
        return;
      }
      const blob = await buildDocxBlob(form);
      saveAs(blob, `${normalizeFileName(form.name || "")}.docx`);
    };

    const saveRecord = async () => {
      try {
        await formRef.value?.validate?.();
      } catch {
        return;
      }
      try {
        saveLoading.value = true;
        syncTypeNames();
        const payload = { ...form };
        if (payload.generated) {
          payload.contentHtml = sanitizeRichText(payload.contentHtml);
        }
        const client = getEmergencyManagementClient();
        if (type.value === "add") {
          await client.createPlanDocument(payload);
        } else if (type.value === "edit") {
          await client.updatePlanDocument(payload);
        }
        message.success("操作成功");
        router.back();
      } catch {
        // keep page; message may already be shown by http layer
      } finally {
        saveLoading.value = false;
      }
    };

    onMounted(async () => {
      const client = getEmergencyManagementClient();
      try {
        const [fileTypes, eventTypes] = await Promise.all([client.getFileTypes(), client.getEventTypes()]);
        fileTypeOptions.value = toOptions(fileTypes, ["label", "name"], ["value", "id"]);
        eventTypeOptions.value = toOptions(eventTypes, ["label", "name"], ["value", "code", "id"]);
      } catch {
        message.error("加载选项失败");
      }
      if (type.value !== "add" && id.value) {
        try {
          const detail = (await client.getPlanDocument(id.value)) as PlanForm;
          afterGet(detail || {});
        } catch {
          message.error("加载详情失败");
        }
      }
    });

    const expirationValue = computed({
      get: () => (form.expirationDate ? getDayjs()(form.expirationDate) : null),
      set: (v) => {
        form.expirationDate = v ? getDayjs()(v).format("YYYY-MM-DD") : null;
      },
    });

    const labelCol = { flex: "100px" };
    const wrapperCol = { flex: "1" };

    const displayText = (value: unknown, empty = "—") => {
      const text = value == null || value === "" ? "" : String(value);
      return <span class={[styles.descValue, !text ? styles.descEmpty : undefined]}>{text || empty}</span>;
    };

    const optionLabel = (options: Option[], value: unknown) => options.find((item) => String(item.value) === String(value))?.label || "";

    const levelLabel = () => {
      if (form.levelCode === "IMPORTANT") return "重要";
      if (form.levelCode === "ORDINARY") return "普通";
      return optionLabel(levelOptions, form.levelCode);
    };

    const slots = {
      "layout-content": () => (
        <Form
          ref={formRef}
          model={form}
          rules={readonly.value ? undefined : rules.value}
          labelCol={labelCol}
          wrapperCol={wrapperCol}
          labelAlign="left"
          class={[styles.planDocForm, styles.planDocFormInline]}
        >
          <div class={styles.sectionTitle}>基本信息</div>
          <FormItem label="文件名称" name="name">
            {readonly.value ? displayText(form.name) : <Input v-model:value={form.name} maxlength={20} placeholder="请输入文件名称" />}
          </FormItem>
          <FormItem label="文件类型" name="emergencyFileTypeId">
            {readonly.value ? (
              displayText(form.emergencyFileTypeName || optionLabel(fileTypeOptions.value, form.emergencyFileTypeId))
            ) : (
              <Select
                v-model:value={form.emergencyFileTypeId}
                options={fileTypeOptions.value}
                placeholder="请选择文件类型"
                allowClear
                onChange={syncTypeNames}
              />
            )}
          </FormItem>
          <FormItem label="文件级别" name="levelCode">
            {readonly.value ? (
              displayText(levelLabel())
            ) : (
              <Select v-model:value={form.levelCode} options={levelOptions} placeholder="请选择文件级别" allowClear />
            )}
          </FormItem>
          <FormItem label="到期日期" name="expirationDate">
            {readonly.value ? (
              displayText(form.expirationDate)
            ) : (
              <DatePicker
                class={styles.expirationDate}
                value={expirationValue.value}
                format="YYYY-MM-DD"
                placeholder="请选择"
                allowClear
                onChange={(v) => {
                  expirationValue.value = v;
                }}
              />
            )}
          </FormItem>
          <FormItem label="事件分类" name="emergencyEventTypeCode">
            {readonly.value ? (
              displayText(form.emergencyEventTypeName || optionLabel(eventTypeOptions.value, form.emergencyEventTypeCode))
            ) : (
              <Select
                v-model:value={form.emergencyEventTypeCode}
                options={eventTypeOptions.value}
                placeholder="请选择事件分类"
                allowClear
                onChange={syncTypeNames}
              />
            )}
          </FormItem>
          <FormItem label="文件描述" name="remark" class={styles.planDocFormFull}>
            {readonly.value ? (
              displayText(form.remark)
            ) : (
              <Textarea v-model:value={form.remark} placeholder="请填写备注信息，最多输入200个字符" maxlength={200} showCount rows={3} />
            )}
          </FormItem>

          {form.generated ? (
            <>
              <FormItem label="预案正文" class={styles.planDocFormFull}>
                <GeneratedContentEditor
                  modelValue={form.contentHtml}
                  metadata={generatedMetadata(form)}
                  readonly={readonly.value}
                  onUpdate:modelValue={(v: string) => {
                    form.contentHtml = v;
                  }}
                />
              </FormItem>
              <FormItem label="正文附件" class={styles.planDocFormFull}>
                <GeneratedAttachmentUpload
                  modelValue={form.contentFileIds}
                  files={form.contentFileVOS}
                  readonly={readonly.value}
                  showHeader={false}
                  onUpdate:modelValue={(v: string) => {
                    form.contentFileIds = v;
                  }}
                />
              </FormItem>
            </>
          ) : (
            <>
              <FormItem label="附件文件" name="documentFileId" class={styles.planDocFormFull}>
                <SingleFileUpload
                  fileId={form.documentFileId}
                  files={form.documentFileVOS}
                  accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf"
                  readonly={readonly.value}
                  onUpdate:fileId={(v) => {
                    form.documentFileId = v;
                  }}
                  onUpdate:files={(v) => {
                    form.documentFileVOS = v;
                  }}
                />
                {!readonly.value ? (
                  <span class={styles.fileTxt}>支持上传文档（.doc/.docx/.xls/.xlsx/.ppt/.pptx/.pdf）最大为20MB，只能上传1个文件</span>
                ) : null}
              </FormItem>
              <FormItem label="处理流程" name="processFileId" class={styles.planDocFormFull}>
                <SingleFileUpload
                  fileId={form.processFileId}
                  files={form.processFileVOS}
                  accept=".png,.jpeg,.jpg"
                  readonly={readonly.value}
                  imagePreview
                  onUpdate:fileId={(v) => {
                    form.processFileId = v;
                  }}
                  onUpdate:files={(v) => {
                    form.processFileVOS = v;
                  }}
                />
                {!readonly.value ? <span class={styles.fileTxt}>支持上传图片（.png/.jpeg/.jpg）最大为20MB，只能上传1个文件</span> : null}
              </FormItem>
            </>
          )}
        </Form>
      ),
      "footer-btn": () => (
        <>
          {canDownloadWord(form) ? <Button onClick={() => void downloadWord()}>下载Word</Button> : null}
          <Button onClick={() => router.back()}>返回</Button>
          {!readonly.value ? (
            <Button type="primary" loading={saveLoading.value} onClick={() => void saveRecord()}>
              保存
            </Button>
          ) : null}
        </>
      ),
    };

    return () => <PageLayout title={pageTitle.value} v-slots={slots} />;
  },
});

export default PlanDocumentDetail;
