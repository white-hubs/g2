import type { PatrolArea, PatrolDepartment, PatrolRow, PatrolUser } from "@g2-contract/electronic-patrol";
import type { FormInstance } from "@g2-platform/pc-ui";
import * as VueApi from "vue";
import { useRoute, useRouter } from "vue-router";

import * as PatrolContext from "../domain-context";
import * as PcUi from "../pc-ui-runtime";
import { PATROL_WAY_OPTIONS, areaText, errorMessage, text } from "../shared";

import styles from "../styles.module.less";

const {
  Button,
  Checkbox,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  PageLayout,
  RadioGroup,
  Select,
  TabPane,
  Table,
  Tabs,
  Tag,
  TimePicker,
  message,
  usePcForm,
  usePcTable,
} = PcUi;
const { computed, defineComponent, reactive, ref } = VueApi;

interface PatrolPeriod {
  key: number;
  startTime: string;
  endTime: string;
  intervalNumber: number;
  intervalUnit: number;
  executePeriod: string[];
  tip?: string;
}

interface Participant {
  participateType: string;
  targetId: string;
  targetName: string;
}

function objectList(value: unknown): PatrolRow[] {
  return Array.isArray(value) ? value.filter((item): item is PatrolRow => Boolean(item && typeof item === "object" && "id" in item)) : [];
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === "string") {
    return value.split(",").filter(Boolean);
  }
  return [];
}

function participantList(value: unknown): Participant[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const record = value as Record<string, unknown>;
  const list = record.participateList ?? record.participateParams;
  return Array.isArray(list)
    ? list.filter((item): item is Participant =>
        Boolean(item && typeof item === "object" && "targetId" in item && "participateType" in item),
      )
    : [];
}

function dateTimeInput(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  const raw = String(value);
  const date = /^\d{10,13}$/u.test(raw) ? new Date(Number(raw.length === 10 ? `${raw}000` : raw)) : new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  const part = (number: number): string => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())} ${part(date.getHours())}:${part(date.getMinutes())}:${part(date.getSeconds())}`;
}

export const PatrolPlanFormPage = defineComponent({
  name: "ElectronicPatrolPlanFormPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const id = typeof route.query.id === "string" ? route.query.id : "";
    const handle = typeof route.query.handle === "string" ? route.query.handle : "";
    const kind = route.query.type === "task" ? "task" : "plan";
    const readOnly = handle === "detiles";
    const title =
      kind === "task"
        ? "巡更任务"
        : handle === "edit"
          ? "编辑巡更计划"
          : handle === "copy"
            ? "复制巡更计划"
            : readOnly
              ? "巡更计划详情"
              : "新增巡更计划";
    const activeTab = ref("基础信息");
    const formRef = ref<FormInstance>();
    const saving = ref(false);
    const routeOptions = ref<PatrolRow[]>([]);
    const areaOptions = ref<PatrolArea[]>([]);
    const departmentOptions = ref<{ label: string; value: string }[]>([]);
    const attendanceEnabled = ref(false);
    const selectedPoints = ref<PatrolRow[]>([]);
    const selectedPointKeys = ref<string[]>([]);
    const pointPickerVisible = ref(false);
    const pointPickerRows = ref<PatrolRow[]>([]);
    const pointQuery = reactive<{ keyword: string; areaPath?: string[] }>({ keyword: "" });
    const pointPage = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const selectedUsers = ref<PatrolUser[]>([]);
    const selectedUserKeys = ref<string[]>([]);
    const userPickerVisible = ref(false);
    const userPickerRows = ref<PatrolUser[]>([]);
    const userQuery = reactive({ keyword: "" });
    const userPage = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const selectedDepartments = ref<string[]>([]);
    const participantMode = ref<"USER" | "CONDITION">("USER");
    let periodSequence = 2;
    const periods = ref<PatrolPeriod[]>([{ key: 1, startTime: "", endTime: "", intervalNumber: 1, intervalUnit: 10, executePeriod: [] }]);
    const model = reactive<Record<string, unknown>>({
      planName: "",
      taskName: "",
      status: "ENABLE",
      startData: "",
      endData: "",
      patrolCycle: "circulate",
      patrolDataType: "month",
      patrolData: [],
      patrolWayList: [],
      gpsDistanceMeters: undefined,
      gpsStayMinutes: undefined,
      routeId: "",
      inOrder: false,
      onDuty: false,
    });
    const hasGps = computed(() => Array.isArray(model.patrolWayList) && model.patrolWayList.map(String).includes("GPS"));
    const dayOptions = Array.from({ length: 31 }, (_, index) => ({ label: `${index + 1}号`, value: index + 1 }));
    const weekOptions = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((label, index) => ({ label, value: index + 1 }));

    const [PointTable, pointTableApi] = usePcTable({
      tableCode: "ELECTRONIC_PATROL_PLAN_POINT_PICKER",
      rowKey: "id",
      rowSelection: "checkbox",
      rowSelectionChange(keys) {
        selectedPointKeys.value = keys.map(String);
        const merged = new Map(selectedPoints.value.map((item) => [item.id, item]));
        for (const item of pointPickerRows.value) {
          merged.set(item.id, item);
        }
        selectedPoints.value = selectedPointKeys.value.map((key) => merged.get(key)).filter((item): item is PatrolRow => Boolean(item));
      },
      columns: [
        { title: "巡更点名称", dataIndex: "patrolLocationName", width: 220, ellipsis: true },
        { title: "所属区域", dataIndex: "area", width: 260, ellipsis: true, customRender: ({ text: value }) => areaText(value) },
      ],
      fetchApi: async () => {
        try {
          const result = await PatrolContext.getElectronicPatrolClient().pagePoints({
            pageNumber: pointPage.pageNumber,
            pageSize: pointPage.pageSize,
            keyword: pointQuery.keyword || undefined,
            areaId: pointQuery.areaPath?.join(","),
          });
          pointPickerRows.value = result.records;
          pointPage.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "巡更点加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    const [PointForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: pointQuery,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "巡更点名称",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入巡更点名称" },
        },
        {
          component: "Cascader",
          fieldName: "areaPath",
          label: "所属区域",
          componentProps: {
            allowClear: true,
            changeOnSelect: true,
            options: areaOptions,
            fieldNames: { label: "name", value: "id", children: "children" },
          },
        },
      ],
      handleSubmit(values) {
        pointQuery.keyword = String(values.keyword ?? "").trim();
        pointQuery.areaPath = Array.isArray(values.areaPath) ? values.areaPath.map(String) : undefined;
        pointPage.pageNumber = 1;
        pointTableApi.query();
      },
      handleReset() {
        pointQuery.keyword = "";
        pointQuery.areaPath = undefined;
        pointPage.pageNumber = 1;
        pointTableApi.query();
      },
    });
    const [UserTable, userTableApi] = usePcTable({
      tableCode: "ELECTRONIC_PATROL_PLAN_USER_PICKER",
      rowKey: "id",
      rowSelection: "checkbox",
      rowSelectionChange(keys) {
        selectedUserKeys.value = keys.map(String);
        const merged = new Map(selectedUsers.value.map((item) => [item.id, item]));
        for (const item of userPickerRows.value) {
          merged.set(item.id, item);
        }
        selectedUsers.value = selectedUserKeys.value.map((key) => merged.get(key)).filter((item): item is PatrolUser => Boolean(item));
      },
      columns: [
        { title: "人员姓名", dataIndex: "name", width: 180, ellipsis: true },
        { title: "账号", dataIndex: "username", width: 180, ellipsis: true },
        { title: "所属部门", dataIndex: "organizationName", width: 220, ellipsis: true },
      ],
      fetchApi: async () => {
        try {
          const result = await PatrolContext.getElectronicPatrolClient().pageUsers({
            pageNumber: userPage.pageNumber,
            pageSize: userPage.pageSize,
            keyword: userQuery.keyword || undefined,
          });
          userPickerRows.value = result.records;
          userPage.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "人员加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    const [UserForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: userQuery,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "人员",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入姓名/账号" },
        },
      ],
      handleSubmit(values) {
        userQuery.keyword = String(values.keyword ?? "").trim();
        userPage.pageNumber = 1;
        userTableApi.query();
      },
      handleReset() {
        userQuery.keyword = "";
        userPage.pageNumber = 1;
        userTableApi.query();
      },
    });

    const calculatePeriod = async (period: PatrolPeriod): Promise<void> => {
      if (!period.startTime || !period.endTime || !period.intervalNumber) {
        return;
      }
      try {
        const result = await PatrolContext.getElectronicPatrolClient().calculatePeriods({
          startStr: period.startTime,
          endStr: period.endTime,
          intervalHour: period.intervalNumber,
        });
        period.executePeriod = result.periodList ?? [];
        period.tip = result.tip;
      } catch (error) {
        message.error(errorMessage(error, "巡更时段计算失败"));
      }
    };
    const loadRoutes = async (): Promise<void> => {
      try {
        routeOptions.value = await PatrolContext.getElectronicPatrolClient().listRoutes();
      } catch (error) {
        message.error(errorMessage(error, "巡更路线加载失败"));
      }
    };
    const flattenDepartments = (items: PatrolDepartment[]): { label: string; value: string }[] =>
      items.flatMap((item) => [{ label: item.name, value: item.id }, ...flattenDepartments(item.children ?? [])]);
    void Promise.all([
      loadRoutes(),
      PatrolContext.getElectronicPatrolClient()
        .listAreas()
        .then((items) => {
          areaOptions.value = items;
        }),
      PatrolContext.getElectronicPatrolClient()
        .listDepartments()
        .then((items) => {
          departmentOptions.value = flattenDepartments(items);
        }),
      PatrolContext.getElectronicPatrolClient()
        .getAttendanceEnabled()
        .then((enabled) => {
          attendanceEnabled.value = enabled;
        }),
    ]).catch((error: unknown) => message.error(errorMessage(error, "基础数据加载失败")));

    const hydrate = (record: PatrolRow): void => {
      const points = objectList(record.locationList ?? record.locationIds);
      selectedPoints.value = points;
      selectedPointKeys.value = points.map((item) => item.id);
      Object.assign(model, {
        ...record,
        startData: dateTimeInput(record.startData),
        endData: dateTimeInput(record.endData),
        patrolData: stringList(record.patrolData).map(Number),
        patrolWayList: stringList(record.patrolWayList ?? record.patrolWay),
        gpsDistanceMeters: record.gpsDistanceMeters ?? "",
        gpsStayMinutes: record.gpsStayMinutes ?? "",
        routeId: record.routeId ?? "",
        inOrder: Boolean(record.inOrder),
        onDuty: Boolean(record.onDuty),
      });
      const tasks = Array.isArray(record.taskList) ? record.taskList : [];
      if (tasks.length > 0) {
        periods.value = tasks.map((item) => {
          const value = item as Record<string, unknown>;
          const range = typeof value.timeRange === "string" ? value.timeRange.split("-") : [];
          return {
            key: periodSequence++,
            startTime: String(value.startTime ?? range[0] ?? ""),
            endTime: String(value.endTime ?? range[1] ?? ""),
            intervalNumber: Number(value.intervalNumber ?? 1),
            intervalUnit: Number(value.intervalUnit ?? 10),
            executePeriod: stringList(value.executePeriod),
            tip: typeof value.tip === "string" ? value.tip : undefined,
          };
        });
      }
      const participants = participantList(record.conditionParticipate);
      participantMode.value =
        (record.conditionParticipate as Record<string, unknown> | undefined)?.conditionType === "CONDITION" ? "CONDITION" : "USER";
      selectedUsers.value = participants
        .filter((item) => item.participateType === "USER")
        .map((item) => ({ id: item.targetId, name: item.targetName }));
      selectedUserKeys.value = selectedUsers.value.map((item) => item.id);
      selectedDepartments.value = participants.filter((item) => item.participateType === "DEPT").map((item) => item.targetId);
      if (handle === "copy") {
        model.status = "ENABLE";
      }
    };
    if (id) {
      void PatrolContext.getElectronicPatrolClient()
        .getPlan(id)
        .then(hydrate)
        .catch((error: unknown) => message.error(errorMessage(error, "巡更计划加载失败")));
    }
    const selectRoute = (value: string): void => {
      const selected = routeOptions.value.find((item) => item.id === value);
      if (!selected) {
        return;
      }
      const points = objectList(selected.patrolLocation ?? selected.locationList);
      selectedPoints.value = points;
      selectedPointKeys.value = points.map((item) => item.id);
      pointTableApi.setSelectedRowKeys(selectedPointKeys.value);
    };
    const removePoint = (pointId: string): void => {
      selectedPoints.value = selectedPoints.value.filter((item) => item.id !== pointId);
      selectedPointKeys.value = selectedPointKeys.value.filter((key) => key !== pointId);
      pointTableApi.setSelectedRowKeys(selectedPointKeys.value);
    };
    const buildParticipants = (): Participant[] =>
      participantMode.value === "USER"
        ? selectedUsers.value.map((user) => ({ participateType: "USER", targetId: user.id, targetName: user.name }))
        : selectedDepartments.value.map((departmentId) => ({
            participateType: "DEPT",
            targetId: departmentId,
            targetName: departmentOptions.value.find((item) => item.value === departmentId)?.label ?? departmentId,
          }));
    const save = async (): Promise<void> => {
      try {
        await formRef.value?.validateFields();
        if (periods.value.some((period) => !period.startTime || !period.endTime || period.executePeriod.length === 0)) {
          message.warning("请完善巡更时间并生成巡更时段");
          activeTab.value = "基础信息";
          return;
        }
        if (selectedPoints.value.length === 0) {
          message.warning("请选择巡更点");
          activeTab.value = "巡更路线";
          return;
        }
        if (buildParticipants().length === 0) {
          message.warning("请选择巡更人员或部门");
          activeTab.value = "巡更人员";
          return;
        }
        if (hasGps.value && (!model.gpsDistanceMeters || !model.gpsStayMinutes)) {
          message.warning("请填写 GPS 巡更规则");
          activeTab.value = "基础信息";
          return;
        }
        saving.value = true;
        const body: Record<string, unknown> = {
          ...model,
          id: kind === "plan" && handle === "edit" ? id : undefined,
          patrolData: Array.isArray(model.patrolData) ? model.patrolData.join(",") : model.patrolData,
          locationIds: selectedPoints.value.map((item) => ({ id: item.id })),
          taskList: periods.value.map((period) => ({
            startTime: period.startTime,
            endTime: period.endTime,
            timeRange: `${period.startTime}-${period.endTime}`,
            intervalNumber: period.intervalNumber,
            intervalUnit: period.intervalUnit,
            executePeriod: period.executePeriod,
          })),
          routeId: model.routeId,
          inOrder: Boolean(model.inOrder),
          onDuty: Boolean(model.onDuty),
          patrolWayList: Array.isArray(model.patrolWayList) ? model.patrolWayList.map(String) : [],
          conditionParticipate: { conditionType: participantMode.value, participateList: buildParticipants(), abnormalUserList: [] },
        };
        if (!hasGps.value) {
          delete body.gpsDistanceMeters;
          delete body.gpsStayMinutes;
        }
        if (kind === "plan") {
          if (handle === "edit") {
            await PatrolContext.getElectronicPatrolClient().updatePlan(body);
          } else {
            await PatrolContext.getElectronicPatrolClient().createPlan(body);
          }
        } else {
          delete body.planName;
          delete body.status;
          delete body.startData;
          delete body.endData;
          delete body.patrolCycle;
          delete body.patrolData;
          delete body.patrolDataType;
          await PatrolContext.getElectronicPatrolClient().createTask(body);
        }
        message.success(handle === "edit" ? "修改成功" : handle === "copy" ? "复制成功" : "保存成功");
        router.back();
      } catch (error) {
        if (error instanceof Error) {
          message.error(errorMessage(error, "保存失败"));
        }
      } finally {
        saving.value = false;
      }
    };

    const basicPanel = () => (
      <div class={styles.formCard}>
        <Form ref={formRef} model={model} disabled={readOnly} labelCol={{ style: { width: "130px" } }}>
          <div class={styles.formGrid}>
            {kind === "plan" ? (
              <>
                <FormItem label="计划名称" name="planName" rules={[{ required: true, message: "请输入计划名称" }]}>
                  <Input v-model:value={model.planName} maxlength={20} placeholder="请输入计划名称" />
                </FormItem>
                <FormItem label="计划状态" name="status" rules={[{ required: true, message: "请选择计划状态" }]}>
                  <Select
                    v-model:value={model.status}
                    options={[
                      { label: "启用", value: "ENABLE" },
                      { label: "停用", value: "STOP" },
                      { label: "结束", value: "END" },
                    ]}
                  />
                </FormItem>
                <FormItem label="计划生效时间" name="startData" rules={[{ required: true, message: "请选择计划生效时间" }]}>
                  <DatePicker v-model:value={model.startData} valueFormat="YYYY-MM-DD HH:mm:ss" showTime style={{ width: "100%" }} />
                </FormItem>
                <FormItem label="计划失效时间" name="endData" rules={[{ required: true, message: "请选择计划失效时间" }]}>
                  <DatePicker v-model:value={model.endData} valueFormat="YYYY-MM-DD HH:mm:ss" showTime style={{ width: "100%" }} />
                </FormItem>
                <FormItem label="巡更周期" name="patrolCycle" rules={[{ required: true, message: "请选择巡更周期" }]}>
                  <Select
                    v-model:value={model.patrolCycle}
                    options={[
                      { label: "循环", value: "circulate" },
                      { label: "单次", value: "one" },
                    ]}
                  />
                </FormItem>
                <FormItem label="巡更日期">
                  <div class={styles.actionSpace}>
                    {model.patrolDataType !== "day" ? (
                      <Select
                        v-model:value={model.patrolData}
                        mode="multiple"
                        options={model.patrolDataType === "month" ? dayOptions : weekOptions}
                        style={{ minWidth: "230px" }}
                      />
                    ) : (
                      <span>每天</span>
                    )}
                    <Select
                      v-model:value={model.patrolDataType}
                      options={[
                        { label: "按月", value: "month" },
                        { label: "按周", value: "week" },
                        { label: "按天", value: "day" },
                      ]}
                      style={{ width: "100px" }}
                    />
                  </div>
                </FormItem>
              </>
            ) : (
              <FormItem label="任务名称" name="taskName" rules={[{ required: true, message: "请输入任务名称" }]}>
                <Input v-model:value={model.taskName} maxlength={20} placeholder="请输入任务名称" />
              </FormItem>
            )}
            <FormItem label="巡更方式" name="patrolWayList" rules={[{ required: true, message: "请选择巡更方式" }]}>
              <Select v-model:value={model.patrolWayList} mode="multiple" options={PATROL_WAY_OPTIONS} placeholder="请选择巡更方式" />
            </FormItem>
            {hasGps.value ? (
              <FormItem label="GPS巡更规则" class={styles.fullRow}>
                <div class={styles.actionSpace}>
                  <span>距离小于</span>
                  <InputNumber v-model:value={model.gpsDistanceMeters} min={1} precision={0} addonAfter="米" />
                  <span>且停留时长大于</span>
                  <InputNumber v-model:value={model.gpsStayMinutes} min={1} precision={0} addonAfter="分钟" />
                  <Tag color="orange">需开启手机定位功能</Tag>
                </div>
              </FormItem>
            ) : null}
          </div>
          <div class={styles.detailSectionTitle}>巡更执行时间</div>
          {periods.value.map((period, index) => (
            <div class={styles.messageCard} key={period.key}>
              <div class={styles.messageRow}>
                <strong>{kind === "plan" ? `巡更任务 ${index + 1}` : "巡更任务"}</strong>
                <TimePicker
                  v-model:value={period.startTime}
                  valueFormat="HH:mm"
                  format="HH:mm"
                  placeholder="开始时间"
                  onChange={() => void calculatePeriod(period)}
                />
                <span>至</span>
                <TimePicker
                  v-model:value={period.endTime}
                  valueFormat="HH:mm"
                  format="HH:mm"
                  placeholder="结束时间"
                  onChange={() => void calculatePeriod(period)}
                />
                <span>每隔</span>
                <InputNumber
                  v-model:value={period.intervalNumber}
                  min={1}
                  max={24}
                  precision={0}
                  addonAfter="小时"
                  onChange={() => void calculatePeriod(period)}
                />
                {kind === "plan" && !readOnly ? (
                  index === 0 ? (
                    <Button
                      type="link"
                      onClick={() =>
                        periods.value.push({
                          key: periodSequence++,
                          startTime: "",
                          endTime: "",
                          intervalNumber: 1,
                          intervalUnit: 10,
                          executePeriod: [],
                        })
                      }
                    >
                      添加任务
                    </Button>
                  ) : (
                    <Button type="link" danger onClick={() => periods.value.splice(index, 1)}>
                      删除
                    </Button>
                  )
                ) : null}
              </div>
              <div class={styles.messageRow}>
                <span>巡更时段：</span>
                {period.executePeriod.length > 0 ? (
                  period.executePeriod.map((value) => (
                    <Tag
                      key={value}
                      color="green"
                      closable={!readOnly}
                      onClose={() => (period.executePeriod = period.executePeriod.filter((item) => item !== value))}
                    >
                      {value}
                    </Tag>
                  ))
                ) : (
                  <span class={styles.muted}>请选择时间并设置间隔</span>
                )}
              </div>
              {period.tip ? <div class={styles.danger}>{period.tip}</div> : null}
            </div>
          ))}
        </Form>
      </div>
    );
    const routePanel = () => (
      <div class={styles.tablePage}>
        <div class={styles.formCard}>
          <Form model={model} disabled={readOnly} labelCol={{ style: { width: "130px" } }}>
            <FormItem label="巡更路线" required>
              <Select
                v-model:value={model.routeId}
                showSearch
                options={routeOptions.value.map((item) => ({ label: text(item.patrolRouteName), value: item.id }))}
                onChange={(value: unknown) => selectRoute(String(value ?? ""))}
                placeholder="请选择巡更路线"
              />
            </FormItem>
            <FormItem label="是否按顺序巡更">
              <Checkbox v-model:checked={model.inOrder} />
            </FormItem>
            {!readOnly ? (
              <FormItem label="巡更点">
                <Button
                  type="primary"
                  onClick={() => {
                    pointPickerVisible.value = true;
                    pointTableApi.setSelectedRowKeys(selectedPointKeys.value);
                    pointTableApi.query();
                  }}
                >
                  添加巡更点
                </Button>
              </FormItem>
            ) : null}
          </Form>
        </div>
        <Table
          rowKey="id"
          pagination={false}
          dataSource={selectedPoints.value}
          columns={[
            { title: "序号", width: 70, customRender: ({ index }: { index: number }) => index + 1 },
            { title: "巡更点", dataIndex: "patrolLocationName", ellipsis: true },
            { title: "所属区域", dataIndex: "area", customRender: ({ text: value }: { text: unknown }) => areaText(value) },
            ...(!readOnly
              ? [
                  {
                    title: "操作",
                    width: 100,
                    customRender: ({ record }: { record: PatrolRow }) => (
                      <Button type="link" danger onClick={() => removePoint(record.id)}>
                        删除
                      </Button>
                    ),
                  },
                ]
              : []),
          ]}
        />
        <Modal
          open={pointPickerVisible.value}
          title="添加巡更点"
          width={900}
          onOk={() => (pointPickerVisible.value = false)}
          onCancel={() => (pointPickerVisible.value = false)}
        >
          <PointForm />
          <PointTable />
        </Modal>
      </div>
    );
    const personnelPanel = () => (
      <div class={styles.tablePage}>
        <div class={styles.formCard}>
          <Form disabled={readOnly} labelCol={{ style: { width: "170px" } }}>
            {attendanceEnabled.value ? (
              <FormItem label="是否只指派给当班人员">
                <Checkbox v-model:checked={model.onDuty} />
              </FormItem>
            ) : null}
            <FormItem label="指派方式">
              <RadioGroup
                v-model:value={participantMode.value}
                options={[
                  { label: "指定人员", value: "USER" },
                  { label: "指定部门", value: "CONDITION" },
                ]}
              />
            </FormItem>
            {participantMode.value === "USER" ? (
              <FormItem label="巡更人员">
                <Button
                  type="primary"
                  onClick={() => {
                    userPickerVisible.value = true;
                    userTableApi.setSelectedRowKeys(selectedUserKeys.value);
                    userTableApi.query();
                  }}
                >
                  选择人员
                </Button>
              </FormItem>
            ) : (
              <FormItem label="巡更部门">
                <Select
                  v-model:value={selectedDepartments.value}
                  mode="multiple"
                  showSearch
                  options={departmentOptions.value}
                  placeholder="请选择部门"
                />
              </FormItem>
            )}
          </Form>
        </div>
        {participantMode.value === "USER" ? (
          <Table
            rowKey="id"
            pagination={false}
            dataSource={selectedUsers.value}
            columns={[
              { title: "人员姓名", dataIndex: "name" },
              { title: "账号", dataIndex: "username", customRender: ({ text: value }: { text: unknown }) => text(value) },
              { title: "所属部门", dataIndex: "organizationName", customRender: ({ text: value }: { text: unknown }) => text(value) },
              ...(!readOnly
                ? [
                    {
                      title: "操作",
                      width: 100,
                      customRender: ({ record }: { record: PatrolUser }) => (
                        <Button
                          type="link"
                          danger
                          onClick={() => {
                            selectedUsers.value = selectedUsers.value.filter((item) => item.id !== record.id);
                            selectedUserKeys.value = selectedUserKeys.value.filter((key) => key !== record.id);
                            userTableApi.setSelectedRowKeys(selectedUserKeys.value);
                          }}
                        >
                          删除
                        </Button>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        ) : null}
        <Modal
          open={userPickerVisible.value}
          title="选择巡更人员"
          width={850}
          onOk={() => (userPickerVisible.value = false)}
          onCancel={() => (userPickerVisible.value = false)}
        >
          <UserForm />
          <UserTable />
        </Modal>
      </div>
    );

    return () => (
      <PageLayout
        title={title}
        v-slots={{
          "layout-content": () => (
            <Tabs activeKey={activeTab.value} onChange={(value: string | number) => (activeTab.value = String(value))}>
              <TabPane key="基础信息" tab="基础信息">
                {basicPanel()}
              </TabPane>
              <TabPane key="巡更路线" tab="巡更路线">
                {routePanel()}
              </TabPane>
              <TabPane key="巡更人员" tab="巡更人员">
                {personnelPanel()}
              </TabPane>
            </Tabs>
          ),
          "footer-page": () => (
            <div class={styles.footerActions}>
              <Button onClick={() => router.back()}>返回</Button>
              {!readOnly ? (
                <Button type="primary" loading={saving.value} onClick={() => void save()}>
                  {handle === "copy" ? "复制" : "保存"}
                </Button>
              ) : null}
            </div>
          ),
        }}
      />
    );
  },
});
