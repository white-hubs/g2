import type { ArrangeRow, ReportFile, TypeRow } from "@g2-contract/work-report";
import {
  Button,
  Form,
  type FormInstance,
  FormItem,
  Image,
  ImagePreviewGroup,
  Input,
  PageLayout,
  PopConfirm,
  Select,
  Spin,
  Textarea,
  Upload,
  type UploadRequestOption,
  message,
} from "@g2-platform/pc-ui";
import { computed, defineComponent, h, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getClient, getFileClient } from "../domain-context";
import { BASE } from "../menu-data";
import { canDeleteArrangement, display, errorText } from "../shared";

import styles from "../styles.module.css";
export const ArrangeFormPage = defineComponent({
  name: "WorkReportArrangeFormPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const readonly = computed(() => route.query.type !== "add");
    const id = String(route.query.id ?? "");
    const detail = ref<ArrangeRow>();
    const options = ref<TypeRow[]>([]);
    const loading = ref(false);
    const saving = ref(false);
    const deleting = ref(false);
    const uploads = ref(0);
    const formRef = ref<FormInstance>();
    const draft = reactive<{ title: string; type?: string; content: string; files: ReportFile[] }>({
      title: "",
      type: undefined,
      content: "",
      files: [],
    });
    let active = true;
    const close = () => {
      const target = route.query.returnPath;
      const list = `${BASE}/arrange-list`;
      void router.push(typeof target === "string" && (target === list || target.startsWith(`${list}?`)) ? target : list);
    };
    const save = async () => {
      if (!formRef.value || saving.value) {
        return;
      }
      saving.value = true;
      try {
        await formRef.value.validateFields();
      } catch {
        saving.value = false;
        return;
      }
      if (!draft.type || uploads.value) {
        saving.value = false;
        return;
      }
      try {
        await getClient().createArrangement({
          title: draft.title,
          type: draft.type,
          content: draft.content,
          fileIds: draft.files.map((file) => file.id).join(","),
        });
        message.success("公布成功");
        close();
      } catch (error) {
        message.error(errorText(error, "保存失败"));
      } finally {
        saving.value = false;
      }
    };
    const upload = async (option: UploadRequestOption) => {
      uploads.value += 1;
      try {
        const file = await (
          await getFileClient()
        ).uploadSceneFile({ file: option.file as File, businessKey: "maintain", sceneCode: "WORK_PLAN" });
        if (active) {
          draft.files.push(file);
        }
        option.onSuccess?.(file);
      } catch (error) {
        if (active) {
          message.error(errorText(error, "图片上传失败"));
        }
        option.onError?.(error instanceof Error ? error : new Error("图片上传失败"));
      } finally {
        uploads.value -= 1;
      }
    };
    const beforeUpload = (file: File): boolean => {
      if (draft.files.length + uploads.value >= 9) {
        message.warning("最多上传 9 张图片");
        return false;
      }
      if (!/\.(jpe?g|png)$/iu.test(file.name)) {
        message.warning("请选择 JPG、JPEG 或 PNG 图片");
        return false;
      }
      return true;
    };
    const remove = async () => {
      if (deleting.value) {
        return;
      }
      deleting.value = true;
      try {
        await getClient().deleteArrangement(id);
        message.success("删除成功");
        close();
      } catch (error) {
        message.error(errorText(error, "删除失败"));
      } finally {
        deleting.value = false;
      }
    };
    onMounted(async () => {
      loading.value = true;
      try {
        if (readonly.value) {
          const result = await getClient().getArrangement(id);
          if (active) {
            detail.value = result;
          }
        } else {
          const result = await getClient().listArrangeTypes();
          if (active) {
            options.value = result;
          }
        }
      } catch (error) {
        if (active) {
          message.error(errorText(error, "工作安排加载失败"));
        }
      } finally {
        if (active) {
          loading.value = false;
        }
      }
    });
    onUnmounted(() => {
      active = false;
    });
    return () => (
      <PageLayout
        title="工作安排"
        v-slots={{
          "layout-content": () => (
            <Spin spinning={loading.value}>
              <Form
                ref={formRef}
                model={draft}
                class={styles.form}
                labelCol={{ style: { width: "80px" } }}
                rules={{ title: [{ required: true, message: "请输入名称" }], type: [{ required: true, message: "请选择类型" }] }}
              >
                <FormItem label="名称" name="title">
                  {readonly.value ? (
                    display(detail.value?.title)
                  ) : (
                    <Input v-model:value={draft.title} maxlength={20} placeholder="请输入名称" />
                  )}
                </FormItem>
                <FormItem label="类型" name="type">
                  {readonly.value ? (
                    display(detail.value?.typeName)
                  ) : (
                    <Select
                      v-model:value={draft.type}
                      placeholder="请选择类型"
                      options={options.value.map((item) => ({ label: item.name, value: item.id }))}
                    />
                  )}
                </FormItem>
                <FormItem label="内容">
                  {readonly.value ? (
                    <div class={styles.detailText}>{display(detail.value?.content)}</div>
                  ) : (
                    <Textarea v-model:value={draft.content} rows={5} />
                  )}
                </FormItem>
                <FormItem label="图片">
                  {h(ImagePreviewGroup, null, () => (
                    <div class={styles.images}>
                      {(readonly.value ? (detail.value?.fileList ?? []) : draft.files).map((file) => (
                        <div key={file.id} class={styles.imageItem}>
                          <Image src={file.path ?? undefined} width={104} height={104} />
                          {!readonly.value ? (
                            <Button
                              type="link"
                              size="small"
                              danger
                              onClick={() => {
                                draft.files = draft.files.filter((item) => item.id !== file.id);
                              }}
                            >
                              移除
                            </Button>
                          ) : null}
                        </div>
                      ))}
                      {!readonly.value && draft.files.length < 9 ? (
                        <Upload
                          accept=".jpeg,.jpg,.png"
                          showUploadList={false}
                          beforeUpload={beforeUpload}
                          customRequest={upload}
                          disabled={uploads.value > 0}
                        >
                          <Button loading={uploads.value > 0}>新增图片</Button>
                        </Upload>
                      ) : null}
                    </div>
                  ))}
                </FormItem>
              </Form>
            </Spin>
          ),
          "footer-page": () => (
            <div class={styles.footer}>
              {!readonly.value ? (
                <Button type="primary" loading={saving.value} disabled={uploads.value > 0 || loading.value} onClick={() => void save()}>
                  保存并公布
                </Button>
              ) : null}
              {readonly.value && detail.value && canDeleteArrangement() ? (
                <PopConfirm title="确定要删除该工作安排？" okText="确定" cancelText="取消" onConfirm={remove}>
                  <Button danger loading={deleting.value}>
                    删除
                  </Button>
                </PopConfirm>
              ) : null}
              <Button onClick={close}>返回</Button>
            </div>
          ),
        }}
      />
    );
  },
});
