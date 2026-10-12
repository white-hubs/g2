import type { MessageMethod, OptionItem, SceneConfig } from "@g2-contract/asset-management";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getClient } from "./domain-context";
import { errorText, options } from "./model";
import { optionTree } from "./options";
import { type Person, PersonPicker } from "./person-picker";
import { loadPcUi } from "./runtime-modules";

import styles from "./styles.module.css";
const { Alert, Button, CheckboxGroup, Form, FormItem, InputNumber, PageLayout, Select, Space, Spin, TabPane, Tabs, TreeSelect, message } =
  await loadPcUi();
export const SCENES = [
  { code: "INVENTORY_TASK", title: "盘点任务", condition: "任务下发即提醒" },
  { code: "MAINTENANCE_OVERDUE_ABOUT", title: "距离资产维保到期", condition: "距离维保到期还有" },
  { code: "MAINTENANCE_OVERDUE", title: "资产维保到期已过", condition: "维保期限已过" },
  { code: "OPERATE_OVERDUE_ABOUT", title: "距离资产使用到期", condition: "距离使用期限到期还有" },
  { code: "OPERATE_OVERDUE", title: "资产使用期限已过", condition: "使用期限已过" },
  { code: "CONSUMABLE_LOWER", title: "耗材库存低于下限", condition: "耗材库存低于下限" },
  { code: "CONSUMABLE_UPPER", title: "耗材库存高于上限", condition: "耗材库存高于上限" },
];
interface NoticeDraft extends SceneConfig {
  recipients: { type: string; people: Person[] }[];
}
const OBJECT_TYPES = [
  { label: "人员", value: "USER" },
  { label: "岗位", value: "POST" },
  { label: "角色", value: "ROLE" },
  { label: "部门", value: "DEPARTMENT" },
];
export function noticeDraft(scene: (typeof SCENES)[number], saved?: SceneConfig): NoticeDraft {
  return {
    label: scene.title,
    sceneCode: scene.code,
    value: saved?.value ?? 0,
    noticeWays: saved?.noticeWays ?? [],
    noticeObjs: [],
    recipients: saved?.noticeObjs?.length
      ? saved.noticeObjs.map((entry) => {
          const people: unknown = JSON.parse(entry.objInfo || "[]");
          if (!Array.isArray(people)) {
            throw new TypeError("消息通知对象格式错误");
          }
          return { type: entry.objType, people: people as Person[] };
        })
      : [{ type: "USER", people: [] }],
  };
}
export function noticePayload(row: NoticeDraft): SceneConfig {
  return {
    label: row.label,
    sceneCode: row.sceneCode,
    value: row.value,
    noticeWays: row.noticeWays,
    noticeObjs: row.recipients
      .filter((entry) => entry.people.length)
      .map((entry) => ({
        objType: entry.type,
        objId: entry.people.map((person) => person.id).join(","),
        objInfo: JSON.stringify(entry.people),
      })),
  };
}
export const MessageConfigPage = defineComponent({
  setup() {
    const selected = ref(SCENES[0].code);
    const rules = reactive<Record<string, NoticeDraft[]>>(Object.fromEntries(SCENES.map((scene) => [scene.code, [noticeDraft(scene)]])));
    const methods = reactive<Record<string, MessageMethod[]>>({});
    const departments = ref<OptionItem[]>([]);
    const positions = ref<OptionItem[]>([]);
    const roles = ref<OptionItem[]>([]);
    const loading = ref(true);
    const loaded = ref(false);
    const loadError = ref("");
    const saving = ref(false);
    const load = () => {
      loading.value = true;
      loaded.value = false;
      loadError.value = "";
      return Promise.all([
        getClient().messageConfig(),
        getClient().organizations(),
        getClient().positions(),
        getClient().roles(),
        ...SCENES.map(async (scene) => {
          methods[scene.code] = await getClient().messageMethods(scene.code);
        }),
      ])
        .then(([config, orgs, posts, rolePage]) => {
          departments.value = optionTree(orgs);
          positions.value = posts;
          roles.value = rolePage.records.map((row) => ({ id: row.id, name: String(row.name) }));
          for (const scene of SCENES) {
            const rows = config.filter((row) => row.sceneCode === scene.code && row.label);
            rules[scene.code] = rows.length > 0 ? rows.map((row) => noticeDraft(scene, row)) : [noticeDraft(scene)];
          }
          loaded.value = true;
        })
        .catch((error: unknown) => {
          loadError.value = errorText(error);
          message.error(loadError.value);
        })
        .finally(() => {
          loading.value = false;
        });
    };
    onMounted(() => void load());
    const save = async () => {
      if (saving.value || loading.value || !loaded.value) {
        return;
      }
      saving.value = true;
      try {
        await getClient().saveMessageConfig(SCENES.flatMap((scene) => rules[scene.code].map(noticePayload)));
        message.success("保存成功");
      } catch (error) {
        message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    };
    return () => (
      <PageLayout
        title="消息配置"
        class={styles.page}
        v-slots={{
          "layout-content": () => (
            <div class={styles.main}>
              <Tabs
                activeKey={selected.value}
                onChange={(key) => {
                  selected.value = String(key);
                }}
              >
                {SCENES.map((scene) => (
                  <TabPane key={scene.code} tab={scene.title} />
                ))}
              </Tabs>
              <div class={styles.scroll}>
                <Spin spinning={loading.value}>
                  {loadError.value && (
                    <div style={{ marginBottom: "16px" }}>
                      <Alert message="消息配置加载失败，暂不可保存，请重试" description={loadError.value} type="error" showIcon />
                      <Button style={{ marginTop: "8px" }} onClick={() => void load()}>
                        重试
                      </Button>
                    </div>
                  )}
                  {selected.value === "INVENTORY_TASK" ? (
                    <Alert style={{ marginBottom: "16px" }} message="盘点任务下发后，提醒责任人" type="info" showIcon />
                  ) : (
                    <Button
                      disabled={!loaded.value}
                      style={{ margin: "0 0 16px" }}
                      onClick={() => {
                        const scene = SCENES.find((entry) => entry.code === selected.value)!;
                        rules[selected.value].push(noticeDraft(scene));
                      }}
                    >
                      添加通知规则
                    </Button>
                  )}
                  {rules[selected.value].map((row, index) => (
                    <div class={styles.notice} key={`${selected.value}-${index}`}>
                      <Form layout="vertical" disabled={!loaded.value}>
                        <FormItem label="通知条件">
                          <Space>
                            {SCENES.find((scene) => scene.code === row.sceneCode)?.condition}
                            {row.sceneCode.includes("OVERDUE") && (
                              <>
                                <InputNumber
                                  value={row.value}
                                  min={0}
                                  precision={0}
                                  onChange={(value) => {
                                    row.value = Number(value ?? 0);
                                  }}
                                />
                                天提醒
                              </>
                            )}
                          </Space>
                        </FormItem>
                        <FormItem label="通知方式">
                          {methods[row.sceneCode]?.length ? (
                            <CheckboxGroup
                              value={row.noticeWays.map((entry) => entry.noticeWay)}
                              options={methods[row.sceneCode]}
                              onChange={(values) => {
                                row.noticeWays = values.map(
                                  (value) => row.noticeWays.find((entry) => entry.noticeWay === value) ?? { noticeWay: String(value) },
                                );
                              }}
                            />
                          ) : (
                            <span>当前场景未配置可使用的通知方式</span>
                          )}
                        </FormItem>
                        {row.sceneCode === "INVENTORY_TASK" ? (
                          <FormItem label="消息模板">您收到【盘点任务名称】【耗材/资产】盘点任务，请及时盘点并提交盘点结果</FormItem>
                        ) : (
                          <FormItem label="通知人员">
                            {row.recipients.map((recipient, recipientIndex) => (
                              <div class={styles.toolbar} key={recipient.type}>
                                <Select
                                  style={{ width: "140px" }}
                                  value={recipient.type}
                                  options={OBJECT_TYPES.map((item) => ({
                                    ...item,
                                    disabled: row.recipients.some((entry) => entry !== recipient && entry.type === item.value),
                                  }))}
                                  onChange={(value) => {
                                    recipient.type = String(value);
                                    recipient.people = [];
                                  }}
                                />
                                <div style={{ width: "min(460px, 100%)" }}>
                                  {recipient.type === "USER" ? (
                                    <PersonPicker
                                      value={recipient.people}
                                      multiple
                                      onChange={(people) => {
                                        recipient.people = people;
                                      }}
                                    />
                                  ) : recipient.type === "DEPARTMENT" ? (
                                    <TreeSelect
                                      style={{ width: "100%" }}
                                      treeCheckable
                                      showCheckedStrategy="SHOW_ALL"
                                      value={recipient.people.map((person) => person.id)}
                                      treeData={departments.value}
                                      fieldNames={{ label: "name", value: "id", children: "children" }}
                                      allowClear
                                      onChange={(values) => {
                                        const list = options(departments.value);
                                        recipient.people = (Array.isArray(values) ? values : []).map((id) => ({
                                          id: String(id),
                                          name: list.find((item) => item.value === id)?.label ?? "",
                                        }));
                                      }}
                                    />
                                  ) : (
                                    <Select
                                      style={{ width: "100%" }}
                                      mode="multiple"
                                      value={recipient.people.map((person) => person.id)}
                                      options={options(recipient.type === "POST" ? positions.value : roles.value)}
                                      allowClear
                                      showSearch
                                      optionFilterProp="label"
                                      onChange={(values) => {
                                        const list = options(recipient.type === "POST" ? positions.value : roles.value);
                                        recipient.people = (Array.isArray(values) ? values : []).map((id) => ({
                                          id: String(id),
                                          name: list.find((item) => item.value === id)?.label ?? "",
                                        }));
                                      }}
                                    />
                                  )}
                                </div>
                                {recipientIndex > 0 && (
                                  <Button
                                    danger
                                    onClick={() => {
                                      row.recipients.splice(recipientIndex, 1);
                                    }}
                                  >
                                    移除
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              disabled={row.recipients.length >= OBJECT_TYPES.length}
                              onClick={() => {
                                const type = OBJECT_TYPES.find((entry) => !row.recipients.some((item) => item.type === entry.value));
                                if (type) {
                                  row.recipients.push({ type: type.value, people: [] });
                                }
                              }}
                            >
                              添加通知对象
                            </Button>
                          </FormItem>
                        )}
                      </Form>
                      {row.sceneCode !== "INVENTORY_TASK" && (
                        <Button
                          danger
                          disabled={!loaded.value || rules[row.sceneCode].length <= 1}
                          onClick={() => {
                            rules[row.sceneCode].splice(index, 1);
                          }}
                        >
                          删除规则
                        </Button>
                      )}
                    </div>
                  ))}
                </Spin>
              </div>
            </div>
          ),
          "footer-page": () => (
            <Button type="primary" loading={saving.value} disabled={loading.value || !loaded.value} onClick={() => void save()}>
              保存
            </Button>
          ),
        }}
      />
    );
  },
});
