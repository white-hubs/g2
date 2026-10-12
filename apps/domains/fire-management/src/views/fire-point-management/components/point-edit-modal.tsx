import type { FirePointRecord } from "@g2-contract/fire-management";
import { defineComponent, shallowRef } from "vue";

import { updateFirePoint } from "@/api/server";
import { usePcForm, usePcModal } from "@/pc-ui-runtime";
import { message } from "@/pc-ui-runtime";

const keepEditPending = (): void => undefined;

const normalizeBusType = (value: unknown): 1 | 2 | undefined => {
  if (value === 1 || value === "1") return 1;
  if (value === 2 || value === "2") return 2;
  return undefined;
};

export const PointEditModal = defineComponent({
  name: "PointEditModal",
  props: {
    hostId: { type: String, required: true },
  },
  emits: ["saved"],
  setup: (props, { emit, expose }) => {
    const editingPoint = shallowRef<FirePointRecord | null>(null);

    const savePoint = async (values: Record<string, unknown>): Promise<void> => {
      const point = editingPoint.value;
      if (!point) return;
      modalApi.setConfirmLoading(true);
      try {
        const coordinateX = values.coordinateX;
        const coordinateY = values.coordinateY;
        const busType = normalizeBusType(values.busType);
        await updateFirePoint({
          id: point.id,
          fireManageDeviceId: props.hostId,
          ...(point.deviceId !== undefined ? { deviceId: point.deviceId } : {}),
          pointName: String(values.pointName ?? "").trim(),
          circuit: String(values.circuit ?? "").trim(),
          address: String(values.address ?? "").trim(),
          ...(values.pointCode ? { pointCode: String(values.pointCode).trim() } : {}),
          ...(busType ? { busType } : {}),
          ...(values.location ? { location: String(values.location).trim() } : {}),
          ...(coordinateX !== undefined && coordinateX !== null && coordinateX !== "" ? { coordinateX: Number(coordinateX) } : {}),
          ...(coordinateY !== undefined && coordinateY !== null && coordinateY !== "" ? { coordinateY: Number(coordinateY) } : {}),
        });
        modalApi.close();
        emit("saved");
        message.success("点位编辑保存成功");
      } catch (error) {
        message.error((error as Error).message || "保存点位失败");
      } finally {
        modalApi.setConfirmLoading(false);
      }
    };

    const [EditForm, formApi] = usePcForm({
      cache: false,
      layout: "vertical",
      showButton: false,
      isCollapsed: false,
      schema: [
        {
          component: "Input",
          fieldName: "pointName",
          label: "点位名称",
          componentProps: { placeholder: "请输入点位名称", maxlength: 100, allowClear: true, onChange: keepEditPending },
        },
        {
          component: "Input",
          fieldName: "circuit",
          label: "回路号",
          componentProps: { placeholder: "支持数字、字母及组合编码", allowClear: true, onChange: keepEditPending },
        },
        {
          component: "Input",
          fieldName: "address",
          label: "地址码",
          componentProps: { placeholder: "支持数字、字母及组合编码", allowClear: true, onChange: keepEditPending },
        },
        {
          component: "Input",
          fieldName: "pointCode",
          label: "编号",
          componentProps: { placeholder: "请输入编号", allowClear: true, onChange: keepEditPending },
        },
        {
          component: "Select",
          fieldName: "busType",
          label: "接线样式",
          componentProps: {
            allowClear: true,
            placeholder: "请选择接线样式",
            options: [
              { label: "总线", value: 1 },
              { label: "多线", value: 2 },
            ],
            onChange: keepEditPending,
          },
        },
        {
          component: "Input",
          fieldName: "location",
          label: "所属位置",
          componentProps: { placeholder: "请输入所属位置", allowClear: true, onChange: keepEditPending },
        },
        {
          component: "InputNumber",
          fieldName: "coordinateX",
          label: "X 坐标（平面图百分比）",
          componentProps: { min: 0, max: 100, precision: 0, style: { width: "100%" }, onChange: keepEditPending },
        },
        {
          component: "InputNumber",
          fieldName: "coordinateY",
          label: "Y 坐标（平面图百分比）",
          componentProps: { min: 0, max: 100, precision: 0, style: { width: "100%" }, onChange: keepEditPending },
        },
      ],
      handleSubmit: savePoint,
    });

    const [EditModal, modalApi] = usePcModal({
      title: "编辑点位数据",
      width: "680px",
      centered: true,
      closeOnClickModal: false,
      onConfirm: () => formApi.handleSubmit(),
      onClosed: () => {
        editingPoint.value = null;
        formApi.handleReset();
      },
    });

    const openModal = (point: FirePointRecord): void => {
      editingPoint.value = point;
      formApi.setFormValues({
        pointName: point.pointName || point.name || "",
        circuit: String(point.circuit ?? ""),
        address: String(point.address ?? ""),
        pointCode: point.pointCode || point.code || "",
        busType: normalizeBusType(point.busType),
        location: point.location || point.locationName || "",
        coordinateX: point.coordinateX ?? point.posX,
        coordinateY: point.coordinateY ?? point.posY,
      });
      modalApi.open();
    };

    expose({ openModal });

    return () => <EditModal v-slots={{ default: () => <EditForm /> }} />;
  },
});
