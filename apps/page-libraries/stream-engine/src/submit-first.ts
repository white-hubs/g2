import type { FormFlowSubmitPayload, StreamEngineClient } from "@g2-client/stream-engine/client";

type InitialFlowClient = Pick<
  StreamEngineClient,
  | "checkClassesChange"
  | "checkClockRepair"
  | "submitAttendanceApproval"
  | "submitHotelApproval"
  | "submitVehicleApproval"
  | "submitVisitorApproval"
  | "submitPersonnelApproval"
  | "submitIllegalParking"
  | "submitFormFlowFirst"
>;

const attendanceTypes = new Set(["LEAVE", "CANCEL_LEAVE", "OVERTIME", "LEAVE_THE_POST", "AWAY_BUSINESS"]);
const vehicleTypes = new Set(["VECHICLE_INSERT", "VECHICLE_UPDATE", "VECHICLE_DELETE"]);

/** 旧版发起流程先做业务校验，再交给所属业务服务提交。校验不通过时不创建流程。 */
export async function submitInitialFlow(client: InitialFlowClient, payload: FormFlowSubmitPayload): Promise<boolean> {
  const flowData = { formId: payload.formDefinitionId, formData: payload.data };
  if (payload.businessType === "CHANGE_CLASSES" && !(await client.checkClassesChange(flowData))) return false;
  if (payload.businessType === "REPAIR_CLOCK" && !(await client.checkClockRepair({ businessType: payload.businessType, flowData })))
    return false;

  if (attendanceTypes.has(payload.businessType)) await client.submitAttendanceApproval(payload);
  else if (payload.businessType === "HOTEL_RESERVATION") await client.submitHotelApproval(payload);
  else if (vehicleTypes.has(payload.businessType)) await client.submitVehicleApproval(payload);
  else if (payload.businessType === "VISITOR_INVITE") await client.submitVisitorApproval(payload);
  else if (payload.businessType === "PERSONNEL_INDUCTION") await client.submitPersonnelApproval(payload);
  else if (payload.businessType === "ILLEGAL_PARKING") await client.submitIllegalParking(payload);
  else await client.submitFormFlowFirst(payload);
  return true;
}
