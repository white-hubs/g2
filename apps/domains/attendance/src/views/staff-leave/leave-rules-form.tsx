import type { FormExpose } from "@g2-platform/pc-ui";
import {
  Button,
  DatePicker,
  Form,
  FormItem,
  type FormRule,
  Input,
  InputNumber,
  PageLayout as Layout,
  RadioGroup,
  Select,
  Spin,
  message,
} from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { type LeaveRules, type Quota, getHolidayList, leaveRulesDetail, leaveRulesInsert, leaveRulesUpdate } from "@/api/staff-leave";
import { LeaveExpiryDate } from "@/components/business/leave-expiry-date/leave-expiry-date";
import { LeaveQuotaConfig } from "@/components/business/leave-quota-config/leave-quota-config";
import { logger } from "@/logger";

export const LeaveRulesForm = defineComponent({
  setup: () => {
    const router = useRouter();
    const { action, id } = useRoute().query;
    const goBack = (): void => {
      router.back();
    };

    /** 标题 */
    const title = computed(() => {
      let res = "假期规则";
      if (action === "add") {
        res += " / 新增";
      } else if (action === "edit") {
        res += " / 编辑";
      } else {
        res += " / 详情";
      }
      return res;
    });

    const grantWayOptions = [
      { label: "每年自动发放一次", value: "EVERY_YEAR" },
      { label: "加班时长自动计入余额", value: "OVERTIME_APPEND" },
    ];
    const convertWayOptions = [
      { label: "按工作日计算时长", value: "WORKING_DAY" },
      { label: "按自然日计算时长", value: "CALENDAR_DAY" },
    ];
    const trueOrFalse = [
      { label: "是", value: true },
      { label: "否", value: false },
    ];
    const holidayTypeOptions = ref<{ label: string; value: string }[]>([]);

    /** 最小请假单位组件 */
    const leaveMiniUnit = (): VNode => (
      <div style="display:flex;align-items:center">
        按
        <div style="width:120px;margin:0 15px">
          <InputNumber min={0} max={99} v-model:value={formData.value.minAskUnit} />
        </div>
        小时请假
        <span style="font-size:12px;margin-left:20px;color:rgba(0, 0, 0, 0.25)">
          以x小时为最小单位计算，请假时长或假期余额不足x小时的不能请假
        </span>
      </div>
    );

    /** 日折算时长 */
    const dayTranslateTime = (): VNode => (
      <div style="display:flex;align-items:center">
        <div style="width:120px;margin-right:15px">
          <InputNumber min={0} max={99} v-model:value={formData.value.dayOfHour} />
        </div>
        小时=1天
      </div>
    );

    /** 发放日期 */
    const grantTimeComp = (): VNode => (
      <div style="display:flex;align-items:center">
        <DatePicker
          v-model:value={formData.value.grantDate}
          dropdownClassName="month-day-picker"
          format="MM-DD"
          valueFormat="MM-DD"
          getPopupContainer={(trigger: HTMLElement) => trigger.parentElement ?? document.body}
        />
      </div>
    );

    /** 表单实例 */
    const formRef = ref<FormExpose>();
    const formData = ref<Omit<LeaveRules, "grantDate"> & { grantDate: string | undefined }>({
      name: "",
      notLimit: true,
      calculationWay: undefined,
      dayOfHour: null,
      grantDate: undefined,
      grantWay: "EVERY_YEAR",
      minAskUnit: null,
      quota: "",
      validity: "",
      intoAbsence: false,
      holidayType: undefined,
    });

    /** 是否需要发放日期和配置额度 */
    const requiredQuota = computed(() => !formData.value.notLimit && formData.value.grantWay !== "OVERTIME_APPEND");

    const checkName = async (): Promise<void> => {
      if (!formData.value.name.trim()) {
        throw new Error("请填写规则名称");
      }
      if (!/^[\u4E00-\u9FA5\w\d]+$/.test(formData.value.name)) {
        throw new Error("仅支持包含中英文字符及数字");
      }
      return;
    };
    const checkQuota = async (): Promise<void> => {
      if (!requiredQuota.value) {
        return;
      }
      if (!formData.value.quota) {
        throw new Error("请完善额度配置");
      }
      const quota = formData.value.quota as Quota;
      if (quota.quotaType === "FIXED" && !quota.fixedNumber) {
        throw new Error("请完善额度配置");
      }

      if (["SOCIETY_AGE", "COMPANY_AGE"].includes(quota.quotaType)) {
        if (quota.quotaLevelList.length === 0) {
          throw new Error("请完善额度配置");
        }
        if (quota.quotaLevelList.find((e) => !e.ageYear || !e.holidayNumber)) {
          throw new Error("请完善额度配置");
        }
      }

      return;
    };
    const customValidatesRules = {
      name: { required: true, trigger: "change", validator: checkName } satisfies FormRule,
      quota: { required: requiredQuota.value, trigger: "change", validator: checkQuota } satisfies FormRule,
    };

    // 保存
    const saveLoading = ref(false);
    const save = async (): Promise<void> => {
      if (saveLoading.value || !init.value) {
        return;
      }
      saveLoading.value = true;
      try {
        formRef.value?.clearValidate();
        await formRef.value?.validate();
        saveLoading.value = true;
        const params: LeaveRules = {
          name: formData.value.name,
          minAskUnit: formData.value.minAskUnit,
          notLimit: formData.value.notLimit,
          calculationWay: formData.value.calculationWay,
          dayOfHour: formData.value.dayOfHour,
          grantDate: !formData.value.notLimit ? (formData.value.grantDate ?? "") : "",
          grantWay: !formData.value.notLimit ? formData.value.grantWay : "",
          quota: !formData.value.notLimit ? JSON.stringify(formData.value.quota) : "",
          validity: !formData.value.notLimit ? JSON.stringify(formData.value.validity) : "",
          intoAbsence: formData.value.intoAbsence,
          holidayType: formData.value.holidayType,
        };
        if (action === "add") {
          await leaveRulesInsert(params);
        } else {
          await leaveRulesUpdate({ ...params, id: id as string });
        }

        message.success("操作成功");
        router.back();
      } catch (error) {
        logger.error(error);
        message.error("保存失败，请检查表单或稍后重试");
      } finally {
        saveLoading.value = false;
      }
    };

    const init = ref(false);
    const detailLoading = ref(true);
    onMounted(async () => {
      try {
        await getHolidayList().then((res) => {
          holidayTypeOptions.value = (res.data as { name: string; value: string }[]).map((e) => ({
            label: e.value,
            value: e.name,
          }));
        });
        if (action !== "add") {
          if (id) {
            const res = await leaveRulesDetail({ id: id as string });
            if (res.data) {
              formData.value = { ...res.data, grantDate: res.data.grantDate || undefined };
              if (!formData.value.grantWay) {
                formData.value.grantWay = undefined;
              }
              if (typeof formData.value.quota === "string" && formData.value.quota) {
                formData.value.quota = JSON.parse(formData.value.quota);
              }
              if (typeof formData.value.validity === "string" && formData.value.validity) {
                formData.value.validity = JSON.parse(formData.value.validity);
              }
            }
          }
        }
        init.value = true;
      } catch (error) {
        logger.error(error);
        message.error("加载规则失败");
      } finally {
        detailLoading.value = false;
      }
    });

    const layoutSlots = {
      "layout-content": (): VNode | undefined => (
        <>
          <Spin spinning={detailLoading.value}>
            <div style="min-height:180px">
              {init.value && (
                <Form
                  ref={formRef}
                  model={formData.value}
                  disabled={action === "detail"}
                  rules={customValidatesRules}
                  labelCol={{ style: { width: "150px" } }}
                  style={{ margin: "20px" }}
                >
                  <FormItem label="假期名称" name="name" rules={[customValidatesRules.name]} style={{ width: "30%" }}>
                    <Input v-model:value={formData.value.name} placeholder="请输入假期名称" />
                  </FormItem>
                  <FormItem
                    label="假期类型"
                    name="holidayType"
                    rules={[{ required: true, message: "请完善假期类型" }]}
                    style={{ width: "30%" }}
                  >
                    <Select v-model:value={formData.value.holidayType} options={holidayTypeOptions.value} placeholder="请选择假期类型" />
                  </FormItem>
                  <FormItem
                    label="是否计入缺勤"
                    name="intoAbsence"
                    rules={[{ required: true, message: "请完善是否计入缺勤" }]}
                    style={{ width: "30%" }}
                  >
                    <RadioGroup options={trueOrFalse} v-model:value={formData.value.intoAbsence} />
                  </FormItem>
                  <FormItem
                    label="最小请假单位"
                    name="minAskUnit"
                    rules={[{ required: true, message: "请完善最小请假单位" }]}
                    style={{ width: "100%" }}
                  >
                    {leaveMiniUnit()}
                  </FormItem>
                  <FormItem label="日折算时长" name="dayOfHour" style={{ width: "100%" }}>
                    {dayTranslateTime()}
                  </FormItem>
                  <FormItem
                    label="请假时长核算"
                    name="calculationWay"
                    rules={[{ required: true, message: "请完善请假时长核算" }]}
                    style={{ width: "30%" }}
                  >
                    <Select
                      options={convertWayOptions}
                      v-model:value={formData.value.calculationWay}
                      placeholder="请选择请假时长核算方式"
                    />
                  </FormItem>
                  <FormItem label="假期额度" name="notLimit" style={{ width: "100%" }}>
                    <RadioGroup
                      options={[
                        { label: "限制", value: false },
                        { label: "不限制", value: true },
                      ]}
                      v-model:value={formData.value.notLimit}
                    />
                  </FormItem>
                  {!formData.value.notLimit && (
                    <>
                      <FormItem
                        label="发放方式"
                        name="grantWay"
                        rules={[{ required: true, message: "请完善发放方式" }]}
                        style={{ width: "30%" }}
                      >
                        <Select options={grantWayOptions} v-model:value={formData.value.grantWay} />
                      </FormItem>
                    </>
                  )}
                  {requiredQuota.value && (
                    <>
                      <FormItem
                        label="发放日期"
                        name="grantDate"
                        rules={[{ required: true, message: "请完善发放日期" }]}
                        style={{ width: "30%" }}
                      >
                        {grantTimeComp()}
                      </FormItem>
                      <FormItem label="额度配置" name="quota" required>
                        <LeaveQuotaConfig action={String(action)} readonly={action === "detail"} v-model:value={formData.value.quota} />
                      </FormItem>
                    </>
                  )}
                  {!formData.value.notLimit && (
                    <>
                      <FormItem
                        label="额度有效期"
                        name="validity"
                        rules={[{ required: true, message: "请完善额度有效期" }]}
                        style={{ width: "100%" }}
                      >
                        <LeaveExpiryDate readonly={action === "detail"} v-model:value={formData.value.validity} />
                      </FormItem>
                    </>
                  )}
                </Form>
              )}
            </div>
          </Spin>
        </>
      ),
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
