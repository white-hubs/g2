import type { SceneFile } from "@g2-contract/file";
import type {
  CheckExecutionStatus,
  SafetyCreditCheckExecutionItemVO,
  SafetyCreditCheckExecutionSubmitCommand,
  SafetyCreditCheckExecutionVO,
  SafetyCreditCheckPhotoVO,
  SafetyCreditId,
  SafetyCreditMerchantVO,
} from "@g2-contract/safety-credit";
import { Button, Checkbox, Form, FormItem, Modal, PageLayout, Select, Space, Tag, Textarea, message } from "@g2-platform/pc-ui";
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { checkExecutionStatusColor, checkExecutionStatusLabel, cleanText, displayText, formatDateTime } from "../s2/shared";
import { getFileClient, getSafetyCreditClient } from "@/domain-context";

import "../s2/s2.less";
import "./s5.less";

interface PhotoState {
  fileId: string;
  fileName: string;
  captureTime: string;
  filePath?: string;
}

interface CheckItemState {
  itemId: SafetyCreditId;
  itemName: string;
  required: boolean;
  photoRequired: boolean;
  checked: boolean;
  remark: string;
  photos: PhotoState[];
}

function readBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function readString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? undefined : trimmed;
}

function readId(value: unknown, fallback: string): SafetyCreditId {
  if (typeof value === "number") {
    return value;
  }
  return readString(value) ?? fallback;
}

function readQueryText(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return readQueryText(value[0]);
  }
  return readString(value);
}

function formatNow(): string {
  return formatDateTime(new Date());
}

function normalizePhotos(photos?: SafetyCreditCheckPhotoVO[]): PhotoState[] {
  return (photos ?? []).map((photo, index) => {
    const fileId = readString(photo.fileId ?? photo.file?.id ?? photo.id) ?? `photo-${index + 1}`;
    const state: PhotoState = {
      fileId,
      fileName: readString(photo.file?.name) ?? fileId,
      captureTime: readString(photo.captureTime) ?? formatNow(),
    };
    const filePath = readString(photo.file?.path);
    if (filePath !== undefined) {
      state.filePath = filePath;
    }
    return state;
  });
}

function normalizeItem(item: SafetyCreditCheckExecutionItemVO, index: number): CheckItemState {
  const fallbackId = `item-${index + 1}`;
  return {
    itemId: readId(item.itemId ?? item.id, fallbackId),
    itemName: readString(item.itemName) ?? `检查项${index + 1}`,
    required: item.required ?? true,
    photoRequired: item.photoRequired ?? false,
    checked: readBoolean(item.checked),
    remark: readString(item.remark) ?? "",
    photos: normalizePhotos(item.photos),
  };
}

function hasExecutionDetail(detail?: SafetyCreditCheckExecutionVO | null): detail is SafetyCreditCheckExecutionVO {
  return readString(detail?.id) !== undefined;
}

export const CheckProcessing = defineComponent({
  name: "CheckProcessing",
  setup: () => {
    const route = useRoute();
    const loading = ref(false);
    const saving = ref(false);
    const submitting = ref(false);
    const uploadingPhotos = ref(0);
    const merchantLoading = ref(false);
    const merchantSearchText = ref("");
    const merchantOptions = ref<SafetyCreditMerchantVO[]>([]);
    const selectedMerchantId = ref("");
    const execution = ref<SafetyCreditCheckExecutionVO | null>(null);
    const executionOptions = ref<SafetyCreditCheckExecutionVO[]>([]);
    const executionSelectVisible = ref(false);
    const items = ref<CheckItemState[]>([]);
    let merchantSearchTimer: ReturnType<typeof setTimeout> | undefined;
    let merchantSearchSeq = 0;

    const readonly = computed(() => execution.value?.status === "COMPLETED" || execution.value?.status === "OVERDUE");
    const photoUploading = computed(() => uploadingPhotos.value > 0);
    const completedCount = computed(() => items.value.filter((item) => item.checked).length);
    const hasProcessData = computed(() => hasExecutionDetail(execution.value) && items.value.length > 0);

    function executionId(): SafetyCreditId | undefined {
      return execution.value?.id;
    }

    function merchantOptionLabel(item: SafetyCreditMerchantVO): string {
      return `${displayText(item.merchantName)} / ${displayText(item.merchantCode)}`;
    }

    async function loadMerchants(keyword = merchantSearchText.value): Promise<void> {
      const searchSeq = ++merchantSearchSeq;
      merchantLoading.value = true;
      try {
        const searchKeyword = cleanText(keyword);
        const result = await getSafetyCreditClient().pageMerchants({
          pageNumber: 1,
          pageSize: 50,
          ...(searchKeyword === undefined ? {} : { keyword: searchKeyword }),
        });
        if (searchSeq !== merchantSearchSeq) {
          return;
        }
        merchantOptions.value = result.records ?? [];
      } finally {
        if (searchSeq === merchantSearchSeq) {
          merchantLoading.value = false;
        }
      }
    }

    function searchMerchants(keyword: string): void {
      merchantSearchText.value = keyword;
      if (merchantSearchTimer !== undefined) {
        clearTimeout(merchantSearchTimer);
      }
      merchantSearchTimer = setTimeout(() => {
        void loadMerchants(keyword);
      }, 250);
    }

    function resetExecution(): void {
      execution.value = null;
      executionOptions.value = [];
      executionSelectVisible.value = false;
      items.value = [];
    }

    function applyExecutionDetail(merchantId: string, detail?: SafetyCreditCheckExecutionVO | null): void {
      const currentDetail = hasExecutionDetail(detail) ? detail : null;
      execution.value = currentDetail;
      items.value = (currentDetail?.items ?? []).map(normalizeItem);
      if (currentDetail !== null && !merchantOptions.value.some((item) => String(item.id) === String(merchantId))) {
        merchantOptions.value = [
          {
            id: merchantId,
            merchantCode: currentDetail.merchantCode ?? merchantId,
            merchantName: currentDetail.merchantName ?? merchantId,
          },
          ...merchantOptions.value,
        ];
      }
    }

    async function loadExecution(merchantId = selectedMerchantId.value): Promise<void> {
      const selectedId = cleanText(merchantId);
      resetExecution();
      if (selectedId === undefined) {
        message.warning("请选择商户");
        return;
      }
      loading.value = true;
      try {
        const executions = await getSafetyCreditClient().listCurrentCheckExecutions(selectedId);
        if (executions.length > 1) {
          executionOptions.value = executions;
          executionSelectVisible.value = true;
          return;
        }
        applyExecutionDetail(selectedId, executions[0] ?? null);
      } finally {
        loading.value = false;
      }
    }

    function selectExecutionToProcess(detail: SafetyCreditCheckExecutionVO): void {
      applyExecutionDetail(selectedMerchantId.value, detail);
      executionOptions.value = [];
      executionSelectVisible.value = false;
    }

    async function reloadCurrentExecution(): Promise<void> {
      const id = executionId();
      if (id === undefined) {
        await loadExecution();
        return;
      }
      const detail = await getSafetyCreditClient().getCheckExecution(id);
      applyExecutionDetail(String(detail.merchantId ?? selectedMerchantId.value), detail);
    }

    function selectMerchant(value?: SafetyCreditId): void {
      selectedMerchantId.value = value === undefined ? "" : String(value);
      merchantSearchText.value = "";
      resetExecution();
      if (selectedMerchantId.value !== "") {
        void loadExecution();
      }
    }

    function reset(): void {
      selectedMerchantId.value = "";
      merchantSearchText.value = "";
      resetExecution();
      void loadMerchants("");
    }

    function updateChecked(itemId: SafetyCreditId, checked: boolean): void {
      items.value = items.value.map((item) => (String(item.itemId) === String(itemId) ? { ...item, checked } : item));
    }

    function updateRemark(itemId: SafetyCreditId, remark: string): void {
      items.value = items.value.map((item) => (String(item.itemId) === String(itemId) ? { ...item, remark } : item));
    }

    async function uploadPhotoFile(file: File): Promise<PhotoState> {
      uploadingPhotos.value += 1;
      try {
        const fileInfo: SceneFile = await (
          await getFileClient()
        ).uploadSceneFile({
          businessKey: String(executionId() ?? "SAFETY_CREDIT"),
          sceneCode: "SAFETY_CREDIT",
          file,
        });
        const fileId = readString(fileInfo.id);
        if (fileId === undefined) {
          throw new Error("文件服务未返回文件ID");
        }
        const fileName = readString(fileInfo.name ?? file.name) ?? "图片";
        const photo: PhotoState = {
          fileId,
          fileName,
          captureTime: formatNow(),
        };
        const filePath = readString(fileInfo.path);
        if (filePath !== undefined) {
          photo.filePath = filePath;
        }
        return photo;
      } finally {
        uploadingPhotos.value -= 1;
      }
    }

    async function appendPhoto(itemId: SafetyCreditId, file: File): Promise<void> {
      const fileName = readString(file.name) ?? "图片";
      const photo = await uploadPhotoFile(file);
      photo.fileName = readString(photo.fileName) ?? fileName;
      items.value = items.value.map((item) =>
        String(item.itemId) === String(itemId) ? { ...item, photos: [...item.photos, photo] } : item,
      );
    }

    function handleFileChange(itemId: SafetyCreditId, event: Event): void {
      const input = event.target as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      input.value = "";
      if (files.length === 0) {
        return;
      }
      void (async () => {
        for (const file of files) {
          await appendPhoto(itemId, file);
        }
        message.success("照片已上传");
      })().catch((error: unknown) => {
        message.error(error instanceof Error ? error.message : "照片上传失败");
      });
    }

    function removePhoto(itemId: SafetyCreditId, fileId: string): void {
      items.value = items.value.map((item) =>
        String(item.itemId) === String(itemId) ? { ...item, photos: item.photos.filter((photo) => photo.fileId !== fileId) } : item,
      );
    }

    function buildPayload(): SafetyCreditCheckExecutionSubmitCommand {
      return {
        items: items.value.map((item) => ({
          itemId: item.itemId,
          checked: item.checked,
          remark: item.remark.trim(),
          photos: item.photos.map((photo) => ({
            fileId: photo.fileId,
            captureTime: photo.captureTime,
          })),
        })),
      };
    }

    function validateSubmit(): boolean {
      const missingRequired = items.value.find((item) => item.required && !item.checked);
      if (missingRequired !== undefined) {
        message.warning(`请完成必查项：${missingRequired.itemName}`);
        return false;
      }
      const missingPhoto = items.value.find((item) => item.photoRequired && item.photos.length === 0);
      if (missingPhoto !== undefined) {
        message.warning(`请上传需拍照项照片：${missingPhoto.itemName}`);
        return false;
      }
      return true;
    }

    async function saveDraft(): Promise<void> {
      const id = executionId();
      if (id === undefined || !hasProcessData.value || readonly.value) {
        return;
      }
      if (photoUploading.value) {
        message.warning("照片正在上传，请稍后再保存");
        return;
      }
      saving.value = true;
      try {
        await getSafetyCreditClient().saveCheckExecutionDraft(id, buildPayload());
        message.success("自查草稿已保存");
        await reloadCurrentExecution();
      } finally {
        saving.value = false;
      }
    }

    async function submit(): Promise<void> {
      const id = executionId();
      if (id === undefined || !hasProcessData.value || readonly.value || !validateSubmit()) {
        return;
      }
      if (photoUploading.value) {
        message.warning("照片正在上传，请稍后再提交");
        return;
      }
      submitting.value = true;
      try {
        await getSafetyCreditClient().submitCheckExecution(id, buildPayload());
        message.success("自查已提交");
        await loadExecution();
      } finally {
        submitting.value = false;
      }
    }

    function renderMerchantSelect(): JSX.Element {
      return (
        <FormItem class="search-field wide" label="商户">
          <Select
            allowClear
            filterOption={false}
            loading={merchantLoading.value}
            optionFilterProp="label"
            optionLabelProp="label"
            placeholder="请输入或选择商户"
            searchValue={merchantSearchText.value}
            showSearch
            class="source-application-select"
            options={merchantOptions.value.map((item) => ({ label: merchantOptionLabel(item), value: String(item.id) }))}
            value={selectedMerchantId.value || undefined}
            onChange={(inputValue) => {
              const value = inputValue as SafetyCreditId | undefined;
              return selectMerchant(value);
            }}
            onSearch={searchMerchants}
            onClear={() => {
              selectMerchant(undefined);
              void loadMerchants("");
            }}
          />
        </FormItem>
      );
    }

    function renderSummary(): JSX.Element {
      const detail = execution.value;
      if (!hasExecutionDetail(detail) || items.value.length === 0) {
        return <div class="empty-tip">暂无待处理数据</div>;
      }
      return (
        <>
          <section class="s5-processing-summary">
            <div>
              <span>商户</span>
              <strong>{displayText(detail.merchantName ?? detail.merchantCode ?? detail.merchantId)}</strong>
            </div>
            <div>
              <span>清单</span>
              <strong>{displayText(detail.checkName)}</strong>
            </div>
            <div>
              <span>执行状态</span>
              <strong>
                <Tag color={checkExecutionStatusColor(detail.status)}>{checkExecutionStatusLabel(detail.status)}</Tag>
              </strong>
            </div>
            <div>
              <span>周期</span>
              <strong>
                {formatDateTime(detail.cycleBegin)} 至 {formatDateTime(detail.cycleEnd)}
              </strong>
            </div>
            <div>
              <span>完成进度</span>
              <strong>
                {completedCount.value}/{items.value.length}
              </strong>
            </div>
            <div>
              <span>提交时间</span>
              <strong>{formatDateTime(detail.submitTime)}</strong>
            </div>
          </section>
          <section class="s5-processing-items">
            {items.value.length === 0 ? (
              <div class="empty-tip">暂无检查项</div>
            ) : (
              items.value.map((item, index) => (
                <article class="s5-processing-card" key={String(item.itemId)}>
                  <div class="s5-processing-card-head">
                    <div class="s5-processing-check">
                      <Checkbox
                        checked={item.checked}
                        disabled={readonly.value}
                        onUpdate:checked={(inputValue) => {
                          const checked = inputValue as boolean;
                          return updateChecked(item.itemId, checked);
                        }}
                      />
                      <span>{item.itemName}</span>
                    </div>
                    <div class="s5-processing-tags">
                      {item.required ? <Tag color="orange">必查</Tag> : null}
                      {item.photoRequired ? <Tag color="blue">需拍照</Tag> : null}
                      <Tag color="default">{index + 1}</Tag>
                    </div>
                  </div>
                  <Textarea
                    value={item.remark}
                    disabled={readonly.value}
                    placeholder="备注"
                    maxlength={200}
                    onUpdate:value={(inputValue) => {
                      const value = inputValue as string;
                      return updateRemark(item.itemId, value);
                    }}
                  />
                  <div class="s5-processing-photo-row">
                    <label class={["s5-processing-photo-action", readonly.value || photoUploading.value ? "disabled" : ""]}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={readonly.value || photoUploading.value}
                        onChange={(inputValue) => {
                          const event = inputValue as Event;
                          return handleFileChange(item.itemId, event);
                        }}
                      />
                      <span>{photoUploading.value ? "上传中" : "上传照片"}</span>
                    </label>
                    <div class="s5-processing-photo-list">
                      {item.photos.length === 0 ? (
                        <span class="empty-photo">暂无照片</span>
                      ) : (
                        item.photos.map((photo) => {
                          const filePath = readString(photo.filePath);
                          return (
                            <div class="s5-processing-photo" key={photo.fileId}>
                              {filePath !== undefined ? <img src={filePath} alt={photo.fileName} /> : null}
                              <span title={photo.fileName}>
                                {photo.fileName} · {formatDateTime(photo.captureTime)}
                              </span>
                              {readonly.value ? null : (
                                <Button type="link" size="small" danger onClick={() => removePhoto(item.itemId, photo.fileId)}>
                                  删除
                                </Button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      );
    }

    function statusSortValue(status?: CheckExecutionStatus): number {
      if (status === "PARTIAL_COMPLETED") {
        return 1;
      }
      if (status === "PENDING") {
        return 2;
      }
      return 3;
    }

    function renderExecutionSelector(): JSX.Element {
      const options = [...executionOptions.value].toSorted(
        (left, right) =>
          statusSortValue(left.status) - statusSortValue(right.status) ||
          formatDateTime(left.cycleEnd).localeCompare(formatDateTime(right.cycleEnd)),
      );
      return (
        <Modal
          okText="确定"
          cancelText="取消"
          v-model:open={executionSelectVisible.value}
          title="选择自查清单"
          width={720}
          footer={null}
          onCancel={() => {
            executionSelectVisible.value = false;
          }}
        >
          <div class="s5-execution-select-list">
            {options.map((item) => (
              <button class="s5-execution-select-item" key={String(item.id)} type="button" onClick={() => selectExecutionToProcess(item)}>
                <div>
                  <strong>{displayText(item.checkName)}</strong>
                  <span>
                    {formatDateTime(item.cycleBegin)} 至 {formatDateTime(item.cycleEnd)}
                  </span>
                </div>
                <Tag color={checkExecutionStatusColor(item.status)}>{checkExecutionStatusLabel(item.status)}</Tag>
              </button>
            ))}
          </div>
        </Modal>
      );
    }

    onMounted(() => {
      void loadMerchants("");
      const merchantId = readQueryText(route.query.merchantId);
      if (merchantId !== undefined) {
        selectedMerchantId.value = merchantId;
        void loadExecution(merchantId);
      }
    });

    onBeforeUnmount(() => {
      if (merchantSearchTimer !== undefined) {
        clearTimeout(merchantSearchTimer);
      }
    });

    const layoutSlots = {
      "layout-header": (): JSX.Element =>
        hasProcessData.value ? (
          <Space>
            <Button disabled={readonly.value || photoUploading.value} loading={saving.value} onClick={() => void saveDraft()}>
              保存草稿
            </Button>
            <Button
              type="primary"
              disabled={readonly.value || photoUploading.value}
              loading={submitting.value}
              onClick={() => void submit()}
            >
              提交自查
            </Button>
          </Space>
        ) : (
          <span />
        ),
      "layout-content": (): JSX.Element => (
        <div class="safety-credit-s2">
          <Form class="toolbar" layout="inline">
            {renderMerchantSelect()}
            <Space>
              <Button type="primary" loading={loading.value} onClick={() => void loadExecution()}>
                查询
              </Button>
              <Button onClick={reset}>重置</Button>
            </Space>
          </Form>
          <section class="table-wrap s5-processing-wrap">
            {loading.value ? <div class="empty-tip">正在加载...</div> : renderSummary()}
          </section>
          {renderExecutionSelector()}
        </div>
      ),
    };

    return (): JSX.Element => <PageLayout title="自查处理" v-slots={layoutSlots} />;
  },
});
