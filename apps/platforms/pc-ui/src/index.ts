import {
  Checkbox as AntCheckbox,
  Image as AntImage,
  Input as AntInput,
  Modal as AntModalComponent,
  Select as AntSelect,
  Upload as AntUpload,
} from "ant-design-vue";
export type { UploadChangeParam, UploadFile } from "ant-design-vue";
import type { App, Component } from "vue";

import "./style";

export {
  Avatar,
  Alert,
  Button,
  Cascader,
  Card,
  Checkbox,
  Collapse,
  ConfigProvider,
  Drawer,
  Descriptions,
  DescriptionsItem,
  Dropdown,
  Empty,
  Form,
  FormItem,
  Image,
  Input,
  InputNumber,
  InputPassword,
  Menu,
  MenuItem,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Popover,
  Progress,
  Rate,
  Radio,
  RadioGroup,
  Row,
  Col,
  Select,
  Space,
  Spin,
  Switch,
  Step,
  Steps,
  Slider,
  SubMenu,
  Table,
  TabPane,
  Tabs,
  Tag,
  TimePicker,
  Timeline,
  TimelineItem,
  Tooltip,
  Tree,
  TreeSelect,
  Result,
} from "ant-design-vue";
export {
  CaretDownOutlined,
  CaretRightOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
  StarFilled,
  WarningFilled,
  AppstoreOutlined,
  BellOutlined,
  BulbOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  HistoryOutlined,
  ImportOutlined,
  LinkOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  StopOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  VideoCameraOutlined,
  WarningOutlined,
} from "@ant-design/icons-vue";
export type { TableColumnType as ColumnType } from "ant-design-vue";

/** 迁域兼容导出：保持三方组件仍由 pc-ui 收敛。 */
export const Textarea: typeof AntInput.TextArea = AntInput.TextArea;
export const InputSearch: typeof AntInput.Search = AntInput.Search;
export const SelectOption: typeof AntSelect.Option = AntSelect.Option;
export const UploadDragger: typeof AntUpload.Dragger = AntUpload.Dragger;
export { AntUpload as Upload };
export const CheckboxGroup: typeof AntCheckbox.Group = AntCheckbox.Group;
export const ImagePreviewGroup: Component = AntImage.PreviewGroup;
export { AntModalComponent as AntModal };
/** @deprecated 新代码请使用 Timeline / TimelineItem；仅为领域迁移保留此导出名称。 */
export { Timeline as TimeLine, TimelineItem as TimeLineItem } from "ant-design-vue";
export { default as dayjs } from "dayjs";
export type { Dayjs } from "dayjs";
export type { FormInstance } from "ant-design-vue";
export type { FormInstance as FormExpose } from "ant-design-vue";

export { Page } from "./page";
export { PopOver } from "./popover";
export { PopConfirm } from "./popconfirm";
export { PageLayout } from "./page-layout";
export { useTableXScroll } from "./use-table-x-scroll";
export { usePcTable } from "./use-pc-table";
export type { UploadRequestOption } from "ant-design-vue/es/vc-upload/interface";
export { usePcForm } from "./use-pc-form";
export { usePcModal } from "./use-pc-modal";
export type { PcModalOptions } from "./use-pc-modal";
export { usePcQueryState } from "./use-pc-query-state";
export type { PcQueryStateApi, PcQueryStateOptions } from "./use-pc-query-state";
export type { PcFormApiOptions, PcFormValueChangeMeta, PcFormSchemaProp } from "./pc-form-types";
export type { PageResultVo, PcTableApiOptions, PcTableColumn } from "./pc-table-types";
export { RangePicker, DatePicker, AntDatePicker, AntRangePicker, datePickerZhCN } from "./date-picker";
/** 旧仓 cube DateRangePicker 别名；新代码请直接使用 RangePicker。 */
export { RangePicker as DateRangePicker } from "./date-picker";
export { ZhConfigProvider, zhCN } from "./zh-config-provider";
export {
  DEFAULT_SKIN_PRIMARY,
  LEGACY_SKIN_COLOR_KEY,
  MF_ROOT_CHANGE_SKIN_EVENT,
  SKIN_STORAGE_KEY,
  primaryColorFromSkinEvent,
  readStoredPrimaryColor,
} from "./skin-primary";
export { useSkinPrimaryColor } from "./use-skin-primary-color";
export { useThemeTokens } from "./use-theme-tokens";

/**
 * antdv `Form` 的 `rules` prop 类型（`RuleObject | RuleObject[]`）本身是个联合类型，消费方（如
 * pc-auth 的 LoginPage）不应该自己手写一个形状相似但不兼容的接口（那样会被 Form 组件的 props 类型
 * 校验拒绝）——这里统一导出一个消费方可直接使用的 `FormRules` 类型别名，避免每个用到 Form 的组件
 * 各自猜一遍 antdv 的内部类型形状。
 */
export type { Rule as FormRule } from "ant-design-vue/es/form/interface";

/**
 * 轻量安装：导入样式。组件请具名或 subpath 导入（`@g2-platform/pc-ui/button` 等），
 * 不再 `app.use(Antd)` 全量注册（G4c 网络/API 按需）。
 */
export function installPcUi(_app: App): void {
  // style side-effect via top-level `import "./style"`
}

export { downloadPDF } from "./download-pdf";
export { PcIcon } from "./pc-icon";
export { Calendar, RadioButton } from "ant-design-vue";
export { MinusCircleOutlined } from "@ant-design/icons-vue";
export type { PickerMode } from "ant-design-vue/es/vc-picker/interface";
export { RichTextEditor } from "./rich-text-editor";
export { generateQrCode } from "./qr-code";
