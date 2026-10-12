import { Button, Cascader, Form, FormItem, Input, Select, Spin, type FormInstance, type FormRule } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";

import { SiteDeviceSelectModal, type SiteDeviceOption } from "./device-select-modal";
import { getDailyInspectionClient, getMdataClient, getOuaaClient } from "@/domain-context";

import styles from "./site-configuration.module.css";

export interface SiteFormState {
  id?: string;
  codeNum: string;
  name: string;
  typeId: string | undefined;
  typeName: string;
  depId: string | undefined;
  depName: string;
  areaId: string[];
  detailAddress: string;
  location: string;
  latAndLon: string;
  deviceIdList: string[];
  deviceList: SiteDeviceOption[];
}

export interface SiteModeDetails {
  modelType: boolean;
  siteInfo: Partial<SiteFormState> & Record<string, unknown>;
}

interface TreeOption {
  label: string;
  value: string;
  children?: TreeOption[];
}

interface NamedOption {
  id: string;
  name: string;
}

function listOf(value: unknown): Array<Record<string, unknown>> {
  let current = value;
  for (let i = 0; i < 4 && current && typeof current === "object" && !Array.isArray(current) && "data" in current; i += 1) {
    current = (current as { data: unknown }).data;
  }
  if (Array.isArray(current)) return current as Array<Record<string, unknown>>;
  if (!current || typeof current === "object") {
    const root = (current ?? {}) as Record<string, unknown>;
    const nested = root.records ?? root.list ?? root.children ?? root.data;
    if (Array.isArray(nested)) return nested as Array<Record<string, unknown>>;
  }
  return [];
}

function treeOptions(value: unknown): TreeOption[] {
  return listOf(value).map((item) => {
    const children = Array.isArray(item.children) ? treeOptions(item.children) : undefined;
    return {
      label: String(item.name ?? item.label ?? "--"),
      value: String(item.id ?? item.value ?? ""),
      children: children?.length ? children : undefined,
    };
  });
}

function flattenOrg(value: unknown): NamedOption[] {
  const result: NamedOption[] = [];
  const walk = (nodes: Array<Record<string, unknown>>): void => {
    for (const item of nodes) {
      const id = String(item.id ?? item.value ?? "");
      const name = String(item.name ?? item.label ?? "");
      if (id) result.push({ id, name });
      if (Array.isArray(item.children)) walk(item.children as Array<Record<string, unknown>>);
    }
  };
  walk(listOf(value));
  return result;
}

function emptyForm(): SiteFormState {
  return {
    codeNum: "",
    name: "",
    typeId: undefined,
    typeName: "",
    depId: undefined,
    depName: "",
    areaId: [],
    location: "",
    detailAddress: "",
    latAndLon: "",
    deviceIdList: [],
    deviceList: [],
  };
}

/** 新增/编辑现场点表单；地图选点暂无公共能力，保留 latAndLon 可编辑。 */
export const AddSiteModal = defineComponent({
  name: "AddSiteModal",
  props: {
    modeDetails: {
      type: Object as PropType<SiteModeDetails>,
      required: true,
    },
  },
  setup(props, { expose }) {
    const formRef = ref<FormInstance>();
    const spinning = ref(true);
    const deviceModalOpen = ref(false);
    const siteTypes = ref<NamedOption[]>([]);
    const departments = ref<NamedOption[]>([]);
    const areas = ref<TreeOption[]>([]);
    const formState = reactive<SiteFormState>(emptyForm());

    const rules: Record<string, FormRule[]> = {
      name: [{ required: true, message: "请输入现场点名称", trigger: "blur" }],
      codeNum: [{ required: true, message: "请输入现场点编码", trigger: "blur" }],
      typeId: [{ required: true, message: "请选择现场点类型", trigger: "change" }],
      depId: [{ required: true, message: "请选择管理部门", trigger: "change" }],
      areaId: [{ required: true, type: "array", min: 1, message: "请选择区域", trigger: "change" }],
    };

    const hydrate = (): void => {
      Object.assign(formState, emptyForm());
      if (props.modeDetails.modelType) return;
      const info = props.modeDetails.siteInfo as Record<string, unknown>;
      const rawAreaId = info.areaId;
      const areaId =
        typeof rawAreaId === "string" ? rawAreaId.split(",").filter(Boolean) : Array.isArray(rawAreaId) ? rawAreaId.map(String) : [];
      const depIdRaw = info.depId;
      const depId = Array.isArray(depIdRaw)
        ? String(depIdRaw[0] ?? "") || undefined
        : depIdRaw != null && depIdRaw !== ""
          ? String(depIdRaw)
          : undefined;
      const deviceList = Array.isArray(info.deviceList)
        ? (info.deviceList as SiteDeviceOption[]).map((item) => ({ id: String(item.id), name: String(item.name ?? "--") }))
        : [];
      Object.assign(formState, {
        id: info.id != null ? String(info.id) : undefined,
        codeNum: String(info.codeNum ?? ""),
        name: String(info.name ?? ""),
        typeId: info.typeId != null && info.typeId !== "" ? String(info.typeId) : undefined,
        typeName: String(info.typeName ?? ""),
        depId,
        depName: String(info.depName ?? ""),
        areaId,
        location: String(info.location ?? ""),
        detailAddress: String(info.detailAddress ?? ""),
        latAndLon: String(info.latAndLon ?? ""),
        deviceList,
        deviceIdList: deviceList.map((item) => item.id),
      });
    };

    const loadOptions = async (): Promise<void> => {
      spinning.value = true;
      try {
        const [types, orgTree, areaTree] = await Promise.all([
          getDailyInspectionClient().request<NamedOption[]>("GET", "/inspect/sceneTypeList"),
          (await getOuaaClient()).getOrganizationTree(),
          (await getMdataClient()).getAreaTree(),
        ]);
        siteTypes.value = Array.isArray(types) ? types.map((item) => ({ id: String(item.id), name: String(item.name ?? "--") })) : [];
        departments.value = flattenOrg(orgTree);
        areas.value = treeOptions(areaTree);
      } finally {
        spinning.value = false;
      }
    };

    const onCheck = async (): Promise<boolean> => {
      try {
        await formRef.value?.validate();
        formState.deviceIdList = formState.deviceList.map((item) => item.id);
        return true;
      } catch {
        return false;
      }
    };

    expose({ formState, onCheck });

    watch(
      () => props.modeDetails,
      () => {
        hydrate();
      },
      { deep: true, immediate: true },
    );

    onMounted(() => {
      void loadOptions();
    });

    return () => (
      <Spin spinning={spinning.value} tip="加载中...">
        <Form ref={formRef} model={formState} rules={rules} labelCol={{ span: 5 }} wrapperCol={{ span: 18 }}>
          <FormItem label="现场点名称" name="name">
            <Input v-model:value={formState.name} maxlength={30} placeholder="请输入" />
          </FormItem>
          <FormItem label="现场点编码" name="codeNum">
            <Input v-model:value={formState.codeNum} maxlength={30} placeholder="请输入" />
          </FormItem>
          <FormItem label="现场点类型" name="typeId">
            <Select
              v-model:value={formState.typeId}
              allowClear
              placeholder="请选择"
              style={{ width: "150px" }}
              options={siteTypes.value.map((item) => ({ label: item.name, value: item.id }))}
              onChange={(value) => {
                const next = value == null || value === "" ? undefined : String(value);
                formState.typeId = next;
                formState.typeName = siteTypes.value.find((item) => item.id === next)?.name ?? "";
              }}
            />
          </FormItem>
          <FormItem label="管理部门" name="depId">
            <Select
              v-model:value={formState.depId}
              allowClear
              placeholder="请选择"
              style={{ width: "150px" }}
              options={departments.value.map((item) => ({ label: item.name, value: item.id }))}
              onChange={(value) => {
                const next = value == null || value === "" ? undefined : String(value);
                formState.depId = next;
                formState.depName = departments.value.find((item) => item.id === next)?.name ?? "";
              }}
            />
          </FormItem>
          <FormItem label="区域" name="areaId">
            <Cascader v-model:value={formState.areaId} changeOnSelect allowClear options={areas.value} placeholder="请选择" />
          </FormItem>
          <FormItem label="详细地址">
            <Input v-model:value={formState.location} maxlength={30} placeholder="请输入" />
          </FormItem>
          <FormItem label="定位">
            {/* 暂无 G2 地图选点组件，保留经纬度手填以对齐旧字段 */}
            <Input v-model:value={formState.latAndLon} placeholder="经度,纬度" />
          </FormItem>
          <FormItem label="关联监控">
            <div class={styles["device-wrapper"]}>
              <Button
                type="primary"
                onClick={() => {
                  deviceModalOpen.value = true;
                }}
              >
                添加
              </Button>
              <div class={styles["device-list"]}>
                {formState.deviceList.map((item) => (
                  <div key={item.id} class={styles["device-item"]}>
                    <span class={styles["device-name"]}>{item.name}</span>
                    <Button
                      type="link"
                      size="small"
                      class={styles["device-remove"]}
                      onClick={() => {
                        formState.deviceList = formState.deviceList.filter((row) => row.id !== item.id);
                      }}
                    >
                      x
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </FormItem>
        </Form>
        <SiteDeviceSelectModal
          open={deviceModalOpen.value}
          value={formState.deviceList}
          onUpdate:open={(open: boolean) => {
            deviceModalOpen.value = open;
          }}
          onOk={(devices: SiteDeviceOption[]) => {
            formState.deviceList = devices;
          }}
        />
      </Spin>
    );
  },
});
