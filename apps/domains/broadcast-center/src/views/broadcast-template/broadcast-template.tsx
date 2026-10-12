// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import type { BroadcastTemplatePage } from "@g2-contract/broadcast-center";
import type { FormInstance, UploadRequestOption } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { broadcastApi } from "@/api/server";
import { getFileClient } from "@/domain-context";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  PopOver,
  RadioButton,
  RadioGroup,
  Select,
  Textarea,
  Upload,
  getDayjs,
  message,
  usePcTable,
} from "@/pc-ui-runtime";
import {
  formatBroadcastTemplateContent,
  normalizeUploaded,
  toEditableBroadcastContent,
  toStoredBroadcastContent,
  usePageName,
} from "@/utils";

import styles from "./broadcast.module.css";

const dayjs = getDayjs();

const VARIABLE_LABELS: Record<string, string> = {
  name: "姓名",
  address: "地址",
  plateNo: "车牌号",
  curTime: "当前时间",
  curDate: "当前日期",
  phone: "电话",
  genericText: "通用文本",
};

const VARIABLE_INSERT: Record<string, string> = {
  name: "{ 姓名 }",
  address: "{ 地址 }",
  plateNo: "{车牌号 }",
  curTime: "{当前时间}",
  curDate: "{当前日期}",
  phone: "{ 电话 }",
  genericText: "{ 通用文本 }",
};

/** 广播模板 */
export const BroadcastTemplate = defineComponent({
  name: "BroadcastTemplate",
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const tableCode = "BROADCAST_TEMPLATE";
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const formState = reactive<{ keyword: string | undefined; contentType: string | undefined }>({
      keyword: undefined,
      contentType: undefined,
    });
    const panelRef = ref<FormInstance>();
    const videoList = ref<{ uid: string; name: string; status: string; path: string }[]>([]);
    const state = reactive({
      panelVisible: false,
      panelLoading: false,
      disabled: false,
      modalName: "新增",
      itemId: "",
      panelModel: {
        contentType: "TEXT",
        name: "",
        code: "name",
        content: "",
        audioContent: "",
        audioContentId: "",
      },
      cursorPosition: 0,
      panelRules: {
        name: [{ required: true, message: "类型名称不能为空" }],
        code: [{ required: true, message: "请选择广播变量" }],
        audioContent: [{ required: true, message: "广播内容不能为空" }],
      },
    });

    const hasReadOptions = [
      { label: "文本", value: "TEXT" },
      { label: "音频", value: "AUDIO" },
    ];

    const columns = [
      {
        title: "序号",
        dataIndex: "",
        ellipsis: true,
        align: "center",
        width: 70,
        customRender: ({ index }: { index: number }): JSX.Element => <PopOver content={index + 1 || "--"}>{index + 1 || "--"}</PopOver>,
      },
      {
        title: "模板名称",
        dataIndex: "name",
        align: "center",
        width: 150,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "广播内容",
        dataIndex: "content",
        ellipsis: true,
        align: "center",
        width: 400,
        customRender: ({ text, record }: { text: string; record: BroadcastTemplatePage }): JSX.Element => {
          if (record.contentType === "TEXT") {
            const display = formatBroadcastTemplateContent(text);
            return <PopOver content={display || ""}>{display || "--"}</PopOver>;
          }
          return <audio src={record.fileVOList?.[0] ? record.fileVOList[0].path : ""} style="max-width: 100%;max-height: 100%;" controls />;
        },
      },
      {
        title: "编辑人",
        dataIndex: "updateByName",
        ellipsis: true,
        align: "center",
        width: 100,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "最近编辑时间",
        dataIndex: "updateTime",
        ellipsis: true,
        align: "center",
        width: 160,
        customRender: ({ text }: { text: string }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "";
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        ellipsis: true,
        align: "center",
        width: 120,
        customRender: ({ record }: { record: BroadcastTemplatePage }): JSX.Element => (
          <>
            <Button type="link" size="small" onClick={() => operationRecord(record)}>
              编辑
            </Button>
            <PopConfirm title="确认删除该项？" onConfirm={async () => operationDelete(record)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode,
      rowKey: "id",
      fetchApi: async () => {
        const result = await broadcastApi.broadcastTemplatePage({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: formState.keyword || undefined,
          contentType: formState.contentType || undefined,
        });
        return { total: result.total, pages: result.pages, records: result.records };
      },
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const operationDelete = async (record: BroadcastTemplatePage): Promise<void> => {
      await broadcastApi.deleteBroadcastTemplate(record.id);
      message.success("操作成功");
      tableApi.query();
    };

    const openModel = (type: string): void => {
      state.panelVisible = true;
      if (type === "add") {
        resetPanelModel();
        state.modalName = "新增";
        state.disabled = false;
        state.itemId = "";
      }
    };

    const resetPanelModel = (): void => {
      state.panelModel = {
        contentType: "TEXT",
        name: "",
        code: "name",
        content: "",
        audioContent: "",
        audioContentId: "",
      };
      videoList.value = [];
    };

    const queryForm = (): void => {
      page.pageNumber = 1;
      tableApi.query();
    };

    const operationRecord = (record: BroadcastTemplatePage): void => {
      state.disabled = record.defaulted;
      state.modalName = "编辑";
      state.panelVisible = true;
      state.itemId = record.id;
      Object.assign(state.panelModel, {
        name: record.name,
        contentType: record.contentType,
        code: "name",
        content: toEditableBroadcastContent(record.content),
        audioContent: record.fileVOList?.[0]?.name || "",
        audioContentId: record.fileVOList?.[0]?.id || "",
      });
    };

    const reset = (): void => {
      page.pageNumber = 1;
      formState.keyword = undefined;
      formState.contentType = undefined;
      tableApi.query();
    };

    const changeTab = (type: string): void => {
      const val = VARIABLE_INSERT[type];
      if (!val) return;
      const pos = state.cursorPosition;
      const content = state.panelModel.content;
      state.panelModel.content = content.slice(0, pos) + val + content.slice(pos);
    };

    const panelCancel = (): void => {
      panelRef.value?.resetFields?.();
      state.panelVisible = false;
      resetPanelModel();
    };

    const customRequest = async (data: UploadRequestOption): Promise<void> => {
      const client = await getFileClient();
      const formData = new FormData();
      formData.append("businessKey", "alarm");
      formData.append("file", data.file as File);
      const uploaded = normalizeUploaded(await client.uploadFile(formData));
      if (uploaded?.id && uploaded.name && uploaded.path) {
        videoList.value = [
          {
            uid: uploaded.id,
            name: uploaded.name,
            status: "success",
            path: uploaded.path,
          },
        ];
        state.panelModel.audioContent = uploaded.name;
        state.panelModel.audioContentId = uploaded.id;
        data.onSuccess?.(uploaded);
      } else {
        data.onError?.(new Error("上传失败"));
      }
    };

    const save = async (): Promise<void> => {
      try {
        await panelRef.value?.validate?.();
        state.panelLoading = true;
        const params = { ...state.panelModel };
        if (params.contentType === "TEXT") {
          params.content = toStoredBroadcastContent(params.content);
        } else {
          params.content = params.audioContentId;
        }
        if (state.modalName === "新增") {
          await broadcastApi.broadcastTemplate(params);
        } else {
          await broadcastApi.editBroadcast(state.itemId, params);
        }
        panelCancel();
        reset();
        message.success("操作成功");
      } catch {
        // 校验失败或接口异常时保持弹窗
      } finally {
        state.panelLoading = false;
      }
    };

    const removeFile = (): boolean => true;

    void route;

    const slots = {
      "layout-header": (): JSX.Element => (
        <div>
          <Button class="mr-16" type="primary" onClick={() => openModel("add")}>
            新增
          </Button>
        </div>
      ),
      "layout-content": (): JSX.Element => (
        <>
          <Form layout="inline" style={{ margin: "10px 0 0 0" }}>
            <FormItem label="" style={{ paddingRight: 0, marginRight: "10px", marginBottom: "10px" }}>
              <Input
                style={{ width: "220px" }}
                placeholder="请输入名称搜索"
                value={formState.keyword}
                onUpdate:value={(v) => (formState.keyword = v)}
              />
            </FormItem>
            <FormItem label="内容类型" style={{ paddingRight: 0, marginRight: "10px", marginBottom: "10px" }}>
              <Select
                allowClear
                options={hasReadOptions}
                style={{ width: "220px" }}
                placeholder="请选择内容类型"
                value={formState.contentType}
                onUpdate:value={(v) => (formState.contentType = v)}
              />
            </FormItem>
            <FormItem style={{ paddingRight: 0, marginRight: "10px", marginBottom: "10px" }}>
              <Button type="primary" onClick={queryForm}>
                查询
              </Button>
              <Button style={{ marginLeft: "10px" }} onClick={reset}>
                重置
              </Button>
            </FormItem>
          </Form>
          <PcTable />
        </>
      ),
      "footer-page": (): JSX.Element => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(pageNumber, pageSize) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            tableApi.query();
          }}
        />
      ),
      // 弹窗必须挂在 PageLayout default slot：其内部 ZhConfigProvider 提供中文 locale（确定/取消）
      default: (): JSX.Element => (
        <Modal
          open={state.panelVisible}
          title={state.modalName}
          centered
          width="45%"
          okText="确定"
          cancelText="取消"
          confirmLoading={state.panelLoading}
          onOk={save}
          onCancel={panelCancel}
        >
          <Form ref={panelRef} model={state.panelModel} rules={state.panelRules}>
            <FormItem label="模板名称" name="name">
              <Input
                value={state.panelModel.name}
                maxlength={6}
                disabled={state.disabled}
                placeholder="请输入模板名称"
                onUpdate:value={(v) => (state.panelModel.name = v)}
              />
            </FormItem>
            <FormItem label="内容类型" name="contentType">
              <RadioGroup value={state.panelModel.contentType} onUpdate:value={(v) => (state.panelModel.contentType = v)}>
                <Radio value="TEXT">文本</Radio>
                <Radio value="AUDIO">音频</Radio>
              </RadioGroup>
            </FormItem>
            {state.panelModel.contentType === "TEXT" ? (
              <>
                <FormItem label="广播变量" name="code">
                  <RadioGroup
                    value={state.panelModel.code}
                    buttonStyle="solid"
                    onUpdate:value={(v) => {
                      state.panelModel.code = v;
                      changeTab(v);
                    }}
                  >
                    {Object.keys(VARIABLE_LABELS).map((type) => (
                      <RadioButton value={type} key={type}>
                        {VARIABLE_LABELS[type]}
                      </RadioButton>
                    ))}
                  </RadioGroup>
                </FormItem>
                <FormItem label="广播内容" name="content">
                  <Textarea
                    value={state.panelModel.content}
                    rows={6}
                    maxlength={200}
                    allowClear
                    showCount
                    onUpdate:value={(v) => (state.panelModel.content = v)}
                    onBlur={(e: FocusEvent) => {
                      state.cursorPosition = (e.target as HTMLTextAreaElement).selectionStart || 0;
                    }}
                  />
                </FormItem>
              </>
            ) : (
              <FormItem label="广播内容" name="audioContent">
                <Input
                  showCount={false}
                  placeholder=""
                  value={state.panelModel.audioContent}
                  disabled
                  style={{ width: "50%", marginRight: "10px" }}
                />
                {videoList.value.length > 0 && (
                  <span
                    style={{ color: "red" }}
                    onClick={() => {
                      videoList.value = [];
                      state.panelModel.audioContent = "";
                      state.panelModel.audioContentId = "";
                    }}
                  >
                    删除
                  </span>
                )}
                <Upload
                  fileList={videoList.value}
                  onRemove={removeFile}
                  customRequest={customRequest}
                  showUploadList={false}
                  accept=".mp3,.mp4"
                >
                  <Button type="primary">上传</Button>
                </Upload>
                <span class={styles["upload-tip"]}>支持mp3格式，文件大小不超过5MB</span>
              </FormItem>
            )}
          </Form>
        </Modal>
      ),
    };

    return (): JSX.Element => <PageLayout title={pageTitle ?? "广播模版"} v-slots={slots} />;
  },
});
