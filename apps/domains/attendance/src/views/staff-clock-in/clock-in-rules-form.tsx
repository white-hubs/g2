import type { FormExpose, FormRule as RuleObject } from "@g2-platform/pc-ui";
import { Button, CheckboxGroup, Form, FormItem, Input, PageLayout as Layout, Spin, message } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ClockInRules,
  type DeviceParam,
  type LocationParam,
  clockInRulesDetail,
  clockInRulesInsert,
  clockInRulesUpdate,
} from "@/api/staff-clock-in";
import { ClockInRuleSettingGPSPickerTable } from "@/components/business/clock-in-rule-setting-gps-pick-table/clock-in-rule-setting-gps-pick-table";
import { ClockInRuleSettingMachineSelectTable } from "@/components/business/clock-in-rule-setting-machine-select-table/clock-in-rule-setting-machine-select-table";
import { VerticalLine } from "@/components/vertical-line/vertical-line";
import { logger } from "@/logger";

import style from "@/assets/style.module.less";

export const ClockInRulesForm = defineComponent({
  setup: () => {
    const router = useRouter();
    const { action, id } = useRoute().query;
    const goBack = (): void => {
      router.back();
    };

    /** 标题 */
    const title = computed(() => {
      let res = "打卡规则";
      if (action === "add") {
        res += " / 新增";
      } else if (action === "edit") {
        res += " / 编辑";
      } else {
        res += " / 详情";
      }
      return res;
    });

    /** 表单实例 */
    const formRef = ref<FormExpose>();

    const formData = ref<{
      name: string;
      ways: string[];
      deviceList: DeviceParam[];
      gpsSetting: { locationList: LocationParam[]; faceRecognition: boolean; outClock: boolean };
    }>({
      name: "",
      ways: [],
      deviceList: [],
      gpsSetting: {
        locationList: [],
        faceRecognition: true,
        outClock: false,
      },
    });

    const checkDeviceList = async (rule: unknown, value: unknown[]): Promise<void> => {
      if ((formData.value.ways as string[]).includes("DEVICE") && value.length === 0) {
        throw new Error("请添加考勤机");
      }
      return;
    };

    const checkGpsSetting = async (rule: unknown, value: { locationList: unknown[] }): Promise<void> => {
      if ((formData.value.ways as string[]).includes("GPS") && value.locationList.length === 0) {
        throw new Error("请添加考勤地点");
      }
      return;
    };

    const customValidatesRules = {
      deviceList: { trigger: "change", validator: checkDeviceList } satisfies RuleObject,
      gpsSetting: { trigger: "change", validator: checkGpsSetting } satisfies RuleObject,
    };

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

        const params: ClockInRules = {
          name: formData.value.name,
          ways: formData.value.ways.join(","),
          deviceList: formData.value.deviceList.map((item) => ({
            id: (item as DeviceParam).id,
            code: (item as DeviceParam).code,
            modelName: (item as DeviceParam).modelName,
            name: (item as DeviceParam).name,
            genreName: (item as DeviceParam).genreName,
          })),
          locationList: formData.value.gpsSetting.locationList.map((item) => ({
            address: (item as LocationParam).address,
            latitude: (item as LocationParam).latitude,
            longitude: (item as LocationParam).longitude,
            ranges: (item as LocationParam).ranges,
          })),
          faceRecognition: formData.value.gpsSetting.faceRecognition,
          outClock: formData.value.gpsSetting.outClock,
        };
        if (action === "add") {
          await clockInRulesInsert(params);
        } else {
          await clockInRulesUpdate({ ...params, id: id as string });
        }

        message.success("操作成功");
        router.back();
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
            const res = await clockInRulesDetail({ id: id as string });
            if (res.data) {
              formData.value.name = res.data.name;
              formData.value.ways = res.data.ways.split(",");
              formData.value.gpsSetting.faceRecognition = res.data.faceRecognition;
              formData.value.gpsSetting.outClock = res.data.outClock;
              formData.value.gpsSetting.locationList = res.data.locationList ?? [];
              formData.value.deviceList = res.data.deviceList ?? [];
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
                <FormItem
                  label="打卡规则名称"
                  name="name"
                  class={style["w-50"]}
                  rules={[{ required: true, message: "请输入打卡规则名称" }]}
                >
                  <Input value={formData.value.name} v-model:value={formData.value.name} maxlength={30} />
                </FormItem>
                <VerticalLine title="打卡规则" />
                <FormItem label="打卡方式" name="ways" class={style["w-50"]} rules={[{ required: true, message: "请选择打卡方式" }]}>
                  <CheckboxGroup
                    value={formData.value.ways}
                    v-model:value={formData.value.ways}
                    options={[
                      { label: "考勤机打卡", value: "DEVICE" },
                      { label: "GPS地点打卡", value: "GPS" },
                    ]}
                  />
                </FormItem>
                {formData.value.ways.includes("DEVICE") && (
                  <FormItem name="deviceList">
                    <ClockInRuleSettingMachineSelectTable
                      value={formData.value.deviceList}
                      v-model:value={formData.value.deviceList}
                      readonly={action === "detail"}
                    />
                  </FormItem>
                )}
                {formData.value.ways.includes("GPS") && (
                  <FormItem name="gpsSetting">
                    <ClockInRuleSettingGPSPickerTable
                      value={formData.value.gpsSetting}
                      v-model:value={formData.value.gpsSetting}
                      readonly={action === "detail"}
                    />
                  </FormItem>
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
