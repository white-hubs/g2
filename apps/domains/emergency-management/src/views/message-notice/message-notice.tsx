// @ts-nocheck
/**
 * Port of legacy messageNotice/newMessageNotice.vue
 * Tabs: ALARM_TIMEOUT_NOTIFY + EMERGENCY_FILE_EXPIRE_NOTIFY; save per active tab.
 */
import { defineComponent, onMounted, reactive, toRefs } from "vue";

import { ChannelCheckbox } from "./channel-checkbox";
import { getEmergencyManagementClient } from "@/domain-context";
import { Button, PageLayout, PopConfirm, TabPane, Tabs, message } from "@/pc-ui-runtime";

import styles from "./message-notice.module.css";

const ALARM_KEY = "ALARM_TIMEOUT_NOTIFY";
const FILE_KEY = "EMERGENCY_FILE_EXPIRE_NOTIFY";
const BUSINESS_TYPE = "ALARM";

const MERCHANT_ALARM = "【报警时间】发生的【车辆违停】报警事件，将在【配置的通知条件（例：30分钟）】后超时，请及时处理";

type PanelItem = { key: string; tab: string };

function asList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.records)) return obj.records as Record<string, unknown>[];
    if (Array.isArray(obj.list)) return obj.list as Record<string, unknown>[];
  }
  return [];
}

function normalizeNoticeWays(ways: unknown): string[] {
  if (!Array.isArray(ways)) return [];
  return ways
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        return String((item as Record<string, unknown>).noticeWay ?? (item as Record<string, unknown>).value ?? "");
      }
      return String(item);
    })
    .filter(Boolean);
}

export const MessageNotice = defineComponent({
  name: "MessageNotice",
  setup() {
    const state = reactive({
      model: {} as Record<string, unknown[]>,
      activeKey: ALARM_KEY,
      panelList: [
        { key: ALARM_KEY, tab: "报警任务超时" },
        { key: FILE_KEY, tab: "文件到期提醒" },
      ] as PanelItem[],
      loading: false,
    });

    const getReceive = async (sceneCode: string) => {
      try {
        return await getEmergencyManagementClient().getNoticeMethods(sceneCode);
      } catch {
        return [];
      }
    };

    const getUserOptions = async (ids: Array<string | number>) => {
      const normalizedIds = (ids || []).map(String).filter(Boolean);
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
    };

    const getData = async () => {
      const client = getEmergencyManagementClient();
      state.model = {};
      state.loading = true;
      try {
        const result = asList(await client.getAlarmNoticeConfig(BUSINESS_TYPE));
        if (!result.length) {
          state.model[ALARM_KEY] = [
            {
              satMsgDefineCode: ALARM_KEY,
              effectiveDays: 30,
              label: "报警任务超时",
              name: "",
              notifyExpression: "",
              notificationTime: 1,
              enabled: false,
              channelParams: [],
              msgTmpContent: MERCHANT_ALARM,
              noticeMethod: await getReceive(ALARM_KEY),
            },
          ];
        } else {
          for (const item of result) {
            const sceneCode = String(item.sceneCode ?? ALARM_KEY);
            const obj = {
              satMsgDefineCode: sceneCode,
              label: item.label,
              notificationTime: item.value,
              channelParams: normalizeNoticeWays(item.noticeWays),
              msgTmpContent: MERCHANT_ALARM,
              noticeMethod: await getReceive(sceneCode),
              enabled: true,
            };
            if (!Array.isArray(state.model[sceneCode])) {
              state.model[sceneCode] = [];
            }
            state.model[sceneCode].push(obj);
          }
          if (!state.model[ALARM_KEY]?.length) {
            state.model[ALARM_KEY] = [
              {
                satMsgDefineCode: ALARM_KEY,
                effectiveDays: 30,
                label: "报警任务超时",
                name: "",
                notifyExpression: "",
                notificationTime: 1,
                enabled: false,
                channelParams: [],
                msgTmpContent: MERCHANT_ALARM,
                noticeMethod: await getReceive(ALARM_KEY),
              },
            ];
          }
        }

        let emergencyFileNoticeRes = (await client.getEmergencyFileNotice()) as Record<string, unknown> | null;
        if (!emergencyFileNoticeRes) {
          emergencyFileNoticeRes = {
            noticeMethod: await getReceive(FILE_KEY),
            noticeWays: [],
            emergencyFileNoticeObjs: [
              {
                emergencyFileTypeId: undefined,
                objType: null,
                objId: [],
              },
            ],
          };
        }
        const objsRaw = Array.isArray(emergencyFileNoticeRes.emergencyFileNoticeObjs) ? emergencyFileNoticeRes.emergencyFileNoticeObjs : [];
        const emergencyFileNoticeObjs = [];
        for (const element of objsRaw as Array<Record<string, unknown>>) {
          const ids = Array.isArray(element.objId) ? (element.objId as Array<string | number>).map(String).filter(Boolean) : [];
          const selectOption = await getUserOptions(ids);
          emergencyFileNoticeObjs.push({
            ...element,
            emergencyFileTypeId:
              element.emergencyFileTypeId == null || element.emergencyFileTypeId === "" ? undefined : String(element.emergencyFileTypeId),
            objId: ids,
            objType: element.objType || (ids.length ? "USER" : null),
            selectOption,
          });
        }
        if (!emergencyFileNoticeObjs.length) {
          emergencyFileNoticeObjs.push({
            emergencyFileTypeId: undefined,
            objType: null,
            objId: [],
            selectOption: [],
          });
        }
        state.model[FILE_KEY] = [
          {
            noticeMethod: await getReceive(FILE_KEY),
            noticeWays: normalizeNoticeWays(emergencyFileNoticeRes.noticeWays),
            emergencyFileNoticeObjs,
          },
        ];
      } catch {
        message.error("加载消息配置失败");
      } finally {
        state.loading = false;
      }
    };

    const addConfigEvent = async (item: PanelItem) => {
      if (item.key === FILE_KEY) {
        (state.model[item.key] as unknown[]).push({
          noticeMethod: await getReceive(item.key),
          noticeWays: [],
          emergencyFileNoticeObjs: [
            {
              emergencyFileTypeId: undefined,
              objType: "USER",
              objId: [],
              selectOption: [],
            },
          ],
        });
        return;
      }
      (state.model[item.key] as unknown[]).push({
        satMsgDefineCode: item.key,
        effectiveDays: 30,
        label: item.tab,
        name: "",
        notifyExpression: "",
        notificationTime: 1,
        enabled: false,
        channelParams: [],
        msgTmpContent: MERCHANT_ALARM,
        noticeMethod: await getReceive(item.key),
      });
    };

    const deleteConfigEvent = (key: string, index: number) => {
      const list = state.model[key] as unknown[];
      if (!list || list.length === 1) {
        message.warning("请至少保留一条消息通知！");
        return;
      }
      list.splice(index, 1);
    };

    const submit = async () => {
      const client = getEmergencyManagementClient();
      if (state.activeKey === FILE_KEY) {
        const data = (state.model[FILE_KEY] || [])[0] as Record<string, unknown>;
        if (!data) return;
        const params = {
          // legacy saved checkbox values as-is (string[]); keep same shape
          noticeWays: Array.isArray(data.noticeWays) ? data.noticeWays : [],
          emergencyFileNoticeObjs: (Array.isArray(data.emergencyFileNoticeObjs) ? data.emergencyFileNoticeObjs : []).map(
            (e: Record<string, unknown>) => ({
              emergencyFileTypeId: e.emergencyFileTypeId ?? null,
              objType: e.objType,
              objId: e.objId,
            }),
          ),
        };
        try {
          state.loading = true;
          await client.saveEmergencyFileNotice(params);
          message.success("保存成功");
        } catch {
          message.error("保存失败");
        } finally {
          state.loading = false;
        }
        return;
      }

      const data = ((state.model[ALARM_KEY] as unknown[]) || []).filter((e: Record<string, unknown>) => e.satMsgDefineCode === ALARM_KEY);
      const arr = data.map((i: Record<string, unknown>) => {
        const channelParams = Array.isArray(i.channelParams) ? i.channelParams : [];
        const noticeWays = channelParams.map((item: unknown) => ({
          noticeWay: item,
        }));
        return {
          label: i.label,
          sceneCode: i.satMsgDefineCode,
          value: i.notificationTime,
          noticeWays,
        };
      });
      try {
        state.loading = true;
        await client.saveAlarmNoticeConfig({
          businessType: BUSINESS_TYPE,
          sceneConfigDTOS: arr,
        });
        await getData();
        message.success("保存成功");
      } catch {
        message.error("保存失败");
      } finally {
        state.loading = false;
      }
    };

    onMounted(() => {
      void getData();
    });

    const { model, activeKey, panelList, loading } = toRefs(state);

    const slots = {
      "layout-content": () => (
        <div class={styles.detailForm}>
          <Tabs
            activeKey={activeKey.value}
            onChange={(key: string) => {
              activeKey.value = key;
            }}
          >
            {panelList.value.map((item, index) => (
              <TabPane key={item.key} tab={item.tab} class={styles.pt2}>
                <div class={styles.addConfigBut}>
                  <span>{index === 0 ? "报警任务超时，提醒处理人员" : "预案文件到期后，发送消息提醒对应人员"}</span>
                  {index === 0 ? (
                    <Button type="primary" onClick={() => void addConfigEvent(item)}>
                      添加
                    </Button>
                  ) : null}
                </div>
                {((model.value[item.key] as unknown[]) || []).map((ele: Record<string, unknown>, idx: number) => (
                  <div key={idx} class={styles.msgBox}>
                    {item.key === ALARM_KEY ? (
                      <ChannelCheckbox
                        mode="alarm"
                        model={ele}
                        noticeMethod={ele.noticeMethod as unknown[]}
                        onChangeItem={(e: unknown[]) => {
                          ele.enabled = Boolean(e?.length);
                        }}
                      />
                    ) : (
                      <ChannelCheckbox
                        mode="file"
                        model={ele}
                        noticeMethod={ele.noticeMethod as unknown[]}
                        onUpdate:model={(v: Record<string, unknown>) => {
                          (model.value[item.key] as unknown[])[idx] = v;
                        }}
                      />
                    )}
                    <PopConfirm
                      title="确定要删除该条消息吗?"
                      okText="是"
                      cancelText="否"
                      onConfirm={() => deleteConfigEvent(item.key, idx)}
                    >
                      <Button danger type="primary" style={{ display: idx === 0 ? "none" : undefined }}>
                        删除
                      </Button>
                    </PopConfirm>
                  </div>
                ))}
              </TabPane>
            ))}
          </Tabs>
        </div>
      ),
      "footer-btn": () => (
        <Button type="primary" loading={loading.value} onClick={() => void submit()}>
          保存
        </Button>
      ),
    };

    return () => <PageLayout title="消息配置" v-slots={slots} />;
  },
});

export default MessageNotice;
