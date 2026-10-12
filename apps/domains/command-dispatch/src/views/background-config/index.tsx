import type { DataDictionary } from "@g2-contract/dictionary";
import type { UploadRequestOption } from "@g2-platform/pc-ui/types";
import { defineComponent, onBeforeUnmount, onMounted, reactive } from "vue";

import { PageFrame } from "../../components/page-frame";
import { getDictionaryClient, getFileClient, resolveCommandDispatchResourceUrl } from "../../domain-context";
import { Alert, Button, Empty, message, Spin, Upload } from "../../pc-ui-runtime";
import { MAP_CONFIG_CODE, configurationError, loadConfiguration, saveConfiguration } from "../dispatch-map-config/config";
import { BACKGROUND_IMAGE_TYPES, backgroundRecord, validateBackgroundFile } from "./config";

import styles from "./index.module.css";

export const BackgroundConfig = defineComponent({
  name: "BackgroundConfig",
  setup() {
    const state = reactive({
      records: [] as DataDictionary[],
      path: "",
      loading: true,
      loaded: false,
      saving: false,
      uploading: false,
      error: "",
      previewFailed: false,
    });
    let disposed = false;
    onBeforeUnmount(() => {
      disposed = true;
    });

    const load = async (): Promise<void> => {
      state.loading = true;
      state.loaded = false;
      state.error = "";
      try {
        const client = await getDictionaryClient();
        const records = await loadConfiguration(client, MAP_CONFIG_CODE);
        if (disposed) {
          return;
        }
        state.records = records;
        state.path = records.find((record) => record.code === "background")?.variable ?? "";
        state.previewFailed = false;
        state.loaded = true;
      } catch (error) {
        if (!disposed) {
          state.error = configurationError(error, "背景配置加载失败，请重试");
        }
      } finally {
        if (!disposed) {
          state.loading = false;
        }
      }
    };

    const beforeUpload = (file: Blob): boolean | string => {
      const error = validateBackgroundFile(file);
      if (error) {
        message.error(error);
        return Upload.LIST_IGNORE;
      }
      return true;
    };

    const upload = async (options: UploadRequestOption): Promise<void> => {
      if (!(options.file instanceof Blob)) {
        options.onError?.(new Error("请上传图片文件"));
        return;
      }
      const validation = validateBackgroundFile(options.file);
      if (validation) {
        message.error(validation);
        options.onError?.(new Error(validation));
        return;
      }
      state.uploading = true;
      state.error = "";
      try {
        const client = await getFileClient();
        const result = await client.uploadBusinessFile({ file: options.file, businessKey: "mdata" });
        if (!result.path?.trim()) {
          throw new Error("上传接口未返回图片地址");
        }
        if (disposed) {
          return;
        }
        state.path = result.path;
        state.previewFailed = false;
        options.onSuccess?.(result);
        message.success("上传成功，请保存背景配置");
      } catch (error) {
        if (!disposed) {
          state.error = configurationError(error, "图片上传失败，请重试");
          options.onError?.(error instanceof Error ? error : new Error("图片上传失败"));
        }
      } finally {
        if (!disposed) {
          state.uploading = false;
        }
      }
    };

    const save = async (): Promise<void> => {
      if (!state.path) {
        message.warning("请上传背景图片");
        return;
      }
      if (!state.loaded || state.uploading || state.saving) {
        return;
      }
      state.saving = true;
      state.error = "";
      try {
        const client = await getDictionaryClient();
        state.records = [backgroundRecord(state.records, state.path)];
        await saveConfiguration(client, state.records, "调度中心地图配置");
        state.records = await client.getDataDictionaryByItem({ itemCode: MAP_CONFIG_CODE });
        if (!disposed) {
          message.success("保存成功");
        }
      } catch (error) {
        if (!disposed) {
          state.error = configurationError(error, "保存失败，请重试");
        }
      } finally {
        if (!disposed) {
          state.saving = false;
        }
      }
    };

    onMounted(() => {
      void load();
    });
    return () => (
      <PageFrame
        title="背景配置"
        v-slots={{
          search: () => (
            <div class={styles.toolbar}>
              <div>
                <div class={styles.heading}>调度中心默认背景配置</div>
                <div class={styles.description}>支持未对接地图服务的厂家使用默认背景图</div>
              </div>
              <Upload
                accept={BACKGROUND_IMAGE_TYPES.join(",")}
                beforeUpload={beforeUpload}
                customRequest={(options) => {
                  void upload(options);
                }}
                showUploadList={false}
                disabled={!state.loaded || state.saving || state.uploading}
              >
                <Button type="primary" loading={state.uploading} disabled={!state.loaded || state.saving}>
                  上传
                </Button>
              </Upload>
            </div>
          ),
          default: () => (
            <div class={styles.body}>
              {state.error && (
                <Alert
                  type="error"
                  showIcon
                  message={state.error}
                  v-slots={{
                    action: () =>
                      !state.loaded ? (
                        <Button size="small" onClick={() => void load()}>
                          重新加载
                        </Button>
                      ) : undefined,
                  }}
                />
              )}
              {state.previewFailed && <Alert type="warning" showIcon message="图片预览加载失败，请检查图片地址或重新上传" />}
              <div class={styles.preview}>
                {state.loading ? (
                  <Spin />
                ) : state.path ? (
                  <img
                    class={styles.image}
                    src={resolveCommandDispatchResourceUrl(state.path)}
                    alt="调度中心背景图预览"
                    onError={() => {
                      state.previewFailed = true;
                    }}
                  />
                ) : (
                  <Empty description="暂无背景图" />
                )}
              </div>
            </div>
          ),
          footer: () => (
            <Button type="primary" loading={state.saving} disabled={!state.loaded || state.uploading} onClick={() => void save()}>
              保存
            </Button>
          ),
        }}
      />
    );
  },
});
