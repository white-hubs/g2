import { Form, FormItem, Input, Spin, dayjs } from "@g2-platform/pc-ui";
import type { FormExpose, FormRule as RuleObject } from "@g2-platform/pc-ui";
import { Button, message } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { type Classes, classesDetail, classesInsert, classesUpdate } from "@/api/classes-manage";
import { ClassesTypeSelect } from "@/components/business/classes-type-select/classes-type-select";
import { ClockInTime } from "@/components/business/clock-in-time/clock-in-time";
import { RestTimeRange } from "@/components/business/rest-time-range/rest-time-range";
import { DeptTreeSelect } from "@/components/department-select";
import { logger } from "@/logger";

import "./classes-manage-form.less";

interface WorkTime {
  workTime: string;
  afterTime: string;
  beforeTime: string;
}
export const ClassesManageForm = defineComponent({
  setup: () => {
    const router = useRouter();
    const { action, id } = useRoute().query;
    const goBack = (): void => {
      router.back();
    };

    /** 标题 */
    const title = computed(() => {
      let res = "班次";
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

    const formData = ref<Classes & { restRange: [string, string]; startWorkTimeTemp: WorkTime; endWorkTimeTemp: WorkTime }>({
      name: "",
      nickName: "",
      classesType: undefined,
      deptIds: [],
      startWorkTime: "",
      startClockAfterTime: "",
      startClockBeforeTime: "",
      endWorkTime: "",
      endClockAfterTime: "",
      endClockBeforeTime: "",
      restStartTime: "",
      restEndTime: "",
      restRange: ["", ""],
      endTimeIsMorrow: false,
      startWorkTimeTemp: {
        workTime: "",
        afterTime: "",
        beforeTime: "",
      },
      endWorkTimeTemp: {
        workTime: "",
        afterTime: "",
        beforeTime: "",
      },
    });

    watch(
      () => [formData.value.startWorkTimeTemp.workTime, formData.value.endWorkTimeTemp.workTime],
      ([start, end]) => {
        formData.value.endTimeIsMorrow = Boolean(start && end && dayjs("2023-09-01 " + end).isBefore(dayjs("2023-09-01 " + start)));
      },
      { immediate: true },
    );

    const checkName = async (): Promise<void> => {
      if (!formData.value.name.trim()) {
        throw new Error("请填写班次名称");
      }
      if (!/^[\u4E00-\u9FA5\w\d]+$/.test(formData.value.name)) {
        throw new Error("仅支持包含中英文字符及数字");
      }
      return;
    };
    const checkNickname = async (): Promise<void> => {
      if (!formData.value.nickName.trim()) {
        throw new Error("请填写班次简称");
      }
      if (!/^[\u4E00-\u9FA5\w\d]+$/.test(formData.value.nickName)) {
        throw new Error("仅支持包含中英文字符及数字");
      }
      return;
    };
    const checkWorkTime = async (rule: unknown, value: WorkTime): Promise<void> => {
      if (!value.afterTime || !value.beforeTime || !value.beforeTime) {
        throw new Error("请检查未填写项目");
      }
      return;
    };
    const customValidatesRules = {
      name: { required: true, trigger: "change", validator: checkName } satisfies RuleObject,
      nickName: { required: true, trigger: "change", validator: checkNickname } satisfies RuleObject,
      startWorkTimeTemp: { required: true, trigger: "change", validator: checkWorkTime } satisfies RuleObject,
      endWorkTimeTemp: { required: true, trigger: "change", validator: checkWorkTime } satisfies RuleObject,
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

        const params: Classes = {
          name: formData.value.name,
          nickName: formData.value.nickName,
          classesType: formData.value.classesType,
          deptIds: formData.value.deptIds ? (formData.value.deptIds as string[]).join(",") : "",
          restStartTime: formData.value.restRange ? formData.value.restRange[0] : "",
          restEndTime: formData.value.restRange ? formData.value.restRange[1] : "",
          endTimeIsMorrow: formData.value.endTimeIsMorrow,
          startWorkTime: formData.value.startWorkTimeTemp.workTime,
          startClockAfterTime: formData.value.startWorkTimeTemp.afterTime,
          startClockBeforeTime: formData.value.startWorkTimeTemp.beforeTime,
          endWorkTime: formData.value.endWorkTimeTemp.workTime,
          endClockAfterTime: formData.value.endWorkTimeTemp.afterTime,
          endClockBeforeTime: formData.value.endWorkTimeTemp.beforeTime,
        };
        if (action === "add") {
          await classesInsert(params);
        } else {
          await classesUpdate({ ...params, id: id as string });
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
            const res = await classesDetail({ id: id as string });
            if (res.data) {
              formData.value.name = res.data.name;
              formData.value.nickName = res.data.nickName;
              formData.value.classesType = res.data.classesType;
              formData.value.deptIds = res.data.deptIds === "0" ? [] : (res.data.deptIds as string).split(",");
              formData.value.startWorkTimeTemp = {
                workTime: res.data.startWorkTime,
                beforeTime: res.data.startClockBeforeTime,
                afterTime: res.data.startClockAfterTime,
              };
              formData.value.endWorkTimeTemp = {
                workTime: res.data.endWorkTime,
                beforeTime: res.data.endClockBeforeTime,
                afterTime: res.data.endClockAfterTime,
              };
              formData.value.restRange = [res.data.restStartTime ?? "", res.data.restEndTime ?? ""];
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
            <div class="classes-manage-form">
              <Form
                ref={formRef}
                model={formData.value}
                rules={customValidatesRules}
                labelCol={{ style: { width: "150px" } }}
                disabled={action === "detail"}
                style={{ margin: "20px" }}
              >
                <FormItem label="班次名称" name="name" class="w-40">
                  <Input value={formData.value.name} v-model:value={formData.value.name} placeholder="请输入班次名称" />
                </FormItem>
                <FormItem label="班次简称" name="nickName" class="w-40">
                  <Input
                    value={formData.value.nickName}
                    v-model:value={formData.value.nickName}
                    maxlength={4}
                    placeholder="请输入班次简称"
                  />
                </FormItem>
                <FormItem label="建议应用范围" name="deptIds" class="w-40">
                  <DeptTreeSelect value={formData.value.deptIds} v-model:value={formData.value.deptIds} cheakable />
                </FormItem>
                <FormItem label="班次类型" name="classesType" class="w-40" rules={[{ required: true, message: "请选择班次类型" }]}>
                  <ClassesTypeSelect
                    disabled={action === "detail"}
                    value={formData.value.classesType}
                    v-model:value={formData.value.classesType}
                  />
                </FormItem>
                <FormItem label="上班时间" name="startWorkTimeTemp" class="block">
                  <ClockInTime
                    value={formData.value.startWorkTimeTemp}
                    v-model:value={formData.value.startWorkTimeTemp}
                    firstText="上班打卡范围"
                    readonly={action === "detail"}
                  />
                </FormItem>
                <FormItem label="下班时间" name="endWorkTimeTemp" class="block">
                  <ClockInTime
                    value={formData.value.endWorkTimeTemp}
                    v-model:value={formData.value.endWorkTimeTemp}
                    firstText="下班打卡范围"
                    showNextDay={formData.value.endTimeIsMorrow}
                    readonly={action === "detail"}
                  />
                </FormItem>
                <FormItem label="休息时间" name="restRange" class="block">
                  <RestTimeRange value={formData.value.restRange} v-model:value={formData.value.restRange} readonly={action === "detail"} />
                </FormItem>
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
