import { expect, test } from "bun:test";
import { effectScope, nextTick, reactive } from "vue";

import { carIdSourceId, useCarIdOptions, type CarIdData } from "./car-id-control";

test("CarId resolves the first selected user or a scalar dependency", () => {
  expect(carIdSourceId([{ id: "user-1" }, { id: "user-2" }])).toBe("user-1");
  expect(carIdSourceId({ id: "user-3" })).toBe("user-3");
  expect(carIdSourceId("user-4")).toBe("user-4");
  expect(carIdSourceId([])).toBe("");
});

test("CarId keeps the configured default until the add form selects the first fetched plate", async () => {
  const changes: string[] = [];
  const data = reactive<CarIdData>({
    client: { getVehicleNumbers: async (id) => (id === "user-1" ? ["沪A12345", "沪B67890"] : []) },
    params: "person",
    formValues: { person: [{ id: "user-1" }] },
    value: null,
    defaultValue: "默认号牌",
    detail: false,
  });
  const scope = effectScope();
  const state = scope.run(() =>
    useCarIdOptions(
      data,
      (value) => changes.push(value),
      () => {},
    ),
  )!;
  expect(changes).toEqual(["默认号牌"]);
  expect(state.loading.value).toBe(true);
  await nextTick();
  expect(state.options.value).toEqual(["沪A12345", "沪B67890"]);
  expect(changes).toEqual(["默认号牌", "沪A12345"]);
  expect(state.loading.value).toBe(false);
  scope.stop();
});

test("CarId ignores a stale lookup after its dependent user changes", async () => {
  const changes: string[] = [];
  const responses = new Map<string, (plates: string[]) => void>();
  const data = reactive<CarIdData>({
    client: {
      getVehicleNumbers: (id) =>
        new Promise((resolve) => {
          responses.set(id, resolve);
        }),
    },
    params: "person",
    formValues: { person: [{ id: "user-1" }] },
    value: null,
    defaultValue: "",
    detail: false,
  });
  const scope = effectScope();
  const state = scope.run(() =>
    useCarIdOptions(
      data,
      (value) => changes.push(value),
      () => {},
    ),
  )!;
  data.formValues.person = [{ id: "user-2" }];
  await nextTick();
  responses.get("user-1")?.(["旧号牌"]);
  await nextTick();
  expect(changes).toEqual([]);
  expect(state.loading.value).toBe(true);
  responses.get("user-2")?.(["新号牌"]);
  await nextTick();
  expect(state.options.value).toEqual(["新号牌"]);
  expect(changes).toEqual(["新号牌"]);
  scope.stop();
});

test("CarId detail lookup preserves the recorded plate", async () => {
  const changes: string[] = [];
  const data = reactive<CarIdData>({
    client: { getVehicleNumbers: async () => ["新号牌"] },
    params: "person",
    formValues: { person: "user-1" },
    value: "原号牌",
    defaultValue: "默认号牌",
    detail: true,
  });
  const scope = effectScope();
  scope.run(() =>
    useCarIdOptions(
      data,
      (value) => changes.push(value),
      () => {},
    ),
  );
  await nextTick();
  expect(changes).toEqual([]);
  scope.stop();
});
