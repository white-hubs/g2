// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { getCurrentDailyType, initDailyTypeFromRoute } from "@g2-client/daily-task/client";
import { type Ref, defineComponent, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { cubeMessageCenterService } from "@/api/server";
import { UserFusionSelect } from "@/components/daily-task-widgets";
import { Button, CheckboxGroup, Form, type FormExpose, FormItem, InputNumber, TabPane, Tabs, message } from "@/pc-ui-runtime";
import { PageLayout } from "@/pc-ui-runtime";
import type { SceneConfigDTO } from "@/types/daily-task";
import { usePageName } from "@/utils/page-title";

import "./message-config.css";

interface NoticeObjs {
  label: string;
  value: string;
}

interface UserItem {
  type: string;
  ids?: string[];
}

const TaskGenerateNotify = "DAILY_TASK_GENERATE";
const TaskWillOverdueNotify = "DAILY_TASK_WILL_OVERDUE";
const TaskOverdueNotify = "DAILY_TASK_OVERDUE";
const TaskTransferNotify = "DAILY_TASK_TRANSFER";
const TaskTerminateNotify = "DAILY_TASK_TERMINATE";
const TaskProgressNotify = "DAILY_TASK_PROGRESS";
const TaskSubmitNotify = "DAILY_TASK_SUBMIT";
const TaskCompleteNotify = "DAILY_TASK_COMPLETE";

const codeForLabel = {
  DAILY_TASK_GENERATE: "任务下发",
  DAILY_TASK_WILL_OVERDUE: "任务即将超时",
  DAILY_TASK_OVERDUE: "任务超时",
  DAILY_TASK_TRANSFER: "任务移交",
  DAILY_TASK_TERMINATE: "任务中止",
  DAILY_TASK_PROGRESS: "任务进度提醒",
  DAILY_TASK_SUBMIT: "任务提交",
  DAILY_TASK_COMPLETE: "任务完成",
};

export const MessageConfig = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    initDailyTypeFromRoute(route);
    const activeKey = ref(TaskWillOverdueNotify);
    const taskGenerateClock = ref<{
      noticeWays: string[] | undefined;
      label: string;
      sceneCode: string;
    }>({
      noticeWays: [],
      label: codeForLabel[TaskGenerateNotify],
      sceneCode: TaskGenerateNotify,
    });
    const taskWillOverdueClock = ref<{
      noticeWays: string[] | undefined;
      noticeItems: UserItem;
      label: string;
      sceneCode: string;
      value: number | undefined;
    }>({
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
      label: codeForLabel[TaskWillOverdueNotify],
      sceneCode: TaskWillOverdueNotify,
      value: undefined,
    });
    const taskOverdueClock = ref<{
      noticeWays: string[] | undefined;
      noticeItems: UserItem;
      label: string;
      sceneCode: string;
    }>({
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
      label: codeForLabel[TaskOverdueNotify],
      sceneCode: TaskOverdueNotify,
    });
    const taskTransferClock = ref<{
      noticeWays: string[] | undefined;
      noticeItems: UserItem;
      label: string;
      sceneCode: string;
    }>({
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
      label: codeForLabel[TaskTransferNotify],
      sceneCode: TaskTransferNotify,
    });
    const taskTerminateClock = ref<{
      noticeWays: string[] | undefined;
      noticeItems: UserItem;
      label: string;
      sceneCode: string;
    }>({
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
      label: codeForLabel[TaskTerminateNotify],
      sceneCode: TaskTerminateNotify,
    });
    const taskProgressClock = ref<{
      noticeWays: string[] | undefined;
      noticeItems: UserItem;
      label: string;
      sceneCode: string;
      businessValue: {
        day: number | undefined;
        progress: number | undefined;
      };
    }>({
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
      label: codeForLabel[TaskProgressNotify],
      sceneCode: TaskProgressNotify,
      businessValue: {
        day: undefined,
        progress: undefined,
      },
    });
    const taskSubmitClock = ref<{
      noticeWays: string[] | undefined;
      noticeItems: UserItem;
      label: string;
      sceneCode: string;
    }>({
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
      label: codeForLabel[TaskSubmitNotify],
      sceneCode: TaskSubmitNotify,
    });
    const taskCompleteClock = ref<{
      noticeWays: string[] | undefined;
      noticeItems: UserItem;
      label: string;
      sceneCode: string;
    }>({
      noticeWays: [],
      noticeItems: { type: "USER", ids: [] },
      label: codeForLabel[TaskCompleteNotify],
      sceneCode: TaskCompleteNotify,
    });

    const taskWillOverdueRenderRef = ref<FormExpose>();
    const taskWillOverdueRules = {
      noticeWays: [{ required: true, message: "请选择通知方式", trigger: "blur" }],
      value: [{ required: true, message: "请输入提醒天数", trigger: "blur" }],
      // NoticeItems: [{ validator: async (): Promise<unknown> => taskWillOverdueUserRef.value?.checkFormData(), trigger: 'blur' }]
    };
    const taskOverdueRenderRef = ref<FormExpose>();
    const taskOverdueUserRef = ref<{ checkFormData: () => Promise<unknown>; isValid: Ref<boolean> }>();
    const taskOverdueRules = {
      noticeWays: [{ required: true, message: "请选择通知方式", trigger: "blur" }],
      noticeItems: [{ validator: async (): Promise<unknown> => taskOverdueUserRef.value?.checkFormData(), trigger: "blur" }],
    };
    const taskProgressRenderRef = ref<FormExpose>();
    const taskProgressUserRef = ref<{ checkFormData: () => Promise<unknown>; isValid: Ref<boolean> }>();
    const validateProgressBusinessValue = async (): Promise<unknown> => {
      const bv = taskProgressClock.value.businessValue;
      const day = bv?.day;
      const progress = bv?.progress;
      if (day === undefined || day === null || Number.isNaN(day)) {
        throw "请输入提醒天数";
      }
      if (progress === undefined || progress === null || Number.isNaN(progress)) {
        throw "请输入提醒进度";
      }
      return true;
    };
    const taskProgressRules = {
      noticeWays: [{ required: true, message: "请选择通知方式", trigger: "blur" }],
      businessValue: [{ validator: validateProgressBusinessValue, trigger: "blur" }],
      noticeItems: [{ validator: async (): Promise<unknown> => taskProgressUserRef.value?.checkFormData(), trigger: "blur" }],
    };
    const tabchange = (value: string): void => {
      activeKey.value = value;
    };
    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class="message-config">
          <Tabs activeKey={activeKey.value} onChange={tabchange} type="card" destroyInactiveTabPane={false}>
            {/* <TabPane tab={codeForLabel[TaskGenerateNotify]} key={TaskGenerateNotify} forceRender={true}>
                <Form model={taskGenerateClock.value} ref={taskGenerateRenderRef} rules={taskGenerateRules}>
                  <FormItem label='通知条件:'>任务下发即提醒</FormItem>
                  <FormItem label='通知方式:' name='noticeWays'>
                    <div class='flex-row'>
                      {noticeObjs.value.taskGenerateClock.length && <CheckboxGroup class='checkbox-margin' v-model:value={taskGenerateClock.value.noticeWays} options={noticeObjs.value.taskGenerateClock} />}
                      {!noticeObjs.value.taskGenerateClock.length && <span>当前场景未配置可使用的通知方式</span>}
                    </div>
                  </FormItem>
                  <FormItem label='通知内容:'>您有一个新任务【任务名称】，请及时处理。</FormItem>
                </Form>
              </TabPane> */}
            <TabPane tab={codeForLabel[TaskWillOverdueNotify]} key={TaskWillOverdueNotify} forceRender={true}>
              <Form model={taskWillOverdueClock.value} ref={taskWillOverdueRenderRef} rules={taskWillOverdueRules}>
                <FormItem label="通知条件:" name="value">
                  任务截止时间前的{" "}
                  <InputNumber class="input-number-width" max={99999} min={0} v-model:value={taskWillOverdueClock.value.value} />{" "}
                  天，自动触发。
                </FormItem>
                <FormItem label="通知方式:" name="noticeWays">
                  <div class="flex-row">
                    {noticeObjs.value.taskWillOverdueClock.length && (
                      <CheckboxGroup
                        class="checkbox-margin"
                        v-model:value={taskWillOverdueClock.value.noticeWays}
                        options={noticeObjs.value.taskWillOverdueClock}
                      />
                    )}
                    {noticeObjs.value.taskWillOverdueClock.length === 0 && <span>当前场景未配置可使用的通知方式</span>}
                  </div>
                </FormItem>
                <FormItem label="通知内容:">您有一个新任务【任务名称】即将到来，请加快处理。</FormItem>
                {/* <FormItem label='通知人员:' name='noticeItems'>
                    <UserFusionSelect ref={taskWillOverdueUserRef} v-model:typeValue={taskWillOverdueClock.value.noticeItems} />
                  </FormItem> */}
              </Form>
            </TabPane>
            <TabPane tab={codeForLabel[TaskOverdueNotify]} key={TaskOverdueNotify} forceRender={true}>
              <Form model={taskOverdueClock.value} ref={taskOverdueRenderRef} rules={taskOverdueRules}>
                <FormItem label="通知条件:">任务超时提醒</FormItem>
                <FormItem label="通知方式:" name="noticeWays">
                  <div class="flex-row">
                    {noticeObjs.value.taskOverdueClock.length && (
                      <CheckboxGroup
                        class="checkbox-margin"
                        v-model:value={taskOverdueClock.value.noticeWays}
                        options={noticeObjs.value.taskOverdueClock}
                      />
                    )}
                    {noticeObjs.value.taskOverdueClock.length === 0 && <span>当前场景未配置可使用的通知方式</span>}
                  </div>
                </FormItem>
                <FormItem label="通知内容:">任务【任务名称】已超时，请立即处理。</FormItem>
                <FormItem label="通知人员:" name="noticeItems">
                  <UserFusionSelect ref={taskOverdueUserRef} v-model:typeValue={taskOverdueClock.value.noticeItems} />
                </FormItem>
              </Form>
            </TabPane>
            {/* <TabPane tab={codeForLabel[TaskTransferNotify]} key={TaskTransferNotify} forceRender={true}>
                <Form model={taskTransferClock.value} ref={taskTransferRenderRef} rules={taskTransferRules}>
                  <FormItem label='通知条件:'>任务移交时提醒</FormItem>
                  <FormItem label='通知方式:' name='noticeWays'>
                    <div class='flex-row'>
                      {noticeObjs.value.taskTransferClock.length && <CheckboxGroup class='checkbox-margin' v-model:value={taskTransferClock.value.noticeWays} options={noticeObjs.value.taskTransferClock} />}
                      {!noticeObjs.value.taskTransferClock.length && <span>当前场景未配置可使用的通知方式</span>}
                    </div>
                  </FormItem>
                  <FormItem label='通知内容:'>任务【任务名称】已被【原负责人】转发给您，请注意处理。</FormItem>
                  <FormItem label='通知人员:' name='noticeItems'>
                    <UserFusionSelect ref={taskTransferUserRef} v-model:typeValue={taskTransferClock.value.noticeItems} />
                  </FormItem>
                </Form>
              </TabPane> */}
            {/* <TabPane tab={codeForLabel[TaskTerminateNotify]} key={TaskTerminateNotify} forceRender={true}>
                <Form model={taskTerminateClock.value} ref={taskTerminateRenderRef} rules={taskTerminateRules}>
                  <FormItem label='通知条件:'>任务终止时提醒</FormItem>
                  <FormItem label='通知方式:' name='noticeWays'>
                    <div class='flex-row'>
                      {noticeObjs.value.taskTerminateClock.length && <CheckboxGroup class='checkbox-margin' v-model:value={taskTerminateClock.value.noticeWays} options={noticeObjs.value.taskTerminateClock} />}
                      {!noticeObjs.value.taskTerminateClock.length && <span>当前场景未配置可使用的通知方式</span>}
                    </div>
                  </FormItem>
                  <FormItem label='通知内容:'>您负责的任务【任务名称】已被【某人】中止。</FormItem>
                  <FormItem label='通知人员:' name='noticeItems'>
                    <UserFusionSelect ref={taskTerminateUserRef} v-model:typeValue={taskTerminateClock.value.noticeItems} />
                  </FormItem>
                </Form>
              </TabPane> */}
            <TabPane tab={codeForLabel[TaskProgressNotify]} key={TaskProgressNotify} forceRender={true}>
              <Form model={taskProgressClock.value} ref={taskProgressRenderRef} rules={taskProgressRules}>
                <FormItem label="通知条件:" name="businessValue">
                  任务距离截止日期剩余{" "}
                  <InputNumber class="input-number-width" max={99999} min={0} v-model:value={taskProgressClock.value.businessValue.day} />{" "}
                  天，任务完成进度不足{" "}
                  <InputNumber
                    class="input-number-width"
                    max={100}
                    min={0}
                    v-model:value={taskProgressClock.value.businessValue.progress}
                  />{" "}
                  %，发起消息提醒。
                </FormItem>
                <FormItem label="通知方式:" name="noticeWays">
                  <div class="flex-row">
                    {noticeObjs.value.taskProgressClock.length && (
                      <CheckboxGroup
                        class="checkbox-margin"
                        v-model:value={taskProgressClock.value.noticeWays}
                        options={noticeObjs.value.taskProgressClock}
                      />
                    )}
                    {noticeObjs.value.taskProgressClock.length === 0 && <span>当前场景未配置可使用的通知方式</span>}
                  </div>
                </FormItem>
                <FormItem label="通知内容:">
                  当前【任务名称】已完成【任务进度】，目前任务进展存在风险，请注意督促相关人员加快处理。
                </FormItem>
                <FormItem label="通知人员:" name="noticeItems">
                  <UserFusionSelect ref={taskProgressUserRef} v-model:typeValue={taskProgressClock.value.noticeItems} />
                </FormItem>
              </Form>
            </TabPane>
            {/* <TabPane tab={codeForLabel[TaskSubmitNotify]} key={TaskSubmitNotify} forceRender={true}>
                <Form model={taskSubmitClock.value} ref={taskSubmitRenderRef} rules={taskSubmitRules}>
                  <FormItem label='通知条件:'>任务提交时提醒</FormItem>
                  <FormItem label='通知方式:' name='noticeWays'>
                    <div class='flex-row'>
                      {noticeObjs.value.taskSubmitClock.length && <CheckboxGroup class='checkbox-margin' v-model:value={taskSubmitClock.value.noticeWays} options={noticeObjs.value.taskSubmitClock} />}
                      {!noticeObjs.value.taskSubmitClock.length && <span>当前场景未配置可使用的通知方式</span>}
                    </div>
                  </FormItem>
                  <FormItem label='通知内容:'>【某执行人员】已提交【任务名称】任务，请注意跟进。</FormItem>
                  <FormItem label='通知人员:' name='noticeItems'>
                    <UserFusionSelect ref={taskSubmitUserRef} v-model:typeValue={taskSubmitClock.value.noticeItems} />
                  </FormItem>
                </Form>
              </TabPane>
              <TabPane tab={codeForLabel[TaskCompleteNotify]} key={TaskCompleteNotify} forceRender={true}>
                <Form model={taskCompleteClock.value} ref={taskCompleteRenderRef} rules={taskCompleteRules}>
                  <FormItem label='通知条件:'>任务完成时提醒</FormItem>
                  <FormItem label='通知方式:' name='noticeWays'>
                    <div class='flex-row'>
                      {noticeObjs.value.taskCompleteClock.length && <CheckboxGroup class='checkbox-margin' v-model:value={taskCompleteClock.value.noticeWays} options={noticeObjs.value.taskCompleteClock} />}
                      {!noticeObjs.value.taskCompleteClock.length && <span>当前场景未配置可使用的通知方式</span>}
                    </div>
                  </FormItem>
                  <FormItem label='通知内容:'>【某执行人员】已完成【任务名称】任务，请注意跟进。</FormItem>
                  <FormItem label='通知人员:' name='noticeItems'>
                    <UserFusionSelect ref={taskCompleteUserRef} v-model:typeValue={taskCompleteClock.value.noticeItems} />
                  </FormItem>
                </Form>
              </TabPane> */}
          </Tabs>
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <>
          <Button
            type="primary"
            loading={loading.value}
            onClick={() => {
              save();
            }}
          >
            保存
          </Button>
        </>
      ),
    };

    const loading = ref(false);
    const getNoticeOption = async (
      code: string,
    ): Promise<
      {
        label: string;
        value: string;
      }[]
    > => cubeMessageCenterService.sceneNotificationMethod(code);
    const noticeObjs = ref<{
      taskGenerateClock: NoticeObjs[];
      taskWillOverdueClock: NoticeObjs[];
      taskOverdueClock: NoticeObjs[];
      taskTransferClock: NoticeObjs[];
      taskTerminateClock: NoticeObjs[];
      taskProgressClock: NoticeObjs[];
      taskSubmitClock: NoticeObjs[];
      taskCompleteClock: NoticeObjs[];
    }>({
      taskGenerateClock: [],
      taskWillOverdueClock: [],
      taskOverdueClock: [],
      taskTransferClock: [],
      taskTerminateClock: [],
      taskProgressClock: [],
      taskSubmitClock: [],
      taskCompleteClock: [],
    });
    const toNoticeWaysDTO = (ways?: string[]): { noticeWay: string }[] => (ways ?? []).map((w) => ({ noticeWay: w }));
    const toNoticeObjsDTO = (items?: UserItem): { objType: string; objId: string; objInfo: string }[] => [
      {
        objType: items?.type ?? "",
        objId: items?.ids?.join(",") ?? "",
        objInfo: JSON.stringify(items?.ids ?? []),
      },
    ];
    const save = async (): Promise<void> => {
      const forms: { ref: typeof taskWillOverdueRenderRef; key: string }[] = [
        // { ref: taskGenerateRenderRef, key: TaskGenerateNotify },
        { ref: taskWillOverdueRenderRef, key: TaskWillOverdueNotify },
        { ref: taskOverdueRenderRef, key: TaskOverdueNotify },
        // { ref: taskTransferRenderRef, key: TaskTransferNotify },
        // { ref: taskTerminateRenderRef, key: TaskTerminateNotify },
        { ref: taskProgressRenderRef, key: TaskProgressNotify },
        // { ref: taskSubmitRenderRef, key: TaskSubmitNotify },
        // { ref: taskCompleteRenderRef, key: TaskCompleteNotify },
      ];
      for (const f of forms) {
        try {
          await f.ref.value?.validate();
        } catch {
          activeKey.value = f.key;
          return;
        }
      }

      loading.value = true;
      const sceneConfigDTOS = [
        {
          ...taskGenerateClock.value,
          noticeWays: toNoticeWaysDTO(taskGenerateClock.value.noticeWays),
        },
        {
          ...taskWillOverdueClock.value,
          noticeWays: toNoticeWaysDTO(taskWillOverdueClock.value.noticeWays),
          noticeObjs: toNoticeObjsDTO(taskWillOverdueClock.value.noticeItems),
        },
        {
          ...taskOverdueClock.value,
          noticeWays: toNoticeWaysDTO(taskOverdueClock.value.noticeWays),
          noticeObjs: toNoticeObjsDTO(taskOverdueClock.value.noticeItems),
        },
        {
          ...taskTransferClock.value,
          noticeWays: toNoticeWaysDTO(taskTransferClock.value.noticeWays),
          noticeObjs: toNoticeObjsDTO(taskTransferClock.value.noticeItems),
        },
        {
          ...taskTerminateClock.value,
          noticeWays: toNoticeWaysDTO(taskTerminateClock.value.noticeWays),
          noticeObjs: toNoticeObjsDTO(taskTerminateClock.value.noticeItems),
        },
        {
          ...taskProgressClock.value,
          noticeWays: toNoticeWaysDTO(taskProgressClock.value.noticeWays),
          noticeObjs: toNoticeObjsDTO(taskProgressClock.value.noticeItems),
          value: taskProgressClock.value.businessValue.day,
          config: taskProgressClock.value.businessValue.progress,
        },
        {
          ...taskSubmitClock.value,
          noticeWays: toNoticeWaysDTO(taskSubmitClock.value.noticeWays),
          noticeObjs: toNoticeObjsDTO(taskSubmitClock.value.noticeItems),
        },
        {
          ...taskCompleteClock.value,
          noticeWays: toNoticeWaysDTO(taskCompleteClock.value.noticeWays),
          noticeObjs: toNoticeObjsDTO(taskCompleteClock.value.noticeItems),
        },
      ];
      await cubeMessageCenterService.addMessageConfig({
        businessType: getCurrentDailyType(),
        sceneConfigDTOS,
      });
      loading.value = false;
      getData();
      message.success("保存成功");
    };

    const parseNoticeItems = (
      raw: { objId?: string; objType?: string; objInfo?: unknown }[] | null | undefined,
    ): { type: string; ids: string[] } => {
      if (!raw) {
        return { type: "USER", ids: [] };
      }
      const items = raw.map((e) => ({
        type: e.objType ?? "",
        ids: e.objId?.split(",") ?? [],
      }));
      return items.length > 0 ? items[0] : { type: "USER", ids: [] };
    };

    const getConfigInfo = async (): Promise<SceneConfigDTO[]> => {
      const data = await cubeMessageCenterService.getMessageConfig({
        businessType: getCurrentDailyType(),
      });
      return data;
    };

    const loadSceneByLabel = async (data: SceneConfigDTO[], sceneCode: string): Promise<void> => {
      const item = data.find((d) => d.sceneCode === sceneCode);
      if (!item) {
        return;
      }
      const ways = (item.noticeWays ?? []).map((e) => e.noticeWay ?? "");
      if (sceneCode === TaskGenerateNotify) {
        taskGenerateClock.value.noticeWays = ways;
        taskGenerateClock.value.label = item.label;
        taskGenerateClock.value.sceneCode = item.sceneCode;
      } else if (sceneCode === TaskWillOverdueNotify) {
        taskWillOverdueClock.value.noticeWays = ways;
        taskWillOverdueClock.value.label = item.label;
        taskWillOverdueClock.value.sceneCode = item.sceneCode;
        taskWillOverdueClock.value.value = item.value ? Number(item.value) : undefined;
        taskWillOverdueClock.value.noticeItems = parseNoticeItems(item.noticeObjs);
      } else if (sceneCode === TaskOverdueNotify) {
        taskOverdueClock.value.noticeWays = ways;
        taskOverdueClock.value.label = item.label;
        taskOverdueClock.value.sceneCode = item.sceneCode;
        taskOverdueClock.value.noticeItems = parseNoticeItems(item.noticeObjs);
      } else if (sceneCode === TaskTransferNotify) {
        taskTransferClock.value.noticeWays = ways;
        taskTransferClock.value.label = item.label;
        taskTransferClock.value.sceneCode = item.sceneCode;
        taskTransferClock.value.noticeItems = parseNoticeItems(item.noticeObjs);
      } else if (sceneCode === TaskTerminateNotify) {
        taskTerminateClock.value.noticeWays = ways;
        taskTerminateClock.value.label = item.label;
        taskTerminateClock.value.sceneCode = item.sceneCode;
        taskTerminateClock.value.noticeItems = parseNoticeItems(item.noticeObjs);
      } else if (sceneCode === TaskProgressNotify) {
        taskProgressClock.value.noticeWays = ways;
        taskProgressClock.value.label = item.label;
        taskProgressClock.value.sceneCode = item.sceneCode;
        taskProgressClock.value.noticeItems = parseNoticeItems(item.noticeObjs);
        taskProgressClock.value.businessValue = {
          day: item.value ? Number(item.value) : undefined,
          progress: item.config ? Number(item.config) : undefined,
        };
      } else if (sceneCode === TaskSubmitNotify) {
        taskSubmitClock.value.noticeWays = ways;
        taskSubmitClock.value.label = item.label;
        taskSubmitClock.value.sceneCode = item.sceneCode;
        taskSubmitClock.value.noticeItems = parseNoticeItems(item.noticeObjs);
      } else if (sceneCode === TaskCompleteNotify) {
        taskCompleteClock.value.noticeWays = ways;
        taskCompleteClock.value.label = item.label;
        taskCompleteClock.value.sceneCode = item.sceneCode;
        taskCompleteClock.value.noticeItems = parseNoticeItems(item.noticeObjs);
      }
    };

    const getData = async (): Promise<void> => {
      const config = await getConfigInfo();
      const codes = [
        TaskGenerateNotify,
        TaskWillOverdueNotify,
        TaskOverdueNotify,
        TaskTransferNotify,
        TaskTerminateNotify,
        TaskProgressNotify,
        TaskSubmitNotify,
        TaskCompleteNotify,
      ];
      await Promise.all(codes.map(async (code) => loadSceneByLabel(config, code)));
      const [i, f, fi, r, t, p, s, c] = await Promise.all([
        getNoticeOption(TaskGenerateNotify),
        getNoticeOption(TaskWillOverdueNotify),
        getNoticeOption(TaskOverdueNotify),
        getNoticeOption(TaskTransferNotify),
        getNoticeOption(TaskTerminateNotify),
        getNoticeOption(TaskProgressNotify),
        getNoticeOption(TaskSubmitNotify),
        getNoticeOption(TaskCompleteNotify),
      ]);
      noticeObjs.value.taskGenerateClock = i;
      noticeObjs.value.taskWillOverdueClock = f;
      noticeObjs.value.taskOverdueClock = fi;
      noticeObjs.value.taskTransferClock = r;
      noticeObjs.value.taskTerminateClock = t;
      noticeObjs.value.taskProgressClock = p;
      noticeObjs.value.taskSubmitClock = s;
      noticeObjs.value.taskCompleteClock = c;
    };

    onMounted(() => {
      getData();
    });
    return (): JSX.Element => (
      <>
        <PageLayout title={pageTitle} v-slots={layoutSlots} />
      </>
    );
  },
});
