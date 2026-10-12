import type { ThirdPartyServiceConfig } from "@g2-contract/business-config";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";

import { getBusinessConfigClient } from "../domain-context";
import {
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  PageLayout,
  RadioGroup,
  Select,
  Spin,
  Text,
  message,
  type FormInstance,
} from "../pc-ui-runtime";

type FieldKind = "text" | "textarea" | "number" | "boolean";
interface FieldDefinition {
  key: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  defaultValue?: string | number | boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  precision?: number;
}
interface ServiceDefinition {
  code: string;
  name: string;
  fields: FieldDefinition[];
}

const communicationFields: Record<string, FieldDefinition[]> = {
  xunYi: [
    { key: "apiKey", label: "密钥", kind: "textarea", required: true, placeholder: "请输入密钥" },
    { key: "rootAccount", label: "调度台账号", required: true, placeholder: "请输入调度台账号" },
    { key: "rootAccountPwd", label: "调度台账号密码", required: true, placeholder: "请输入调度台账号密码" },
    { key: "serverApiAddr", label: "接口服务地址", required: true, placeholder: "请输入接口服务地址" },
    { key: "isRecord", label: "是否录音", kind: "boolean", required: true, defaultValue: true },
    { key: "isVideo", label: "是否录像", kind: "boolean", required: true, defaultValue: true },
    { key: "fileUrl", label: "通讯文件地址", kind: "textarea", required: true, placeholder: "请输入通讯文件地址" },
    { key: "serverIp", label: "调度台地址", kind: "textarea", required: true, placeholder: "请输入调度台地址" },
    { key: "serverPort", label: "调度台端口", required: true, placeholder: "请输入调度台端口" },
    { key: "serverResourceUrl", label: "资源地址", kind: "textarea", required: true, placeholder: "请输入资源地址" },
    { key: "serverBusinessPort", label: "业务端口", required: true, placeholder: "请输入业务端口" },
    { key: "serverBusinessResourceUrl", label: "业务资源地址", kind: "textarea", required: true, placeholder: "请输入业务资源地址" },
    { key: "serverMobileRegisterIp", label: "APP注册地址", kind: "textarea", required: true, placeholder: "请输入APP注册地址" },
    { key: "serverMobileRegisterPort", label: "APP注册端口", required: true, placeholder: "请输入APP注册端口" },
  ],
  tencent: [
    { key: "securityId", label: "凭证id", required: true, placeholder: "请输入凭证id" },
    { key: "secretKey", label: "密钥", kind: "textarea", required: true, placeholder: "请输入密钥" },
    { key: "region", label: "地域信息", required: true, placeholder: "请输入地域信息" },
    { key: "sdkAppId", label: "sdkAppId", required: true, placeholder: "请输入sdkAppId" },
    { key: "sdkAppSecretKey", label: "sdkAppSecretKey", required: true, placeholder: "请输入sdkAppSecretKey" },
  ],
};

const definitions: ServiceDefinition[] = [
  {
    name: "高德地图服务",
    code: "gdMap",
    fields: [
      { key: "andriodKey", label: "安卓-key", required: true, placeholder: "请输入安卓-Key" },
      { key: "iosKey", label: "IOS-Key", required: true, placeholder: "请输入IOS-key" },
      { key: "webKey", label: "WEB-Key", required: true, placeholder: "请输入WEB-key" },
      { key: "securityJsCode", label: "WEB安全码", placeholder: "请输入WEB安全码" },
    ],
  },
  { name: "天地图服务", code: "TD_MAP", fields: [{ key: "webKey", label: "天地图web-key", required: true, placeholder: "请输入WEB-key" }] },
  { name: "通讯服务", code: "THIRD_SERVICE::correspond_service", fields: [] },
  {
    name: "人脸识别",
    code: "att_identity_verify",
    fields: [
      { key: "deviceType", label: "接入类型", kind: "text", required: true, defaultValue: "1", placeholder: "阿里" },
      {
        key: "confidence",
        label: "相识度",
        kind: "number",
        required: true,
        min: 75,
        max: 100,
        precision: 2,
        placeholder: "请输入相识度(数字)",
      },
      { key: "accessKeyId", label: "accessKeyId", required: true, placeholder: "请输入accessKeyId" },
      { key: "accessKeySecret", label: "accessKeySecret", required: true, placeholder: "请输入accessKeySecret" },
      { key: "endpoint", label: "服务地址", required: true, placeholder: "请输入服务地址" },
    ],
  },
  {
    name: "微信公众号",
    code: "WX_OFFICIAL_ACCOUNT",
    fields: [
      { key: "name", label: "公众号名称", required: true, placeholder: "请输入公众号名称" },
      { key: "appid", label: "appid", required: true, placeholder: "请输入公众号appid" },
      { key: "secret", label: "secret", required: true, placeholder: "请输入公众号secret" },
    ],
  },
];

function parseRecord(record: ThirdPartyServiceConfig): Record<string, unknown> {
  if (!record.variable) return {};
  try {
    const value: unknown = JSON.parse(record.variable);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    throw new Error(`${record.name}配置内容格式错误`);
  }
}

const errorText = (error: unknown): string => (error instanceof Error ? error.message : "请求失败");

export const ThirdPartyServicesPage = defineComponent({
  name: "BusinessConfigThirdPartyServicesPage",
  setup() {
    const records = ref<ThirdPartyServiceConfig[]>([]);
    const listLoading = ref(false);
    const modalOpen = ref(false);
    const detailLoading = ref(false);
    const saving = ref(false);
    const selected = ref<ThirdPartyServiceConfig>();
    const formRef = ref<FormInstance>();
    const values = reactive<Record<string, unknown>>({});
    let detailSequence = 0;

    const activeFields = computed<FieldDefinition[]>(() => {
      if (!selected.value) return [];
      if (selected.value.code === "THIRD_SERVICE::correspond_service") {
        return [{ key: "providerCode", label: "服务提供商", required: true }, ...(communicationFields[String(values.providerCode)] ?? [])];
      }
      return definitions.find((item) => item.code === selected.value?.code)?.fields ?? [];
    });

    async function load(): Promise<void> {
      listLoading.value = true;
      try {
        records.value = await getBusinessConfigClient().getThirdPartyServices();
      } catch (error) {
        message.error(errorText(error));
      } finally {
        listLoading.value = false;
      }
    }

    async function openConfig(record: ThirdPartyServiceConfig): Promise<void> {
      const sequence = ++detailSequence;
      selected.value = record;
      modalOpen.value = true;
      detailLoading.value = true;
      for (const key of Object.keys(values)) delete values[key];
      try {
        const detail = await getBusinessConfigClient().getThirdPartyService(record.id);
        if (sequence !== detailSequence) return;
        const parsed = parseRecord(detail);
        if (detail.code === "THIRD_SERVICE::correspond_service") {
          values.providerCode = parsed.providerCode;
          Object.assign(values, parsed.config && typeof parsed.config === "object" ? parsed.config : {});
        } else {
          Object.assign(values, parsed);
        }
        const fields =
          detail.code === "THIRD_SERVICE::correspond_service"
            ? (communicationFields[String(values.providerCode)] ?? [])
            : (definitions.find((item) => item.code === detail.code)?.fields ?? []);
        for (const field of fields) {
          if (values[field.key] === undefined) values[field.key] = field.defaultValue;
        }
        selected.value = detail;
      } catch (error) {
        if (sequence === detailSequence) {
          modalOpen.value = false;
          message.error(errorText(error));
        }
      } finally {
        if (sequence === detailSequence) detailLoading.value = false;
      }
    }

    function changeProvider(value: unknown): void {
      const previousKeys = Object.values(communicationFields).flatMap((fields) => fields.map((field) => field.key));
      for (const key of previousKeys) delete values[key];
      values.providerCode = value;
      for (const field of communicationFields[String(value)] ?? []) values[field.key] = field.defaultValue;
      formRef.value?.clearValidate?.();
    }

    async function save(): Promise<void> {
      if (saving.value || !selected.value) return;
      try {
        await formRef.value?.validateFields();
        saving.value = true;
        const variable =
          selected.value.code === "THIRD_SERVICE::correspond_service"
            ? JSON.stringify({ providerCode: values.providerCode ?? "", config: { ...values } })
            : JSON.stringify({ ...values });
        await getBusinessConfigClient().updateThirdPartyService({
          ...selected.value,
          variable,
          version: selected.value.version ?? "",
          remarks: selected.value.remarks ?? "",
        });
        message.success("修改成功");
        modalOpen.value = false;
        await load();
      } catch (error) {
        if (error instanceof Error) message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    }

    function renderField(field: FieldDefinition) {
      const onUpdate = (value: unknown) => (values[field.key] = value);
      if (field.key === "providerCode") {
        return (
          <Select
            value={values.providerCode as string | undefined}
            options={[
              { value: "xunYi", label: "讯一" },
              { value: "tencent", label: "腾讯" },
            ]}
            placeholder="请选择服务提供商"
            allowClear
            onUpdate:value={changeProvider}
          />
        );
      }
      if (field.kind === "boolean") {
        return (
          <RadioGroup
            value={values[field.key] as boolean | undefined}
            options={[
              { value: true, label: "是" },
              { value: false, label: "否" },
            ]}
            onUpdate:value={onUpdate}
          />
        );
      }
      if (field.kind === "number") {
        return (
          <InputNumber
            value={values[field.key] as number | undefined}
            min={field.min}
            max={field.max}
            precision={field.precision}
            placeholder={field.placeholder}
            onUpdate:value={onUpdate}
            style={{ width: "100%" }}
          />
        );
      }
      const Control = field.kind === "textarea" ? Text : Input;
      return (
        <Control value={values[field.key] as string | undefined} placeholder={field.placeholder ?? "请输入"} onUpdate:value={onUpdate} />
      );
    }

    onMounted(() => void load());

    return () => (
      <PageLayout
        title="三方服务配置"
        v-slots={{
          "layout-content": () => (
            <Spin spinning={listLoading.value}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                {records.value.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => void openConfig(record)}
                    style={{
                      width: "270px",
                      minHeight: "150px",
                      border: 0,
                      background: "#f2f2f2",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: 600,
                    }}
                  >
                    {record.name}
                  </button>
                ))}
              </div>
              <Modal
                open={modalOpen.value}
                title={selected.value?.name ?? ""}
                width={600}
                okText="确定"
                cancelText="取消"
                confirmLoading={saving.value}
                onOk={() => void save()}
                onCancel={() => {
                  detailSequence++;
                  modalOpen.value = false;
                }}
              >
                {detailLoading.value ? <Spin /> : null}
                {!detailLoading.value && selected.value ? (
                  <div style={{ maxHeight: "600px", paddingRight: "10px", overflowY: "auto" }}>
                    <Form ref={formRef} model={values} labelCol={{ style: { width: "120px" } }}>
                      {activeFields.value.map((field) => (
                        <FormItem
                          key={field.key}
                          label={field.label}
                          name={field.key}
                          rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
                        >
                          {renderField(field)}
                        </FormItem>
                      ))}
                    </Form>
                  </div>
                ) : null}
              </Modal>
            </Spin>
          ),
        }}
      />
    );
  },
});
