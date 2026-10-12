import type { AliasRecord, BusinessConfigClient, BusinessOrganization, TenantUser, ThirdPartyServiceConfig } from "@g2-contract/business-config";
import type { UploadRequestOption } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getBusinessConfigClient } from "../domain-context";
import { Button, Form, FormItem, Input, Modal, Page, PageLayout, PopConfirm, RadioGroup, Space, Upload, message, usePcTable } from "../pc-ui-runtime";

const SETTING_CODE = "SERVICE_CONFIGURATION";
const errorText = (error: unknown): string => error instanceof Error ? error.message : "请求失败";
const cards = [
  { title: "访问端别名", route: "/d/business-config/alias/terminal" },
  { title: "应用别名", route: "/d/business-config/alias/application" },
  { title: "菜单别名", route: "/d/business-config/alias/menu" },
];

export const BusinessConfigurationPage = defineComponent({
  name: "BusinessConfigurationPage",
  setup() {
    const client = getBusinessConfigClient();
    const router = useRouter();
    const loading = ref(false);
    const saving = ref(false);
    const configModal = ref(false);
    const configRecord = ref<ThirdPartyServiceConfig>();
    const configValues = reactive<Record<string, unknown>>({ phone_encryption: false, monitor_layout: "", monitor_thumbnail: "" });
    const uploadBusy = ref(false);
    const users = ref<TenantUser[]>([]);
    const userPage = reactive({ pageNumber: 1, pageSize: 10 });
    const selectedUserIds = ref<string[]>([]);
    const userConfig = ref<{ id: string; userId: string }[]>([]);
    const organizations = ref<BusinessOrganization[]>([]);
    const keyword = ref("");
    const organizationId = ref<string>();
    const userModal = ref(false);
    const cardError = ref("");

    const [UserTable, userTableApi] = usePcTable({
      tableCode: "BUSINESS_CONFIG_PHONE_ENCRYPTION_USERS",
      rowKey: "id", pagination: false, rowSelection: "checkbox",
      rowSelectionChange: (keys) => { selectedUserIds.value = keys.map(String); },
      fetchApi: async () => ({ records: users.value, total: users.value.length, pages: 1 }),
      columns: [
        { title: "名称", dataIndex: "name" }, { title: "联系电话", dataIndex: "mobile" },
        { title: "性别", dataIndex: "gender", customRender: ({ text }: { text: unknown }) => ({ MALE: "男", FEMALE: "女", NONE: "未知" }[String(text)] ?? "未知") },
        { title: "职位", dataIndex: "positions", customRender: ({ text }: { text: unknown }) => Array.isArray(text) ? (text as { name: string }[]).map((item) => item.name).join("，") || "--" : "--" },
        { title: "工作状态", dataIndex: "workStatus", customRender: ({ text }: { text: unknown }) => ({ REST: "休息", WORKING: "在岗", LEAVE_POST: "离岗", AWAY_BUSINESS: "出差", ASK_LEAVE: "请假" }[String(text)] ?? "--") },
      ],
    });

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const [setting, selected, orgs] = await Promise.all([
          client.getBusinessSetting(SETTING_CODE), client.listPhoneEncryptionUsers(), client.listBusinessOrganizations(),
        ]);
        configRecord.value = setting;
        userConfig.value = selected;
        selectedUserIds.value = selected.map((item) => item.userId);
        organizations.value = orgs;
        if (setting?.variable) {
          try { Object.assign(configValues, JSON.parse(setting.variable) as Record<string, unknown>); }
          catch { throw new Error("通用业务配置格式错误，无法安全编辑"); }
        }
      } catch (error) { message.error(errorText(error)); }
      finally { loading.value = false; }
    }

    async function openGenericConfig(): Promise<void> {
      saving.value = true;
      configModal.value = true;
      try {
        const current = await client.getBusinessSetting(SETTING_CODE);
        const record = current ?? { id: "", itemCode: SETTING_CODE, name: "通用配置", code: SETTING_CODE };
        configRecord.value = record;
        Object.assign(configValues, { phone_encryption: false, monitor_layout: "", monitor_thumbnail: "" });
        if (record.variable) Object.assign(configValues, JSON.parse(record.variable) as Record<string, unknown>);
      } catch (error) { configModal.value = false; message.error(errorText(error)); }
      finally { saving.value = false; }
    }

    async function saveSetting(): Promise<void> {
      if (!configRecord.value || saving.value) return;
      saving.value = true;
      try {
        await client.saveBusinessSetting({ ...configRecord.value, variable: JSON.stringify(configValues) });
        message.success("修改成功"); configModal.value = false;
      } catch (error) { message.error(errorText(error)); }
      finally { saving.value = false; }
    }

    async function searchUsers(): Promise<void> {
      loading.value = true;
      try {
        users.value = await client.listTenantUsers({ keyword: keyword.value.trim() || undefined, organizationIds: organizationId.value ? [organizationId.value] : undefined, enabled: true });
        userPage.pageNumber = 1;
        userTableApi.setDataSource(users.value.slice(0, userPage.pageSize));
        userTableApi.setSelectedRowKeys(selectedUserIds.value);
      } catch (error) { message.error(errorText(error)); }
      finally { loading.value = false; }
    }

    async function saveUsers(): Promise<void> {
      if (saving.value) return;
      saving.value = true;
      try {
        await client.savePhoneEncryptionUsers(selectedUserIds.value, userConfig.value);
        userConfig.value = await client.listPhoneEncryptionUsers();
        selectedUserIds.value = userConfig.value.map((item) => item.userId);
        message.success("操作成功"); userModal.value = false;
      } catch (error) { message.error(errorText(error)); }
      finally { saving.value = false; }
    }

    async function uploadThumbnail(option: import("@g2-platform/pc-ui").UploadRequestOption): Promise<void> {
      if (uploadBusy.value) return;
      uploadBusy.value = true;
      try {
        const uploaded = await client.uploadBusinessConfigFile({ file: option.file as File, businessKey: "mdata" });
        configValues.monitor_thumbnail = uploaded.id;
        option.onSuccess?.(uploaded);
      } catch (error) { option.onError?.(error instanceof Error ? error : new Error("上传失败")); message.error(errorText(error)); }
      finally { uploadBusy.value = false; }
    }

    async function openUserModal(): Promise<void> {
      userModal.value = true;
      await searchUsers();
    }

    onMounted(() => { void load(); });
    return () => <PageLayout title="业务配置" showFooter={false} v-slots={{
      "layout-content": () => <div aria-busy={loading.value} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "16px" }}>
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "16px" }}>
          {cards.map((card) => <button key={card.route} type="button" onClick={() => void router.push(card.route)} style={{ minHeight: "120px", border: "1px solid #e5e7eb", borderRadius: "4px", background: "#f5f5f5", color: "#1f1f1f", cursor: "pointer", fontSize: "16px", fontWeight: 600 }}>{card.title}</button>)}
          <button type="button" onClick={() => void openUserModal()} style={{ minHeight: "120px", border: "1px solid #e5e7eb", borderRadius: "4px", background: "#f5f5f5", color: "#1f1f1f", cursor: "pointer", fontSize: "16px", fontWeight: 600 }}>指定人员手机号加密</button>
          <button type="button" onClick={() => void openGenericConfig()} style={{ minHeight: "120px", border: "1px solid #e5e7eb", borderRadius: "4px", background: "#f5f5f5", color: "#1f1f1f", cursor: "pointer", fontSize: "16px", fontWeight: 600 }}>通用配置</button>
        </div>
        {cardError.value && <p role="alert">{cardError.value}</p>}
        <Modal open={configModal.value} title={configRecord.value?.name ?? "通用配置"} width={720} okText="确定" cancelText="取消" confirmLoading={saving.value} onOk={() => void saveSetting()} onCancel={() => { configModal.value = false; }}>
          <Form layout="vertical">
            {configRecord.value?.code === SETTING_CODE ? <>
              <FormItem label="手机号加密"><RadioGroup value={configValues.phone_encryption} options={[{ label: "开启", value: true }, { label: "关闭", value: false }]} onUpdate:value={(value: boolean) => configValues.phone_encryption = value} /></FormItem>
              <FormItem label="监控显示布局"><RadioGroup value={configValues.monitor_layout} options={[{ label: "1X1", value: "1X1" }, { label: "2X2", value: "2X2" }, { label: "4X4", value: "4X4" }]} onUpdate:value={(value: string) => configValues.monitor_layout = value} /></FormItem>
              <FormItem label="监控缩略图"><Upload accept="image/*" maxCount={1} showUploadList={false} customRequest={(option: import("@g2-platform/pc-ui").UploadRequestOption) => void uploadThumbnail(option)}><Button loading={uploadBusy.value}>上传缩略图</Button></Upload>{typeof configValues.monitor_thumbnail === "string" && configValues.monitor_thumbnail && <span> 已选择文件：{configValues.monitor_thumbnail}</span>}</FormItem>
            </> : Object.entries(configValues).map(([key, value]) => <FormItem key={key} label={key}><Input value={String(value ?? "")} onUpdate:value={(next: string) => configValues[key] = next} /></FormItem>)}
          </Form>
        </Modal>
        <Modal open={userModal.value} title="选择人员" width={1100} okText="保存" cancelText="取消" confirmLoading={saving.value} onOk={() => void saveUsers()} onCancel={() => { userModal.value = false; }}>
          <Space style={{ marginBottom: "12px" }}>
            <select value={organizationId.value} onChange={(event: Event) => organizationId.value = (event.target as HTMLSelectElement).value || undefined}>
              <option value="">全部部门</option>{organizations.value.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            </select>
            <Input value={keyword.value} placeholder="请输入人员名称" onUpdate:value={(value: string) => keyword.value = value} />
            <Button type="primary" onClick={() => void searchUsers()}>查询</Button>
          </Space><UserTable />
          <Page current={userPage.pageNumber} pageSize={userPage.pageSize} total={users.value.length} cachePageQuery={false} onPageChange={(pageNumber: number, pageSize: number) => {
            userPage.pageNumber = pageNumber; userPage.pageSize = pageSize;
            userTableApi.setDataSource(users.value.slice((pageNumber - 1) * pageSize, pageNumber * pageSize));
            userTableApi.setSelectedRowKeys(selectedUserIds.value);
          }} />
        </Modal>
      </div>,
    }} />;
  },
});

export const AliasManagementPage = (kind: "terminal" | "application" | "menu") => defineComponent({
  name: `BusinessConfigAlias-${kind}`,
  setup() {
    const client: BusinessConfigClient = getBusinessConfigClient();
    const router = useRouter();
    const loading = ref(false);
    const saving = ref(false);
    const rows = ref<AliasRecord[]>([]);
    const terminals = ref<{ code: string; name: string; alias?: string }[]>([]);
    const groups = ref<{ id: string; name: string; applicationPageVOS: { code: string; name: string }[] }[]>([]);
    const applications = ref<{ code: string; name: string }[]>([]);
    const menus = ref<AliasRecord[]>([]);
    const selectedTerminal = ref("");
    const selectedApplication = ref("");
    const modalOpen = ref(false);
    const active = ref<AliasRecord>();
    const form = reactive({ name: "", path: "", icon: "" });
    const iconUploading = ref(false);
    const [AliasTable, aliasTableApi] = usePcTable({
      tableCode: `BUSINESS_CONFIG_ALIAS_${kind.toUpperCase()}`, rowKey: "code", pagination: false,
      ...(kind === "menu" ? { childrenColumnName: "children" } : {}),
      fetchApi: async () => ({ records: rows.value, total: rows.value.length, pages: 1 }),
      columns: [
        { title: "初始名称", dataIndex: "name" },
        { title: "别名", dataIndex: "aliasName", customRender: ({ record }) => (record as AliasRecord).alias?.name || "--" },
        { title: "操作", dataIndex: "actions", width: 160, customRender: ({ record }) => {
          const alias = record as AliasRecord;
          return <Space size={4}><Button type="link" onClick={() => edit(alias)}>编辑</Button>{kind === "terminal" && alias.canDelete && alias.id && <PopConfirm title="确定删除该外链？" okText="确定" cancelText="取消" onConfirm={() => void removeAlias(alias)}><Button type="link" danger>删除</Button></PopConfirm>}</Space>;
        } },
      ],
    });
    function syncRows(): void { aliasTableApi.setDataSource(rows.value); }
    async function load(): Promise<void> {
      loading.value = true;
      try {
        if (kind === "terminal") { rows.value = await client.listTerminalAliases(); syncRows(); return; }
        if (kind === "application") { rows.value = (await client.listBusinessApplications()).map((item) => ({ code: item.code, name: item.name, alias: item.alias, icon: item.icon })); syncRows(); return; }
        terminals.value = await client.getUserTerminals();
        selectedTerminal.value ||= terminals.value[0]?.code ?? "";
        await loadMenuOptions();
      } catch (error) { message.error(errorText(error)); }
      finally { loading.value = false; }
    }
    async function loadMenuOptions(): Promise<void> {
      if (!selectedTerminal.value) return;
      loading.value = true;
      try {
        groups.value = await client.listAliasApplicationGroups(selectedTerminal.value);
        applications.value = groups.value.flatMap((group) => group.applicationPageVOS);
        selectedApplication.value = applications.value.some((app) => app.code === selectedApplication.value) ? selectedApplication.value : applications.value[0]?.code ?? "";
        await loadMenus();
      } catch (error) { message.error(errorText(error)); }
      finally { loading.value = false; }
    }
    async function loadMenus(): Promise<void> {
      if (!selectedTerminal.value || !selectedApplication.value) { menus.value = []; return; }
      try {
        menus.value = await client.listAliasMenus(selectedApplication.value, selectedTerminal.value);
        rows.value = menus.value;
        syncRows();
      }
      catch (error) { message.error(errorText(error)); }
    }
    function edit(record: AliasRecord): void {
      active.value = record; form.name = record.alias?.name ?? ""; form.path = record.alias?.path ?? ""; form.icon = record.alias?.icon ?? ""; modalOpen.value = true;
    }
    function addExternal(): void {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(10)), (byte) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[byte % 52]).join("");
      active.value = { code, name: "外链", alias: {} };
      form.name = ""; form.path = ""; form.icon = ""; modalOpen.value = true;
    }
    async function removeAlias(record: AliasRecord): Promise<void> {
      if (!record.id) return;
      try { await client.deleteBusinessAlias(record.id); message.success("删除成功"); await load(); }
      catch (error) { message.error(errorText(error)); }
    }
    async function uploadAliasIcon(option: UploadRequestOption): Promise<void> {
      if (iconUploading.value) return;
      iconUploading.value = true;
      try {
        const file = await client.uploadBusinessConfigFile({ file: option.file as File, businessKey: "mdata" });
        form.icon = file.path ?? file.id;
        option.onSuccess?.(file);
      } catch (error) { option.onError?.(error instanceof Error ? error : new Error("上传失败")); message.error(errorText(error)); }
      finally { iconUploading.value = false; }
    }
    async function saveOne(): Promise<void> {
      if (!active.value || saving.value) return;
      saving.value = true;
      try {
        if (kind === "terminal") await client.saveTerminalAlias({ code: active.value.code, name: form.name, path: form.path });
        else if (kind === "application") await client.saveApplicationAlias({ code: active.value.code, name: form.name, icon: form.icon });
        else {
          const patchTree = (items: AliasRecord[]): AliasRecord[] => items.map((item, index) => item.code === active.value?.code
            ? { ...item, alias: { name: form.name, icon: form.icon, sort: index + 1 } }
            : { ...item, children: item.children ? patchTree(item.children) : undefined });
          menus.value = patchTree(menus.value);
          const flatten = (items: AliasRecord[]): { code: string; name: string; icon: string; sort: number }[] => items.flatMap((item, index) => [
            { code: item.code, name: item.alias?.name ?? item.name, icon: item.alias?.icon ?? "", sort: item.alias?.sort ?? index + 1 },
            ...(item.children ? flatten(item.children) : []),
          ]);
          await client.saveMenuAliases({ terminalCode: selectedTerminal.value, applicationCode: selectedApplication.value, alias: flatten(menus.value) });
        }
        message.success("保存成功"); modalOpen.value = false; await load();
      } catch (error) { message.error(errorText(error)); }
      finally { saving.value = false; }
    }
    onMounted(() => { void load(); });
    const titles = { terminal: "访问端别名配置", application: "应用别名配置", menu: "菜单别名配置" };
    return () => <PageLayout title={titles[kind]} v-slots={{
      "layout-header": () => kind === "menu" ? <Space>
        <select value={selectedTerminal.value} onChange={(event: Event) => { selectedTerminal.value = (event.target as HTMLSelectElement).value; void loadMenuOptions(); }}>
          {terminals.value.map((terminal) => <option key={terminal.code} value={terminal.code}>{terminal.name}</option>)}
        </select>
        <select value={selectedApplication.value} onChange={(event: Event) => { selectedApplication.value = (event.target as HTMLSelectElement).value; void loadMenus(); }}>
          {applications.value.map((application) => <option key={application.code} value={application.code}>{application.name}</option>)}
        </select>
      </Space> : kind === "terminal" ? <Button type="primary" onClick={addExternal}>新增外链</Button> : undefined,
      "layout-content": () => <><AliasTable />{kind === "menu" && <div style={{ display: "none" }}>{JSON.stringify(menus.value)}</div>}
        <Modal open={modalOpen.value} title="编辑别名" okText="保存" cancelText="取消" confirmLoading={saving.value} onOk={() => void saveOne()} onCancel={() => { modalOpen.value = false; }}>
          <Form layout="vertical"><FormItem label="原始名称">{active.value?.name}</FormItem><FormItem label="别名"><Input value={form.name} onUpdate:value={(value: string) => form.name = value} /></FormItem>
            {kind === "terminal" && <FormItem label="入口路由"><Input value={form.path} onUpdate:value={(value: string) => form.path = value} /></FormItem>}
            {kind !== "terminal" && <FormItem label="图标"><Upload accept="image/*" maxCount={1} showUploadList={false} customRequest={(option: UploadRequestOption) => void uploadAliasIcon(option)}><Button loading={iconUploading.value}>上传图标</Button></Upload><Input value={form.icon} placeholder="图标地址" onUpdate:value={(value: string) => form.icon = value} /></FormItem>}
          </Form>
        </Modal>
      </>,
      "footer-page": () => <Button onClick={() => void router.push("/d/business-config/service-configuration")}>返回</Button>,
    }} />;
  },
});
