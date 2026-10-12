import type {
  BulletinDetail,
  BulletinFile,
  DeliveryRecord,
  ModelTypeRow,
  NoticeConfig,
  NoticeLevel,
  PersonnelType,
  RecipientOption,
} from "@g2-contract/technical-bulletin";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AttachmentUpload } from "../components/attachment-upload";
import { RecipientSelectorModal } from "../components/recipient-selector-modal";
import { getTechnicalBulletinClient } from "../domain-context";
import {
  Button,
  Cascader,
  Form,
  type FormInstance,
  FormItem,
  Input,
  PageLayout,
  PlusOutlined,
  Popconfirm,
  Select,
  Tag,
  RichTextEditor,
  message,
  usePcTable,
} from "../pc-ui-runtime";
import { errorMessage, recipientId, recipientOption, text } from "../shared";

import styles from "../styles.module.less";

const BASE = "/d/technical-bulletin";

interface RecipientConfigDraft {
  way: string[];
  personnelType: PersonnelType;
  deptIds: RecipientOption[];
  postIds: RecipientOption[];
  roleIds: RecipientOption[];
  userIds: RecipientOption[];
}

interface AnnouncementFormModel {
  id?: string;
  title: string;
  typePath: string[];
  level?: string;
  tagId?: string;
  publishAgency?: string;
  content: string;
  files: BulletinFile[];
  configs: RecipientConfigDraft[];
}

const personnelOptions = [
  { label: "部门", value: "department" },
  { label: "职位", value: "position" },
  { label: "角色", value: "role" },
  { label: "用户", value: "user" },
];

const personnelNames: Record<PersonnelType, string> = {
  department: "部门",
  position: "职位",
  role: "角色",
  user: "用户",
};

const channelOptions = [
  { label: "站内信消息", value: "CHANNEL_SITE" },
  { label: "App 消息", value: "CHANNEL_APP" },
];

function selectedKey(kind: PersonnelType): keyof Pick<RecipientConfigDraft, "deptIds" | "postIds" | "roleIds" | "userIds"> {
  return kind === "department" ? "deptIds" : kind === "position" ? "postIds" : kind === "role" ? "roleIds" : "userIds";
}

function clearRecipients(config: RecipientConfigDraft): void {
  config.deptIds = [];
  config.postIds = [];
  config.roleIds = [];
  config.userIds = [];
}

function normalizeConfig(config: NoticeConfig): RecipientConfigDraft {
  const deptIds = (config.deptIds ?? []).map((item) => recipientOption(item));
  const postIds = (config.postIds ?? []).map((item) => recipientOption(item));
  const roleIds = (config.roleIds ?? []).map((item) => recipientOption(item));
  const userIds = (config.userIds ?? []).map((item) => recipientOption(item));
  const personnelType: PersonnelType =
    config.personnelType ?? (deptIds.length > 0 ? "department" : postIds.length > 0 ? "position" : roleIds.length > 0 ? "role" : "user");
  return {
    way: typeof config.way === "string" ? config.way.split(",").filter(Boolean) : Array.isArray(config.way) ? config.way : [],
    personnelType,
    deptIds,
    postIds,
    roleIds,
    userIds,
  };
}

export const AnnouncementFormPage = defineComponent({
  name: "TechnicalBulletinAnnouncementForm",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const mode = computed(() => (route.query.mode === "detail" ? "detail" : route.query.mode === "edit" ? "edit" : "add"));
    const readonly = computed(() => mode.value === "detail");
    const loading = ref(false);
    const formRef = ref<FormInstance>();
    const typeOptions = ref<{ label: string; value: string; children: { label: string; value: string }[] }[]>([]);
    const levelOptions = ref<{ label: string; value: string }[]>([]);
    const labelOptions = ref<{ label: string; value: string }[]>([]);
    const institutionOptions = ref<{ label: string; value: string }[]>([]);
    const typeRows = ref<ModelTypeRow[]>([]);
    const selector = reactive<{ configIndex: number; kind: PersonnelType; open: boolean }>({
      configIndex: 0,
      kind: "department",
      open: false,
    });
    const model = reactive<AnnouncementFormModel>({
      title: "",
      typePath: [],
      content: "",
      files: [],
      configs: [],
    });

    const [DeliveryTable, deliveryTableApi] = usePcTable({
      tableCode: "TECHNICAL_BULLETIN_DELIVERY_RECORD",
      rowKey: "id",
      autoScrollY: false,
      autoFetch: false,
      columns: [
        { title: "公告时间", dataIndex: "sendTime", width: 190, fixed: "left", customRender: ({ text: value }) => text(value) },
        { title: "公告人", dataIndex: "userName", width: 180, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "公告结果", dataIndex: "sendStatusDesc", width: 180, ellipsis: true, customRender: ({ text: value }) => text(value) },
      ],
    });

    const loadOptions = async (): Promise<void> => {
      const client = getTechnicalBulletinClient();
      const [types, levels, labels, institutions] = await Promise.all([
        client.listNoticeTypes({ pageNumber: 1, pageSize: 100 }),
        client.listNoticeLevels(),
        client.listNoticeLabels(),
        client.listInstitutions(),
      ]);
      typeRows.value = types;
      typeOptions.value = [
        {
          label: "通知公告",
          value: "ANNOUNCEMENT",
          children: types.filter((item) => item.oneLevelType === "ANNOUNCEMENT").map((item) => ({ label: item.typeName, value: item.id })),
        },
        {
          label: "新闻资讯",
          value: "NEW_INFORMATION",
          children: types
            .filter((item) => item.oneLevelType === "NEW_INFORMATION")
            .map((item) => ({ label: item.typeName, value: item.id })),
        },
      ];
      levelOptions.value = levels.map((item: NoticeLevel) => ({ label: item.name, value: item.code }));
      labelOptions.value = labels.map((item) => ({ label: item.typeName, value: item.id }));
      institutionOptions.value = institutions.map((item) => ({ label: item.typeName, value: item.id }));
    };

    const applyDetail = (detail: BulletinDetail): void => {
      const typeRow = typeRows.value.find((item) => item.id === detail.type);
      model.id = detail.id;
      model.title = detail.title ?? "";
      model.typePath = detail.type ? [typeRow?.oneLevelType ?? "ANNOUNCEMENT", detail.type] : [];
      model.level = detail.level;
      model.tagId = detail.tagId;
      model.publishAgency = detail.publishAgency;
      model.content = detail.content ?? "";
      model.files = detail.files ?? [];
      model.configs = (detail.noticeConfigs ?? []).map((item) => normalizeConfig(item));
    };

    const loadDetail = async (id: string): Promise<void> => {
      const client = getTechnicalBulletinClient();
      const detail = await client.getAnnouncement(id);
      applyDetail(detail);
      if (readonly.value) {
        const records: DeliveryRecord[] = await client.listDeliveryRecords(id);
        deliveryTableApi.setDataSource(records);
      }
    };

    onMounted(async () => {
      loading.value = true;
      try {
        await loadOptions();
        const id = typeof route.query.id === "string" ? route.query.id : "";
        if (id) {
          await loadDetail(id);
        }
      } catch (error) {
        message.error(errorMessage(error, "公告数据加载失败"));
      } finally {
        loading.value = false;
      }
    });

    const addConfig = (): void => {
      model.configs.push({ way: [], personnelType: "department", deptIds: [], postIds: [], roleIds: [], userIds: [] });
    };

    const openSelector = (index: number): void => {
      selector.configIndex = index;
      selector.kind = model.configs[index].personnelType;
      selector.open = true;
    };

    const updatePersonnelType = (config: RecipientConfigDraft, value: unknown): void => {
      const nextType = String(value) as PersonnelType;
      if (nextType === config.personnelType) {
        return;
      }
      clearRecipients(config);
      config.personnelType = nextType;
    };

    const removeRecipient = (config: RecipientConfigDraft, id: string): void => {
      const key = selectedKey(config.personnelType);
      config[key] = config[key].filter((item) => String(item.id) !== String(id));
    };

    const save = async (): Promise<void> => {
      try {
        await formRef.value?.validateFields();
        const invalidChannel = model.configs.some((item) => item.way.length === 0);
        if (invalidChannel) {
          message.warning("请选择通知方式");
          return;
        }
        const invalidRecipient = model.configs.some((item) => item[selectedKey(item.personnelType)].length === 0);
        if (invalidRecipient) {
          message.warning("请选择通知人员");
          return;
        }
        loading.value = true;
        await getTechnicalBulletinClient().saveAnnouncement({
          ...(model.id ? { id: model.id } : {}),
          title: model.title.trim(),
          type: model.typePath[1],
          level: String(model.level),
          tagId: model.tagId,
          publishAgency: model.publishAgency,
          content: model.content,
          fileIds: model.files.map((file) => file.id),
          noticeConfigCommands: model.configs.map((item) => ({
            way: item.way.join(","),
            personnelType: item.personnelType,
            deptIds: item.deptIds.map(recipientId),
            postIds: item.postIds.map(recipientId),
            roleIds: item.roleIds.map(recipientId),
            userIds: item.userIds.map(recipientId),
          })),
        });
        message.success("操作成功");
        await router.push(`${BASE}/notice-manage`);
      } catch (error) {
        if (error instanceof Error) {
          message.error(errorMessage(error, "保存失败"));
        }
      } finally {
        loading.value = false;
      }
    };

    const currentSelection = computed(() => {
      const config = model.configs[selector.configIndex];
      return config ? config[selectedKey(selector.kind)] : [];
    });

    return () => (
      <PageLayout
        title={`${mode.value === "add" ? "新增" : mode.value === "edit" ? "修改" : "详情"}公告管理`}
        v-slots={{
          "layout-content": () => (
            <div class={styles.formPage}>
              <h2 class={styles.sectionTitle}>基础信息</h2>
              <Form ref={formRef} model={model} labelCol={{ style: { width: "100px" } }} disabled={readonly.value}>
                <div class={styles.formGrid}>
                  <FormItem label="公告标题" name="title" rules={[{ required: true, message: "请输入公告标题" }]}>
                    <Input
                      value={model.title}
                      maxlength={128}
                      showCount
                      placeholder="请输入公告标题"
                      onUpdate:value={(value: string) => (model.title = value)}
                    />
                  </FormItem>
                  <FormItem label="公告类别" name="typePath" rules={[{ required: true, type: "array", min: 2, message: "请选择公告类别" }]}>
                    <Cascader
                      value={model.typePath}
                      options={typeOptions.value}
                      placeholder="请选择公告类别"
                      onUpdate:value={(value) => {
                        model.typePath = Array.isArray(value) ? value.map(String) : [];
                      }}
                    />
                  </FormItem>
                  <FormItem label="公告级别" name="level" rules={[{ required: true, message: "请选择公告级别" }]}>
                    <Select
                      value={model.level}
                      options={levelOptions.value}
                      placeholder="请选择公告级别"
                      onUpdate:value={(value) => (model.level = value === undefined ? undefined : String(value))}
                    />
                  </FormItem>
                  <FormItem label="公告标签" name="tagId">
                    <Select
                      value={model.tagId}
                      allowClear
                      options={labelOptions.value}
                      placeholder="请选择公告标签"
                      onUpdate:value={(value) => (model.tagId = value === undefined ? undefined : String(value))}
                    />
                  </FormItem>
                  <FormItem label="发布机构" name="publishAgency">
                    <Select
                      value={model.publishAgency}
                      allowClear
                      options={institutionOptions.value}
                      placeholder="请选择发布机构"
                      onUpdate:value={(value) => (model.publishAgency = value === undefined ? undefined : String(value))}
                    />
                  </FormItem>
                  <FormItem
                    class={styles.fullWidth}
                    label="公告内容"
                    name="content"
                    rules={[{ required: true, message: "请填写公告内容" }]}
                  >
                    {readonly.value ? (
                      <div class={styles.contentHtml} innerHTML={model.content || "--"} />
                    ) : (
                      <RichTextEditor
                        modelValue={model.content}
                        height={260}
                        onUpdate:modelValue={(value: string) => (model.content = value)}
                      />
                    )}
                  </FormItem>
                  <FormItem class={styles.fullWidth} label="附件信息">
                    <AttachmentUpload
                      value={model.files}
                      readonly={readonly.value}
                      onUpdate:value={(value: BulletinFile[]) => (model.files = value)}
                    />
                  </FormItem>
                </div>
              </Form>

              <div class={styles.recipientSectionHeader}>
                <div>
                  <h2 class={styles.sectionTitle}>公告人员</h2>
                  <p class={styles.sectionDescription}>设置公告的通知渠道和接收范围，可按不同人员类型添加多组配置。</p>
                </div>
                {!readonly.value ? (
                  <Button type="primary" onClick={() => addConfig()}>
                    <PlusOutlined />
                    添加通知配置
                  </Button>
                ) : null}
              </div>
              <div class={styles.recipientList}>
                {model.configs.length === 0 ? (
                  <div class={styles.recipientEmpty}>
                    <div class={styles.recipientEmptyIcon}>人</div>
                    <div>
                      <strong>{readonly.value ? "暂无公告人员配置" : "尚未配置公告人员"}</strong>
                      <p>{readonly.value ? "该公告未配置通知范围" : "添加配置后，可选择通知方式、人员类型和具体接收人员。"}</p>
                    </div>
                    {!readonly.value ? (
                      <Button onClick={() => addConfig()}>
                        <PlusOutlined />
                        添加第一条配置
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {model.configs.map((config, index) => {
                  const key = selectedKey(config.personnelType);
                  const recipientName = personnelNames[config.personnelType];
                  return (
                    <div class={styles.recipientCard} key={`${index}-${config.personnelType}`}>
                      <div class={styles.recipientCardHeader}>
                        <div class={styles.recipientCardTitle}>
                          <span class={styles.recipientCardIndex}>{index + 1}</span>
                          <span>通知配置 {index + 1}</span>
                          <span class={styles.recipientCardSummary}>
                            {config.way.length} 种通知方式 · 已选 {config[key].length} 个{recipientName}
                          </span>
                        </div>
                        {!readonly.value ? (
                          <Popconfirm
                            title="删除当前通知配置？"
                            description="删除后，该配置中的通知方式和已选人员将同时移除。"
                            okText="确定"
                            cancelText="取消"
                            onConfirm={() => model.configs.splice(index, 1)}
                          >
                            <Button type="link" danger>
                              删除配置
                            </Button>
                          </Popconfirm>
                        ) : null}
                      </div>
                      <div class={styles.recipientCardBody}>
                        <div class={styles.recipientField}>
                          <div class={styles.recipientFieldLabel}>
                            通知方式<span class={styles.requiredMark}>*</span>
                          </div>
                          <Select
                            mode="multiple"
                            value={config.way}
                            disabled={readonly.value}
                            options={channelOptions}
                            maxTagCount="responsive"
                            placeholder="请选择通知方式"
                            onUpdate:value={(value) => {
                              config.way = Array.isArray(value) ? value.map(String) : [];
                            }}
                          />
                        </div>
                        <div class={styles.recipientField}>
                          <div class={styles.recipientFieldLabel}>
                            人员类型<span class={styles.requiredMark}>*</span>
                          </div>
                          <Select
                            value={config.personnelType}
                            disabled={readonly.value}
                            options={personnelOptions}
                            placeholder="请选择通知人员类型"
                            onUpdate:value={(value) => updatePersonnelType(config, value)}
                          />
                        </div>
                        <div class={[styles.recipientField, styles.recipientTargetField]}>
                          <div class={styles.recipientFieldLabelRow}>
                            <div class={styles.recipientFieldLabel}>
                              接收{recipientName}
                              <span class={styles.requiredMark}>*</span>
                            </div>
                            <span>已选 {config[key].length} 项</span>
                          </div>
                          <div class={[styles.recipientTags, config[key].length === 0 ? styles.recipientTagsEmpty : ""]}>
                            <div class={styles.recipientTagContent}>
                              {config[key].length === 0 ? (
                                <span class={styles.recipientHint}>暂未选择{recipientName}</span>
                              ) : (
                                config[key].map((item) => (
                                  <Tag key={item.id} closable={!readonly.value} onClose={() => removeRecipient(config, item.id)}>
                                    {item.name}
                                  </Tag>
                                ))
                              )}
                            </div>
                            {!readonly.value ? (
                              <Button type={config[key].length === 0 ? "primary" : "default"} onClick={() => openSelector(index)}>
                                {config[key].length === 0 ? `选择${recipientName}` : `重新选择${recipientName}`}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {readonly.value ? (
                <>
                  <h2 class={styles.sectionTitle} style={{ marginTop: "24px" }}>
                    公告记录
                  </h2>
                  <DeliveryTable />
                </>
              ) : null}

              <RecipientSelectorModal
                open={selector.open}
                kind={selector.kind}
                value={currentSelection.value}
                onUpdate:open={(value: boolean) => (selector.open = value)}
                onConfirm={(value: RecipientOption[]) => {
                  const config = model.configs[selector.configIndex];
                  if (config) {
                    clearRecipients(config);
                    config[selectedKey(selector.kind)] = value;
                  }
                }}
              />
            </div>
          ),
          "footer-btn": () => (
            <div class={styles.footerActions}>
              <Button onClick={() => void router.push(`${BASE}/notice-manage`)}>返回</Button>
              {!readonly.value ? (
                <Button type="primary" loading={loading.value} onClick={() => void save()}>
                  保存
                </Button>
              ) : null}
            </div>
          ),
        }}
      />
    );
  },
});
