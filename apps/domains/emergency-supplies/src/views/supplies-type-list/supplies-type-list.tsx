import type { SuppliesTypeVO } from "@g2-contract/emergency-supplies";
import type { FormExpose } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getEmergencySuppliesPcUi } from "@/domain-context";
import { getEmergencySuppliesClient } from "@/shared";

import styles from "./supplies-type-list.module.less";

const { Button, Form, FormItem, Input, Modal, Page, PageLayout, PopConfirm, SearchOutlined, Select, message, usePcTable } =
  getEmergencySuppliesPcUi();

type SuppliesTypeFormState = {
  id?: string;
  name: string;
  code: string;
  color: string;
  status: boolean;
};

const createInitialForm = (): SuppliesTypeFormState => ({
  name: "",
  code: "",
  color: "RED",
  status: true,
});

const suppliesTypeColorOptions = [
  {
    label: "红色",
    value: "RED",
    tagText: "红",
    color: "#f5222d",
    background: "#fff1f0",
    border: "#ff7875",
  },
  {
    label: "橙色",
    value: "ORANGE",
    tagText: "橙",
    color: "#fa8c16",
    background: "#fff7e6",
    border: "#ffc069",
  },
  {
    label: "黄色",
    value: "YELLOW",
    tagText: "黄",
    color: "#fadb14",
    background: "#feffe6",
    border: "#ffec3d",
  },
  {
    label: "绿色",
    value: "GREEN",
    tagText: "绿",
    color: "#52c41a",
    background: "#f6ffed",
    border: "#95de64",
  },
  {
    label: "金色",
    value: "GOLD",
    tagText: "金",
    color: "#d48806",
    background: "#fffbe6",
    border: "#ffd666",
  },
  {
    label: "蓝色",
    value: "BLUE",
    tagText: "蓝",
    color: "#1677ff",
    background: "#e6f4ff",
    border: "#69b1ff",
  },
  {
    label: "紫色",
    value: "PURPLE",
    tagText: "紫",
    color: "#722ed1",
    background: "#f9f0ff",
    border: "#b37feb",
  },
  {
    label: "青色",
    value: "CYAN",
    tagText: "青",
    color: "#13c2c2",
    background: "#e6fffb",
    border: "#5cdbd3",
  },
  {
    label: "黄绿",
    value: "LIME",
    tagText: "黄绿",
    color: "#7cb305",
    background: "#fcffe6",
    border: "#d3f261",
  },
];

const colorConfig = (value?: string) =>
  suppliesTypeColorOptions.find((item) => item.value === value) ?? {
    label: "未配置",
    value: "",
    tagText: "--",
    color: "#6b7280",
    background: "#f3f4f6",
    border: "#d1d5db",
  };

const statusClass = (enabled?: boolean): string[] => [styles.statusTag, enabled ? styles.statusEnabled : styles.statusDisabled];

export const SuppliesTypeList = defineComponent({
  name: "SuppliesTypeList",
  setup: () => {
    const query = reactive({
      keyword: "",
      status: undefined as boolean | undefined,
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const modalVisible = ref(false);
    const modalTitle = ref("新增类别");
    const submitLoading = ref(false);
    const formRef = ref<FormExpose>();
    const formState = reactive<SuppliesTypeFormState>(createInitialForm());

    const resetForm = (): void => {
      Object.assign(formState, createInitialForm());
      formState.id = undefined;
      formRef.value?.clearValidate();
    };

    const openCreateModal = (): void => {
      resetForm();
      modalTitle.value = "新增类别";
      modalVisible.value = true;
    };

    const openEditModal = (record: SuppliesTypeVO): void => {
      resetForm();
      modalTitle.value = "编辑类别";
      Object.assign(formState, {
        id: record.id,
        name: record.name ?? "",
        code: record.code ?? "",
        color: record.color ?? "RED",
        status: record.status ?? true,
      });
      modalVisible.value = true;
    };

    const changeStatus = async (record: SuppliesTypeVO): Promise<void> => {
      await getEmergencySuppliesClient().updateSuppliesType(record.id, { status: !record.status });
      message.success("操作成功");
      tableApi.query();
    };

    const deleteSuppliesType = async (id: string): Promise<void> => {
      await getEmergencySuppliesClient().deleteSuppliesType(id);
      message.success("删除成功");
      tableApi.query();
    };

    const submitSuppliesType = async (): Promise<void> => {
      await formRef.value?.validate();
      submitLoading.value = true;
      try {
        const payload: Partial<SuppliesTypeVO> = {
          name: formState.name,
          code: formState.code,
          color: formState.color,
          status: formState.status,
        };
        if (formState.id) {
          await getEmergencySuppliesClient().updateSuppliesType(formState.id, payload);
        } else {
          await getEmergencySuppliesClient().createSuppliesType(payload);
        }
        message.success("操作成功");
        modalVisible.value = false;
        tableApi.query();
      } finally {
        submitLoading.value = false;
      }
    };

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "EMERGENCY_SUPPLIES_TYPE",
      columns: [
        { title: "类别名称", dataIndex: "name" },
        { title: "类别编码", dataIndex: "code", width: 160 },
        {
          title: "标识色",
          dataIndex: "color",
          width: 120,
          customRender: ({ text }: { text?: string }) => {
            const color = colorConfig(text);
            return (
              <span
                class={styles.colorTag}
                style={{
                  color: color.color,
                  backgroundColor: color.background,
                  borderColor: color.border,
                }}
              >
                {color.tagText}
              </span>
            );
          },
        },
        {
          title: "状态",
          dataIndex: "status",
          width: 100,
          customRender: ({ text }: { text?: boolean }) => <span class={statusClass(text)}>{text ? "启用" : "禁用"}</span>,
        },
        { title: "备注", dataIndex: "remark", ellipsis: true },
        {
          title: "操作",
          dataIndex: "action",
          width: 210,
          fixed: "right",
          customRender: ({ record }: { record: SuppliesTypeVO }) => (
            <>
              <Button type="link" size="small" onClick={() => openEditModal(record)}>
                编辑
              </Button>
              <Button type="link" size="small" onClick={() => changeStatus(record)}>
                {record.status ? "禁用" : "启用"}
              </Button>
              <PopConfirm title="确认删除该物资类别？" okText="确定" cancelText="取消" onConfirm={() => deleteSuppliesType(record.id)}>
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </PopConfirm>
            </>
          ),
        },
      ],
      fetchApi: async () =>
        getEmergencySuppliesClient().getSuppliesTypePage({
          ...query,
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
        }),
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });
    const search = () => {
      page.pageNumber = 1;
      tableApi.query();
    };
    const slots = {
      "layout-header": () => (
        <div class={styles.headerActions}>
          <Button type="primary" onClick={openCreateModal}>
            新增类别
          </Button>
        </div>
      ),
      "layout-content": () => (
        <div class={styles.page}>
          <div class={styles.toolbar}>
            <div class={styles.filterItem}>
              <span class={styles.filterLabel}>关键字：</span>
              <Input
                class={styles.keyword}
                v-model:value={query.keyword}
                prefix={<SearchOutlined />}
                placeholder="类别名称/编码"
                allowClear
                onPressEnter={search}
              />
            </div>
            <Select
              class={styles.statusSelect}
              style={{ width: "120px" }}
              value={query.status === undefined ? undefined : query.status ? 1 : 0}
              allowClear
              placeholder="全部状态"
              options={[
                { label: "启用", value: 1 },
                { label: "禁用", value: 0 },
              ]}
              onUpdate:value={(value: unknown) => {
                query.status = value === undefined ? undefined : Number(value) === 1;
              }}
              onChange={search}
            />
            <Button type="primary" onClick={search}>
              查询
            </Button>
            <Button
              onClick={() => {
                query.keyword = "";
                query.status = undefined;
                search();
              }}
            >
              重置
            </Button>
          </div>
          <PcTable />
          <Modal
            v-model:open={modalVisible.value}
            title={modalTitle.value}
            width="480px"
            destroyOnClose
            confirmLoading={submitLoading.value}
            okText="确定"
            cancelText="取消"
            onOk={submitSuppliesType}
            onCancel={() => {
              modalVisible.value = false;
            }}
          >
            <Form
              ref={formRef}
              model={formState}
              labelCol={{ span: 24 }}
              wrapperCol={{ span: 24 }}
              class={styles.typeForm}
              rules={{
                name: [
                  {
                    required: true,
                    message: "请输入类别名称",
                    trigger: "blur",
                  },
                ],
                code: [
                  {
                    required: true,
                    message: "请输入类别编码",
                    trigger: "blur",
                  },
                ],
                color: [
                  {
                    required: true,
                    message: "请选择标识色",
                    trigger: "change",
                  },
                ],
              }}
            >
              <FormItem label="类别名称" name="name">
                <Input v-model:value={formState.name} placeholder="如：消防" maxlength={60} />
              </FormItem>
              <div class={styles.formGrid}>
                <FormItem label="类别编码" name="code">
                  <Input v-model:value={formState.code} placeholder="如：FIRE" maxlength={64} />
                </FormItem>
                <FormItem label="标识色" name="color">
                  <Select v-model:value={formState.color} options={suppliesTypeColorOptions} placeholder="请选择标识色" />
                </FormItem>
                <FormItem label="状态" name="status">
                  <Select
                    value={formState.status ? 1 : 0}
                    options={[
                      { label: "启用", value: 1 },
                      { label: "禁用", value: 0 },
                    ]}
                    onUpdate:value={(value: unknown) => {
                      formState.status = Number(value) === 1;
                    }}
                  />
                </FormItem>
              </div>
            </Form>
          </Modal>
        </div>
      ),
      "footer-page": () => (
        <Page
          cachePageQuery={false}
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(n, s) => {
            page.pageNumber = n;
            page.pageSize = s;
            tableApi.query();
          }}
        />
      ),
    };
    return () => <PageLayout title="物资类别" v-slots={slots} />;
  },
});
