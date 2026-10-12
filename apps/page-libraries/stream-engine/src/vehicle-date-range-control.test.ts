import { expect, test } from "bun:test";
import { effectScope, nextTick, reactive } from "vue";

import {
  type VehicleDateRangeData,
  type VehicleDateRangeValue,
  useVehicleDateRange,
  vehicleDateRangePlate,
  vehicleDateRangeValue,
} from "./vehicle-date-range-control";

test("vehicle date range resolves a root plate and the current legacy grouped row", () => {
  expect(vehicleDateRangePlate({ params: "plate", formValues: { plate: "沪A12345" } })).toBe("沪A12345");
  const rows = [{ plate: "沪A12345" }, { plate: "沪B67890" }];
  expect(vehicleDateRangePlate({ params: "fleet>plate", formValues: {}, rootFormValues: { fleet: rows } })).toBe("沪B67890");
  expect(vehicleDateRangePlate({ params: "fleet>plate", formValues: {}, rootFormValues: { fleet: rows }, rowChain: [rows[0]!] })).toBe(
    "沪A12345",
  );
  expect(vehicleDateRangePlate({ params: "fleet>plate", formValues: {}, rootFormValues: { fleet: [] } })).toBe("");
});

test("vehicle period preserves the two-entry value and the configured date format", () => {
  expect(vehicleDateRangeValue({ begin: "2026-09-28 08:30:00", end: "2026-10-01 18:45:00" }, "yyyy-MM-dd HH:mm:ss")).toEqual([
    "2026-09-28 08:30:00",
    "2026-10-01 18:45:00",
  ]);
  expect(vehicleDateRangeValue({ begin: "2026-09-28 08:30:00", end: "2026-10-01 18:45:00" }, "yyyy-MM-dd")).toEqual([
    "2026-09-28",
    "2026-10-01",
  ]);
  expect(vehicleDateRangeValue({ begin: "2026-09-28" }, "yyyy-MM-dd")).toEqual([null, null]);
  expect(vehicleDateRangeValue({ begin: "invalid", end: "invalid" }, "yyyy-MM-dd")).toEqual([null, null]);
});

test("plate switching ignores a late result and clears loading after the current result", async () => {
  const changes: VehicleDateRangeValue[] = [];
  const responses = new Map<string, (value: { begin: string; end: string }) => void>();
  const data = reactive<VehicleDateRangeData>({
    client: {
      getVehicleNumberTime: (plate) =>
        new Promise((resolve) => {
          responses.set(plate, resolve);
        }),
    },
    params: "plate",
    formValues: { plate: "沪A12345" },
    format: "yyyy-MM-dd",
    readonly: false,
  });
  const scope = effectScope();
  const state = scope.run(() =>
    useVehicleDateRange(
      data,
      (value) => changes.push(value),
      () => {},
    ),
  )!;
  expect(state.loading.value).toBe(true);
  data.formValues.plate = "沪B67890";
  await nextTick();
  responses.get("沪A12345")?.({ begin: "2026-01-01", end: "2026-02-01" });
  await nextTick();
  expect(changes).toEqual([]);
  expect(state.loading.value).toBe(true);
  responses.get("沪B67890")?.({ begin: "2026-03-01", end: "2026-04-01" });
  await nextTick();
  expect(changes).toEqual([["2026-03-01", "2026-04-01"]]);
  expect(state.loading.value).toBe(false);
  scope.stop();
});

test("readonly snapshots and an unlinked range do not request or overwrite their value", async () => {
  const calls: string[] = [];
  const changes: VehicleDateRangeValue[] = [];
  const data = reactive<VehicleDateRangeData>({
    client: {
      getVehicleNumberTime: async (plate) => {
        calls.push(plate);
        return { begin: "2026-01-01", end: "2026-02-01" };
      },
    },
    params: "plate",
    formValues: { plate: "沪A12345" },
    format: "yyyy-MM-dd",
    readonly: true,
  });
  const scope = effectScope();
  scope.run(() =>
    useVehicleDateRange(
      data,
      (value) => changes.push(value),
      () => {},
    ),
  );
  await nextTick();
  expect(calls).toEqual([]);
  data.params = "";
  data.readonly = false;
  await nextTick();
  expect(calls).toEqual([]);
  expect(changes).toEqual([]);
  scope.stop();
});

test("a grouped render with a new row object does not repeat the same plate lookup", async () => {
  const calls: string[] = [];
  const data = reactive<VehicleDateRangeData>({
    client: {
      getVehicleNumberTime: async (plate) => {
        calls.push(plate);
        return { begin: "2026-01-01", end: "2026-02-01" };
      },
    },
    params: "plate",
    formValues: { plate: "沪A12345" },
    format: "yyyy-MM-dd",
    readonly: false,
  });
  const scope = effectScope();
  scope.run(() =>
    useVehicleDateRange(
      data,
      () => {},
      () => {},
    ),
  );
  await nextTick();
  data.formValues = { ...data.formValues, period: ["2026-01-01", "2026-02-01"] };
  await nextTick();
  expect(calls).toEqual(["沪A12345"]);
  scope.stop();
});

test("vehicle lookup reports an error, preserves the existing range and recovers", async () => {
  const changes: VehicleDateRangeValue[] = [];
  const errors: unknown[] = [];
  const data = reactive<VehicleDateRangeData>({
    client: {
      getVehicleNumberTime: async (plate) => {
        if (plate === "坏号牌") {
          throw new Error("车辆有效期查询失败");
        }
        return {};
      },
    },
    params: "plate",
    formValues: { plate: "坏号牌" },
    format: "yyyy-MM-dd",
    readonly: false,
  });
  const scope = effectScope();
  const state = scope.run(() =>
    useVehicleDateRange(
      data,
      (value) => changes.push(value),
      (error) => errors.push(error),
    ),
  )!;
  await nextTick();
  expect(errors).toHaveLength(1);
  expect(changes).toEqual([]);
  expect(state.loading.value).toBe(false);
  data.formValues.plate = "无有效期号牌";
  await nextTick();
  await nextTick();
  expect(changes).toEqual([[null, null]]);
  expect(state.loading.value).toBe(false);
  scope.stop();
});
