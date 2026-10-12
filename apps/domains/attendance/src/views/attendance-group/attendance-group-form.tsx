import type { FormExpose } from "@g2-platform/pc-ui";
import { AntModal, Button, CheckboxGroup, Form, FormItem, Input, PageLayout as Layout, Select, Spin, message } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type AttendanceGroup,
  type StaffList,
  attendanceGroupDetail,
  attendanceGroupInsert,
  attendanceGroupPreChecked,
  attendanceGroupUpdate,
} from "@/api/attendance-group";
import { type Limit, type RulesClassesList, schedulingRuleDetail } from "@/api/scheduling-manage";
import { clockInRulesDetail } from "@/api/staff-clock-in";
import { BusinessTripRulesSelect } from "@/components/business/business-trip-rules-select/business-trip-rules-select";
import { ClassesSelectTable } from "@/components/business/classes-select-table/classes-select-table";
import { ClockInRuleSelect } from "@/components/business/clock-in-rule-select/clock-in-rule-select";
import { ClockInRuleSettingGPSPickerTable } from "@/components/business/clock-in-rule-setting-gps-pick-table/clock-in-rule-setting-gps-pick-table";
import { ClockInRuleSettingMachineSelectTable } from "@/components/business/clock-in-rule-setting-machine-select-table/clock-in-rule-setting-machine-select-table";
import { LeaveRulesSelect } from "@/components/business/leave-rules-select/leave-rules-select";
import { OffDutyRulesSelect } from "@/components/business/off-duty-rules-select/off-duty-rules-select";
import { OverTimeRulesSelect } from "@/components/business/overtime-rules-select/overtime-rules-select";
import { SchedulingRulesClassesSelectTable } from "@/components/business/scheduling-rules-classes-select-table/scheduling-rules-classes-select-table";
import { SchedulingRulesLimit } from "@/components/business/scheduling-rules-limit/scheduling-rules-limit";
import { SchedulingRuleSelect } from "@/components/business/scheduling-rules-select/scheduling-rules-select";
import { SupplementRulesSelect } from "@/components/business/supplement-rules-select/supplement-rules-select";
import { UserPickerTable } from "@/components/business/user-picker-table/user-picker-table";
import { VerticalLine } from "@/components/vertical-line/vertical-line";
import { logger } from "@/logger";
import { functionDictionaryStore } from "@/store/function-dictionary";

import style from "@/assets/style.module.less";

export const AttendanceGroupForm = defineComponent({
  setup: () => {
    const router = useRouter();
    const { action, id } = useRoute().query;
    const goBack = (): void => {
      router.back();
    };

    /** 标题 */
    const title = computed(() => {
      let res = "考勤组";
      if (action === "add") {
        res += " / 新增";
      } else if (action === "edit") {
        res += " / 编辑";
      } else {
        res += " / 详情";
      }
      return res;
    });

    const showLimit = computed(() => {
      if (formData.value.schedulingWays === "SHIFTS" && formData.value.limit) {
        let limit = false;
        for (const key in formData.value.limit) {
          if ((formData.value.limit as Record<string, unknown>)[key]) {
            limit = true;
          }
        }
        return limit;
      }
      return false;
    });

    /** 表单实例 */
    const formRef = ref<FormExpose>();

    const formData = ref<
      AttendanceGroup & {
        staffList: StaffList[];
        schedulingWays?: string;
        clockInWays?: string;
        classesSelect?: { legalHolidaysRest: boolean; rulesClassesList: RulesClassesList[] };
        deviceList: { id: string; name: string }[];
        gpsSetting: { locationList: unknown[]; faceRecognition: boolean; outClock: boolean };
        limit?: Limit;
        groupClassList: { id: string; name: string; content?: string[]; typeName?: string }[];
        cardRuleList: { id: string; name: string; content?: string[]; typeName?: string }[];
        overtimeRuleList: { id: string; name: string; content?: string[]; typeName?: string }[];
        holidayRuleList: { id: string; name: string; content?: string[]; typeName?: string }[];
        leavePostRuleList: { id: string; name: string; content?: string[]; typeName?: string }[];
        awayBusinessRuleList: { id: string; name: string; content?: string[]; typeName?: string }[];
      }
    >({
      name: "",
      ranges: undefined,
      groupStaffList: [],
      staffList: [],
      schedulingRuleId: undefined,
      clockRuleId: undefined,
      classesSelect: {
        legalHolidaysRest: false,
        rulesClassesList: [],
      },
      deviceList: [],
      gpsSetting: {
        locationList: [],
        faceRecognition: false,
        outClock: false,
      },
      groupClassIds: undefined,
      groupClassList: [],
      cardRuleIds: undefined,
      cardRuleList: [],
      overtimeRuleId: undefined,
      overtimeRuleList: [],
      holidayRuleIds: undefined,
      holidayRuleList: [],
      leavePostRuleId: undefined,
      leavePostRuleList: [],
      awayBusinessRuleId: undefined,
      awayBusinessRuleList: [],
    });

    const customValidatesRules = {};

    // 保存
    const saveLoading = ref(false);
    const save = async (): Promise<void> => {
      if (saveLoading.value) {
        return;
      }
      saveLoading.value = true;
      try {
        formRef.value?.clearValidate();
        await formRef.value?.validate();

        const params: AttendanceGroup = {
          name: formData.value.name,
          ranges: formData.value.ranges,
          groupStaffList:
            formData.value.ranges === "PART"
              ? formData.value.staffList.map((e) => ({
                  deptId: e.organizations.length ? e.organizations[e.organizations.length - 1].id : "",
                  deptName: e.organizations.length ? e.organizations[e.organizations.length - 1].name : "",
                  id: e.id,
                  mobile: e.mobile,
                  name: e.name,
                  organizations: JSON.stringify(e.organizations),
                }))
              : [],
          schedulingRuleId: formData.value.schedulingRuleId,
          clockRuleId: formData.value.clockRuleId,
          groupClassIds: formData.value.groupClassList.map((e) => e.id).join(","),
          cardRuleIds: formData.value.cardRuleList.map((e) => e.id).join(","),
          holidayRuleIds: formData.value.holidayRuleList.map((e) => e.id).join(","),
          overtimeRuleId: formData.value.overtimeRuleList.map((e) => e.id).join(","),
          leavePostRuleId: formData.value.leavePostRuleList.map((e) => e.id).join(","),
          awayBusinessRuleId: formData.value.awayBusinessRuleList.map((e) => e.id).join(","),
        };
        const handelSubmit = async (): Promise<void> => {
          if (action === "add") {
            await attendanceGroupInsert(params);
          } else {
            await attendanceGroupUpdate({ ...params, id: id as string });
          }
          message.success("操作成功");
          router.back();
        };
        const preCheck = await attendanceGroupPreChecked({ ...params, id: action === "add" ? undefined : (id as string) });
        if (preCheck.data) {
          await new Promise<void>((resolve, reject) => {
            AntModal.confirm({
              okText: "确定",
              cancelText: "取消",
              centered: true,
              title: (preCheck.data as string) + "，是否保存",
              onOk: async () => {
                try {
                  await handelSubmit();
                  resolve();
                } catch (error) {
                  reject(error);
                }
              },
              onCancel: () => resolve(),
            });
          });
          return;
        }
        await handelSubmit();
      } catch (error) {
        logger.error(error);
      } finally {
        saveLoading.value = false;
      }
    };

    const init = ref(false);
    onMounted(async () => {
      try {
        if (action !== "add") {
          if (id) {
            const res = await attendanceGroupDetail({ id: id as string }, action !== "edit");
            if (res.data) {
              formData.value.name = res.data.name;
              formData.value.ranges = res.data.ranges;
              formData.value.staffList = res.data.groupStaffList
                ? res.data.groupStaffList.map((e) => ({
                    organizations: e.organizations ? JSON.parse(e.organizations) : [],
                    id: e.id,
                    name: e.name,
                    mobile: e.mobile,
                  }))
                : [];
              if (res.data.ranges === "ALL") {
                formData.value.staffList = [];
              }
              formData.value.schedulingRuleId = res.data.schedulingRuleId;
              formData.value.clockRuleId = res.data.clockRuleId;
              formData.value.groupClassList = res.data.groupClassList;
              formData.value.cardRuleList = res.data.cardRuleList;
              formData.value.holidayRuleList = res.data.holidayRuleList;
              formData.value.leavePostRuleList = res.data.leavePostRuleId ? [res.data.leavePostRule] : [];
              formData.value.overtimeRuleList = res.data.overtimeRuleId ? [res.data.overtimeRule] : [];
              formData.value.awayBusinessRuleList = res.data.awayBusinessRuleId ? [res.data.awayBusinessRule] : [];
            }
          }
        }
      } catch (error) {
        logger.error(error);
        message.error("详情加载失败");
      } finally {
        init.value = true;
      }
    });

    const schedulingLoading = ref(false);
    const clockLoading = ref(false);
    let schedulingVersion = 0;
    let clockVersion = 0;
    watch(
      () => formData.value.schedulingRuleId,
      async (ruleId) => {
        const version = ++schedulingVersion;
        if (!ruleId) {
          formData.value.schedulingWays = undefined;
          schedulingLoading.value = false;
          return;
        }
        schedulingLoading.value = true;
        try {
          const res = await schedulingRuleDetail({ id: String(ruleId) });
          if (version !== schedulingVersion) {
            return;
          }
          formData.value.schedulingWays = res.data.ways;
          formData.value.classesSelect = { legalHolidaysRest: res.data.legalHolidaysRest, rulesClassesList: res.data.rulesClassesList };
          formData.value.limit = {
            continuousDays: Number(res.data.continuousDays) || null,
            intervalHour: Number(res.data.intervalHour) || null,
            sameShift: res.data.sameShift ? JSON.parse(res.data.sameShift as string) : [{ sameShiftNumber: null, sameShiftType: null }],
          };
        } catch (error) {
          message.error(error instanceof Error ? error.message : "排班规则加载失败");
        } finally {
          if (version === schedulingVersion) {
            schedulingLoading.value = false;
          }
        }
      },
    );
    watch(
      () => formData.value.clockRuleId,
      async (ruleId) => {
        const version = ++clockVersion;
        if (!ruleId) {
          formData.value.clockInWays = undefined;
          clockLoading.value = false;
          return;
        }
        clockLoading.value = true;
        try {
          const res = await clockInRulesDetail({ id: String(ruleId) });
          if (version !== clockVersion) {
            return;
          }
          formData.value.clockInWays = res.data.ways;
          formData.value.deviceList = res.data.deviceList ?? [];
          formData.value.gpsSetting = {
            faceRecognition: res.data.faceRecognition,
            outClock: res.data.outClock,
            locationList: res.data.locationList ?? [],
          };
        } catch (error) {
          message.error(error instanceof Error ? error.message : "打卡规则加载失败");
        } finally {
          if (version === clockVersion) {
            clockLoading.value = false;
          }
        }
      },
    );

    const layoutSlots = {
      "layout-content": (): VNode | undefined => {
        if (!init.value) {
          return (
            <div style="min-height:240px;display:flex;align-items:center;justify-content:center">
              <Spin spinning />
            </div>
          );
        }
        return (
          <>
            <div class={style["attendance-group-form"]}>
              <Form
                ref={formRef}
                model={formData.value}
                rules={customValidatesRules}
                labelCol={{ style: { width: "150px" } }}
                disabled={action === "detail"}
                style={{ margin: "20px" }}
              >
                <VerticalLine title="基本信息" />
                <FormItem label="考勤组名称" name="name" class={style["w-50"]} rules={[{ required: true, message: "请输入考勤组名称" }]}>
                  <Input value={formData.value.name} v-model:value={formData.value.name} />
                </FormItem>
                <FormItem label="适用范围" name="ranges" class={style["w-50"]} rules={[{ required: true, message: "请选择适用范围" }]}>
                  <Select
                    value={formData.value.ranges}
                    v-model:value={formData.value.ranges}
                    disabled={action !== "add"}
                    options={[
                      { label: "所有人", value: "ALL" },
                      { label: "部分人", value: "PART" },
                    ]}
                  />
                </FormItem>
                {formData.value.ranges === "PART" && (
                  <FormItem
                    label="适用人员"
                    name="staffList"
                    rules={[{ required: true, type: "array", min: 1, message: "请选择适用人员" }]}
                  >
                    <UserPickerTable
                      value={formData.value.staffList}
                      v-model:value={formData.value.staffList}
                      readonly={action === "detail"}
                    />
                  </FormItem>
                )}
                <FormItem
                  label="考勤班次"
                  name="groupClassList"
                  rules={[{ required: true, type: "array", min: 1, message: "请选择考勤班次" }]}
                >
                  <ClassesSelectTable
                    value={formData.value.groupClassList}
                    v-model:value={formData.value.groupClassList}
                    readonly={action === "detail"}
                  />
                </FormItem>
                {functionDictionaryStore.find((e) => e.code === "ARRANGE") && (
                  <>
                    <VerticalLine title="排班规则" />
                    <FormItem
                      label="排班规则"
                      name="schedulingRuleId"
                      class={style["w-50"]}
                      rules={[{ required: true, message: "请选择排班规则" }]}
                    >
                      <SchedulingRuleSelect
                        value={formData.value.schedulingRuleId}
                        v-model:value={formData.value.schedulingRuleId}
                        readonly={action === "detail"}
                      />
                    </FormItem>
                    {schedulingLoading.value && <Spin spinning />}
                    {formData.value.schedulingRuleId && (
                      <FormItem label="排班方式" class={style["w-50"]}>
                        <Select
                          value={formData.value.schedulingWays}
                          disabled
                          options={[
                            { label: "固定班制", value: "FIXED" },
                            { label: "倒班制", value: "SHIFTS" },
                          ]}
                        />
                      </FormItem>
                    )}
                    {formData.value.schedulingWays === "FIXED" && formData.value.classesSelect && (
                      <FormItem>
                        <SchedulingRulesClassesSelectTable
                          value={formData.value.classesSelect}
                          schedulingWay={formData.value.schedulingWays}
                          readonly
                        />
                      </FormItem>
                    )}
                    {showLimit.value && formData.value.limit && (
                      <FormItem>
                        <SchedulingRulesLimit value={formData.value.limit} readonly />
                      </FormItem>
                    )}
                  </>
                )}
                {functionDictionaryStore.find((e) => e.code === "CLOCK_IN") && (
                  <>
                    <VerticalLine title="打卡规则" />
                    <FormItem
                      label="打卡规则"
                      name="clockRuleId"
                      class={style["w-50"]}
                      rules={[{ required: true, message: "请选择打卡规则" }]}
                    >
                      <ClockInRuleSelect
                        value={formData.value.clockRuleId}
                        v-model:value={formData.value.clockRuleId}
                        readonly={action === "detail"}
                      />
                    </FormItem>
                    {clockLoading.value && <Spin spinning />}
                    {formData.value.clockRuleId && (
                      <FormItem label="打卡方式">
                        <CheckboxGroup
                          value={formData.value.clockInWays?.split(",")}
                          disabled
                          options={[
                            { label: "考勤机打卡", value: "DEVICE" },
                            { label: "GPS地点打卡", value: "GPS" },
                          ]}
                        />
                      </FormItem>
                    )}
                    {formData.value.clockInWays?.includes("DEVICE") && (
                      <FormItem>
                        <ClockInRuleSettingMachineSelectTable value={formData.value.deviceList} readonly />
                      </FormItem>
                    )}
                    {formData.value.clockInWays?.includes("GPS") && (
                      <FormItem>
                        <ClockInRuleSettingGPSPickerTable value={formData.value.gpsSetting} readonly />
                      </FormItem>
                    )}
                  </>
                )}
                {functionDictionaryStore.find((e) => e.code === "LEAVE") && (
                  <>
                    <VerticalLine title="请假规则" />
                    <FormItem
                      label="请假规则"
                      name="holidayRuleList"
                      rules={[{ required: true, type: "array", min: 1, message: "请选择请假规则" }]}
                    >
                      <LeaveRulesSelect
                        value={formData.value.holidayRuleList}
                        v-model:value={formData.value.holidayRuleList}
                        readonly={action === "detail"}
                      />
                    </FormItem>
                  </>
                )}
                {functionDictionaryStore.find((e) => e.code === "REPAIR_CLOCK") && (
                  <>
                    <VerticalLine title="补卡规则" />
                    <FormItem
                      label="补卡规则"
                      name="cardRuleList"
                      rules={[{ required: true, type: "array", min: 1, message: "请选择补卡规则" }]}
                    >
                      <SupplementRulesSelect
                        value={formData.value.cardRuleList}
                        v-model:value={formData.value.cardRuleList}
                        readonly={action === "detail"}
                      />
                    </FormItem>
                  </>
                )}
                {functionDictionaryStore.find((e) => e.code === "OVERTIME") && (
                  <>
                    <VerticalLine title="加班规则" />
                    <FormItem
                      label="加班规则"
                      name="overtimeRuleList"
                      rules={[{ required: true, type: "array", min: 1, message: "请选择加班规则" }]}
                    >
                      <OverTimeRulesSelect
                        value={formData.value.overtimeRuleList}
                        v-model:value={formData.value.overtimeRuleList}
                        readonly={action === "detail"}
                      />
                    </FormItem>
                  </>
                )}
                {functionDictionaryStore.find((e) => e.code === "POST") && (
                  <>
                    <VerticalLine title="离岗规则" />
                    <FormItem
                      label="离岗规则"
                      name="leavePostRuleList"
                      rules={[{ required: true, type: "array", min: 1, message: "请选择离岗规则" }]}
                    >
                      <OffDutyRulesSelect
                        value={formData.value.leavePostRuleList}
                        v-model:value={formData.value.leavePostRuleList}
                        readonly={action === "detail"}
                      />
                    </FormItem>
                  </>
                )}
                {functionDictionaryStore.find((e) => e.code === "AWAY") && (
                  <>
                    <VerticalLine title="出差规则" />
                    <FormItem
                      label="出差规则"
                      name="awayBusinessRuleList"
                      rules={[{ required: true, type: "array", min: 1, message: "请选择出差规则" }]}
                    >
                      <BusinessTripRulesSelect
                        value={formData.value.awayBusinessRuleList}
                        v-model:value={formData.value.awayBusinessRuleList}
                        readonly={action === "detail"}
                      />
                    </FormItem>
                  </>
                )}
              </Form>
            </div>
          </>
        );
      },
      "footer-page": (): VNode => (
        <>
          <Button onClick={goBack}>返回</Button>
          {action !== "detail" && (
            <Button type="primary" style={{ marginLeft: "10px" }} loading={saveLoading.value} onClick={save}>
              保存
            </Button>
          )}
        </>
      ),
    };
    return (): VNode => <Layout title={title.value} v-slots={layoutSlots} />;
  },
});
