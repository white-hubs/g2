import type { EduResource } from "@g2-contract/secure-edu";
import type { ColumnType } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, reactive, ref, watch } from "vue";

import { getClient, getOuaa, loadUi } from "./context";
import { LABELS, type Row, errorText, number, object, person, rows, text } from "./model";

import styles from "./styles.module.css";
const { Button, Modal, Page, PopConfirm, Space, Tag, message, usePcForm, usePcTable } = await loadUi();
export const Picker = defineComponent({
  props: {
    value: { type: Array as PropType<Row[]>, default: () => [] },
    resource: { type: String as PropType<EduResource | "people">, required: true },
    multiple: Boolean,
    disabled: Boolean,
    title: { type: String, default: "选择人员" },
  },
  emits: { change: (_rows: Row[]) => true },
  setup(props, { emit }) {
    const open = ref(false);
    const chosen = ref<Row[]>([]);
    const query = reactive({ keyword: "" });
    const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    let version = 0;
    const [PcTable, table] = usePcTable({
      rowKey: "id",
      tableCode: `SECURE_EDU_PICK_${props.resource}`,
      autoFetch: false,
      pagination: false,
      autoScrollY: false,
      scrollY: 260,
      rowSelection: props.multiple ? "checkbox" : "radio",
      columns:
        props.resource === "people"
          ? [
              { title: "姓名", dataIndex: "name", width: 120 },
              { title: "电话", dataIndex: "phone", width: 140 },
              { title: "部门", dataIndex: "departmentName", width: 160 },
              { title: "岗位", dataIndex: "postName", width: 160 },
            ]
          : props.resource === "test-paper-manage"
            ? [
                { title: "试卷名称", dataIndex: "name", width: 250 },
                { title: "试卷总分", dataIndex: "score", width: 100 },
                { title: "及格分数", dataIndex: "passingGradeScore", width: 100 },
                { title: "试题数", dataIndex: "examPaperQuestionNumber", width: 100 },
                { title: "试卷说明", dataIndex: "remark", width: 200 },
              ]
            : [
                { title: props.resource === "question" ? "题目" : "名称", dataIndex: "name", width: 340 },
                { title: "主题", dataIndex: "themeName", width: 160 },
                ...(props.resource === "question"
                  ? [
                      {
                        title: "题目类型",
                        dataIndex: "questionType",
                        width: 120,
                        customRender: ({ record }: { record: Row }) => LABELS[text(record.questionType)] ?? text(record.questionTypeName),
                      },
                    ]
                  : []),
              ],
      rowSelectionChange: (keys, data) => {
        const selected = data as Row[];
        const retained = chosen.value.filter((item) => keys.includes(item.id) && !selected.some((row) => row.id === item.id));
        chosen.value = props.multiple ? [...retained, ...selected] : selected;
      },
    });
    const selectedColumns: ColumnType<Row>[] =
      props.resource === "people"
        ? [
            { title: "名称", dataIndex: "name", width: 130 },
            { title: "联系电话", dataIndex: "phone", width: 140 },
            { title: "部门", dataIndex: "departmentName", width: 180 },
            { title: "职位", dataIndex: "postName", width: 160 },
          ]
        : [
            {
              title: "附件名称",
              dataIndex: "fileName",
              width: 250,
              customRender: ({ record }) => {
                const file = object(record.file);
                const path = text(file.path ?? record.path);
                const name = text(record.fileName ?? file.name ?? record.name);
                return path ? (
                  <a href={path} target="_blank" rel="noopener noreferrer" download={name}>
                    {name}
                  </a>
                ) : (
                  name
                );
              },
            },
            {
              title: "附件大小",
              dataIndex: "fileSize",
              width: 110,
              customRender: ({ record }) => `${(number(record.fileSize ?? object(record.file).size) / 1024).toFixed(2)} KB`,
            },
            {
              title: "文件时长",
              dataIndex: "duration",
              width: 110,
              customRender: ({ record }) => (number(record.duration) ? `${number(record.duration)} 秒` : "--"),
            },
          ];
    if (!props.disabled) {
      selectedColumns.push({
        title: "操作",
        dataIndex: "action",
        width: 90,
        customRender: ({ record }) => (
          <PopConfirm
            title="确认移除该项？"
            okText="确定"
            cancelText="取消"
            onConfirm={() =>
              emit(
                "change",
                props.value.filter((item) => item.id !== record.id),
              )
            }
          >
            <Button type="link" danger size="small">
              移除
            </Button>
          </PopConfirm>
        ),
      });
    }
    const [SelectedTable, selectedTable] = usePcTable({
      rowKey: "id",
      tableCode: `SECURE_EDU_SELECTED_${props.resource}`,
      autoFetch: false,
      pagination: false,
      autoScrollY: false,
      scrollY: 200,
      columns: selectedColumns,
    });
    watch(
      () => props.value,
      (value) => selectedTable.setDataSource(value),
      { deep: true, immediate: true },
    );
    async function load() {
      const current = ++version;
      table.loading.value = true;
      try {
        const response =
          props.resource === "people"
            ? await (await getOuaa()).listTenantUsers({ ...query, pageNumber: pager.pageNumber, pageSize: pager.pageSize })
            : await getClient().page(props.resource, { ...query, pageNumber: pager.pageNumber, pageSize: pager.pageSize });
        const value = response && typeof response === "object" && "data" in response ? response.data : response;
        if (!value || typeof value !== "object" || !("records" in value)) {
          throw new Error("选择列表响应格式错误");
        }
        if (current === version) {
          const entries = rows(value.records);
          table.setDataSource(props.resource === "people" ? entries.map((entry) => person(entry)) : entries);
          pager.total = Number("total" in value ? value.total : entries.length);
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          table.loading.value = false;
        }
      }
    }
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      cache: false,
      actionsInline: true,
      showCollapseButton: false,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "请输入名称搜索", allowClear: true },
        },
      ],
      handleSubmit: () => {
        pager.pageNumber = 1;
        void load();
      },
      handleReset: () => {
        pager.pageNumber = 1;
        void load();
      },
    });
    const show = () => {
      chosen.value = [...props.value];
      table.setSelectedRowKeys(chosen.value.map((row) => row.id));
      table.setSelectedRows(chosen.value);
      open.value = true;
      void load();
    };
    return () => (
      <>
        <Button disabled={props.disabled} onClick={show}>
          {props.title}
        </Button>
        <Space wrap style={{ marginLeft: "8px" }}>
          {(!props.multiple || !["people", "courseware"].includes(props.resource)) &&
            props.value.map((row) => (
              <Tag
                key={row.id}
                closable={!props.disabled}
                onClose={() =>
                  emit(
                    "change",
                    props.value.filter((item) => item.id !== row.id),
                  )
                }
              >
                {text(row.name ?? row.userName)}
              </Tag>
            ))}
        </Space>
        {props.multiple && ["people", "courseware"].includes(props.resource) && props.value.length > 0 && (
          <div class={styles.selectedTable}>
            <SelectedTable />
          </div>
        )}
        <Modal
          title={props.title}
          open={open.value}
          width={880}
          okText="确定"
          cancelText="取消"
          onCancel={() => {
            open.value = false;
          }}
          onOk={() => {
            emit("change", [...chosen.value]);
            open.value = false;
          }}
        >
          <div class={styles.main} style={{ height: "430px" }}>
            <PcForm />
            <Space wrap style={{ maxHeight: "48px", overflow: "auto", flexShrink: 0 }}>
              {chosen.value.map((row) => (
                <Tag key={row.id}>{text(row.name)}</Tag>
              ))}
            </Space>
            <PcTable />
          </div>
          <Page
            cachePageQuery={false}
            syncToUrl={false}
            current={pager.pageNumber}
            pageSize={pager.pageSize}
            total={pager.total}
            onPageChange={(n: number, s: number) => {
              pager.pageNumber = n;
              pager.pageSize = s;
              void load();
            }}
          />
        </Modal>
      </>
    );
  },
});
