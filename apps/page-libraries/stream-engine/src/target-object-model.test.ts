import { expect, test } from "bun:test";

import { targetObjectDisplay, targetObjectName, targetObjectOptions, targetObjectQuery, targetObjectValue } from "./target-object-model";

test("device query keeps all legacy filters and category path while generic/outsourced devices retain their own contract", () => {
  const values = {
    keyword: "循环泵",
    tagCodes: ["pump", "critical"],
    anyMatchedDepartmentId: "dep",
    anyMatchedAreaId: "area",
    productId: "prod",
    categoryCode: ["mechanical", "pump"],
  };
  expect(targetObjectQuery("DEVICE", values, 2, 15)).toEqual({
    pageNumber: 2,
    pageSize: 15,
    keyword: "循环泵",
    tagCodes: ["pump", "critical"],
    anyMatchedDepartmentId: "dep",
    anyMatchedAreaId: "area",
    productId: "prod",
    categoryCode: "mechanical-pump",
  });
  expect(targetObjectQuery("DEVICE", values, 2, 15, { legacyDevice: true })).toEqual({ pageNumber: 2, pageSize: 15, keyword: "循环泵" });
  expect(targetObjectQuery("DEVICE", values, 2, 15, { outSource: true })).toEqual({
    pageNumber: 2,
    pageSize: 15,
    keyword: "循环泵",
    enabled: true,
  });
});

test("every target type uses its old field names and RectifyTarget retains enabled", () => {
  expect(targetObjectQuery("AREA", { keyword: "ignored" }, 1, 10)).toEqual({});
  expect(targetObjectQuery("PROPERTY", { keyword: "打印机", typeId: "office", receiveDepId: "dep" }, 1, 10)).toEqual({
    pageNumber: 1,
    pageSize: 10,
    keyword: "打印机",
    typeId: "office",
    receiveDepId: "dep",
    status: "",
    areaId: "",
    sourceId: "",
    purchaseStartDate: "",
    purchaseEndDate: "",
    usageDate: "",
  });
  expect(targetObjectQuery("STALL", { type: "stall", areaId: "area", keyword: "档位" }, 1, 10)).toEqual({
    pageNumber: 1,
    pageSize: 10,
    enabled: true,
    keyword: "档位",
    type: "stall",
    areaId: "area",
  });
  expect(targetObjectQuery("SITE_POINT", { pointName: "消防栓", typeId: "fire", receiveDepId: "dep" }, 1, 10)).toEqual({
    pageNumber: 1,
    pageSize: 10,
    pointName: "消防栓",
    typeId: "fire",
    receiveDepId: "dep",
  });
  expect(targetObjectQuery("PATROL_POINT", { keyword: "北门", areaId: "area" }, 1, 10)).toEqual({
    pageNumber: 1,
    pageSize: 10,
    keyword: "北门",
    areaId: "area",
  });
  expect(targetObjectQuery("RISK_SOURCE", { keyword: "配电柜", typeCode: "electrical" }, 1, 10)).toEqual({
    pageNumber: 1,
    pageSize: 10,
    keyword: "配电柜",
    typeCode: "electrical",
    areaId: "",
  });
  expect(targetObjectQuery("SMALL_ENGINEERING", { keyword: "铺路", depId: "dep", status: "UNDERWAY" }, 1, 10)).toEqual({
    pageNumber: 1,
    pageSize: 10,
    keyword: "铺路",
    depId: "dep",
    status: "UNDERWAY",
  });
  expect(targetObjectQuery("SMALL_ENGINEERING", {}, 1, 10, { rectify: true })).toEqual({
    pageNumber: 1,
    pageSize: 10,
    keyword: "",
    depId: "",
    status: "",
    enabled: true,
  });
});

test("risk dictionary nextList and IoT category fields become filter options without losing child values", () => {
  expect(
    targetObjectOptions(
      { data: [{ code: "fire", name: "消防", nextList: [{ code: "fire-equipment", name: "消防设备" }] }] },
      { value: "code", children: "nextList" },
    ),
  ).toEqual([{ value: "fire", label: "消防", children: [{ value: "fire-equipment", label: "消防设备" }] }]);
  expect(
    targetObjectOptions(
      [{ categoryCode: "mechanical", categoryName: "机电", children: [{ categoryCode: "pump", categoryName: "水泵" }] }],
      { value: "categoryCode", label: "categoryName" },
    ),
  ).toEqual([{ value: "mechanical", label: "机电", children: [{ value: "pump", label: "水泵" }] }]);
  expect(targetObjectOptions(undefined)).toEqual([]);
});

test("selection retains target DTO and selection type across tab switches, while RectifyTarget emits only id/name", () => {
  const patrol = { id: "patrol-1", type: "PATROL_POINT", patrolLocationName: "北门巡更点", area: [{ name: "北区" }] };
  expect(targetObjectValue([patrol], "DEVICE")).toEqual({ ...patrol, name: "北门巡更点", flowConvertData: false });
  const project = { id: "project-1", projectName: "道路整修", projectTypeName: "日常维修", depName: "监管部" };
  expect(targetObjectValue([project], "SMALL_ENGINEERING", { compact: true, array: true })).toEqual([
    { id: "project-1", name: "道路整修" },
  ]);
  expect(targetObjectName(patrol)).toBe("北门巡更点");
  expect(targetObjectDisplay([{ name: "维护部" }, "电气部"])).toBe("维护部/电气部");
  expect(targetObjectDisplay({ pathName: "北区/泵房" })).toBe("北区/泵房");
});
