import type { InspectionRecord } from "@g2-contract/daily-inspection";
import type { OuaaClient } from "@g2-contract/ouaa";
import {
  Button,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  PageLayout,
  Select,
  Spin,
  Switch,
  Textarea,
  TimePicker,
  dayjs,
  message,
} from "@g2-platform/pc-ui";
import { computed, defineComponent, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { PatrolContent, type Target, normalizeTargets, record, records, standards, targetRelations } from "@/components/patrol-content";
import { TaskProgress } from "@/components/task-progress";
import { getPatrolClient, getSmallEngineeringClient, getSmallEngineeringContext } from "@/domain-context";

const BUSINESS_TYPE = "SMALL_ENGINEERING";
const BASE = "/d/small-engineering";
const splitIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : typeof value === "string" && value ? value.split(",").filter(Boolean) : [];
const json = (value: unknown): InspectionRecord => {
  if (typeof value !== "string") {
    return record(value);
  }
  try {
    return record(JSON.parse(value));
  } catch {
    return {};
  }
};
interface Option {
  label: string;
  value: string;
}
function createPatrolEdit(kind: "plan" | "task") {
  return defineComponent({
    name: kind === "plan" ? "SmallEngineeringPatrolPlanEdit" : "SmallEngineeringPatrolTaskEdit",
    setup() {
      const route = useRoute();
      const router = useRouter();
      const patrol = getPatrolClient();
      const small = getSmallEngineeringClient();
      const mode = computed(() => String(route.query.type ?? "create"));
      const readonly = computed(() => mode.value === "info");
      const title = computed(
        () =>
          `${readonly.value ? "巡检" : mode.value === "edit" ? "编辑巡检" : "新增巡检"}${kind === "plan" ? "计划" : "任务"}${readonly.value ? "详情" : ""}`,
      );
      const form = reactive<InspectionRecord>({
        name: "",
        typeId: undefined,
        level: "GENERAL",
        receiveType: "1",
        receiveIds: [],
        receiveDeptIds: [],
        receivePostIds: [],
        receiveRoleIds: [],
        beginTime: undefined,
        endTime: undefined,
        method: "",
        cycle: false,
        cronId: undefined,
        cycleType: undefined,
        selection: [],
        hour: "12:00",
        remark: "",
        isCheck: false,
      });
      const duration = reactive({ day: 0, hour: 0, minute: 0 });
      const targets = ref<Target[]>([]);
      const types = ref<Option[]>([]);
      const periods = ref<Option[]>([]);
      const users = ref<Option[]>([]);
      const departments = ref<Option[]>([]);
      const roles = ref<Option[]>([]);
      const posts = ref<Option[]>([]);
      const loading = ref(true);
      const saving = ref(false);
      const loadError = ref("");
      let originalName = "";
      const goBack = () => {
        void router.push(`${BASE}/engineering-patrol-${kind === "plan" ? "plan" : "task"}`);
      };
      const load = async () => {
        loading.value = true;
        loadError.value = "";
        try {
          const ouaa = await getSmallEngineeringContext().ensureClient<OuaaClient>("ouaaClient");
          const [typeList, periodList, userList, departmentList, roleList, postList, detail, object] = await Promise.all([
            patrol.listTypes({ businessType: BUSINESS_TYPE }),
            patrol.listPeriods({ businessType: BUSINESS_TYPE }),
            ouaa.listUsers({ pageNumber: 1, pageSize: 1000 }),
            ouaa.getDepartments({ enabled: true }),
            ouaa.getRoles(),
            ouaa.listPositions({ enabled: true }),
            route.query.id
              ? kind === "plan"
                ? patrol.getPlan({ id: String(route.query.id), businessType: BUSINESS_TYPE })
                : patrol.getTask({ id: String(route.query.id), businessType: BUSINESS_TYPE })
              : Promise.resolve(undefined),
            route.query.objectId ? small.getScheduleDetail(String(route.query.objectId)) : Promise.resolve(undefined),
          ]);
          const options = (items: InspectionRecord[]): Option[] =>
            items.map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }));
          types.value = options(typeList);
          periods.value = [...options(periodList), { label: "自定义", value: "custom" }];
          users.value = userList.records.map((item) => ({ label: item.name, value: item.id }));
          const flatten = (items: typeof departmentList): Option[] =>
            items.flatMap((item) => [{ label: item.name, value: item.id }, ...flatten(item.children ?? [])]);
          departments.value = flatten(departmentList);
          roles.value = roleList.map((item) => ({ label: item.name, value: item.id }));
          posts.value = options(records(postList));
          if (detail) {
            originalName = String(detail.name ?? "");
            const cron = json(detail.cronName);
            Object.assign(form, detail, cron, {
              name: mode.value === "copy" ? `${originalName}-副本-${dayjs().format("YYYY-MM-DD")}` : originalName,
              receiveType: String(detail.receiveType ?? "1"),
              receiveIds: splitIds(detail.receiveIds),
              receiveDeptIds: splitIds(detail.receiveDeptIds),
              receivePostIds: splitIds(detail.receivePostIds),
              receiveRoleIds: splitIds(detail.receiveRoleIds),
              beginTime: detail.validBeginTime ? dayjs(detail.validBeginTime as string).format("YYYY-MM-DD HH:mm:ss") : undefined,
              endTime: detail.validEndTime ? dayjs(detail.validEndTime as string).format("YYYY-MM-DD HH:mm:ss") : undefined,
              cronId: detail.cronId || (detail.cycle ? "custom" : undefined),
              selection: splitIds(cron.selection),
            });
            Object.assign(duration, json(detail.limitTimeJson));
            targets.value = normalizeTargets(detail.typeTargets);
          }
          if (object) {
            const defaults = standards(await patrol.getStandardsByTarget(BUSINESS_TYPE, String(object.projectType ?? ""), BUSINESS_TYPE));
            targets.value = [
              {
                targetId: String(object.id ?? ""),
                targetName: String(object.projectName ?? ""),
                targetCode: String(object.projectNum ?? ""),
                targetType: String(object.projectType ?? ""),
                targetTypeName: String(object.projectTypeName ?? ""),
                standardDTOList: defaults.map((item) => ({
                  ...item,
                  standardItems: item.standardItems.map((part) => ({ ...part, isRawItem: 1 })),
                })),
              },
            ];
            form.name = String(object.projectName ?? "");
            form.receiveIds = records(object.superviseUser).map((item) => String(item.id));
            const dates = String(object.duration ?? "").split(",");
            form.beginTime = dates[0] || undefined;
            form.endTime = dates[1] || undefined;
          }
        } catch (error) {
          loadError.value = error instanceof Error ? error.message : "详情加载失败";
          message.error(loadError.value);
        } finally {
          loading.value = false;
        }
      };
      const save = async () => {
        if (saving.value || loading.value || loadError.value) {
          return;
        }
        if (!String(form.name ?? "").trim() || !form.typeId || !form.level) {
          message.warning("请填写名称、巡检类型和巡检级别");
          return;
        }
        if (
          String(form.receiveType) === "1"
            ? splitIds(form.receiveIds).length === 0
            : ![form.receiveDeptIds, form.receivePostIds, form.receiveRoleIds].some((value) => splitIds(value).length)
        ) {
          message.warning("请选择负责人");
          return;
        }
        if (kind === "plan" && (!form.beginTime || (form.endTime && String(form.beginTime) > String(form.endTime)))) {
          message.warning("请选择正确的计划时间");
          return;
        }
        if (kind === "plan" && mode.value !== "edit" && dayjs(String(form.beginTime)).isBefore(dayjs())) {
          message.warning("计划开始时间不能早于当前时间");
          return;
        }
        if (duration.day * 1440 + duration.hour * 60 + duration.minute <= 0) {
          message.warning("请填写任务有效期");
          return;
        }
        if (
          form.cycle &&
          (!form.cronId ||
            (form.cronId === "custom" &&
              (!form.cycleType || !form.hour || (form.cycleType !== "EVERY_DAY" && splitIds(form.selection).length === 0))))
        ) {
          message.warning("请完整配置巡查周期");
          return;
        }
        const relations = targetRelations(targets.value);
        if (relations.length === 0) {
          message.warning("请添加巡检对象并选择巡检内容");
          return;
        }
        saving.value = true;
        try {
          if (
            kind === "plan" &&
            (mode.value !== "edit" || form.name !== originalName) &&
            (await patrol.checkPlanNameRepeat({ planName: String(form.name).trim(), businessType: BUSINESS_TYPE }))
          ) {
            message.warning("计划名称已存在");
            return;
          }
          const payload: InspectionRecord = {
            name: String(form.name).trim(),
            typeId: form.typeId,
            level: form.level,
            receiveType: form.receiveType,
            receiveIds: splitIds(form.receiveIds).join(","),
            receiveDeptIds: splitIds(form.receiveDeptIds).join(","),
            receivePostIds: splitIds(form.receivePostIds).join(","),
            receiveRoleIds: splitIds(form.receiveRoleIds).join(","),
            method: form.method,
            limitTimeJson: JSON.stringify(duration),
            remark: form.remark,
            businessType: BUSINESS_TYPE,
            ...(kind === "plan"
              ? {
                  beginTime: form.beginTime,
                  endTime: form.endTime,
                  validBeginTime: form.beginTime,
                  validEndTime: form.endTime,
                  cycle: form.cycle,
                  cronId: form.cronId === "custom" ? "" : form.cronId,
                  cycleType: form.cycleType,
                  selection: splitIds(form.selection).join(","),
                  hour: form.hour,
                  enable: 1,
                  planRelationList: relations,
                  id: mode.value === "edit" ? form.id : "",
                }
              : { isCheck: form.isCheck, taskTargetDTOList: relations }),
          };
          if (kind === "task") {
            await patrol.createTask(payload);
          } else if (mode.value === "edit") {
            await patrol.updatePlan(payload);
          } else {
            await patrol.createPlan(payload);
          }
          message.success("保存成功");
          goBack();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
          saving.value = false;
        }
      };
      void load();
      const multi = (key: string, options: Option[], placeholder: string) => (
        <Select
          disabled={readonly.value}
          mode="multiple"
          v-model:value={form[key]}
          options={options}
          showSearch
          optionFilterProp="label"
          placeholder={placeholder}
          style={{ width: "100%" }}
        />
      );
      const slots = {
        "layout-content": () => (
          <Spin spinning={loading.value}>
            {loadError.value ? (
              <div>
                {loadError.value}
                <Button
                  onClick={() => {
                    void load();
                  }}
                >
                  重试
                </Button>
              </div>
            ) : (
              <>
                <h3>基础信息</h3>
                <Form labelCol={{ style: { width: "130px" } }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(280px,1fr))", gap: "0 20px" }}>
                    <FormItem label={kind === "plan" ? "计划名称" : "任务名称"} required>
                      <Input disabled={readonly.value} v-model:value={form.name} maxlength={32} placeholder="请输入名称" />
                    </FormItem>
                    <FormItem label="巡查类型" required>
                      <Select
                        disabled={readonly.value}
                        v-model:value={form.typeId}
                        options={types.value}
                        placeholder="请选择巡查类型"
                        style={{ width: "100%" }}
                      />
                    </FormItem>
                    <FormItem label="巡检级别" required>
                      <Select
                        disabled={readonly.value}
                        v-model:value={form.level}
                        options={[
                          { label: "普通", value: "GENERAL" },
                          { label: "紧急", value: "URGENT" },
                        ]}
                        style={{ width: "100%" }}
                      />
                    </FormItem>
                    <FormItem label="负责人类型" required>
                      <Select
                        disabled={readonly.value}
                        v-model:value={form.receiveType}
                        options={[
                          { label: "人员", value: "1" },
                          { label: "部门/岗位/角色", value: "2" },
                        ]}
                        style={{ width: "100%" }}
                      />
                    </FormItem>
                    {form.receiveType === "1" ? (
                      <FormItem label="负责人" required>
                        {multi("receiveIds", users.value, "请选择负责人")}
                      </FormItem>
                    ) : (
                      <>
                        <FormItem label="部门">{multi("receiveDeptIds", departments.value, "请选择部门")}</FormItem>
                        <FormItem label="岗位">{multi("receivePostIds", posts.value, "请选择岗位")}</FormItem>
                        <FormItem label="角色">{multi("receiveRoleIds", roles.value, "请选择角色")}</FormItem>
                      </>
                    )}
                    {kind === "plan" && (
                      <>
                        <FormItem label="计划开始时间" required>
                          <DatePicker
                            disabled={readonly.value}
                            v-model:value={form.beginTime}
                            showTime
                            valueFormat="YYYY-MM-DD HH:mm:ss"
                            style={{ width: "100%" }}
                          />
                        </FormItem>
                        <FormItem label="计划结束时间">
                          <DatePicker
                            disabled={readonly.value}
                            v-model:value={form.endTime}
                            showTime
                            valueFormat="YYYY-MM-DD HH:mm:ss"
                            style={{ width: "100%" }}
                          />
                        </FormItem>
                      </>
                    )}
                    <FormItem label="扫码巡查">
                      <Switch
                        disabled={readonly.value}
                        checked={form.method === "SCAN_CODE"}
                        onChange={(checked) => {
                          form.method = checked === true ? "SCAN_CODE" : "";
                        }}
                      />
                    </FormItem>
                    {kind === "task" && (
                      <FormItem label="稽查任务">
                        <Switch disabled={readonly.value} v-model:checked={form.isCheck} />
                      </FormItem>
                    )}
                    <FormItem label="任务时限" required>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {(["day", "hour", "minute"] as const).map((key, index) => (
                          <InputNumber
                            disabled={readonly.value}
                            min={0}
                            max={key === "day" ? 9999 : key === "hour" ? 23 : 59}
                            precision={0}
                            v-model:value={duration[key]}
                            addonAfter={["天", "小时", "分钟"][index]}
                            style={{ width: "33%" }}
                          />
                        ))}
                      </div>
                    </FormItem>
                    {kind === "plan" && (
                      <>
                        <FormItem label="周期巡查">
                          <Switch disabled={readonly.value} v-model:checked={form.cycle} />
                        </FormItem>
                        {form.cycle && (
                          <>
                            <FormItem label="循环周期" required>
                              <Select
                                disabled={readonly.value}
                                v-model:value={form.cronId}
                                options={periods.value}
                                placeholder="请选择循环周期"
                                style={{ width: "100%" }}
                              />
                            </FormItem>
                            {form.cronId === "custom" && (
                              <>
                                <FormItem label="执行周期" required>
                                  <Select
                                    disabled={readonly.value}
                                    v-model:value={form.cycleType}
                                    onChange={() => {
                                      form.selection = [];
                                    }}
                                    options={[
                                      { label: "每日", value: "EVERY_DAY" },
                                      { label: "每周", value: "EVERY_WEEK" },
                                      { label: "每月", value: "EVERY_MONTH" },
                                    ]}
                                    style={{ width: "100%" }}
                                  />
                                </FormItem>
                                {form.cycleType && form.cycleType !== "EVERY_DAY" && (
                                  <FormItem label="执行日期" required>
                                    {multi(
                                      "selection",
                                      Array.from({ length: form.cycleType === "EVERY_WEEK" ? 7 : 31 }, (_, index) => ({
                                        label:
                                          form.cycleType === "EVERY_WEEK"
                                            ? `周${["日", "一", "二", "三", "四", "五", "六"][index]}`
                                            : `${index + 1}号`,
                                        value: String(index + 1),
                                      })),
                                      "请选择执行日期",
                                    )}
                                  </FormItem>
                                )}
                                <FormItem label="执行时间" required>
                                  <TimePicker disabled={readonly.value} v-model:value={form.hour} format="HH:mm" valueFormat="HH:mm" />
                                </FormItem>
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <FormItem label="备注">
                    <Textarea disabled={readonly.value} v-model:value={form.remark} rows={3} />
                  </FormItem>
                </Form>
                <h3>巡检内容</h3>
                <PatrolContent
                  modelValue={targets.value}
                  onUpdate:modelValue={(value) => {
                    targets.value = value;
                  }}
                  readonly={readonly.value}
                  departments={departments.value}
                />
                {readonly.value && kind === "task" && <TaskProgress id={String(route.query.id ?? "")} />}
              </>
            )}
          </Spin>
        ),
        "footer-page": () => (
          <>
            <Button onClick={goBack}>返回</Button>
            {!readonly.value && (
              <Button
                type="primary"
                disabled={loading.value || Boolean(loadError.value)}
                loading={saving.value}
                onClick={() => {
                  void save();
                }}
              >
                保存
              </Button>
            )}
          </>
        ),
      };
      return () => <PageLayout title={title.value} v-slots={slots} />;
    },
  });
}
export const PatrolPlanEdit = createPatrolEdit("plan");
export const PatrolTaskEdit = createPatrolEdit("task");
