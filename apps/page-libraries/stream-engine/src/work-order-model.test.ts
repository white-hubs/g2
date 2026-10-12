import { describe, expect, test } from "bun:test";

import {
  buildWorkOrderPayload,
  decodeWorkOrderReturnUrl,
  initialWorkOrderSettings,
  restoreWorkOrderSettings,
  updateWorkOrderPermissions,
  validateWorkOrderBase,
  workOrderApplication,
  workOrderCatalogApplication,
} from "./work-order-model";

describe("旧工单流程基础设置", () => {
  test("回填权限名称、数字分组和停用状态，权限切换后的选择同步到 IDs", () => {
    const settings = restoreWorkOrderSettings({
      shortName: "作业单",
      formGroupId: 7,
      businessType: "WORK_PERMIT",
      enable: false,
      permissionType: "ROLE",
      permissionIds: [12, "role2"],
      permissionList: [
        { id: 12, name: "安全员" },
        { id: "role2", name: "管理员" },
      ],
    });
    expect(settings).toEqual({
      shortName: "作业单",
      formGroupId: 7,
      businessType: "WORK_PERMIT",
      enable: false,
      permissionType: "ROLE",
      permissionIds: [12, "role2"],
      permissionList: [
        { id: 12, name: "安全员" },
        { id: "role2", name: "管理员" },
      ],
    });
    updateWorkOrderPermissions(settings, []);
    expect(settings.permissionIds).toEqual([]);
    expect(validateWorkOrderBase("动火作业", settings)).toEqual(["请选择可以使用的角色"]);
    settings.permissionType = "DEPARTMENT";
    updateWorkOrderPermissions(settings, [{ id: "d1", name: "工程部" }]);
    expect(validateWorkOrderBase("动火作业", settings)).toEqual([]);
    expect(validateWorkOrderBase("动火-作业", settings)[0]).toContain("仅支持");
  });

  test("复制发布不覆盖源工单，保留专用字段且只有 CUSTOM_FORM 带应用", () => {
    const settings = initialWorkOrderSettings(8);
    settings.businessType = "WORK_PERMIT";
    settings.permissionType = "USER";
    updateWorkOrderPermissions(settings, [{ id: "u1", name: "张三" }]);
    const common = {
      id: "source",
      name: "动火作业",
      application: "FAULT",
      formJson: "[]",
      flowJson: "{}",
      publicForm: 1,
      webhookConfigVOList: [{ url: "https://example.test/hook", token: "secret", triggerNode: "FLOW_END" }],
    };
    const payload = buildWorkOrderPayload(common, settings, {
      formId: "source",
      isCopy: true,
      formType: "CUSTOM_FORM",
      applicationCode: "WORK_PERMIT_MANAGE",
      origin: "https://g2.test",
    });
    expect(payload.id).toBeNull();
    expect(payload.businessType).toBe("WORK_PERMIT");
    expect(payload.formGroupId).toBe(8);
    expect(payload.permissionIds).toEqual(["u1"]);
    expect(payload.application).toBe("WORK_PERMIT_MANAGE");
    expect(payload.qrCodeUrl).toBe("https://g2.test/streamengineH5/public-form/?processType=ADD");
    expect(payload.webhookConfigVOList).toEqual(common.webhookConfigVOList);
    expect(
      buildWorkOrderPayload(common, settings, { formId: "source", isCopy: false, formType: "FORM", origin: "https://g2.test" }).application,
    ).toBeUndefined();
    expect(common.id).toBe("source");
  });

  test("工单目录只开放基础与人员档案，作业应用额外开放作业控件", () => {
    expect(workOrderCatalogApplication(workOrderApplication("stream-engine", '{"code":"WORK_PERMIT_MANAGE","name":"作业管理"}'))).toBe(
      "WORK_PERMIT",
    );
    expect(workOrderCatalogApplication(workOrderApplication("FAULT", '{"code":"FAULT"}'))).toBeUndefined();
    expect(workOrderApplication(undefined, "bad json")).toEqual({ code: undefined, name: undefined });
    expect(decodeWorkOrderReturnUrl("%2Fd%2Fwork-permit%3Fa%3D1")).toBe("/d/work-permit?a=1");
    expect(decodeWorkOrderReturnUrl("/d/work-permit?name=50%")).toBe("/d/work-permit?name=50%");
  });
});
