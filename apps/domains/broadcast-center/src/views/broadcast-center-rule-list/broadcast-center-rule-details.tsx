// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import type { BroadcastTemplatePage, Device, SecurityDeviceRecord } from "@g2-contract/broadcast-center";
import type { FormInstance } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { BroadcastDeviceModal } from "./components/broadcast-device-modal";
import { BroadcastModal } from "./components/broadcast-modal";
import { checkedDeviceColumns } from "./config";
import { broadcastApi } from "@/api/server";
import { VerticalLine } from "@/components/vertical-line";
import { Button, Col, Form, FormItem, Input, PageLayout, PopConfirm, PopOver, Row, Table, Textarea, message } from "@/pc-ui-runtime";
import { formatBroadcastTemplateContent, usePageName } from "@/utils";

import styles from "../broadcast-template/broadcast.module.css";

/** 广播规则详情 */
export const BroadcastCenterRuleDetails = defineComponent({
  name: "BroadcastCenterRuleDetails",
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const formRef = ref<FormInstance>();
    const type = (route.query.type as string) || "add";
    const id = (route.query.id as string) || "";
    const rules = {
      name: [{ required: true, message: "请输入规则名称", trigger: "blur" }],
    };
    const state = reactive({
      selectedTemplateModal: {
        visible: false,
        selectedIds: [] as string[],
      },
      formState: {
        name: "",
        remark: "",
      },
      selectedDeviceModal: {
        visible: false,
        selectedIds: [] as string[],
      },
      selectedDeviceIds: [] as string[],
      deviceDataSource: [] as Device[],
      loading: false,
      templateDataSource: [] as { id: string; name: string; content: string }[],
    });

    const deviceRowSelection = computed(() => ({
      selectedRowKeys: state.selectedDeviceIds,
      onChange: (selectedRowKeys: string[]): void => {
        state.selectedDeviceIds = selectedRowKeys;
      },
    }));

    const operationDelete = (index: number): void => {
      state.templateDataSource.splice(index, 1);
      state.selectedTemplateModal.selectedIds.splice(index, 1);
    };

    const handleBack = (): void => {
      history.back();
    };

    const handleSave = async (): Promise<void> => {
      try {
        state.loading = true;
        await formRef.value?.validate?.();
        if (!state.templateDataSource.length) {
          message.warning("请选择模板");
          return;
        }
        if (!state.deviceDataSource.length) {
          message.warning("请选择设备");
          return;
        }

        const templates = state.templateDataSource.map((item) => ({
          templateId: item.id,
          templateName: item.name,
          templateContent: item.content,
        }));

        const devices = state.deviceDataSource.map((item) => ({
          ...item,
          deviceAreaId: item.areaId,
          deviceAreaName: item.areaName,
        }));
        const params = {
          ...state.formState,
          enabled: true,
          templates,
          devices,
        };
        if (type === "add") {
          await broadcastApi.addBroadcastRule(params);
        } else if (type === "edit") {
          await broadcastApi.updateBroadcastRule(id, params);
        }

        message.success("操作成功");
        handleBack();
      } catch {
        // 校验或接口失败时停留在当前页
      } finally {
        state.loading = false;
      }
    };

    const getRuleInfo = async (): Promise<void> => {
      const data = await broadcastApi.getBroadcastRuleInfo(id);
      state.formState.name = data.name;
      state.formState.remark = data.remark || "";
      state.deviceDataSource = (data.devices || []).map((item) => ({
        ...item,
        areaId: item.deviceAreaId || "",
        areaName: item.deviceAreaName || "",
      }));
      state.selectedDeviceModal.selectedIds = (data.devices || []).map((item) => item.deviceId);
      state.templateDataSource = (data.templates || []).map((item) => ({
        id: item.templateId,
        name: item.templateName,
        content: item.templateContent,
      }));
      state.selectedTemplateModal.selectedIds = (data.templates || []).map((item) => item.templateId);
    };

    const operationDeleteDevice = (index: number): void => {
      state.deviceDataSource.splice(index, 1);
      state.selectedDeviceModal.selectedIds.splice(index, 1);
    };

    const batchDeleteDevice = (): void => {
      state.deviceDataSource = state.deviceDataSource.filter((item) => !state.selectedDeviceIds.includes(item.deviceId));
      state.selectedDeviceModal.selectedIds = state.selectedDeviceModal.selectedIds.filter(
        (item) => !state.selectedDeviceIds.includes(item),
      );
      state.selectedDeviceIds = [];
    };

    const deviceCancel = (): void => {
      state.selectedDeviceModal.visible = false;
    };

    const saveDevice = (selectedIds: string[], selectedRows: SecurityDeviceRecord[]): void => {
      state.selectedDeviceModal.selectedIds = selectedIds;
      state.deviceDataSource = selectedRows as unknown as Device[];
      state.selectedDeviceModal.visible = false;
    };

    const cancel = (): void => {
      state.selectedTemplateModal.visible = false;
    };

    const saveTemplate = (selectedIds: string[], selectedRows: BroadcastTemplatePage[]): void => {
      state.selectedTemplateModal.selectedIds = selectedIds;
      state.templateDataSource = selectedRows.map((row) => ({
        id: row.id,
        name: row.name,
        content: row.content,
      }));
      state.selectedTemplateModal.visible = false;
    };

    onMounted(() => {
      if (type !== "add") void getRuleInfo();
    });

    const checkedTemColumns = [
      {
        title: "模板名称",
        dataIndex: "name",
        key: "name",
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        dataIndex: "content",
        key: "content",
        title: "广播内容",
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => {
          const display = formatBroadcastTemplateContent(text);
          return <PopOver content={display || ""}>{display || "--"}</PopOver>;
        },
      },
      {
        dataIndex: "action",
        title: "操作",
        slots: {
          customRender: "action",
        },
      },
    ];

    const slots = {
      "layout-content": (): JSX.Element => (
        <>
          <div class={styles.from}>
            <Form ref={formRef} model={state.formState} rules={rules}>
              <Row>
                <Col span={12}>
                  <FormItem label="规则名称" name="name">
                    <Input
                      maxlength={20}
                      disabled={type === "info"}
                      showCount
                      allowClear
                      value={state.formState.name}
                      onUpdate:value={(v) => (state.formState.name = v)}
                      placeholder="请输入规则名称"
                    />
                  </FormItem>
                </Col>
                <Col span={12}>
                  <FormItem label="说明" name="remark">
                    <Textarea
                      maxlength={200}
                      disabled={type === "info"}
                      allowClear
                      rows={2}
                      value={state.formState.remark}
                      onUpdate:value={(v) => (state.formState.remark = v)}
                      showCount
                      placeholder="输入备注信息"
                    />
                  </FormItem>
                </Col>
              </Row>
            </Form>
          </div>
          <div class={styles["rule-config"]}>
            <VerticalLine title="规则配置" />

            <div class={styles["broadcast-template"]}>
              <div class={styles["top-operate"]}>
                <div class={styles.title}>广播模板</div>
                <Button type="primary" disabled={type === "info"} onClick={() => (state.selectedTemplateModal.visible = true)}>
                  添加
                </Button>
              </div>
              <div class={styles["template-table"]}>
                <Table
                  columns={checkedTemColumns}
                  pagination={false}
                  dataSource={state.templateDataSource}
                  size="small"
                  v-slots={{
                    action: ({ index }: { index: number }) => (
                      <PopConfirm disabled={type === "info"} title="删除当前选中？" onConfirm={() => operationDelete(index)}>
                        <Button type="link" disabled={type === "info"} danger>
                          删除
                        </Button>
                      </PopConfirm>
                    ),
                  }}
                />
              </div>
            </div>
            <div class={styles["broadcast-template"]}>
              <div class={styles["top-operate"]}>
                <div class={styles.title}>广播设备</div>
                <Button type="primary" disabled={type === "info"} onClick={() => (state.selectedDeviceModal.visible = true)}>
                  添加
                </Button>
                <Button danger disabled={type === "info"} onClick={batchDeleteDevice}>
                  批量删除
                </Button>
              </div>
              <div class={styles["template-table"]}>
                <Table
                  columns={checkedDeviceColumns}
                  rowKey="deviceId"
                  rowSelection={deviceRowSelection.value}
                  dataSource={state.deviceDataSource}
                  size="small"
                  v-slots={{
                    action: ({ index }: { index: number }) => (
                      <PopConfirm disabled={type === "info"} title="删除当前选中？" onConfirm={() => operationDeleteDevice(index)}>
                        <Button type="link" disabled={type === "info"} danger>
                          删除
                        </Button>
                      </PopConfirm>
                    ),
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ),
      "footer-page": (): JSX.Element => (
        <>
          <Button onClick={handleBack}>返回</Button>
          {type !== "info" && (
            <Button style={{ marginLeft: "10px" }} type="primary" loading={state.loading} onClick={handleSave}>
              保存
            </Button>
          )}
        </>
      ),
      // 选择弹窗挂在 PageLayout default slot，继承 ZhConfigProvider 中文 locale
      default: (): JSX.Element => (
        <>
          {state.selectedTemplateModal.visible && (
            <BroadcastModal
              visible={state.selectedTemplateModal.visible}
              selectedKeys={state.selectedTemplateModal.selectedIds}
              onCancel={cancel}
              onSave={saveTemplate}
            />
          )}
          {state.selectedDeviceModal.visible && (
            <BroadcastDeviceModal
              visible={state.selectedDeviceModal.visible}
              selectedKeys={state.selectedDeviceModal.selectedIds}
              onCancel={deviceCancel}
              onSave={saveDevice}
            />
          )}
        </>
      ),
    };

    return (): JSX.Element => <PageLayout title={pageTitle ?? "基础信息"} v-slots={slots} />;
  },
});
