import type { FireHostButtonConfigRecord } from "@g2-contract/fire-management";
import { defineComponent, reactive, ref, shallowRef } from "vue";

import { useResponsiveTableRegion } from "../composables/use-responsive-table-region";
import type { HostButtonRecord, LocalPage } from "../fire-config-management.model";
import { listFireHostButtons, listFireHostMethods, removeFireHostButton, saveFireHostButtons, updateFireHostButtons } from "@/api/server";
import { usePcForm, usePcModal, usePcTable } from "@/pc-ui-runtime";
import { Button, PopConfirm, Space, Switch, message, PlusOutlined } from "@/pc-ui-runtime";

import styles from "../fire-config-management.module.css";

// 与《消防配置管理》原型 iconOpts 保持一致，存储值即 Font Awesome class。
const iconOptions = [
  "fas fa-volume-mute",
  "fas fa-redo",
  "fas fa-clipboard-check",
  "fas fa-bell-slash",
  "fas fa-eye-slash",
  "fas fa-eye",
  "fas fa-play",
  "fas fa-stop",
  "fas fa-water",
  "fas fa-robot",
  "fas fa-hand-paper",
  "fas fa-exchange-alt",
  "fas fa-link",
  "fas fa-unlink",
  "fas fa-plug",
  "fas fa-bullhorn",
  "fas fa-arrow-up",
  "fas fa-arrow-down",
  "fas fa-arrow-left",
  "fas fa-arrow-right",
  "fas fa-check",
  "fas fa-times",
  "fas fa-bars",
  "fas fa-search",
  "fas fa-code",
  "fas fa-clock",
  "fas fa-flask",
  "fas fa-print",
  "fas fa-cog",
  "fas fa-desktop",
  "fas fa-list-alt",
  "fas fa-shower",
  "fas fa-fan",
  "fas fa-wind",
  "fas fa-warehouse",
  "fas fa-elevator",
  "fas fa-snowflake",
  "fas fa-lightbulb",
  "fas fa-broadcast-tower",
  "fas fa-door-open",
  "fas fa-bolt",
  "fas fa-fire-extinguisher",
  "fas fa-hashtag",
  "fas fa-font",
  "fas fa-asterisk",
  "fas fa-power-off",
  "fas fa-toggle-on",
  "fas fa-pause",
  "fas fa-sync-alt",
  "fas fa-undo",
  "fas fa-lock",
  "fas fa-unlock",
  "fas fa-key",
  "fas fa-bell",
  "fas fa-exclamation-triangle",
  "fas fa-wrench",
  "fas fa-thermometer-half",
  "fas fa-tint",
  "fas fa-wifi",
  "fas fa-signal",
  "fas fa-battery-full",
  "fas fa-sun",
  "fas fa-moon",
  "fas fa-home",
  "fas fa-video",
  "fas fa-volume-up",
  "fas fa-expand",
  "fas fa-filter",
  "fas fa-plus",
  "fas fa-minus",
  "fas fa-save",
  "fas fa-trash",
  "fas fa-chart-bar",
  "fas fa-map-marker-alt",
  "fas fa-building",
] as const;
const DEFAULT_ICON = "fas fa-cog";
// usePcForm 会把未声明 onChange 的控件变更当作自动查询并触发 handleSubmit。
// 编辑弹窗只允许点击“确认”时提交，因此所有可编辑字段都显式接管 change 事件。
const keepEditPending = (): void => undefined;

const toButtonRecord = (record: FireHostButtonConfigRecord): HostButtonRecord => ({
  ...record,
  id: record.id,
  methodCode: record.methodCode,
  // 后端使用 remark 保存业务自定义的按钮名称，未设置时回退展示物模型方法名称。
  name: record.remark || record.methodName || record.methodCode,
  type: record.methodType || "未分类",
  icon: record.icon || DEFAULT_ICON,
  order: record.sortNo ?? 0,
  enabled: record.enabled !== false,
  remark: record.remark || "",
});

export const HostButtonConfigTab = defineComponent({
  name: "HostButtonConfigTab",
  props: {
    hostId: { type: String, required: true },
    hostName: { type: String, required: true },
  },
  setup: (props) => {
    const totalButtons = ref(0);
    const editingRecord = shallowRef<HostButtonRecord | null>(null);
    const editingIcon = shallowRef(DEFAULT_ICON);
    const methodOptions = shallowRef<{ label: string; value: string }[]>([]);
    const enabledSavingIds = shallowRef(new Set<string>());
    const searchParams = reactive({ keyword: "" });

    const loadButtonRecords = async (): Promise<LocalPage<HostButtonRecord>> => {
      const data = await listFireHostButtons(props.hostId);
      const keyword = searchParams.keyword.trim().toLocaleLowerCase();
      const records = data
        .map(toButtonRecord)
        .filter((record) => !keyword || record.name.toLocaleLowerCase().includes(keyword))
        .toSorted((left, right) => left.order - right.order);
      totalButtons.value = data.length;
      return { records, total: records.length, pages: 1 };
    };

    const loadMethodOptions = async (): Promise<void> => {
      const methods = await listFireHostMethods(props.hostId);
      methodOptions.value = methods.map((method) => ({
        label: method.name ? `${method.name}（${method.methodCode}）` : method.methodCode,
        value: method.methodCode,
      }));
    };

    const updateEnabled = async (record: HostButtonRecord, enabled: boolean): Promise<void> => {
      const recordId = String(record.id);
      if (enabledSavingIds.value.has(recordId)) return;
      enabledSavingIds.value = new Set(enabledSavingIds.value).add(recordId);
      try {
        await updateFireHostButtons(props.hostId, { buttons: [{ id: record.id, enabled }] });
        record.enabled = enabled;
        message.success(enabled ? "按钮已启用" : "按钮已停用");
      } catch (error) {
        message.error((error as Error).message || "更新按钮状态失败");
      } finally {
        const remainingIds = new Set(enabledSavingIds.value);
        remainingIds.delete(recordId);
        enabledSavingIds.value = remainingIds;
      }
    };

    const moveRecord = async (record: HostButtonRecord, offset: -1 | 1): Promise<void> => {
      const page = await loadButtonRecords();
      const currentIndex = page.records.findIndex((item) => String(item.id) === String(record.id));
      const target = page.records[currentIndex + offset];
      if (!target) return;
      try {
        await updateFireHostButtons(props.hostId, {
          buttons: [
            { id: record.id, sortNo: target.order },
            { id: target.id, sortNo: record.order },
          ],
        });
        message.success("按钮顺序已更新");
        tableApi.query();
      } catch (error) {
        message.error((error as Error).message || "调整按钮顺序失败");
      }
    };

    const removeRecord = async (record: HostButtonRecord): Promise<void> => {
      try {
        await removeFireHostButton(props.hostId, record.id);
        message.success("主机按钮已移除");
        tableApi.query();
      } catch (error) {
        message.error((error as Error).message || "移除主机按钮失败");
      }
    };

    const columns = [
      {
        title: "序号",
        dataIndex: "sequence",
        width: 90,
        customRender: ({ index }: { index: number }) => {
          const pagination = tableApi.state.pagination as { current?: number; pageSize?: number };
          return ((pagination.current ?? 1) - 1) * (pagination.pageSize ?? 10) + index + 1;
        },
      },
      { title: "按钮名称", dataIndex: "name", ellipsis: true },
      {
        title: "图标",
        dataIndex: "icon",
        width: 100,
        customRender: ({ record }: { record: HostButtonRecord }) => (
          <span class={styles["icon-badge"]} title={record.icon}>
            <i class={record.icon} />
          </span>
        ),
      },
      {
        title: "状态",
        dataIndex: "enabled",
        width: 120,
        customRender: ({ record }: { record: HostButtonRecord }) => (
          <Switch
            checked={record.enabled}
            loading={enabledSavingIds.value.has(String(record.id))}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={(enabled: boolean) => void updateEnabled(record, enabled)}
          />
        ),
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 250,
        fixed: "right",
        customRender: ({ record }: { record: HostButtonRecord }) => (
          <Space size="small">
            <Button type="link" size="small" onClick={() => void openEditModal(record)}>
              编辑
            </Button>
            <Button type="link" size="small" onClick={() => void moveRecord(record, -1)} disabled={record.order <= 1}>
              上移
            </Button>
            <Button type="link" size="small" onClick={() => void moveRecord(record, 1)} disabled={record.order >= totalButtons.value}>
              下移
            </Button>
            <PopConfirm title={`确认移除“${record.name}”吗？`} onConfirm={() => removeRecord(record)}>
              <Button type="link" size="small" danger>
                移除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];

    const buttonPagination = {
      current: 1,
      pageSize: 10,
      total: 0,
      showSizeChanger: true,
      showTotal: (total: number): string => `共 ${total} 条`,
      onChange: (current: number, pageSize: number): void => {
        tableApi.setState({
          pagination: {
            ...(tableApi.state.pagination as unknown as Record<string, unknown>),
            current,
            pageSize,
          },
        });
        tableApi.query();
      },
    };

    const [ButtonTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      pagination: buttonPagination,
      fetchApi: loadButtonRecords,
    });
    const tableRegionRef = useResponsiveTableRegion((scrollY) => tableApi.setState({ scrollY }));

    const [SearchForm] = usePcForm({
      cache: false,
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "按钮名称",
          componentProps: { placeholder: "请输入按钮名称", allowClear: true },
        },
      ],
      handleSubmit: (values) => {
        searchParams.keyword = String(values.keyword ?? "").trim();
        tableApi.setState({
          pagination: {
            ...(tableApi.state.pagination as unknown as Record<string, unknown>),
            current: 1,
          },
        });
        tableApi.query();
      },
      handleReset: () => {
        searchParams.keyword = "";
        tableApi.setState({
          pagination: {
            ...(tableApi.state.pagination as unknown as Record<string, unknown>),
            current: 1,
          },
        });
        tableApi.query();
      },
    });

    const addButtonConfig = reactive({ remark: "", methodCode: "" });
    const addButtonIcon = shallowRef(DEFAULT_ICON);

    const saveNewButton = async (values: Record<string, unknown>): Promise<void> => {
      const remark = String(values.remark ?? "").trim();
      const methodCode = String(values.methodCode ?? "").trim();
      if (!remark) {
        message.warning("请输入按钮名称");
        return;
      }
      if (!methodCode) {
        message.warning("请选择控制参数");
        return;
      }

      addButtonModalApi.setConfirmLoading(true);
      try {
        const existingButtons = await listFireHostButtons(props.hostId);
        if (existingButtons.some((button) => button.methodCode === methodCode)) {
          message.warning("该控制参数已配置为主机按钮");
          return;
        }
        const buttons = [...existingButtons]
          .toSorted((left, right) => (left.sortNo ?? 0) - (right.sortNo ?? 0))
          .map((button, index) => ({
            methodCode: button.methodCode,
            icon: button.icon || DEFAULT_ICON,
            sortNo: index + 1,
            enabled: button.enabled !== false,
            remark: button.remark || "",
          }));
        buttons.push({
          methodCode,
          icon: addButtonIcon.value || DEFAULT_ICON,
          sortNo: buttons.length + 1,
          enabled: true,
          remark,
        });
        await saveFireHostButtons(props.hostId, { buttons });
        addButtonModalApi.close();
        tableApi.query();
        message.success("主机按钮已新增");
      } catch (error) {
        message.error((error as Error).message || "新增主机按钮失败");
      } finally {
        addButtonModalApi.setConfirmLoading(false);
      }
    };

    const [AddButtonForm, addButtonFormApi] = usePcForm({
      cache: false,
      layout: "vertical",
      showButton: false,
      isCollapsed: false,
      syncStateRef: addButtonConfig,
      schema: [
        {
          component: "Input",
          fieldName: "remark",
          label: "按钮名称",
          rules: { required: true, message: "请输入按钮名称" },
          componentProps: { placeholder: "请输入按钮名称", maxlength: 100, allowClear: true, onChange: keepEditPending },
        },
        {
          component: "Select",
          fieldName: "methodCode",
          label: "控制参数",
          rules: { required: true, message: "请选择控制参数" },
          componentProps: {
            placeholder: "请选择方法列表中的控制参数",
            allowClear: true,
            options: methodOptions,
            onChange: keepEditPending,
          },
        },
      ],
      handleSubmit: saveNewButton,
    });

    const saveEdit = async (values: Record<string, unknown>): Promise<void> => {
      const record = editingRecord.value;
      if (!record) return;
      editModalApi.setConfirmLoading(true);
      try {
        await updateFireHostButtons(props.hostId, {
          buttons: [
            {
              id: record.id,
              icon: editingIcon.value || record.icon,
              sortNo: Number(values.order ?? record.order),
              remark: String(values.remark ?? "").trim(),
            },
          ],
        });
        editModalApi.close();
        tableApi.query();
        message.success("主机按钮配置已保存");
      } catch (error) {
        message.error((error as Error).message || "保存主机按钮失败");
      } finally {
        editModalApi.setConfirmLoading(false);
      }
    };

    const [EditForm, editFormApi] = usePcForm({
      cache: false,
      layout: "vertical",
      showButton: false,
      isCollapsed: false,
      schema: [
        {
          component: "Input",
          fieldName: "remark",
          label: "按钮名称",
          rules: { required: true, message: "请输入按钮名称" },
          componentProps: { placeholder: "请输入按钮名称", maxlength: 100, allowClear: true, onChange: keepEditPending },
        },
        {
          component: "Select",
          fieldName: "methodCode",
          label: "控制参数",
          componentProps: {
            options: methodOptions,
            onChange: keepEditPending,
          },
        },
        {
          component: "InputNumber",
          fieldName: "order",
          label: "显示顺序",
          componentProps: { min: 1, precision: 0, style: { width: "100%" }, onChange: keepEditPending },
        },
      ],
      handleSubmit: saveEdit,
    });

    const [EditModal, editModalApi] = usePcModal({
      title: "编辑主机按钮",
      width: "560px",
      centered: true,
      onConfirm: () => editFormApi.handleSubmit(),
      onClosed: () => {
        editingRecord.value = null;
        editFormApi.handleReset();
      },
    });

    const openEditModal = async (record: HostButtonRecord): Promise<void> => {
      editingRecord.value = record;
      editingIcon.value = record.icon || DEFAULT_ICON;
      editFormApi.setFormValues({ ...record, remark: record.remark || record.name });
      editModalApi.open();
      try {
        await loadMethodOptions();
      } catch (error) {
        message.error((error as Error).message || "获取控制参数列表失败");
      }
    };

    const [AddButtonModal, addButtonModalApi] = usePcModal({
      title: "新增主机按钮",
      width: "560px",
      centered: true,
      onConfirm: () => addButtonFormApi.handleSubmit(),
      onClosed: () => {
        addButtonConfig.remark = "";
        addButtonConfig.methodCode = "";
        addButtonIcon.value = DEFAULT_ICON;
        addButtonFormApi.handleReset();
        addButtonModalApi.setConfirmLoading(false);
      },
    });

    const openAddButtonModal = async (): Promise<void> => {
      addButtonModalApi.setConfirmLoading(true);
      addButtonModalApi.open();
      try {
        await loadMethodOptions();
      } catch (error) {
        message.error((error as Error).message || "获取控制参数列表失败");
      } finally {
        addButtonModalApi.setConfirmLoading(false);
      }
    };

    return () => (
      <div class={styles["tab-content"]}>
        <SearchForm />
        <div class={styles.toolbar}>
          <div class={styles["toolbar-tips"]}>
            {totalButtons.value > 0 && (
              <span class={styles["toolbar-summary"]}>
                {props.hostName} 已配置 <strong>{totalButtons.value}</strong> 个控制按钮
              </span>
            )}
          </div>
          <div class={styles["toolbar-actions"]}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => void openAddButtonModal()}>
              新增
            </Button>
          </div>
        </div>
        <div ref={tableRegionRef} class={styles["page-table-region"]}>
          <ButtonTable />
        </div>
        <EditModal
          v-slots={{
            default: () => (
              <>
                <EditForm />
                <div class={styles["button-icon-picker"]}>
                  <span>按钮图标</span>
                  <div>
                    {iconOptions.map((value) => (
                      <button
                        key={value}
                        type="button"
                        title={value}
                        aria-label={value}
                        class={editingIcon.value === value && styles["button-icon-selected"]}
                        onClick={() => (editingIcon.value = value)}
                      >
                        <i class={value} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ),
          }}
        />
        <AddButtonModal
          v-slots={{
            default: () => (
              <>
                <AddButtonForm />
                <div class={styles["button-icon-picker"]}>
                  <span>按钮图标</span>
                  <div>
                    {iconOptions.map((value) => (
                      <button
                        key={value}
                        type="button"
                        title={value}
                        aria-label={value}
                        class={addButtonIcon.value === value && styles["button-icon-selected"]}
                        onClick={() => (addButtonIcon.value = value)}
                      >
                        <i class={value} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ),
          }}
        />
      </div>
    );
  },
});
