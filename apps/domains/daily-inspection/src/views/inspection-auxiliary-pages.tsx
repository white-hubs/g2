import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { Button, Cascader, Page, PageLayout, Table, Tag, message, usePcForm, type Dayjs, type ColumnType } from "@g2-platform/pc-ui";
import { Alert, CheckboxGroup, Form, FormItem, TabPane, Tabs } from "ant-design-vue";
import { defineComponent, onMounted, reactive, ref, type Component } from "vue";

import dayjs from "@/compat/dayjs";
import { getDailyInspectionClient, getMdataClient, getOuaaClient } from "@/domain-context";

type StatisticKind = "result" | "department" | "personnel" | "target";
interface StatisticTreeOption {
  label: string;
  value: string;
  children?: StatisticTreeOption[];
}

const statisticSpecs: Record<StatisticKind, { title: string; endpoint: string; columns: Array<[string, string]> }> = {
  result: {
    title: "巡检结果统计",
    endpoint: "/statistic-analysis/resultStatistics",
    columns: [
      ["巡检任务", "name"],
      ["巡检对象数", "targetNum"],
      ["巡检类型", "typeName"],
      ["巡检人员", "inspectionStaff"],
      ["稽查人员", "checkStaff"],
      ["巡检结果", "checkResult"],
      ["稽查结果匹配率", "checkMatchRatio"],
      ["稽查不匹配数", "checkNotMatchNum"],
      ["异常隐患数", "hiddenDangerNum"],
      ["巡检报修数", "faultNum"],
      ["巡检耗时", "elapsedTime"],
    ],
  },
  department: {
    title: "部门巡检统计",
    endpoint: "/statistic-analysis/departmentStatistics",
    columns: [
      ["所属部门", "depName"],
      ["覆盖对象数", "coverObjNum"],
      ["对象覆盖率", "coverObjRatio"],
      ["参与巡检人数", "personNum"],
      ["任务总数", "taskTotalNum"],
      ["完成任务数", "completeTaskNum"],
      ["过期未执行任务数", "expireTaskNum"],
      ["任务完成率", "taskCompleteRatio"],
      ["巡检次数", "inspectionNum"],
      ["巡检时间", "inspectionElapsedTimeStr"],
      ["稽查平均匹配率", "checkMatchRatio"],
      ["发现隐患数", "abnormalHiddenDangerNum"],
      ["已处理隐患数", "haveDoneHiddenDangerNum"],
      ["隐患处理率", "hiddenDangerDisposeRatio"],
    ],
  },
  personnel: {
    title: "人员巡检统计",
    endpoint: "/statistic-analysis/staffStatistics",
    columns: [
      ["人员姓名", "staffName"],
      ["所属部门", "depName"],
      ["部门任务总数", "depTaskNum"],
      ["个人任务总数", "personageTaskNum"],
      ["完成任务数", "completeTaskNum"],
      ["过期未执行任务数", "expireTaskNum"],
      ["任务占比", "taskProportion"],
      ["任务完成率", "taskCompleteRatio"],
      ["稽查平均匹配率", "checkMatchingRatio"],
      ["部门巡检次数", "depInspectionNum"],
      ["个人巡检次数", "personageInspectionNum"],
      ["次数占比", "personageNumRatio"],
      ["巡检耗时", "inspectionElapsedTimeStr"],
      ["发现隐患数", "abnormalHiddenDangerNum"],
      ["已处理隐患数", "haveDoneHiddenDangerNum"],
      ["隐患处理率", "hiddenDangerDisposeRatio"],
    ],
  },
  target: {
    title: "巡检对象统计",
    endpoint: "/statistic-analysis/objStatistics",
    columns: [
      ["对象名称", "objName"],
      ["对象类型", "objType"],
      ["所在区域", "area"],
      ["巡检次数", "inspectionNum"],
      ["巡检任务数", "taskNum"],
      ["发现隐患数", "abnormalHiddenDangerNum"],
      ["已处理隐患数", "processedHiddenDangerNum"],
      ["未处理隐患数", "untreatedHiddenDangerNum"],
      ["隐患处理率", "hiddenDangerDisposeRatio"],
      ["报修次数", "repairsNum"],
      ["巡检平均耗时", "inspectionAveTime"],
    ],
  },
};

function recordsOf(value: unknown): { records: InspectionRecord[]; total: number } {
  if (Array.isArray(value)) return { records: value as InspectionRecord[], total: value.length };
  const root = value && typeof value === "object" ? (value as InspectionRecord) : {};
  const records = Array.isArray(root.records) ? (root.records as InspectionRecord[]) : [];
  return { records, total: Number(root.total ?? records.length) };
}

function monthPeriodStrings(): [string, string] {
  return [dayjs().startOf("month").format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD")];
}

function listOf(value: unknown): InspectionRecord[] {
  if (Array.isArray(value)) return value as InspectionRecord[];
  if (!value || typeof value !== "object") return [];
  const root = value as InspectionRecord;
  const nested = root.data && typeof root.data === "object" ? (root.data as InspectionRecord) : root;
  const records = nested.records ?? nested.list ?? nested.children ?? nested.data;
  return Array.isArray(records) ? (records as InspectionRecord[]) : [];
}

function treeOptions(value: unknown): StatisticTreeOption[] {
  return listOf(value).map((item) => {
    const children = Array.isArray(item.children) ? treeOptions(item.children) : undefined;
    return {
      label: String(item.name ?? item.label ?? "--"),
      value: String(item.id ?? item.value ?? ""),
      children: children?.length ? children : undefined,
    };
  });
}

function periodParam(period: unknown): string {
  if (Array.isArray(period) && period.length >= 2) {
    return period
      .slice(0, 2)
      .map((item) => (typeof item === "string" ? item : dayjs(item as Dayjs).format("YYYY-MM-DD")))
      .join(",");
  }
  if (typeof period === "string" && period.includes(",")) return period;
  return monthPeriodStrings().join(",");
}

function createStatisticPage(kind: StatisticKind): Component {
  const spec = statisticSpecs[kind];
  return defineComponent({
    name: `Inspection${kind}Statistics`,
    setup() {
      const loading = ref(false);
      const rows = ref<InspectionRecord[]>([]);
      const typeOptions = ref<Array<{ label: string; value: string }>>([]);
      const departments = ref<Array<{ label: string; value: string }>>([]);
      const areas = ref<StatisticTreeOption[]>([]);
      const query = reactive({
        keyword: "",
        typeId: undefined as string | undefined,
        period: monthPeriodStrings() as [string, string],
        department: undefined as string | undefined,
        objectType: undefined as string | undefined,
        area: [] as string[],
        pageNumber: 1,
        pageSize: 10,
        total: 0,
      });

      const columns: ColumnType[] = spec.columns.map(([title, dataIndex]) => ({
        title,
        dataIndex,
        key: dataIndex,
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: unknown }) =>
          dataIndex === "checkResult" ? (
            <Tag color={text === "正常" ? "success" : "error"}>{String(text ?? "--")}</Tag>
          ) : (
            String(text ?? "--")
          ),
      }));

      const applyFilterValues = (values: Record<string, unknown>): void => {
        query.keyword = String(values.keyword ?? "").trim();
        query.typeId = values.typeId == null || values.typeId === "" ? undefined : String(values.typeId);
        query.department = values.department == null || values.department === "" ? undefined : String(values.department);
        query.objectType = values.objectType == null || values.objectType === "" ? undefined : String(values.objectType);
        query.area = Array.isArray(values.area) ? values.area.map(String) : [];
        const period = values.period;
        if (Array.isArray(period) && period.length >= 2) {
          query.period = [
            typeof period[0] === "string" ? period[0] : dayjs(period[0] as Dayjs).format("YYYY-MM-DD"),
            typeof period[1] === "string" ? period[1] : dayjs(period[1] as Dayjs).format("YYYY-MM-DD"),
          ];
        } else {
          query.period = monthPeriodStrings();
        }
        query.pageNumber = 1;
      };

      const load = async (): Promise<void> => {
        loading.value = true;
        try {
          const value = await getDailyInspectionClient().request("GET", spec.endpoint, {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            period: periodParam(query.period),
            ...(kind === "result" ? { typeId: query.typeId ?? "", taskName: query.keyword } : {}),
            ...(kind === "department" ? { depName: query.keyword } : {}),
            ...(kind === "personnel" ? { depName: query.department ?? "", name: query.keyword } : {}),
            ...(kind === "target" ? { objType: query.objectType ?? "", area: query.area.at(-1) ?? "", name: query.keyword } : {}),
          });
          const page = recordsOf(value);
          rows.value = page.records;
          query.total = page.total;
        } catch {
          rows.value = [];
          query.total = 0;
          message.error(`${spec.title}加载失败`);
        } finally {
          loading.value = false;
        }
      };

      const buildSchema = () => {
        const schema: Array<{
          component: string | Component;
          fieldName: string;
          label: string;
          defaultValue?: unknown;
          componentProps?: Record<string, unknown>;
        }> = [];
        if (kind === "result") {
          schema.push({
            component: "Select",
            fieldName: "typeId",
            label: "巡检类型",
            componentProps: {
              allowClear: true,
              placeholder: "请选择巡检类型",
              options: typeOptions.value,
            },
          });
        }
        if (kind === "personnel") {
          schema.push({
            component: "Select",
            fieldName: "department",
            label: "巡检部门",
            componentProps: {
              allowClear: true,
              placeholder: "请选择巡检部门",
              options: departments.value,
            },
          });
        }
        if (kind === "target") {
          schema.push(
            {
              component: "Select",
              fieldName: "objectType",
              label: "对象类型",
              componentProps: {
                allowClear: true,
                placeholder: "请选择对象类型",
                options: [
                  { label: "设备", value: "DEVICE" },
                  { label: "档位", value: "STALL" },
                  { label: "资产", value: "PROPERTY" },
                  { label: "现场点", value: "SITE_POINT" },
                  { label: "风险源", value: "RISK_SOURCE" },
                ],
              },
            },
            {
              component: Cascader,
              fieldName: "area",
              label: "巡检区域",
              componentProps: {
                allowClear: true,
                placeholder: "请选择巡检区域",
                options: areas.value,
              },
            },
          );
        }
        schema.push(
          {
            component: "RangePicker",
            fieldName: "period",
            label: kind === "result" ? "发布时间" : "巡检时间",
            defaultValue: monthPeriodStrings(),
            componentProps: {
              allowClear: false,
              valueFormat: "YYYY-MM-DD",
            },
          },
          {
            component: "Input",
            fieldName: "keyword",
            label: "",
            componentProps: {
              allowClear: true,
              placeholder: kind === "result" ? "巡检任务" : kind === "department" ? "部门名称" : "人员姓名、部门名称",
            },
          },
        );
        return schema;
      };

      const [PcForm, formApi] = usePcForm({
        cache: false,
        layout: "horizontal",
        showCollapseButton: false,
        schema: buildSchema(),
        handleSubmit(values) {
          applyFilterValues(values);
          void load();
        },
        handleReset() {
          query.keyword = "";
          query.typeId = undefined;
          query.period = monthPeriodStrings();
          query.department = undefined;
          query.objectType = undefined;
          query.area = [];
          query.pageNumber = 1;
          void load();
        },
      });

      onMounted(async () => {
        if (kind === "result") {
          try {
            const types = await getDailyInspectionClient().listTypes();
            typeOptions.value = types.map((item) => ({
              label: String(item.name ?? "--"),
              value: String(item.id ?? ""),
            }));
            formApi.updateFieldSchema({
              component: "Select",
              fieldName: "typeId",
              label: "巡检类型",
              componentProps: {
                allowClear: true,
                placeholder: "请选择巡检类型",
                options: typeOptions.value,
              },
            });
          } catch {
            typeOptions.value = [];
          }
        }
        if (kind === "personnel") {
          try {
            const tree = await (await getOuaaClient()).getOrganizationTree();
            const flatten = (nodes: InspectionRecord[]): void => {
              for (const item of nodes) {
                departments.value.push({ label: String(item.name ?? "--"), value: String(item.name ?? "") });
                if (Array.isArray(item.children)) flatten(item.children as InspectionRecord[]);
              }
            };
            flatten(listOf(tree));
            formApi.updateFieldSchema({
              component: "Select",
              fieldName: "department",
              label: "巡检部门",
              componentProps: {
                allowClear: true,
                placeholder: "请选择巡检部门",
                options: departments.value,
              },
            });
          } catch {
            departments.value = [];
          }
        }
        if (kind === "target") {
          try {
            areas.value = treeOptions(await (await getMdataClient()).getAreaTree());
            formApi.updateFieldSchema({
              component: Cascader,
              fieldName: "area",
              label: "巡检区域",
              componentProps: {
                allowClear: true,
                placeholder: "请选择巡检区域",
                options: areas.value,
              },
            });
          } catch {
            areas.value = [];
          }
        }
        await load();
      });

      return () => (
        <PageLayout
          title={spec.title}
          v-slots={{
            "layout-header": () => <Button type="primary">导出</Button>,
            "layout-content": () => (
              <div class="daily-inspection-page inspection-aux-page">
                <PcForm />
                <Table
                  rowKey={(row) => String(row.id ?? JSON.stringify(row))}
                  columns={columns}
                  dataSource={rows.value}
                  loading={loading.value}
                  pagination={false}
                  scroll={{ x: kind === "department" || kind === "personnel" ? 1900 : 1400 }}
                />
              </div>
            ),
            "footer-page": () => (
              <Page
                current={query.pageNumber}
                pageSize={query.pageSize}
                total={query.total}
                onPageChange={(page: number, size: number) => {
                  query.pageNumber = page;
                  query.pageSize = size;
                  void load();
                }}
              />
            ),
          }}
        />
      );
    },
  });
}

export const InspectionResultStatistics = createStatisticPage("result");
export const InspectionDepartmentStatistics = createStatisticPage("department");
export const InspectionPersonnelStatistics = createStatisticPage("personnel");
export const InspectionTargetStatistics = createStatisticPage("target");

export const InspectionSubmitSetting = defineComponent({
  name: "InspectionSubmitSetting",
  setup() {
    const uploadMethod = ref<string[]>(["camera", "album"]);
    const watermark = ref<string[]>(["location", "timestamp"]);
    return () => (
      <PageLayout
        title="巡检提交设置"
        v-slots={{
          "layout-content": () => (
            <div class="daily-inspection-page inspection-setting-page">
              <Tabs type="card">
                <TabPane key="picture" tab="巡检图片">
                  <Alert message="用于对巡检结果的图片进行配置，以约束用户的巡检行为" type="info" showIcon />
                  <Form labelCol={{ style: { width: "130px" } }}>
                    <FormItem label="图片上传方式">
                      <CheckboxGroup
                        v-model:value={uploadMethod.value}
                        options={[
                          { label: "拍照", value: "camera" },
                          { label: "相册", value: "album" },
                        ]}
                      />
                    </FormItem>
                    <FormItem label="图片水印添加">
                      <CheckboxGroup
                        v-model:value={watermark.value}
                        options={[
                          { label: "上传地点", value: "location" },
                          { label: "上传时间", value: "timestamp" },
                        ]}
                      />
                    </FormItem>
                  </Form>
                </TabPane>
              </Tabs>
            </div>
          ),
          "footer-page": () => (
            <Button type="primary" onClick={() => message.success("保存成功")}>
              保存
            </Button>
          ),
        }}
      />
    );
  },
});

export const InspectionMessageConfig = defineComponent({
  name: "InspectionMessageConfig",
  setup() {
    const active = ref("TASK_LAPSE");
    return () => (
      <PageLayout
        title="巡检通知"
        v-slots={{
          "layout-content": () => (
            <div class="daily-inspection-page inspection-setting-page">
              <Tabs v-model:activeKey={active.value} type="card">
                <TabPane key="TASK_LAPSE" tab="任务即将失效">
                  <Alert message="配置任务即将失效时的通知对象与通知方式" type="info" showIcon />
                </TabPane>
                <TabPane key="TASK_LAPSE_UNFINISHED" tab="任务失效未完成">
                  <Alert message="配置任务失效未完成时的通知" type="info" showIcon />
                </TabPane>
                <TabPane key="TASK_RECORD_ERROR" tab="任务异常">
                  <Alert message="配置巡检任务发现异常时的通知" type="info" showIcon />
                </TabPane>
              </Tabs>
            </div>
          ),
          "footer-page": () => <Button type="primary">保存</Button>,
        }}
      />
    );
  },
});

export { InspectionAnalysis } from "./statistical-analysis/inspection-analyse";
