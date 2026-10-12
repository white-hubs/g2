import type { MessageClient } from "@g2-contract/message";
import type { OuaaClient } from "@g2-contract/ouaa";
import type { RiskType } from "@g2-contract/risk-management";
import { defineComponent, onMounted, reactive, ref } from "vue";

import {
  Button,
  Card,
  CheckboxGroup,
  FormItem,
  InputNumber,
  PageLayout,
  Select,
  Space,
  TabPane,
  Tabs,
  TreeSelect,
  message,
} from "../pc-ui-runtime";
import {
  RISK_MESSAGE_SCENES,
  type SceneCode,
  type SceneItem,
  buildRiskMessageSavePayload,
  createNoticeObject,
  createSceneItem,
  normalizeSceneItem,
  staffRecordsOf,
} from "./risk-message-payload";
import { getRiskManagementClient, getRiskManagementContext } from "@/domain-context";

type ChannelOption = { label: string; value: string };
type StaffOption = { id: string; name: string };

/** 旧页三类通知场景保留为 Tab；通知方式来自消息中心场景通道，人员来自 OUAA。 */
export const RiskMessagePage = defineComponent({
  name: "RiskMessagePage",
  setup() {
    const activeKey = ref<SceneCode>("RISK_SOURCE_OVERDUE_ABOUT");
    const loading = ref(false);
    const saving = ref(false);
    const riskTypes = ref<RiskType[]>([]);
    const staffOptions = ref<StaffOption[]>([]);
    const channelOptions = reactive<Record<SceneCode, ChannelOption[]>>({
      RISK_SOURCE_OVERDUE_ABOUT: [],
      RISK_SOURCE_OVERDUE: [],
      MANDATORY_TESTING_OVERDUE_ABOUT: [],
    });
    const lists = reactive<Record<SceneCode, SceneItem[]>>({
      RISK_SOURCE_OVERDUE_ABOUT: [createSceneItem("RISK_SOURCE_OVERDUE_ABOUT")],
      RISK_SOURCE_OVERDUE: [createSceneItem("RISK_SOURCE_OVERDUE")],
      MANDATORY_TESTING_OVERDUE_ABOUT: [createSceneItem("MANDATORY_TESTING_OVERDUE_ABOUT")],
    });
    let requestVersion = 0;

    const load = async (): Promise<void> => {
      const version = ++requestVersion;
      loading.value = true;
      try {
        const context = getRiskManagementContext();
        const messageClient = await context.ensureClient<MessageClient>("messageClient");
        const ouaaClient = await context.ensureClient<OuaaClient>("ouaaClient");
        const [typeResult, staffResult] = await Promise.all([
          getRiskManagementClient().getRiskTypes({
            itemCode: "risk-source-type",
          }),
          ouaaClient.listTenantUsers({ pageNumber: 1, pageSize: 999 }),
        ]);
        if (version !== requestVersion) return;
        riskTypes.value = (Array.isArray(typeResult) ? typeResult : (typeResult.records ?? [])) as RiskType[];
        staffOptions.value = staffRecordsOf(staffResult);

        for (const scene of RISK_MESSAGE_SCENES) {
          const [result, channels] = await Promise.all([
            getRiskManagementClient().getMessageConfigs({
              businessType: "RISK_SOURCE",
              label: scene.code,
            }),
            messageClient.sceneNotificationMethod(scene.code),
          ]);
          if (version !== requestVersion) return;
          channelOptions[scene.code] = channels;
          const values = result.map((item) => normalizeSceneItem(item, scene.code));
          lists[scene.code].splice(0, lists[scene.code].length, ...(values.length ? values : [createSceneItem(scene.code)]));
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "消息配置加载失败");
      } finally {
        if (version === requestVersion) loading.value = false;
      }
    };

    const addRule = (code: SceneCode): void => {
      lists[code].push(createSceneItem(code));
    };
    const removeRule = (code: SceneCode, index: number): void => {
      if (lists[code].length === 1) return void message.warning("每个提醒场景至少保留一条规则");
      lists[code].splice(index, 1);
    };
    const addRecipient = (item: SceneItem): void => {
      item.noticeObjs.push(createNoticeObject());
    };
    const removeRecipient = (item: SceneItem, index: number): void => {
      if (item.noticeObjs.length > 1) item.noticeObjs.splice(index, 1);
    };

    const validate = (): boolean => {
      for (const scene of RISK_MESSAGE_SCENES) {
        for (const item of lists[scene.code]) {
          if (scene.needsDays && (!item.value || item.value < 1 || item.value > 999)) {
            activeKey.value = scene.code;
            message.error(`${scene.title}天数须为 1-999`);
            return false;
          }
          if (channelOptions[scene.code].length > 0 && !item.noticeWays.length) {
            activeKey.value = scene.code;
            message.error(`${scene.title}请选择至少一种通知方式`);
            return false;
          }
          if (item.noticeObjs.some((obj) => !obj.objType || !obj.objId.length)) {
            activeKey.value = scene.code;
            message.error(`${scene.title}请完整选择风险源分类和通知人员`);
            return false;
          }
        }
      }
      return true;
    };

    const save = async (): Promise<void> => {
      if (saving.value || !validate()) return;
      saving.value = true;
      try {
        await getRiskManagementClient().saveMessageConfig(buildRiskMessageSavePayload(lists));
        message.success("保存成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    const renderRule = (scene: (typeof RISK_MESSAGE_SCENES)[number], item: SceneItem, index: number) => (
      <Card
        class="risk-message-rule"
        key={item.id}
        size="small"
        loading={loading.value}
        style={{ marginTop: "12px" }}
        extra={
          lists[scene.code].length > 1 ? (
            <Button danger type="link" onClick={() => removeRule(scene.code, index)}>
              删除
            </Button>
          ) : null
        }
      >
        <FormItem label="通知条件">
          {scene.needsDays ? (
            <span>
              {scene.condition}
              <InputNumber
                min={1}
                max={999}
                precision={0}
                value={item.value}
                style="width: 160px; margin: 0 8px"
                onUpdate:value={(value: number | string | null) => {
                  item.value = Number(value ?? 0);
                }}
              />
              天提醒
            </span>
          ) : (
            <span>{scene.condition}</span>
          )}
        </FormItem>
        <FormItem label="通知方式">
          {channelOptions[scene.code].length === 0 ? (
            <span>当前场景未配置可使用的通知方式</span>
          ) : (
            <CheckboxGroup
              value={item.noticeWays}
              options={channelOptions[scene.code]}
              onUpdate:value={(value: Array<string | number | boolean>) => {
                item.noticeWays = value.map(String);
              }}
            />
          )}
        </FormItem>
        <FormItem label="通知内容">
          <span>{scene.content}</span>
        </FormItem>
        <FormItem label="通知对象">
          <div class="risk-message-recipients">
            {item.noticeObjs.map((obj, recipientIndex) => (
              <div
                class="risk-message-recipient"
                key={obj.id}
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "8px",
                  alignItems: "center",
                }}
              >
                <TreeSelect
                  value={obj.objType}
                  treeData={riskTypes.value}
                  placeholder="请选择风险源分类"
                  allowClear
                  style="width: 220px"
                  fieldNames={{
                    label: "name",
                    value: "code",
                    children: "nextList",
                  }}
                  onUpdate:value={(value: string | undefined) => {
                    obj.objType = value;
                  }}
                />
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  maxTagCount={6}
                  optionFilterProp="name"
                  value={obj.objId}
                  options={staffOptions.value}
                  placeholder="请选择人员"
                  style="min-width: 260px"
                  fieldNames={{ label: "name", value: "id" }}
                  onUpdate:value={(value) => {
                    obj.objId = Array.isArray(value) ? value.map(String) : value == null || value === "" ? [] : [String(value)];
                  }}
                />
                {recipientIndex === 0 ? (
                  <Button type="link" onClick={() => addRecipient(item)}>
                    添加
                  </Button>
                ) : (
                  <Button type="link" danger onClick={() => removeRecipient(item, recipientIndex)}>
                    删除
                  </Button>
                )}
              </div>
            ))}
          </div>
        </FormItem>
      </Card>
    );

    onMounted(() => void load());

    const slots = {
      "layout-content": () => (
        <Tabs
          activeKey={activeKey.value}
          type="card"
          onChange={(key: string | number) => {
            activeKey.value = key as SceneCode;
          }}
        >
          {RISK_MESSAGE_SCENES.map((scene) => (
            <TabPane key={scene.code} tab={scene.title}>
              <Button type="primary" onClick={() => addRule(scene.code)}>
                添加
              </Button>
              {lists[scene.code].map((item, index) => renderRule(scene, item, index))}
            </TabPane>
          ))}
        </Tabs>
      ),
      "footer-page": () => (
        <Space>
          <Button type="primary" loading={saving.value} onClick={() => void save()}>
            保存
          </Button>
        </Space>
      ),
    };

    return () => <PageLayout title="消息配置" v-slots={slots} />;
  },
});
