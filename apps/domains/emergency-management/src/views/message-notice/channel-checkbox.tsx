// @ts-nocheck
/**
 * Combines legacy newSatMsgConfigCheckBox (alarm timeout) + fileSatMsgConfigCheckBox (file expire).
 */
import { MinusOutlined, PlusOutlined } from "@ant-design/icons-vue";
import { defineComponent, onMounted, reactive, ref, watch } from "vue";

import { getEmergencyManagementClient } from "@/domain-context";
import { Button, Checkbox, CheckboxGroup, Form, FormItem, Input, InputNumber, Modal, Select, Table, Tag, message } from "@/pc-ui-runtime";

import styles from "./message-notice.module.css";

type NoticeOption = { label: string; value: string; [key: string]: unknown };
type SelectOption = { label: string; value: string };
type NoticeObj = {
  emergencyFileTypeId?: string | number;
  objType?: string | null;
  objId?: string[];
  selectOption?: SelectOption[];
};

function asList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.records)) return obj.records as Record<string, unknown>[];
    if (Array.isArray(obj.list)) return obj.list as Record<string, unknown>[];
  }
  return [];
}

function normalizeNoticeMethods(raw: unknown): NoticeOption[] {
  return asList(raw).map((item) => ({
    ...item,
    label: String(item.label ?? item.name ?? item.value ?? ""),
    value: String(item.value ?? item.noticeWay ?? item.code ?? ""),
  }));
}

function normalizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.map(String).filter(Boolean);
}

async function resolveUserOptions(ids: string[]): Promise<SelectOption[]> {
  const normalizedIds = normalizeIds(ids);
  if (!normalizedIds.length) return [];
  try {
    const res = await getEmergencyManagementClient().getTenantUsersByIds(normalizedIds);
    return asList(res)
      .map((e) => ({
        label: String(e.name ?? e.username ?? e.nickName ?? ""),
        value: String(e.id ?? e.userId ?? ""),
      }))
      .filter((item) => item.value && item.label);
  } catch {
    return [];
  }
}

export const ChannelCheckbox = defineComponent({
  name: "ChannelCheckbox",
  props: {
    /** alarm = ALARM_TIMEOUT_NOTIFY; file = EMERGENCY_FILE_EXPIRE_NOTIFY */
    mode: { type: String, default: "alarm" },
    model: { type: Object, required: true },
    noticeMethod: { type: Array, default: () => [] },
  },
  emits: ["update:model", "changeItem", "itemChange"],
  setup(props, { emit }) {
    const formModel = ref(props.model);
    const noticeBox = ref<NoticeOption[]>(normalizeNoticeMethods(props.noticeMethod));
    const fileTypeOptions = ref<SelectOption[]>([]);
    const visible = ref(false);
    const selectIndex = ref(0);
    const selectedKeys = ref<string[]>([]);
    const selectedRows = ref<Record<string, unknown>[]>([]);
    const userRows = ref<Record<string, unknown>[]>([]);
    const userLoading = ref(false);
    const userKeyword = ref("");

    const layout = reactive({
      labelCol: { flex: "88px" },
      wrapperCol: { flex: "1" },
    });

    watch(
      () => props.model,
      (v) => {
        formModel.value = v;
      },
    );

    watch(
      () => props.noticeMethod,
      (v) => {
        noticeBox.value = normalizeNoticeMethods(v);
      },
    );

    const updateValue = () => {
      emit("update:model", formModel.value);
    };

    const change = (e: string[]) => {
      emit("changeItem", e);
      updateValue();
    };

    const itemChange = (checked: boolean, item: NoticeOption) => {
      emit("itemChange", checked, item);
    };

    const loadUsers = async (keyword = "") => {
      userLoading.value = true;
      try {
        const raw = await getEmergencyManagementClient().listTenantUsers({
          pageNumber: 1,
          pageSize: 50,
          keyword: keyword || undefined,
          enabled: true,
        });
        userRows.value = asList(raw);
      } catch {
        message.error("加载人员失败");
      } finally {
        userLoading.value = false;
      }
    };

    const clickSelectBtn = async (index: number) => {
      selectIndex.value = index;
      const objs = (formModel.value.emergencyFileNoticeObjs || []) as NoticeObj[];
      const emergencyFileNoticeObj = objs[index] || {};
      const objIds = normalizeIds(emergencyFileNoticeObj.objId);
      emergencyFileNoticeObj.objId = objIds;
      let selectOption = (emergencyFileNoticeObj.selectOption ?? [])
        .map((e) => ({ label: String(e.label ?? ""), value: String(e.value ?? "") }))
        .filter((e) => e.value && objIds.includes(e.value));
      const knownIds = new Set(selectOption.map((e) => e.value));
      const missingIds = objIds.filter((id) => !knownIds.has(id));
      if (missingIds.length) {
        selectOption = [...selectOption, ...(await resolveUserOptions(missingIds))];
      }
      emergencyFileNoticeObj.selectOption = selectOption;
      selectedKeys.value = objIds;
      selectedRows.value = selectOption.map((e) => ({
        id: e.value,
        name: e.label,
      }));
      userKeyword.value = "";
      visible.value = true;
      void loadUsers();
    };

    const selectUser = () => {
      const index = selectIndex.value;
      const selectedItems = selectedRows.value.filter((e) => selectedKeys.value.includes(String(e.id)));
      if (!formModel.value.emergencyFileNoticeObjs) {
        formModel.value.emergencyFileNoticeObjs = [];
      }
      formModel.value.emergencyFileNoticeObjs[index].selectOption = selectedItems.map((e) => ({
        label: String(e.name ?? e.id ?? ""),
        value: String(e.id ?? ""),
      }));
      formModel.value.emergencyFileNoticeObjs[index].objId = selectedItems.map((e) => String(e.id ?? ""));
      formModel.value.emergencyFileNoticeObjs[index].objType = "USER";
      visible.value = false;
      updateValue();
    };

    const addNoticeType = () => {
      if (!formModel.value.emergencyFileNoticeObjs) {
        formModel.value.emergencyFileNoticeObjs = [];
      }
      formModel.value.emergencyFileNoticeObjs.push({
        emergencyFileTypeId: undefined,
        objType: "USER",
        objId: [],
        selectOption: [],
      });
      updateValue();
    };

    const delNoticeType = (index: number) => {
      formModel.value.emergencyFileNoticeObjs.splice(index, 1);
      updateValue();
    };

    onMounted(async () => {
      if (props.mode !== "file") return;
      try {
        const res = await getEmergencyManagementClient().getFileTypes();
        fileTypeOptions.value = asList(res).map((e) => ({
          label: String(e.name ?? e.label ?? ""),
          value: String(e.id ?? e.value ?? ""),
        }));
      } catch {
        /* ignore */
      }
    });

    const renderAlarm = () => (
      <Form model={formModel.value} labelCol={layout.labelCol} wrapperCol={layout.wrapperCol} labelAlign="left">
        {formModel.value.name ? <span class={styles.title}>{formModel.value.name}</span> : null}
        <div class={styles.pt2}>
          <FormItem label="通知条件">
            <div class={styles.conditionRow}>
              距离任务超时时间还有
              <InputNumber
                id="inputNumber"
                style={{ margin: "0 5px" }}
                v-model:value={formModel.value.notificationTime}
                min={1}
                max={100}
              />
              分钟提醒
            </div>
          </FormItem>
          <FormItem label="通知方式">
            <CheckboxGroup v-model:value={formModel.value.channelParams} onChange={change}>
              {noticeBox.value.map((item) => (
                <Checkbox
                  key={item.value}
                  value={item.value}
                  onChange={(e: { target: { checked: boolean } }) => itemChange(e.target.checked, item)}
                >
                  {item.label}
                </Checkbox>
              ))}
            </CheckboxGroup>
          </FormItem>
          <FormItem label="通知模板">
            <span>{formModel.value.msgTmpContent}</span>
          </FormItem>
        </div>
      </Form>
    );

    const renderFile = () => (
      <>
        <Form model={formModel.value} labelCol={layout.labelCol} wrapperCol={layout.wrapperCol} labelAlign="left">
          <div class={styles.pt2}>
            <FormItem label="通知条件">预案文件已到期</FormItem>
            <FormItem label="通知方式">
              <CheckboxGroup v-model:value={formModel.value.noticeWays} onChange={() => updateValue()}>
                {noticeBox.value.map((item) => (
                  <Checkbox key={item.value} value={item.value} onChange={() => updateValue()}>
                    {item.label}
                  </Checkbox>
                ))}
              </CheckboxGroup>
            </FormItem>
            <FormItem label="通知模板">【预案文件名称】已过期，请及时维护管理。</FormItem>
            <FormItem label="通知人员">
              {(formModel.value.emergencyFileNoticeObjs || []).map((item: NoticeObj, i: number) => (
                <div key={i} class={styles.personItem}>
                  <Select
                    v-model:value={item.emergencyFileTypeId}
                    style={{ width: "200px" }}
                    options={fileTypeOptions.value}
                    placeholder="请选择文件类型"
                    allowClear
                    onChange={() => updateValue()}
                  />
                  <div class={styles.personSelectGroup}>
                    <Select
                      v-model:value={item.objId}
                      mode="multiple"
                      open={false}
                      options={item.selectOption || []}
                      placeholder="已选人员"
                      maxTagCount="responsive"
                      showArrow={false}
                    />
                    <Button type="primary" onClick={() => clickSelectBtn(i)}>
                      选择人员
                    </Button>
                  </div>
                  {i === 0 ? (
                    <Button shape="circle" type="primary" size="small" onClick={addNoticeType}>
                      <PlusOutlined />
                    </Button>
                  ) : (
                    <Button shape="circle" danger size="small" onClick={() => delNoticeType(i)}>
                      <MinusOutlined />
                    </Button>
                  )}
                </div>
              ))}
            </FormItem>
          </div>
        </Form>
        <Modal
          open={visible.value}
          title="选择人员"
          width={960}
          destroyOnClose
          onCancel={() => {
            visible.value = false;
          }}
          onOk={selectUser}
        >
          <div class={styles.userModalBody}>
            <div class={styles.userModalToolbar}>
              <div class={styles.userModalSearch}>
                <Input
                  allowClear
                  value={userKeyword.value}
                  placeholder="请输入人员名称"
                  onUpdate:value={(v: string) => {
                    userKeyword.value = v;
                  }}
                  onPressEnter={() => void loadUsers(userKeyword.value)}
                />
                <Button type="primary" onClick={() => void loadUsers(userKeyword.value)}>
                  查询
                </Button>
              </div>
              <span class={styles.userModalHint}>已选 {selectedKeys.value.length} 人</span>
            </div>
            <div class={styles.selectedTagsSection}>
              <span class={styles.selectedTagsLabel}>已选人员</span>
              <div class={styles.selectedTags}>
                {selectedRows.value.length ? (
                  selectedRows.value
                    .filter((row) => selectedKeys.value.includes(String(row.id)))
                    .map((row) => (
                      <Tag
                        key={String(row.id)}
                        closable
                        onClose={() => {
                          const id = String(row.id);
                          selectedKeys.value = selectedKeys.value.filter((key) => key !== id);
                          selectedRows.value = selectedRows.value.filter((item) => String(item.id) !== id);
                        }}
                      >
                        {String(row.name ?? row.id)}
                      </Tag>
                    ))
                ) : (
                  <span class={styles.selectedEmpty}>暂未选择人员</span>
                )}
              </div>
            </div>
            <Table
              rowKey={(row: Record<string, unknown>) => String(row.id)}
              loading={userLoading.value}
              dataSource={userRows.value}
              size="middle"
              pagination={{ pageSize: 8, showSizeChanger: false }}
              rowSelection={{
                selectedRowKeys: selectedKeys.value,
                onChange: (keys: Array<string | number>, rows: Record<string, unknown>[]) => {
                  const nextKeys = keys.map(String);
                  selectedKeys.value = nextKeys;
                  const map = new Map<string, Record<string, unknown>>();
                  selectedRows.value.forEach((r) => map.set(String(r.id), r));
                  rows.forEach((r) => map.set(String(r.id), r));
                  selectedRows.value = nextKeys.map((k) => map.get(k) || { id: k, name: String(k) });
                },
              }}
              columns={[
                { title: "名称", dataIndex: "name", key: "name", ellipsis: true },
                { title: "联系电话", dataIndex: "mobile", key: "mobile", width: 140 },
                {
                  title: "性别",
                  dataIndex: "gender",
                  key: "gender",
                  width: 80,
                  customRender: ({ text }: { text: string }) => (text === "MALE" ? "男" : text === "FEMALE" ? "女" : "—"),
                },
              ]}
            />
          </div>
        </Modal>
      </>
    );

    return () => (props.mode === "file" ? renderFile() : renderAlarm());
  },
});

export default ChannelCheckbox;
