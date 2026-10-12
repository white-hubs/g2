import type { OutsourceManagerConfig, OutsourceTrafficConfig } from "@g2-client/outsource-repair/client";
import { Button, DeleteOutlined, Form, FormItem, InputNumber, PageLayout, Select, Space, Spin, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getOuaaClient, getOutsourceRepairClient } from "@/domain-context";
import { toNullableNumber, toText, toTextArray } from "@/utils/form-value";
import { asArray, asPageResult } from "@/utils/response";

import styles from "./traffic.module.css";

/** 旧页管理人员类型枚举，顺序与 `traffic.vue` 的 options 一致。 */
const MANAGER_TYPES = [
  { value: "MANAGEMENT", label: "管理人员" },
  { value: "DEPARTMENT", label: "指定部门" },
  { value: "POST", label: "指定岗位职责" },
  { value: "PERSONNAL", label: "指定人员" },
];

/** 仅 MANAGEMENT 不需要再选具体取值。 */
const NEEDS_VALUES = (type: string): boolean => Boolean(type) && type !== "MANAGEMENT";

/** Select 只接受字符串/数字值，这里用 "0"/"1" 承载旧页的布尔开关。 */
const SWITCH_OPTIONS = [
  { value: "0", label: "不启用" },
  { value: "1", label: "启用" },
];

const VALUE_PLACEHOLDER: Record<string, string> = {
  DEPARTMENT: "请选择部门",
  POST: "请选择岗位",
  PERSONNAL: "请选择人员",
};

/** 旧页人员多选上限。 */
const MAX_VALUE_COUNT = 9;

const USER_PAGE_SIZE = 100;

interface SelectOption {
  label: string;
  value: string;
}

interface NamedRow {
  id?: string | number;
  name?: string;
}

const toOptions = (rows: NamedRow[]): SelectOption[] =>
  rows.map((row) => ({ label: String(row.name ?? ""), value: String(row.id ?? "") })).filter((item) => item.value !== "");

const filterOption = (input: string, option?: { label?: unknown }): boolean => String(option?.label ?? "").includes(input);

export const OutsourceTrafficConfigPage = defineComponent({
  name: "OutsourceTrafficConfigPage",
  setup() {
    const client = getOutsourceRepairClient();
    const loading = ref(false);
    const saving = ref(false);
    const model = reactive<OutsourceTrafficConfig>({
      id: "",
      channelTypes: [],
      configs: [],
      deDuplicationConfig: { switchSetting: false, duration: null, deDuplicationPeriod: null },
    });
    const channelOptions = ref<SelectOption[]>([]);
    const valueOptions = ref<Record<string, SelectOption[]>>({ DEPARTMENT: [], POST: [], PERSONNAL: [] });

    const loadChannels = async (): Promise<void> => {
      try {
        const rows = await client.listNotifyChannels();
        // 旧页字段映射 `{ nodeModelName: label, notModel: value }`。
        channelOptions.value = rows
          .map((row) => ({ label: String(row.nodeModelName ?? ""), value: String(row.notModel ?? "") }))
          .filter((item) => item.value !== "");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "通知方式加载失败");
      }
    };

    /** 企业员工一次分页查不完，按总页数补齐后合并，与旧 `tenantUsers` 一致。 */
    const loadAllTenantUsers = async (): Promise<SelectOption[]> => {
      const ouaa = await getOuaaClient();
      const first = asPageResult<NamedRow>(await ouaa.listTenantUsers({ pageNumber: 1, pageSize: USER_PAGE_SIZE, enabled: true }));
      const rest = await Promise.all(
        Array.from({ length: Math.max(first.pages - 1, 0) }, async (_unused, index) =>
          ouaa.listTenantUsers({ pageNumber: index + 2, pageSize: USER_PAGE_SIZE, enabled: true }),
        ),
      );
      return toOptions([...first.records, ...rest.flatMap((response) => asPageResult<NamedRow>(response).records)]);
    };

    const loadValueOptions = async (): Promise<void> => {
      try {
        const ouaa = await getOuaaClient();
        const [departments, positions, users] = await Promise.all([
          ouaa.listFlowDepartmentOptions({ pageNumber: 1, pageSize: 1000, enabled: true }),
          ouaa.listPositions({ pageNumber: 1, pageSize: 1000, enabled: true }),
          loadAllTenantUsers(),
        ]);
        valueOptions.value = {
          DEPARTMENT: toOptions(asArray<NamedRow>(departments)),
          POST: toOptions(asArray<NamedRow>(positions)),
          PERSONNAL: users,
        };
      } catch (error) {
        message.error(error instanceof Error ? error.message : "管理人员选项加载失败");
      }
    };

    const loadConfig = async (): Promise<void> => {
      loading.value = true;
      try {
        const config = await client.getTrafficConfig();
        model.id = config?.id ?? "";
        model.channelTypes = Array.isArray(config?.channelTypes) ? config.channelTypes.map(String) : [];
        model.configs = Array.isArray(config?.configs)
          ? config.configs.map((item) => ({ mgmtType: String(item.mgmtType ?? ""), mgmtValues: toTextArray(item.mgmtValues) }))
          : [];
        // 旧接口可能不返回去重配置，缺省按「不启用」。
        model.deDuplicationConfig = {
          switchSetting: config?.deDuplicationConfig?.switchSetting ?? false,
          duration: config?.deDuplicationConfig?.duration ?? null,
          deDuplicationPeriod: config?.deDuplicationConfig?.deDuplicationPeriod ?? null,
        };
      } catch (error) {
        message.error(error instanceof Error ? error.message : "业务配置加载失败");
      } finally {
        loading.value = false;
      }
    };

    /** 同一类型只能配置一次，已选类型在其余行禁用。 */
    const typeOptionsFor = (index: number): { value: string; label: string; disabled: boolean }[] => {
      const used = new Set(model.configs.filter((_item, position) => position !== index).map((item) => item.mgmtType));
      return MANAGER_TYPES.map((item) => ({ ...item, disabled: used.has(item.value) }));
    };

    const isRowComplete = (item: OutsourceManagerConfig): boolean =>
      Boolean(item.mgmtType) && (!NEEDS_VALUES(item.mgmtType) || item.mgmtValues.length > 0);

    const addRow = (): void => {
      if (model.configs.length >= MANAGER_TYPES.length) {
        message.warning("没有其他选项了");
        return;
      }
      if (model.configs.some((item) => !isRowComplete(item))) {
        message.warning("请先完善已添加的管理人员配置");
        return;
      }
      model.configs.push({ mgmtType: "", mgmtValues: [] });
    };

    const removeRow = (index: number): void => {
      model.configs.splice(index, 1);
    };

    const changeType = (index: number, value: string): void => {
      const row = model.configs[index];
      if (!row) {
        return;
      }
      row.mgmtType = value;
      row.mgmtValues = [];
    };

    const save = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      if (model.channelTypes.length === 0) {
        message.warning("请选择通知方式");
        return;
      }
      if (model.configs.some((item) => !isRowComplete(item))) {
        message.warning("请完善管理人员配置");
        return;
      }
      saving.value = true;
      try {
        await client.saveTrafficConfig({
          id: model.id,
          channelTypes: [...model.channelTypes],
          configs: model.configs.map((item) => ({ mgmtType: item.mgmtType, mgmtValues: [...item.mgmtValues] })),
          deDuplicationConfig: { ...model.deDuplicationConfig },
        });
        message.success("操作成功");
        await loadConfig();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    onMounted(() => {
      void loadChannels();
      void loadValueOptions();
      void loadConfig();
    });

    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div class={styles.detailForm}>
            <Form layout="vertical">
              <div class={styles.sectionTitle}>委外维修管理人员配置</div>
              <FormItem label="通知方式" required>
                <Select
                  mode="multiple"
                  value={model.channelTypes}
                  options={channelOptions.value}
                  placeholder="请选择通知方式"
                  allowClear
                  style={{ maxWidth: "560px" }}
                  onUpdate:value={(raw: unknown) => {
                    model.channelTypes = toTextArray(raw);
                  }}
                />
              </FormItem>
              <FormItem label="管理人员">
                <Button type="primary" style={{ marginBottom: "12px" }} onClick={addRow}>
                  添加
                </Button>
                {model.configs.map((item, index) => (
                  <div class={styles.configRow} key={index}>
                    <Select
                      value={item.mgmtType || undefined}
                      options={typeOptionsFor(index)}
                      placeholder="请选择管理人员类型"
                      onUpdate:value={(raw: unknown) => {
                        changeType(index, toText(raw));
                      }}
                    />
                    {NEEDS_VALUES(item.mgmtType) ? (
                      <Select
                        mode="multiple"
                        value={item.mgmtValues}
                        options={valueOptions.value[item.mgmtType] ?? []}
                        placeholder={VALUE_PLACEHOLDER[item.mgmtType] ?? "请选择"}
                        maxTagCount={MAX_VALUE_COUNT}
                        showSearch
                        allowClear
                        filterOption={filterOption}
                        onUpdate:value={(raw: unknown) => {
                          item.mgmtValues = toTextArray(raw).slice(0, MAX_VALUE_COUNT);
                        }}
                      />
                    ) : (
                      <span />
                    )}
                    <Button
                      type="link"
                      danger
                      class={styles.removeButton}
                      title="删除该行"
                      onClick={() => {
                        removeRow(index);
                      }}
                    >
                      <DeleteOutlined />
                    </Button>
                  </div>
                ))}
              </FormItem>
              <div class={styles.sectionTitle}>故障维修配置</div>
              <Space size={16} class={styles.faultRow}>
                <FormItem label="系统自动生成委外">
                  <Select
                    value={model.deDuplicationConfig.switchSetting ? "1" : "0"}
                    options={SWITCH_OPTIONS}
                    style={{ width: "160px" }}
                    onUpdate:value={(raw: unknown) => {
                      model.deDuplicationConfig.switchSetting = toText(raw) === "1";
                    }}
                  />
                </FormItem>
                {model.deDuplicationConfig.switchSetting ? (
                  <>
                    <FormItem label="故障持续时间">
                      <InputNumber
                        value={model.deDuplicationConfig.duration ?? undefined}
                        addonAfter="秒"
                        min={0}
                        placeholder="故障持续时间"
                        onUpdate:value={(raw: unknown) => {
                          model.deDuplicationConfig.duration = toNullableNumber(raw);
                        }}
                      />
                    </FormItem>
                    <FormItem label="去重周期">
                      <InputNumber
                        value={model.deDuplicationConfig.deDuplicationPeriod ?? undefined}
                        addonAfter="小时"
                        min={0}
                        placeholder="去重周期"
                        onUpdate:value={(raw: unknown) => {
                          model.deDuplicationConfig.deDuplicationPeriod = toNullableNumber(raw);
                        }}
                      />
                    </FormItem>
                  </>
                ) : null}
              </Space>
            </Form>
          </div>
        </Spin>
      ),
      "footer-page": () => (
        <Button type="primary" loading={saving.value} onClick={() => void save()}>
          保存
        </Button>
      ),
    };

    return () => <PageLayout title="委外业务配置" v-slots={slots} />;
  },
});
