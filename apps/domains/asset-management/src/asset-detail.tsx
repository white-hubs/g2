import type { AssetRow } from "@g2-contract/asset-management";
import type { SceneFile } from "@g2-contract/file";
import type { FormInstance } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getClient, getFileClient } from "./domain-context";
import { FileField } from "./file-field";
import { HistoryPanel } from "./history-panel";
import { BASE } from "./menu-data";
import { assetPayload, cellText, errorText, flattenOptions, text } from "./model";
import { useOptions } from "./options";
import { PersonPicker } from "./person-picker";
import { loadPcMap, loadPcUi } from "./runtime-modules";
import { displayDate } from "./table-columns";

import styles from "./styles.module.css";
const {
  Button,
  Cascader,
  DatePicker,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  InputNumber,
  PageLayout,
  Select,
  Space,
  Spin,
  TabPane,
  Tabs,
  Textarea,
  TreeSelect,
  message,
} = await loadPcUi();
const { MapPickerModal } = await loadPcMap();
export const AssetDetail = defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const id = String(route.query.id ?? "");
    const edit = route.query.action === "edit";
    const draft = reactive<AssetRow>({ id });
    const tab = ref("base");
    const loading = ref(true);
    const saving = ref(false);
    const form = ref<FormInstance>();
    const choices = useOptions();
    const mapOpen = ref(false);
    let oldCode = "";
    const back = () =>
      void router.push(
        typeof route.query.returnPath === "string" && route.query.returnPath.startsWith(`${BASE}/assetInventory`)
          ? route.query.returnPath
          : `${BASE}/assetInventory`,
      );
    const save = async () => {
      if (saving.value) {
        return;
      }
      try {
        await form.value?.validate();
      } catch {
        return;
      }
      saving.value = true;
      try {
        if (text(draft, "serialNumber") !== oldCode && (await getClient().checkAssetCodes(id, text(draft, "serialNumber"))).length > 0) {
          message.warning("资产编码已存在");
          return;
        }
        const body = assetPayload(draft);
        await (
          await getFileClient()
        ).persistSceneFiles("PROPERTY_MANAGEMENT::PROPERTY", [...(body.imgs as string[]), ...(body.file as string[])]);
        await getClient().updateAsset(body);
        message.success("保存成功");
        back();
      } catch (error) {
        message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    };
    onMounted(() => {
      void choices
        .load(["assetType", "assetSource", "departments", ...(edit ? ["areas"] : [])])
        .catch((error: unknown) => message.error(errorText(error)));
      void getClient()
        .getAsset(id)
        .then((row) => {
          Object.assign(draft, row, {
            purchaseDate: row.purchaseDate ? displayDate(row.purchaseDate) : undefined,
            startTime: row.startTime ? displayDate(row.startTime) : undefined,
            areaIds: Array.isArray(row.area) ? row.area.map((entry) => String((entry as { id: string }).id)) : (row.areaIds ?? []),
          });
          oldCode = text(row, "serialNumber");
        })
        .catch((error: unknown) => message.error(errorText(error)))
        .finally(() => {
          loading.value = false;
        });
    });
    const field = (name: string, label: string, kind = "text", required = false) => (
      <FormItem name={name} label={label} rules={required ? [{ required: true, message: `请填写${label}` }] : undefined}>
        {!edit ? (
          kind === "date" ? (
            displayDate(draft[name])
          ) : (
            cellText(draft[name])
          )
        ) : kind === "date" ? (
          <DatePicker
            value={draft[name] as string | undefined}
            valueFormat="YYYY-MM-DD"
            onChange={(_date, value) => {
              draft[name] = value;
            }}
          />
        ) : kind === "number" ? (
          <InputNumber
            value={draft[name] as number | undefined}
            min={0}
            precision={name === "price" ? 2 : 0}
            onChange={(value) => {
              draft[name] = value;
            }}
          />
        ) : kind === "area" ? (
          <Cascader
            value={draft.areaIds as string[]}
            options={choices.data.areas}
            fieldNames={{ label: "name", value: "id", children: "children" }}
            changeOnSelect
            onChange={(value) => {
              draft.areaIds = value;
            }}
          />
        ) : (
          <Input
            value={text(draft, name)}
            maxlength={name.includes("Number") ? 200 : undefined}
            onChange={(event) => {
              draft[name] = event.target.value;
            }}
          />
        )}
      </FormItem>
    );
    const select = (
      name: string,
      label: string,
      source: "assetType" | "assetSource" | "departments",
      display: string,
      required = false,
    ) => (
      <FormItem name={name} label={label} rules={required ? [{ required: true, message: `请选择${label}` }] : undefined}>
        {!edit ? (
          cellText(draft[display] ?? flattenOptions(choices.data[source]).find((item) => item.id === draft[name])?.name)
        ) : source === "assetSource" ? (
          <Select
            value={draft[name] as string | undefined}
            allowClear
            showSearch
            optionFilterProp="label"
            options={choices.select(source)}
            onChange={(value) => {
              draft[name] = value;
              draft[display] = flattenOptions(choices.data[source]).find((item) => item.id === value)?.name ?? "";
            }}
          />
        ) : (
          <TreeSelect
            value={draft[name] as string | undefined}
            treeData={choices.data[source]}
            fieldNames={{ label: "name", value: "id", children: "children" }}
            allowClear
            showSearch
            treeNodeFilterProp="name"
            onChange={(value) => {
              draft[name] = value;
              draft[display] = flattenOptions(choices.data[source]).find((item) => item.id === value)?.name ?? "";
            }}
          />
        )}
      </FormItem>
    );
    const person = (name: string, label: string, display: string) => (
      <FormItem label={label}>
        {!edit ? (
          cellText(draft[display])
        ) : (
          <PersonPicker
            value={draft[name] ? [{ id: text(draft, name), name: text(draft, display) }] : []}
            onChange={(people) => {
              draft[name] = people[0]?.id ?? "";
              draft[display] = people[0]?.name ?? "";
            }}
          />
        )}
      </FormItem>
    );
    const note = (name: string, label: string) => (
      <FormItem label={label} class={styles.full}>
        {edit ? (
          <Textarea
            value={text(draft, name)}
            rows={3}
            maxlength={200}
            showCount
            onChange={(event) => {
              draft[name] = event.target.value;
            }}
          />
        ) : (
          <span style={{ whiteSpace: "pre-wrap" }}>{cellText(draft[name])}</span>
        )}
      </FormItem>
    );
    const detailField = (name: string, label: string, value = cellText(draft[name])) => (
      <DescriptionsItem key={name} label={label}>
        {value || "--"}
      </DescriptionsItem>
    );
    const detailSelection = (name: string, label: string, source: "assetType" | "assetSource" | "departments", display: string) =>
      detailField(
        name,
        label,
        cellText(draft[display] ?? flattenOptions(choices.data[source]).find((item) => item.id === draft[name])?.name),
      );
    const detailFiles = (name: "imgs" | "file") => {
      const files = Array.isArray(draft[name]) ? (draft[name] as SceneFile[]) : [];
      return files.length > 0 ? <FileField value={files} scene="PROPERTY_MANAGEMENT::PROPERTY" images={name === "imgs"} disabled /> : "--";
    };
    const details = () => (
      <div class={styles.assetDetails}>
        <section aria-labelledby="asset-information-title">
          <h3 id="asset-information-title" class={styles.detailTitle}>
            资产信息
          </h3>
          <Descriptions class={styles.detailGrid} column={{ xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }} colon={false} size="small">
            {detailSelection("typeId", "资产类别", "assetType", "typeName")}
            {detailField("serialNumber", "资产编码")}
            {detailField("name", "资产名称")}
            {detailField("financeNumber", "财务编码")}
            {detailField("startTime", "入库日期", displayDate(draft.startTime))}
            {detailField("norms", "规格型号")}
            {detailField("usageTime", "使用期限（月）")}
            {detailField("unit", "计量单位")}
            {detailField("number", "数量")}
            {detailSelection("sourceId", "来源", "assetSource", "sourceName")}
            {detailField("price", "原值（元）")}
            {detailField("purchaseDate", "购入日期", displayDate(draft.purchaseDate))}
            {detailField("adminName", "管理员")}
            {detailSelection("maintenanceDepId", "维护部门", "departments", "maintenanceDepName")}
            {detailField("deviceNumber", "模型编码")}
            {detailField("area", "区域")}
            {detailField("storageLocation", "存放地点")}
          </Descriptions>
          <Descriptions class={styles.detailGrid} column={1} colon={false} size="small">
            {detailField("remarks", "备注")}
            {detailField("location", "详细地址")}
            {detailField("latAndLon", "资产位置")}
          </Descriptions>
        </section>
        <section aria-labelledby="asset-user-title">
          <h3 id="asset-user-title" class={styles.detailTitle}>
            使用人信息
          </h3>
          <Descriptions class={styles.detailGrid} column={{ xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }} colon={false} size="small">
            {detailSelection("receiveDepId", "使用部门", "departments", "receiveDepName")}
            {detailField("receiveUserName", "使用人")}
            {detailField("receiveUserPhone", "联系电话")}
          </Descriptions>
        </section>
        <section aria-labelledby="asset-maintenance-title">
          <h3 id="asset-maintenance-title" class={styles.detailTitle}>
            维保信息
          </h3>
          <Descriptions class={styles.detailGrid} column={{ xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }} colon={false} size="small">
            {detailField("supplier", "供应商名称")}
            {detailField("supplierUser", "联系人")}
            {detailField("supplierPhone", "联系电话")}
            {detailField("maintenanceTime", "维保期限（月）")}
          </Descriptions>
          <Descriptions class={styles.detailGrid} column={1} colon={false} size="small">
            {detailField("maintenanceRemarks", "维保备注")}
          </Descriptions>
        </section>
        <section aria-labelledby="asset-files-title">
          <h3 id="asset-files-title" class={styles.detailTitle}>
            附件信息
          </h3>
          <Descriptions class={styles.detailGrid} column={1} colon={false} size="small">
            <DescriptionsItem label="照片">{detailFiles("imgs")}</DescriptionsItem>
            <DescriptionsItem label="附件">{detailFiles("file")}</DescriptionsItem>
          </Descriptions>
        </section>
      </div>
    );
    return () => (
      <PageLayout
        class={styles.page}
        title={edit ? "编辑资产清单" : "资产清单详情"}
        v-slots={{
          "layout-content": () => (
            <div class={[styles.main, styles.detailMain]}>
              <Tabs
                activeKey={tab.value}
                onChange={(key) => {
                  tab.value = String(key);
                }}
              >
                <TabPane key="base" tab="基本信息" />
                {!edit && <TabPane key="history" tab="资产履历" />}
              </Tabs>
              {tab.value === "history" ? (
                <HistoryPanel id={id} />
              ) : (
                <div class={styles.scroll}>
                  <Spin spinning={loading.value}>
                    {!edit ? (
                      details()
                    ) : (
                      <Form ref={form} model={draft} layout="vertical" class={styles.editor}>
                        <div class={styles.sectionTitle}>基本信息</div>
                        {select("typeId", "资产类别", "assetType", "typeName", true)}
                        {field("serialNumber", "资产编码", "text", true)}
                        {field("name", "资产名称", "text", true)}
                        {field("financeNumber", "财务编码")}
                        {field("startTime", "入库日期", "date", true)}
                        {field("norms", "规格型号")}
                        {field("usageTime", "使用期限（月）", "number", true)}
                        {field("unit", "计量单位")}
                        {field("number", "数量", "number")}
                        {select("sourceId", "来源", "assetSource", "sourceName")}
                        {field("price", "原值（元）", "number")}
                        {field("purchaseDate", "购入日期", "date")}
                        {person("adminId", "管理员", "adminName")}
                        {select("maintenanceDepId", "维护部门", "departments", "maintenanceDepName")}
                        {field("deviceNumber", "模型编码")}
                        {edit ? field("areaIds", "区域", "area") : <FormItem label="区域">{cellText(draft.area)}</FormItem>}
                        {field("storageLocation", "存放地点")}
                        <FormItem label="照片">
                          <FileField
                            value={Array.isArray(draft.imgs) ? (draft.imgs as SceneFile[]) : []}
                            scene="PROPERTY_MANAGEMENT::PROPERTY"
                            images
                            disabled={!edit}
                            onChange={(files) => {
                              draft.imgs = files;
                            }}
                          />
                        </FormItem>
                        {note("remarks", "备注")}
                        {note("location", "详细地址")}
                        <FormItem label="资产位置">
                          <Space>
                            <Input value={text(draft, "latAndLon")} readonly />
                            {edit && (
                              <Button
                                onClick={() => {
                                  mapOpen.value = true;
                                }}
                              >
                                获取位置
                              </Button>
                            )}
                          </Space>
                        </FormItem>
                        <div class={styles.sectionTitle}>使用人信息</div>
                        {select("receiveDepId", "使用部门", "departments", "receiveDepName")}
                        {person("receiveUserId", "使用人", "receiveUserName")}
                        {field("receiveUserPhone", "联系电话")}
                        <div class={styles.sectionTitle}>维保信息</div>
                        {field("supplier", "供应商名称")}
                        {field("supplierUser", "联系人")}
                        {field("supplierPhone", "联系电话")}
                        {field("maintenanceTime", "维保期限（月）", "number")}
                        {note("maintenanceRemarks", "维保备注")}
                        <FormItem label="附件" class={styles.full}>
                          <FileField
                            value={Array.isArray(draft.file) ? (draft.file as SceneFile[]) : []}
                            scene="PROPERTY_MANAGEMENT::PROPERTY"
                            disabled={!edit}
                            onChange={(files) => {
                              draft.file = files;
                            }}
                          />
                        </FormItem>
                      </Form>
                    )}
                  </Spin>
                </div>
              )}
            </div>
          ),
          "footer-page": () => (
            <Space>
              <Button onClick={back}>返回</Button>
              {edit && (
                <Button type="primary" loading={saving.value} disabled={loading.value} onClick={() => void save()}>
                  保存
                </Button>
              )}
            </Space>
          ),
          default: () => (
            <MapPickerModal
              open={mapOpen.value}
              title="选择资产位置"
              address={text(draft, "location")}
              center={
                text(draft, "latAndLon").includes(",")
                  ? { lng: Number(text(draft, "latAndLon").split(",")[0]), lat: Number(text(draft, "latAndLon").split(",")[1]) }
                  : undefined
              }
              onUpdate:open={(open: boolean) => {
                mapOpen.value = open;
              }}
              onConfirm={(result) => {
                draft.latAndLon = `${result.lng},${result.lat}`;
                draft.location = result.address;
                mapOpen.value = false;
              }}
            />
          ),
        }}
      />
    );
  },
});
