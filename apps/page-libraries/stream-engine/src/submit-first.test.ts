import { createStreamEngineClient, type FormFlowSubmitPayload } from "@g2-client/stream-engine/client";
import { expect, test } from "bun:test";

import { submitInitialFlow } from "./submit-first";

const basePayload: FormFlowSubmitPayload = {
  application: "ATTENDANCE",
  applicationName: "考勤",
  businessType: "LEAVE",
  data: '{"field1":"test"}',
  flowKey: "flow-1",
  formDefinitionId: "form-1",
  formDefinitionVersion: 1,
  formKey: "form-key",
  type: "FLOW_FORM",
  variables: { field1: "test" },
  approveUsers: { node1: "user-1" },
};

function mockClient(checkResult: unknown = true) {
  const requests: Array<{ url: string; body?: unknown }> = [];
  const client = createStreamEngineClient({
    get: async () => ({}),
    post: async (url, body) => {
      requests.push({ url, body });
      return { data: url.includes("/check") || url.includes("/verification") ? checkResult : "submitted" };
    },
    put: async () => ({}),
    delete: async () => ({}),
  });
  return { client, requests };
}

for (const [businessType, endpoint] of [
  ["LEAVE", "/api/attendance/att/approval/submit"],
  ["CANCEL_LEAVE", "/api/attendance/att/approval/submit"],
  ["OVERTIME", "/api/attendance/att/approval/submit"],
  ["LEAVE_THE_POST", "/api/attendance/att/approval/submit"],
  ["AWAY_BUSINESS", "/api/attendance/att/approval/submit"],
  ["HOTEL_RESERVATION", "/api/third-party/hotel-reservation/approval/submit"],
  ["VECHICLE_INSERT", "/api/park-management/vehicle/approval/submit"],
  ["VECHICLE_UPDATE", "/api/park-management/vehicle/approval/submit"],
  ["VECHICLE_DELETE", "/api/park-management/vehicle/approval/submit"],
  ["VISITOR_INVITE", "/api/visitor-management/visitor/approval/submit"],
  ["PERSONNEL_INDUCTION", "/api/personnel/personnel/submit"],
  ["ILLEGAL_PARKING", "/api/park-management/illegal/parking/submit"],
  ["HIDDENDANGER", "/api/flow/form-flows/first/submit"],
] as const) {
  test(`${businessType} submits to its legacy business endpoint`, async () => {
    const { client, requests } = mockClient();
    const payload = { ...basePayload, businessType };
    expect(await submitInitialFlow(client, payload)).toBe(true);
    expect(requests).toEqual([{ url: endpoint, body: payload }]);
  });
}

for (const [businessType, endpoint, checkBody] of [
  ["CHANGE_CLASSES", "/api/attendance/att/exchange/check", { formId: "form-1", formData: basePayload.data }],
  [
    "REPAIR_CLOCK",
    "/api/attendance/att/approve/verification",
    { businessType: "REPAIR_CLOCK", flowData: { formId: "form-1", formData: basePayload.data } },
  ],
] as const) {
  test(`${businessType} checks first and submits only when allowed`, async () => {
    const payload = { ...basePayload, businessType };
    const allowed = mockClient();
    expect(await submitInitialFlow(allowed.client, payload)).toBe(true);
    expect(allowed.requests).toEqual([
      { url: endpoint, body: checkBody },
      { url: "/api/flow/form-flows/first/submit", body: payload },
    ]);

    const denied = mockClient(false);
    expect(await submitInitialFlow(denied.client, payload)).toBe(false);
    expect(denied.requests).toEqual([{ url: endpoint, body: checkBody }]);
  });
}

test("administrative feedback preserves its originating business key", async () => {
  const { client, requests } = mockClient();
  const payload = { ...basePayload, application: "OFFICIAL_MANAGEMENT", businessType: "OFFICIAL_FOCUS_WORK_REPLY", businessKey: "focus-1" };
  expect(await submitInitialFlow(client, payload)).toBe(true);
  expect(requests).toEqual([{ url: "/api/flow/form-flows/first/submit", body: payload }]);
});
