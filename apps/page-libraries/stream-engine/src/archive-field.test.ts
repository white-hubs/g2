import { expect, test } from "bun:test";
import { effectScope, nextTick, reactive } from "vue";

import { type ArchiveFieldData, type ArchiveFieldValue, archiveFieldValue, useArchiveField } from "./archive-field";

test("personnel archive values retain scalar attributes without an id", () => {
  expect(archiveFieldValue({ id: "", name: "大学本科" })).toEqual({ id: "", name: "大学本科" });
  expect(archiveFieldValue({ name: "13800138000" })).toEqual({ id: "", name: "13800138000" });
  expect(archiveFieldValue(null)).toBeNull();
});

test("a detail archive preserves its snapshot then refreshes an edited related employee", async () => {
  const calls: { attr: string; id: string }[] = [];
  const changes: (ArchiveFieldValue | null)[] = [];
  const data = reactive<ArchiveFieldData>({
    client: {
      getStaffInfo: async (params) => {
        calls.push(params);
        return { name: params.id === "user-2" ? "新档案" : "旧档案" };
      },
      getStaffDetail: async () => ({ name: "发起人" }),
    },
    sourceId: "user-1",
    attr: "education",
    sponsor: false,
    detail: true,
    readonly: false,
  });
  const scope = effectScope();
  scope.run(() =>
    useArchiveField(
      data,
      (value) => changes.push(value),
      () => {},
    ),
  );
  await nextTick();
  expect(calls).toEqual([]);
  data.sourceId = "user-2";
  await nextTick();
  await nextTick();
  expect(calls).toEqual([{ attr: "education", id: "user-2" }]);
  expect(changes).toEqual([{ id: "", name: "新档案" }]);
  scope.stop();
});

test("readonly historical archives do not fetch when the related employee changes", async () => {
  const changes: (ArchiveFieldValue | null)[] = [];
  let calls = 0;
  const data = reactive<ArchiveFieldData>({
    client: {
      getStaffInfo: async () => {
        calls++;
        return { name: "新档案" };
      },
      getStaffDetail: async () => ({ name: "发起人" }),
    },
    sourceId: "user-1",
    attr: "mobile",
    sponsor: false,
    detail: true,
    readonly: true,
  });
  const scope = effectScope();
  scope.run(() =>
    useArchiveField(
      data,
      (value) => changes.push(value),
      () => {},
    ),
  );
  data.sourceId = "user-2";
  await nextTick();
  expect(calls).toBe(0);
  expect(changes).toEqual([]);
  scope.stop();
});

test("new sponsor fields use the user-detail API even when the form field is readonly", async () => {
  const calls: string[] = [];
  const changes: (ArchiveFieldValue | null)[] = [];
  const data = reactive<ArchiveFieldData>({
    client: {
      getStaffInfo: async () => ({ name: "错误来源" }),
      getStaffDetail: async (id) => {
        calls.push(id);
        return { id, name: "发起人甲" };
      },
    },
    sourceId: "user-1",
    attr: "name",
    sponsor: true,
    detail: false,
    readonly: true,
  });
  const scope = effectScope();
  scope.run(() =>
    useArchiveField(
      data,
      (value) => changes.push(value),
      () => {},
    ),
  );
  await nextTick();
  expect(calls).toEqual(["user-1"]);
  expect(changes).toEqual([{ id: "user-1", name: "发起人甲" }]);
  scope.stop();
});

test("an old archive response cannot overwrite the initiator after the related employee is cleared", async () => {
  const responses = new Map<string, (value: { name: string }) => void>();
  const changes: (ArchiveFieldValue | null)[] = [];
  const data = reactive<ArchiveFieldData>({
    client: {
      getStaffInfo: ({ id }) =>
        new Promise((resolve) => {
          responses.set(id, resolve);
        }),
      getStaffDetail: async () => ({ name: "发起人" }),
    },
    sourceId: "user-2",
    attr: "mobile",
    sponsor: false,
    detail: false,
    readonly: false,
  });
  const scope = effectScope();
  const state = scope.run(() =>
    useArchiveField(
      data,
      (value) => changes.push(value),
      () => {},
    ),
  )!;
  data.sourceId = "initiator";
  await nextTick();
  responses.get("user-2")?.({ name: "旧人员电话" });
  await nextTick();
  expect(changes).toEqual([]);
  responses.get("initiator")?.({ name: "发起人电话" });
  await nextTick();
  expect(changes).toEqual([{ id: "", name: "发起人电话" }]);
  expect(state.loading.value).toBe(false);
  scope.stop();
});
