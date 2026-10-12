import { computed, defineComponent, reactive, shallowRef } from "vue";

import type { PointCoordinateRecord, PointCoordinateUpdate } from "../fire-config-management.model";
import { usePcModal } from "@/pc-ui-runtime";
import { InputNumber, Select, TabPane, Tabs, message } from "@/pc-ui-runtime";

import styles from "../fire-config-management.module.css";

type BatchMode = "set" | "offset";
type OffsetOperator = "+" | "-";

const clampCoordinate = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

export const BatchCoordinateModal = defineComponent({
  name: "BatchCoordinateModal",
  emits: ["applied"],
  setup: (_props, { emit, expose }) => {
    const selectedPoints = shallowRef<PointCoordinateRecord[]>([]);
    const mode = shallowRef<BatchMode>("set");
    const formState = reactive<{
      x: number | undefined;
      y: number | undefined;
      offsetX: number | undefined;
      offsetY: number | undefined;
      operatorX: OffsetOperator;
      operatorY: OffsetOperator;
    }>({
      x: undefined,
      y: undefined,
      offsetX: undefined,
      offsetY: undefined,
      operatorX: "+",
      operatorY: "+",
    });

    const modeDescription = computed(() =>
      mode.value === "set"
        ? "将已填写的坐标统一设置到全部选中点位，未填写的坐标保持原值。"
        : "在每个点位当前坐标的基础上，分别增加或减少指定偏移量。",
    );

    const resetState = (): void => {
      mode.value = "set";
      formState.x = undefined;
      formState.y = undefined;
      formState.offsetX = undefined;
      formState.offsetY = undefined;
      formState.operatorX = "+";
      formState.operatorY = "+";
    };

    const buildUpdates = (): PointCoordinateUpdate[] | null => {
      if (mode.value === "set") {
        if (formState.x === undefined && formState.y === undefined) {
          message.warning("请至少输入一个坐标值");
          return null;
        }
        return selectedPoints.value.map((point) => ({
          id: point.id,
          x: formState.x === undefined ? point.x : clampCoordinate(formState.x),
          y: formState.y === undefined ? point.y : clampCoordinate(formState.y),
        }));
      }

      if (formState.offsetX === undefined && formState.offsetY === undefined) {
        message.warning("请至少输入一个坐标偏移量");
        return null;
      }
      const xDelta = (formState.operatorX === "+" ? 1 : -1) * (formState.offsetX ?? 0);
      const yDelta = (formState.operatorY === "+" ? 1 : -1) * (formState.offsetY ?? 0);
      return selectedPoints.value.map((point) => ({
        id: point.id,
        x: clampCoordinate(point.x + xDelta),
        y: clampCoordinate(point.y + yDelta),
      }));
    };

    const [PcModal, modalApi] = usePcModal({
      title: "批量编辑点位坐标",
      width: "640px",
      centered: true,
      closeOnClickModal: false,
      onConfirm: () => {
        const updates = buildUpdates();
        if (!updates) return;
        emit("applied", updates);
        modalApi.close();
      },
      onClosed: () => {
        selectedPoints.value = [];
        resetState();
      },
    });

    const openModal = (points: PointCoordinateRecord[]): void => {
      selectedPoints.value = points;
      resetState();
      modalApi.open();
    };

    expose({ openModal });

    const coordinateInput = (label: string, value: number | undefined, update: (value: number | undefined) => void) => (
      <label class={styles["coordinate-field"]}>
        <span>{label}</span>
        <InputNumber
          value={value}
          min={0}
          max={100}
          precision={0}
          placeholder="0 - 100"
          style={{ width: "100%" }}
          onUpdate:value={(nextValue: number | undefined) => update(nextValue)}
        />
      </label>
    );

    const offsetInput = (
      axis: "X" | "Y",
      operator: OffsetOperator,
      value: number | undefined,
      updateOperator: (value: OffsetOperator) => void,
      updateValue: (value: number | undefined) => void,
    ) => (
      <label class={styles["coordinate-field"]}>
        <span>{axis} 坐标偏移</span>
        <div class={styles["offset-field"]}>
          <Select
            value={operator}
            options={[
              { label: "增加", value: "+" },
              { label: "减少", value: "-" },
            ]}
            style={{ width: "96px" }}
            onChange={(nextValue: unknown) => updateOperator(String(nextValue) as OffsetOperator)}
          />
          <InputNumber
            value={value}
            min={0}
            max={100}
            precision={0}
            placeholder="偏移量"
            style={{ flex: 1 }}
            onUpdate:value={(nextValue: number | undefined) => updateValue(nextValue)}
          />
        </div>
      </label>
    );

    return () => (
      <PcModal
        v-slots={{
          default: () => (
            <div>
              <div class={styles["batch-summary"]}>
                已选择 <strong>{selectedPoints.value.length}</strong> 个点位
              </div>
              <Tabs activeKey={mode.value} onChange={(key: string | number) => (mode.value = String(key) as BatchMode)}>
                <TabPane key="set" tab="输入调整" />
                <TabPane key="offset" tab="参数转换" />
              </Tabs>
              <div class={styles["coordinate-description"]}>{modeDescription.value}</div>
              {mode.value === "set" ? (
                <div class={styles["coordinate-grid"]}>
                  {coordinateInput("X 坐标", formState.x, (value) => (formState.x = value))}
                  {coordinateInput("Y 坐标", formState.y, (value) => (formState.y = value))}
                </div>
              ) : (
                <div class={styles["coordinate-grid"]}>
                  {offsetInput(
                    "X",
                    formState.operatorX,
                    formState.offsetX,
                    (value) => (formState.operatorX = value),
                    (value) => (formState.offsetX = value),
                  )}
                  {offsetInput(
                    "Y",
                    formState.operatorY,
                    formState.offsetY,
                    (value) => (formState.operatorY = value),
                    (value) => (formState.offsetY = value),
                  )}
                </div>
              )}
              <div class={styles["coordinate-unit-tip"]}>坐标采用当前平面图百分比，保存时自动限制在 0 - 100 范围内。</div>
            </div>
          ),
        }}
      />
    );
  },
});
