import { describe, expect, test } from "bun:test";

import { buildPrintFields, buildPrintOperations, formatPrintValue } from "./process-print";

describe("stream engine print parity", () => {
  test("applies print flags, node permissions, group rows and table columns", () => {
    const fields = buildPrintFields({
      schemaItems: [
        { id: "hidden", name: "TextInput", title: "不打印", props: { showPrint: false } },
        { id: "secret", name: "TextInput", title: "隐藏", props: { showPrint: true } },
        { id: "blank", name: "TextInput", title: "只读空值", props: { showPrint: true } },
        {
          id: "group",
          name: "GroupList",
          props: { items: [{ id: "person", name: "TextInput", title: "人员", props: { showPrint: true } }] },
        },
        { id: "assets", name: "ChooseAssetTable", title: "资产", props: { showPrint: false } },
      ],
      formValues: {
        hidden: "不应出现",
        secret: "不应出现",
        blank: "",
        group: [{ person: "甲" }, { person: "乙" }],
        assets: [{ serialNumber: "A-1", name: "设备", purchaseDate: "2026-09-24T00:00:00" }],
      },
      formPerms: [
        { id: "secret", perm: "H" },
        { id: "blank", perm: "R" },
      ],
      processType: "detail",
      nodeId: "approval",
    });
    expect(fields.filter((field) => field.kind === "text")).toEqual([
      { kind: "text", title: "人员", value: "甲" },
      { kind: "text", title: "人员", value: "乙" },
    ]);
    expect(fields[2]?.kind === "table" ? fields[2].columns.slice(0, 3) : []).toEqual(["序号", "资产编码", "资产名称"]);
    expect(fields[2]?.kind === "table" ? fields[2].rows[0]?.slice(0, 3) : []).toEqual(["1", "A-1", "设备"]);
  });

  test("formats legacy business values", () => {
    expect(formatPrintValue({ name: "AssetIsExpired" }, false)).toBe("否");
    expect(formatPrintValue({ name: "VacationDate" }, ["2026-09-24 AM", "2026-09-25 PM"])).toBe("2026-09-24 上午~2026-09-25 下午");
    expect(formatPrintValue({ name: "ServicePeriod" }, { radioValue: "limited", date: "2027-01-01" })).toBe("服务期限至2027-01-01");
    expect(formatPrintValue({ name: "AccessPermission" }, { accessControl: true, accessControlRows: [{ name: "南门" }] })).toBe(
      "南门开启门禁权限",
    );
    expect(
      formatPrintValue(
        { name: "ParkingPermission" },
        { parkingControl: true, parkingControlRows: [{ name: "东停车场" }, { deviceName: "西停车场" }] },
      ),
    ).toBe("东停车场,西停车场开启停车权限");
    expect(formatPrintValue({ name: "WorkPermitTypeSelect" }, { id: "1", typeName: "动火作业" })).toBe("动火作业");
    expect(formatPrintValue({ name: "WorkPermitRiskCheckItems" }, [{ itemName: "灭火器", confirmResult: "NORMAL" }])).toBe("灭火器：正常");
    expect(formatPrintValue({ name: "DeviceStatus" }, [{ name: "温度", value: 0, unitName: "℃" }])).toBe("温度：0℃");
  });

  test("prints linked group fields using each row instead of the root value", () => {
    const fields = buildPrintFields({
      schemaItems: [
        {
          id: "group",
          name: "GroupList",
          props: {
            items: [
              { id: "option", name: "SelectInput", title: "选项", props: { showPrint: true } },
              { id: "note", name: "TextInput", title: "说明", props: { showPrint: true, relateParams: { option: "是" } } },
            ],
          },
        },
      ],
      formValues: {
        option: "否",
        group: [
          { option: "是", note: "第一行说明" },
          { option: "否", note: "隐藏说明" },
        ],
      },
      formPerms: [],
      processType: "detail",
      nodeId: "approval",
    });
    expect(fields).toEqual([
      { kind: "text", title: "选项", value: "是" },
      { kind: "text", title: "说明", value: "第一行说明" },
      { kind: "text", title: "选项", value: "否" },
    ]);
  });

  test("uses the nearest nested group value and falls back to its parent row", () => {
    const fields = buildPrintFields({
      schemaItems: [
        {
          id: "group",
          name: "GroupList",
          props: {
            items: [
              { id: "option", name: "MultipleSelect", props: { showPrint: false } },
              {
                id: "nested",
                name: "GroupList",
                props: {
                  items: [{ id: "note", name: "TextInput", title: "说明", props: { showPrint: true, relateParams: { option: "是" } } }],
                },
              },
            ],
          },
        },
      ],
      formValues: { option: ["否"], group: [{ option: ["是"], nested: [{ note: "继承父行" }, { option: ["否"], note: "隐藏说明" }] }] },
      formPerms: [],
      processType: "detail",
      nodeId: "approval",
    });
    expect(fields).toEqual([{ kind: "text", title: "说明", value: "继承父行" }]);
  });

  test("prints asset table objects, finance number and read-only false values", () => {
    const fields = buildPrintFields({
      schemaItems: [
        { id: "assets", name: "AddAssetTable", title: "添加资产", props: { showPrint: true } },
        { id: "expired", name: "AssetIsExpired", title: "是否逾龄", props: { showPrint: true } },
      ],
      formValues: { assets: [{ serialNumber: "AS-1", financeNumber: "FI-1", type: { id: "T1", name: "办公设备" } }], expired: false },
      formPerms: [{ id: "expired", perm: "R" }],
      processType: "detail",
      nodeId: "approval",
    });
    expect(fields[0]?.kind === "table" ? fields[0].rows[0]?.slice(0, 5) : []).toEqual(["1", "AS-1", "FI-1", "--", "办公设备"]);
    expect(fields[1]).toEqual({ kind: "text", title: "是否逾龄", value: "否" });
  });

  test("recomputes historical consumable issue amounts without changing submitted rows", () => {
    const row = { id: "C1", avgPrice: 2.5, num: 3, storeAmount: 1 };
    const fields = buildPrintFields({
      schemaItems: [{ id: "out", name: "ConsumablesOut", title: "耗材", props: { showPrint: true } }],
      formValues: { out: [row] },
      formPerms: [],
      processType: "detail",
      nodeId: "approval",
    });
    expect(fields[0]?.kind === "table" ? fields[0].rows[0]?.at(-1) : "").toBe("7.5");
    expect(row.storeAmount).toBe(1);
  });

  test("prints approval content only for artificial or enabled automatic approval", () => {
    const node = {
      nodeName: "审批人",
      approvalCommentConfig: { supportText: true, supportHandwrittenSignature: true },
      taskOperations: [
        {
          operation: {
            operator: { name: "张三" },
            typeAlias: "同意",
            createTime: 1789948800000,
            approvalOpinion: { approvalType: "ARTIFICIAL", text: "通过", sign: "sign-1" },
          },
        },
        {
          operation: { operator: { name: "系统" }, createTime: 1789948800000, approvalOpinion: { approvalType: "AUTO", text: "自动通过" } },
        },
      ],
    };
    const hiddenAuto = buildPrintOperations([node]);
    expect(hiddenAuto[0]).toMatchObject({ operator: "张三", action: "同意", opinion: "审批意见：通过", signId: "sign-1" });
    expect(hiddenAuto[1]).toMatchObject({ operator: "", action: "" });
    expect(hiddenAuto[1]?.time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(buildPrintOperations([node], { autoApprovalPrinting: true })[1]?.operator).toBe("系统");
  });
});
