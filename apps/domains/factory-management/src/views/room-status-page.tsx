import type { MonitorRecord } from "@g2-contract/factory-management";
import { Button, DeleteOutlined, EditOutlined, Empty, Form, FormItem, Input, Modal, PageLayout, Space, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getFactoryManagementClient } from "../domain-context";
import { errorMessage } from "../shared";

import styles from "../styles.module.less";

export const RoomStatusPage = defineComponent({
  name: "FactoryManagementRoomStatusPage",
  setup() {
    const rows = ref<MonitorRecord[]>([]);
    const selected = ref<MonitorRecord>();
    const visible = ref(false);
    const saving = ref(false);
    const editingId = ref("");
    const model = reactive({ monitorName: "", monitorUrl: "" });
    const formRef = ref<{ validate(): Promise<void>; resetFields(): void }>();

    const load = async (): Promise<void> => {
      try {
        rows.value = await getFactoryManagementClient().listMonitors("roomStatus");
        if (!selected.value || !rows.value.some((item) => item.id === selected.value?.id)) {
          selected.value = rows.value[0];
        }
      } catch (error) {
        message.error(errorMessage(error, "房间状态配置加载失败"));
      }
    };

    const open = (record?: MonitorRecord): void => {
      editingId.value = record?.id ?? "";
      model.monitorName = record?.monitorName ?? "";
      model.monitorUrl = record?.monitorUrl ?? "";
      visible.value = true;
    };

    const save = async (): Promise<void> => {
      await formRef.value?.validate();
      saving.value = true;
      try {
        const body = { ...model, applicationCode: "FACTORYMANAGEMENT", categoryCode: "roomStatus" };
        if (editingId.value) {
          await getFactoryManagementClient().updateMonitor(editingId.value, body);
        } else {
          await getFactoryManagementClient().createMonitor(body);
        }
        message.success("保存成功");
        visible.value = false;
        await load();
      } catch (error) {
        message.error(errorMessage(error, "保存失败"));
      } finally {
        saving.value = false;
      }
    };

    const remove = (record: MonitorRecord): void => {
      Modal.confirm({
        title: "确认删除当前监控配置？",
        okText: "确定",
        cancelText: "取消",
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await getFactoryManagementClient().deleteMonitor(record.id);
            message.success("删除成功");
            await load();
          } catch (error) {
            message.error(errorMessage(error, "删除失败"));
          }
        },
      });
    };

    onMounted(() => void load());

    return () => (
      <PageLayout
        title="房间状态"
        showFooter={false}
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => open()}>
              新建
            </Button>
          ),
          "layout-content": () => (
            <>
              <div class={styles.monitorWorkspace}>
                <aside class={styles.monitorSidebar}>
                  <div class={styles.sidebarHeading}>楼层区域</div>
                  {rows.value.length > 0 ? (
                    <div class={styles.monitorList}>
                      {rows.value.map((record) => (
                        <button
                          type="button"
                          class={[styles.monitorItem, selected.value?.id === record.id ? styles.monitorItemActive : ""]}
                          onClick={() => (selected.value = record)}
                        >
                          <span title={record.monitorName}>{record.monitorName}</span>
                          <div onClick={(event: MouseEvent) => event.stopPropagation()}>
                            <Space size={2}>
                              <Button type="text" size="small" aria-label="编辑" onClick={() => open(record)}>
                                <EditOutlined />
                              </Button>
                              <Button type="text" size="small" danger aria-label="删除" onClick={() => remove(record)}>
                                <DeleteOutlined />
                              </Button>
                            </Space>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty description="暂无监控配置" />
                  )}
                </aside>
                <section class={styles.monitorFrame}>
                  {selected.value?.monitorUrl ? (
                    <iframe title={selected.value.monitorName} src={selected.value.monitorUrl} frameborder="0" />
                  ) : (
                    <Empty description="请选择左侧监控配置" />
                  )}
                </section>
              </div>
              <Modal
                open={visible.value}
                title={editingId.value ? "编辑监控信息" : "新增监控信息"}
                confirmLoading={saving.value}
                okText="保存"
                cancelText="取消"
                onOk={() => void save()}
                onCancel={() => {
                  visible.value = false;
                  formRef.value?.resetFields();
                }}
              >
                <Form ref={formRef} model={model} labelCol={{ style: { width: "90px" } }}>
                  <FormItem label="监控信息" name="monitorName" rules={[{ required: true, whitespace: true, message: "请输入监控信息" }]}>
                    <Input v-model:value={model.monitorName} placeholder="请输入监控信息" />
                  </FormItem>
                  <FormItem label="组态链接" name="monitorUrl" rules={[{ required: true, whitespace: true, message: "请输入组态链接" }]}>
                    <Input v-model:value={model.monitorUrl} placeholder="请输入组态链接" />
                  </FormItem>
                </Form>
              </Modal>
            </>
          ),
        }}
      />
    );
  },
});
