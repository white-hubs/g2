import customParseFormat from "dayjs/plugin/customParseFormat";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";

import { cycleList, metterReade, setCycle } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import { Button, Form, FormItem, Input, Select, TimePicker, dayjs, message, type Dayjs } from "@/pc-ui-runtime";

dayjs.extend(customParseFormat);

export const DeviceCycle = defineComponent({
  name: "DeviceCycle",
  setup() {
    const format = "HH:mm:ss";
    const loading = ref(false);
    const formRef = ref();
    const options = ref<Array<{ name: string; code: string }>>([]);
    const model = reactive({
      id: "",
      taskId: "",
      readeType: undefined as string | undefined,
      readeVulue: "",
      workTime: "",
      readeVulueList: [] as string[],
    });

    const rules = {
      readeType: [{ required: true, message: "请选择抄表周期" }],
      readeVulue: [
        { required: true, message: "请选择周期配置" },
        { pattern: new RegExp(/(^[1-9]\d{0,2}$)/, "g"), message: "请输入小于999的正整数" },
      ],
      readeVulueList: [
        { required: true, message: "" },
        {
          validator(_rule: unknown, value: string[]) {
            if (value?.length) return Promise.resolve();
            return Promise.reject("请选择周期配置");
          },
        },
      ],
      workTime: [{ required: true, message: "请选择抄表时间" }],
    };

    const workTimeValue = computed<Dayjs | undefined>({
      get() {
        if (!model.workTime) return undefined;
        const parsed = dayjs(model.workTime, format);
        return parsed.isValid() ? parsed : undefined;
      },
      set(value) {
        model.workTime = value?.isValid() ? value.format(format) : "";
      },
    });

    const weekOptions = [
      { name: "周一", id: "1" },
      { name: "周二", id: "2" },
      { name: "周三", id: "3" },
      { name: "周四", id: "4" },
      { name: "周五", id: "5" },
      { name: "周六", id: "6" },
      { name: "周日", id: "7" },
    ];
    const dateOptions = Array.from({ length: 31 }, (_, i) => ({ name: `${i + 1}号`, id: String(i + 1) }));

    const changeCheck = (item: string) => {
      model.readeVulue = "";
      model.readeVulueList = [];
      if (item === "every_specified_min") model.workTime = "00:00:00";
    };

    const getCycleList = async () => {
      const { data } = (await cycleList()) as { data: Array<{ name: string; code: string }> };
      options.value = data;
    };

    const getData = async () => {
      const { data } = (await metterReade()) as {
        data?: { id: string; taskId: string; readeType: string; readeVulue: string; workTime: string };
      };
      if (data) {
        Object.assign(model, {
          id: data.id,
          taskId: data.taskId,
          readeType: data.readeType,
          readeVulue: data.readeType === "every_specified_day" || data.readeType === "every_specified_min" ? data.readeVulue : "",
          workTime: data.workTime,
          readeVulueList:
            data.readeType === "every_specified_day" || data.readeType === "every_specified_min" ? [] : data.readeVulue.split(","),
        });
      }
    };

    const save = () => {
      formRef.value?.validate().then(() => {
        const { id, taskId, readeType, workTime, readeVulue, readeVulueList } = model;
        const params = {
          id,
          taskId,
          readeType,
          workTime,
          readeVulue:
            readeType === "every_specified_day" || model.readeType === "every_specified_min" ? readeVulue : readeVulueList.join(","),
        };
        loading.value = true;
        setCycle(params)
          .then(() => {
            message.success("操作成功");
            void getData();
          })
          .finally(() => {
            loading.value = false;
          });
      });
    };

    onMounted(() => {
      void getData();
      void getCycleList();
    });

    return () => (
      <GLayout
        title="抄表周期"
        showFooter
        contentTableScrollable
        v-slots={{
          "content-table": () => (
            <Form ref={formRef} model={model} rules={rules}>
              <FormItem label="抄表周期" name="readeType">
                <Select
                  v-model:value={model.readeType}
                  placeholder="请选择抄表周期"
                  style={{ width: "300px" }}
                  options={options.value}
                  fieldNames={{ label: "name", value: "code" }}
                  onChange={(value) => changeCheck(String(value ?? ""))}
                />
              </FormItem>
              {model.readeType !== "last_day_monthly" ? (
                <FormItem
                  label="周期配置"
                  name={
                    model.readeType === "every_specified_day" || model.readeType === "every_specified_min" ? "readeVulue" : "readeVulueList"
                  }
                >
                  {model.readeType === "weekly_designated_date" ? (
                    <Select
                      v-model:value={model.readeVulueList}
                      placeholder="请选择日期"
                      fieldNames={{ label: "name", value: "id" }}
                      style={{ width: "300px" }}
                      options={weekOptions}
                      mode="multiple"
                    />
                  ) : model.readeType === "every_specified_day" ? (
                    <Input v-model:value={model.readeVulue} suffix="天" style={{ width: "300px" }} placeholder="请输入周期配置" />
                  ) : model.readeType === "every_specified_min" ? (
                    <Input v-model:value={model.readeVulue} suffix="分钟" style={{ width: "300px" }} placeholder="请输入间隔的时间" />
                  ) : (
                    <Select
                      v-model:value={model.readeVulueList}
                      disabled={!model.readeType}
                      fieldNames={{ label: "name", value: "id" }}
                      style={{ width: "300px" }}
                      placeholder="请选择周期配置"
                      options={dateOptions}
                      mode="multiple"
                    />
                  )}
                </FormItem>
              ) : null}
              <FormItem label={model.readeType === "every_specified_min" ? "采集时间" : "抄表时间"} name="workTime">
                <TimePicker
                  disabled={model.readeType === "every_specified_min"}
                  value={workTimeValue.value}
                  onUpdate:value={(value) => {
                    workTimeValue.value = value as Dayjs | undefined;
                  }}
                  style={{ width: "300px" }}
                  format={format}
                />
              </FormItem>
            </Form>
          ),
          "footer-page": () => (
            <Button type="primary" loading={loading.value} onClick={save}>
              保存
            </Button>
          ),
        }}
      />
    );
  },
});
