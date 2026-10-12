import { loadRuntimeCommon } from "@g2-runtime/common-loader";

type PcUiModule = typeof import("@g2-platform/pc-ui");

// Page library exposes individual pages rather than a domain install hook. Resolve
// the shared UI module before any exposed page can render, and fail closed if it
// is unavailable instead of silently bundling a second implementation.
const pcUi = await loadRuntimeCommon<PcUiModule>("pcUi", "index");

export const Alert = pcUi.Alert;
export const AntRangePicker = pcUi.AntRangePicker;
export const Button = pcUi.Button;
export const Card = pcUi.Card;
export const Cascader = pcUi.Cascader;
export const Checkbox = pcUi.Checkbox;
export const CheckboxGroup = pcUi.CheckboxGroup;
export const Col = pcUi.Col;
export const Collapse = pcUi.Collapse;
export const DatePicker = pcUi.DatePicker;
export const DeleteOutlined = pcUi.DeleteOutlined;
export const Drawer = pcUi.Drawer;
export const EditOutlined = pcUi.EditOutlined;
export const Empty = pcUi.Empty;
export const Form = pcUi.Form;
export const FormItem = pcUi.FormItem;
export const Image = pcUi.Image;
export const Input = pcUi.Input;
export const InputNumber = pcUi.InputNumber;
export const Modal = pcUi.Modal;
export const Page = pcUi.Page;
export const PageLayout = pcUi.PageLayout;
export const Pagination = pcUi.Pagination;
export const PopConfirm = pcUi.PopConfirm;
export const PopOver = pcUi.PopOver;
export const Popconfirm = pcUi.Popconfirm;
export const Popover = pcUi.Popover;
export const Radio = pcUi.Radio;
export const RadioGroup = pcUi.RadioGroup;
export const Row = pcUi.Row;
export const Select = pcUi.Select;
export const Space = pcUi.Space;
export const Spin = pcUi.Spin;
export const Switch = pcUi.Switch;
export const TabPane = pcUi.TabPane;
export const Table = pcUi.Table;
export const Tabs = pcUi.Tabs;
export const Tag = pcUi.Tag;
export const Tree = pcUi.Tree;
export const dayjs = pcUi.dayjs;
export const message = pcUi.message;
export const usePcForm = pcUi.usePcForm;
export const usePcTable = pcUi.usePcTable;

export type { Dayjs } from "@g2-platform/pc-ui";
