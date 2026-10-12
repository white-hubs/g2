import type {
  RiskAreaParam,
  RiskAssessmentMethodParam,
  RiskAssessmentPlanParam,
  RiskControlDepartmentVO,
  RiskControlFileVO,
  RiskControlMeasureParam,
  RiskControlOptionVO,
  RiskControlUserVO,
  RiskControlWarningSignRefVO,
  RiskIdentificationObjectParam,
  RiskUnitParam,
  RiskUnitTypeParam,
  RiskWarningRuleParam,
  RiskWarningSignParam,
} from "@g2-contract/risk-graded-control";

import type {
  AssessmentMethodVO,
  AssessmentUnitVO,
  ControlMeasureVO,
  EvaluationPlanVO,
  GeoPoint,
  IdentificationHistoryRecordVO,
  IdentificationUnitVO,
  NotificationCardVO,
  ObjectStatus,
  PolygonGeo,
  RejectedIdentificationVO,
  ReviewItemVO,
  RiskLevel,
  RiskObjectVO,
  UnitInventoryRowVO,
  UnitTypeVO,
  UnitVO,
  WarningEventVO,
  WarningRuleVO,
  WarningSignVO,
  ZoneVO,
} from "@/types/risk";
import { resolveFileDisplayPath } from "@/utils/file-url";
import { formatApiDateTime } from "@/utils/format-datetime";

interface RiskApiIdName {
  id?: number | string;
  code?: string;
  name?: string;
  type?: string;
}

interface RiskApiGeoFields {
  gisPoint?: string;
  gisGeometry?: string;
  longitude?: number | string;
  latitude?: number | string;
  locationDesc?: string;
}

export type RiskUnitTypeApiVO = RiskApiIdName;

export interface RiskAreaApiVO extends RiskApiIdName {
  departmentId?: string;
  department?: RiskControlDepartmentVO;
  ownerUserId?: string;
  ownerUser?: RiskControlUserVO;
  rangeDesc?: string;
  description?: string;
  gisGeometry?: string;
  inherentRiskLevel?: string;
  controlRiskLevel?: string;
  riskLevel?: string;
  unitCount?: number;
  objectCount?: number;
}

export interface RiskWarningSignApiVO extends RiskApiIdName {
  signType?: string;
  applicableScenario?: string;
  iconFileId?: string | number;
  iconFile?: RiskControlFileVO;
  enabled?: boolean;
}

interface RiskAssessmentOptionApiVO extends RiskApiIdName {
  score?: number;
}

interface RiskAssessmentDimensionApiVO extends RiskApiIdName {
  options?: RiskAssessmentOptionApiVO[];
}

interface RiskAssessmentLevelRuleApiVO {
  riskLevel?: string;
  color?: string;
  scoreRange?: string;
  minScore?: number;
  maxScore?: number;
  controlRequirement?: string;
}

function isDefinedScore(value: number | undefined | null): value is number {
  return value !== undefined && value !== null && !Number.isNaN(value);
}

function formatAssessmentScoreRange(rule: Pick<RiskAssessmentLevelRuleApiVO, "scoreRange" | "minScore" | "maxScore">): string {
  const explicit = rule.scoreRange?.trim();
  if (explicit) {
    return explicit;
  }
  const hasMin = isDefinedScore(rule.minScore);
  const hasMax = isDefinedScore(rule.maxScore);
  if (hasMin && hasMax) {
    return `${rule.minScore}-${rule.maxScore}`;
  }
  if (hasMin) {
    return `>${rule.minScore}`;
  }
  if (hasMax) {
    return `<=${rule.maxScore}`;
  }
  return "—";
}

export interface RiskAssessmentMethodApiVO extends RiskApiIdName {
  formula?: string;
  enabled?: boolean;
  description?: string;
  dimensions?: RiskAssessmentDimensionApiVO[];
  levelRules?: RiskAssessmentLevelRuleApiVO[];
}

export interface RiskUnitApiVO extends RiskApiIdName, RiskApiGeoFields {
  unitId?: number | string;
  unitName?: string;
  unit?: RiskControlOptionVO;
  areaId?: number | string;
  area?: RiskControlOptionVO;
  unitTypeId?: number | string;
  unitType?: RiskControlOptionVO;
  departmentId?: string;
  department?: RiskControlDepartmentVO;
  responsibleUserId?: string;
  responsibleUser?: RiskControlUserVO;
  identifierUserIds?: string[];
  identifierUsers?: RiskControlUserVO[];
  status?: string;
  identifyStatus?: string;
  controlStatus?: string;
  currentIdentifyRoundNo?: string;
  inherentRiskLevel?: string;
  controlRiskLevel?: string;
  riskLevel?: string;
  description?: string;
  identifyCycleDays?: number;
  objectCount?: number;
  rejectedCount?: number;
  warningSignId?: number | string;
  signId?: number | string;
  warningSign?: RiskControlWarningSignRefVO | RiskControlOptionVO;
  lastIdentifySubmitTime?: string;
  lastIdentifyReviewTime?: string;
  nextIdentifyTime?: string;
  objects?: RiskObjectApiVO[];
}

export interface RiskIdentificationUnitApiVO extends RiskUnitApiVO {
  submitTime?: string;
  objectName?: string;
}

export interface RiskObjectApiVO extends RiskApiIdName {
  objectId?: number | string;
  objectCode?: string;
  objectName?: string;
  unitId?: number | string;
  unitName?: string;
  unit?: RiskControlOptionVO;
  assetId?: number | string;
  responsibleUserId?: string;
  responsibleUser?: RiskControlUserVO;
  status?: string;
  inherentRiskLevel?: string;
  controlRiskLevel?: string;
  hazardDesc?: string;
  accidentTypes?: string;
  accidentCause?: string;
  triggerFactor?: string;
  emergencyMeasure?: string;
  measures?: RiskControlMeasureApiVO[];
}

export interface RiskReviewTaskApiVO extends RiskObjectApiVO {
  identifyRoundNo?: string;
  identifierUserId?: string;
  identifierUser?: RiskControlUserVO;
  reviewerUserId?: string;
  reviewerUser?: RiskControlUserVO;
  reviewResult?: string;
  rejectReason?: string;
  reviewComment?: string;
  reviewTime?: string;
  submitTime?: string;
  userId?: string;
}

export interface RiskAssessmentTaskApiVO extends RiskUnitApiVO {
  completedCount?: number;
  objectName?: string;
}

export interface RiskAssessmentRecordApiVO {
  id?: number | string;
  objectId?: number | string;
  methodId?: number | string;
  assessmentType?: string;
  totalScore?: number;
  riskLevel?: string;
  methodSnapshotJson?: string;
  scoreDetailJson?: string;
  dimensionScores?: Record<string, number>;
  submitted?: boolean;
}

export interface RiskEvaluationPlanApiVO extends RiskApiIdName {
  unitName?: string;
  unit?: RiskControlOptionVO;
  objectName?: string;
  planName?: string;
  cycleType?: string;
  nextExecuteTime?: string;
  status?: string;
  enabled?: boolean;
  notifyUserIds?: string[];
}

export interface RiskIdentificationHistoryApiVO extends RiskReviewTaskApiVO {
  reviewResult?: string;
  reviewMode?: string;
  reviewBatchNo?: string;
  operationType?: string;
  snapshotJson?: string;
  lastIdentifySubmitTime?: string;
}

export interface RiskUnitInventoryApiVO extends RiskUnitApiVO {
  measureCount?: number;
  completedMeasureCount?: number;
  hiddenDangerCount?: number;
  warningSigns?: RiskWarningSignApiVO[];
  objects?: RiskObjectApiVO[];
  measures?: RiskControlMeasureApiVO[];
}

export interface RiskControlMeasureApiVO {
  id?: number | string;
  measureId?: number | string;
  unitId?: number | string;
  unitName?: string;
  unit?: RiskControlOptionVO;
  objectId?: number | string;
  objectName?: string;
  name?: string;
  inherentRiskLevel?: string;
  controlRiskLevel?: string;
  riskLevel?: string;
  controlType?: string;
  controlLevel?: string;
  content?: string;
  executorUserId?: string;
  executorUser?: RiskControlUserVO;
  deadline?: string;
  executionStatus?: string;
  executionResult?: string;
  executionDesc?: string;
  executionTime?: string;
  gpsLocation?: string;
  files?: RiskControlFileVO[];
  fileIds?: string[];
}

export interface RiskWarningRuleApiVO extends RiskApiIdName {
  ruleId?: number | string;
  warningType?: string;
  conditionJson?: string;
  disposeDeadlineDays?: number;
  enabled?: boolean;
  notifyUserIds?: string[];
  notifyUsers?: RiskControlUserVO[];
  notifyChannels?: string;
  planName?: string;
}

export interface RiskWarningEventApiVO extends RiskApiIdName {
  unitId?: number | string;
  unitName?: string;
  unit?: RiskControlOptionVO;
  objectId?: number | string;
  objectCode?: string;
  objectName?: string;
  warningType?: string;
  warningStatus?: string;
  severity?: string;
  triggerTime?: string;
  description?: string;
  hazardDesc?: string;
  content?: string;
  disposeTime?: string;
  disposeDesc?: string;
  disposeResult?: string;
}

export interface RiskNoticeCardApiVO extends RiskUnitInventoryApiVO {
  warningSign?: RiskWarningSignApiVO;
  warningSigns?: RiskWarningSignApiVO[];
  department?: RiskControlDepartmentVO;
  objects?: RiskObjectApiVO[];
  measures?: RiskControlMeasureApiVO[];
  hazardDesc?: string;
  accidentTypes?: string;
  emergencyMeasure?: string;
}

export function toId(id?: number | string): string {
  return id == null ? "" : String(id);
}

/** 创建时由后端生成编号；仅在有值时传给 API（编辑回显场景） */
function withOptionalCode(code?: string): { code?: string } {
  const trimmed = code?.trim();
  return trimmed ? { code: trimmed } : {};
}

export function userDisplayName(user?: RiskControlUserVO & { name?: string }, fallbackId?: string): string {
  const name = user?.userName?.trim() || user?.name?.trim();
  if (name) return name;
  return (fallbackId ?? user?.userId ?? "").trim();
}

export function optionDisplayName(option?: RiskControlOptionVO | RiskControlWarningSignRefVO, legacy?: string): string {
  const name = option?.name?.trim();
  if (name) return name;
  return legacy?.trim() ?? "";
}

export function usersDisplayNames(users?: RiskControlUserVO[], fallbackIds?: string[]): string[] {
  if (users?.length) {
    return users.map((u, i) => userDisplayName(u, fallbackIds?.[i])).filter(Boolean);
  }
  return (fallbackIds ?? []).filter(Boolean);
}

export function departmentDisplayName(dept?: RiskControlDepartmentVO, fallbackId?: string): string {
  const name = dept?.departmentName?.trim();
  if (name) return name;
  return (fallbackId ?? dept?.departmentId ?? "").trim();
}

export function mapRiskLevelFromApi(level?: string): RiskLevel | undefined {
  if (!level) return undefined;
  if (level === "LARGE") return "SIGNIFICANT";
  if (level === "MAJOR" || level === "SIGNIFICANT" || level === "GENERAL" || level === "LOW") {
    return level;
  }
  return undefined;
}

export function mapRiskLevelToApi(level?: RiskLevel): string | undefined {
  if (!level) return undefined;
  return level === "SIGNIFICANT" ? "LARGE" : level;
}

function normalizeIdentificationStatusFromApi(statusRaw?: string): IdentificationUnitVO["status"] {
  if (statusRaw === "PENDING_REVIEW") return "PENDING_REVIEW";
  if (statusRaw === "REVIEWED") return "REVIEWED";
  if (statusRaw === "PENDING") return "PENDING";
  return "IDENTIFYING";
}

export function mapUnitTypeFromApi(vo: RiskUnitTypeApiVO): UnitTypeVO {
  return {
    id: toId(vo.id),
    code: vo.code ?? "",
    name: vo.name ?? "",
  };
}

export function mapUnitTypeToApi(form: { code: string; name: string }): RiskUnitTypeParam {
  return {
    ...withOptionalCode(form.code),
    name: form.name.trim(),
  };
}

export function mapZoneFromApi(vo: RiskAreaApiVO): ZoneVO {
  const polygon = parseGisPolygon(vo.gisGeometry);
  const managerId = vo.ownerUserId?.trim() || undefined;
  return {
    id: toId(vo.id),
    code: vo.code ?? "",
    name: vo.name ?? "",
    department: departmentDisplayName(vo.department, vo.departmentId),
    departmentId: vo.departmentId ?? vo.department?.departmentId ?? "",
    scopeText: vo.rangeDesc ?? "",
    manager: managerId ? userDisplayName(vo.ownerUser, managerId) : undefined,
    managerId,
    inherentRiskLevel: mapRiskLevelFromApi(vo.inherentRiskLevel),
    controlRiskLevel: mapRiskLevelFromApi(vo.controlRiskLevel),
    riskLevel: mapRiskLevelFromApi(vo.riskLevel ?? vo.controlRiskLevel),
    unitCount: vo.unitCount ?? vo.objectCount ?? 0,
    remark: vo.description?.trim() || undefined,
    polygon: polygon ? { ...polygon, description: vo.rangeDesc } : undefined,
  };
}

export function parseGisPoint(gisPoint?: string): GeoPoint | undefined {
  if (!gisPoint) return undefined;
  try {
    const parsed = JSON.parse(gisPoint) as {
      lng?: number;
      lat?: number;
      longitude?: number;
      latitude?: number;
      address?: string;
    };
    const lng = parsed.lng ?? parsed.longitude;
    const lat = parsed.lat ?? parsed.latitude;
    if (lng != null && lat != null) {
      return { lng, lat, address: parsed.address };
    }
  } catch {
    // ignore invalid gis json
  }
  return undefined;
}

function parseGisPointFromVo(vo: RiskUnitApiVO): GeoPoint | undefined {
  const fromJson = parseGisPoint(vo.gisPoint);
  if (fromJson) return fromJson;
  if (vo.longitude != null && vo.latitude != null) {
    return {
      lng: Number(vo.longitude),
      lat: Number(vo.latitude),
      address: vo.locationDesc,
    };
  }
  return undefined;
}

export function stringifyGisPoint(point?: GeoPoint): string | undefined {
  if (!point || point.lng == null || point.lat == null) return undefined;
  return JSON.stringify({
    longitude: point.lng,
    latitude: point.lat,
    address: point.address,
  });
}

export function parseGisPolygon(gisGeometry?: string): PolygonGeo | undefined {
  if (!gisGeometry) return undefined;
  try {
    const parsed = JSON.parse(gisGeometry) as {
      points?: Array<{ lng: number; lat: number; address?: string }>;
      shape?: PolygonGeo["shape"];
      radius?: number;
      description?: string;
    };
    if (parsed.points?.length) {
      return {
        points: parsed.points,
        shape: parsed.shape,
        radius: parsed.radius,
        description: parsed.description,
      };
    }
  } catch {
    // ignore invalid gis json
  }
  return undefined;
}

export function stringifyGisPolygon(polygon?: PolygonGeo): string | undefined {
  if (!polygon?.points?.length) return undefined;
  return JSON.stringify({
    points: polygon.points,
    shape: polygon.shape,
    radius: polygon.radius,
    description: polygon.description,
  });
}

export function mapUnitFromApi(vo: RiskUnitApiVO): UnitVO {
  const location = parseGisPointFromVo(vo);
  const identifyUserIds = vo.identifierUserIds ?? [];
  const responsibleUserId = vo.responsibleUserId ?? "";
  const warningSignRef = vo.warningSign as RiskControlWarningSignRefVO | undefined;
  const warningSignId = toId(vo.warningSignId ?? warningSignRef?.id ?? vo.signId);
  const warningSignName = optionDisplayName(warningSignRef);
  return {
    id: toId(vo.id),
    code: vo.code ?? "",
    name: vo.name ?? "",
    unitTypeId: toId(vo.unitTypeId ?? vo.unitType?.id),
    unitType: optionDisplayName(vo.unitType, vo.type),
    zoneId: toId(vo.areaId ?? vo.area?.id),
    zoneName: optionDisplayName(vo.area),
    locationDesc: vo.locationDesc,
    warningSignId: warningSignId || undefined,
    warningSignName: warningSignName || undefined,
    description: vo.description,
    identifyCycleDays: vo.identifyCycleDays ?? 180,
    identifyUserIds,
    identifyUsers: usersDisplayNames(vo.identifierUsers, identifyUserIds),
    responsibleUserId,
    responsibleUser: userDisplayName(vo.responsibleUser, responsibleUserId),
    identifyStatus: normalizeIdentificationStatusFromApi(vo.identifyStatus ?? vo.status),
    currentIdentifyRoundNo: vo.currentIdentifyRoundNo,
    lastIdentifySubmitTime: formatApiDateTime(vo.lastIdentifySubmitTime),
    lastIdentifyReviewTime: formatApiDateTime(vo.lastIdentifyReviewTime),
    nextIdentifyTime: formatApiDateTime(vo.nextIdentifyTime),
    objectCount: vo.objectCount ?? 0,
    rejectedCount: vo.rejectedCount ?? 0,
    inherentRiskLevel: mapRiskLevelFromApi(vo.inherentRiskLevel),
    controlRiskLevel: mapRiskLevelFromApi(vo.controlRiskLevel),
    riskLevel: mapRiskLevelFromApi(vo.riskLevel ?? vo.controlRiskLevel ?? vo.inherentRiskLevel),
    controlStatus: vo.controlStatus as ObjectStatus | undefined,
    location,
  };
}

export function mapUnitToApi(
  form: {
    code: string;
    name: string;
    unitTypeId: string;
    zoneId: string;
    warningSignId?: string;
    description?: string;
    locationDesc?: string;
    identifyCycleDays: number;
    identifyUsers: string[];
    responsibleUser: string;
  },
  location?: GeoPoint,
): RiskUnitParam {
  const locationDesc = form.locationDesc?.trim() || location?.address?.trim() || undefined;
  const payload: RiskUnitParam = {
    ...withOptionalCode(form.code),
    name: form.name.trim(),
    unitTypeId: form.unitTypeId,
    areaId: form.zoneId,
    warningSignId: form.warningSignId || undefined,
    description: form.description?.trim() || undefined,
    locationDesc,
    identifyCycleDays: form.identifyCycleDays,
    identifierUserIds: form.identifyUsers,
    responsibleUserId: form.responsibleUser,
  };
  if (location?.lng != null && location?.lat != null) {
    payload.longitude = location.lng;
    payload.latitude = location.lat;
    payload.gisPoint = stringifyGisPoint(location);
  }
  return payload;
}

export function mapZoneToApi(
  form: {
    code: string;
    name: string;
    department: string;
    scopeText: string;
    manager?: string;
    remark?: string;
  },
  polygon?: PolygonGeo,
): RiskAreaParam {
  return {
    ...withOptionalCode(form.code),
    name: form.name.trim(),
    departmentId: form.department.trim(),
    rangeDesc: form.scopeText.trim(),
    ownerUserId: form.manager?.trim() || undefined,
    description: form.remark?.trim() || undefined,
    gisGeometry: stringifyGisPolygon(polygon),
  };
}

export function mapWarningSignFromApi(vo: RiskWarningSignApiVO): WarningSignVO {
  const iconFileId = vo.iconFileId != null ? String(vo.iconFileId) : vo.iconFile?.id != null ? String(vo.iconFile.id) : undefined;
  return {
    id: toId(vo.id),
    code: vo.code ?? "",
    name: vo.name ?? "",
    type: vo.signType ?? vo.type ?? "",
    applicableScenario: vo.applicableScenario ?? "",
    iconFileId,
    iconUrl: resolveFileDisplayPath(vo.iconFile as RiskControlFileVO | undefined) || undefined,
    status: vo.enabled === false ? "DISABLED" : "ENABLED",
  };
}

export function mapWarningSignToApi(form: {
  code: string;
  name: string;
  type: string;
  applicableScenario?: string;
  status: WarningSignVO["status"];
  iconFileId?: string;
}): RiskWarningSignParam {
  return {
    ...withOptionalCode(form.code),
    name: form.name.trim(),
    signType: form.type,
    applicableScenario: form.applicableScenario?.trim() || undefined,
    enabled: form.status === "ENABLED",
    iconFileId: form.iconFileId || undefined,
  };
}

export function mapAssessmentMethodToApi(form: {
  code: string;
  name: string;
  formula: string;
  description?: string;
  status: AssessmentMethodVO["status"];
  dimensions: AssessmentMethodVO["dimensions"];
  levelRules: AssessmentMethodVO["levelRules"];
}): RiskAssessmentMethodParam {
  return {
    ...withOptionalCode(form.code),
    name: form.name.trim(),
    formula: form.formula,
    description: form.description?.trim() || undefined,
    enabled: form.status === "ENABLED",
    dimensions: form.dimensions.map((d) => ({
      code: d.code,
      name: d.name,
      options: d.options.map((o) => ({ name: o.label, score: o.value })),
    })),
    levelRules: form.levelRules.map((r) => ({
      riskLevel: mapRiskLevelToApi(r.level),
      color: r.color,
      scoreRange: r.range,
      controlRequirement: r.requirement,
    })),
  };
}

export function mapAssessmentMethodFromApi(vo: RiskAssessmentMethodApiVO): AssessmentMethodVO {
  return {
    id: toId(vo.id),
    code: vo.code ?? "",
    name: vo.name ?? "",
    formula: vo.formula ?? "",
    status: vo.enabled === false ? "DISABLED" : "ENABLED",
    dimensions: (vo.dimensions ?? []).map((d) => ({
      code: d.code ?? "",
      name: d.name ?? "",
      options: (d.options ?? []).map((o) => ({
        label: o.name ?? "",
        value: o.score ?? 0,
      })),
    })),
    levelRules: (vo.levelRules ?? []).map((r) => ({
      level: mapRiskLevelFromApi(r.riskLevel) ?? "LOW",
      color: r.color ?? "",
      range: formatAssessmentScoreRange(r),
      requirement: r.controlRequirement ?? "",
    })),
    description: vo.description,
  };
}

export function mapIdentificationStatusToApi(status?: IdentificationUnitVO["status"]): string | undefined {
  if (!status) return undefined;
  if (status === "PENDING") return "IDENTIFYING";
  return status;
}

export function mapIdentificationFromApi(vo: RiskIdentificationUnitApiVO): IdentificationUnitVO {
  const status = normalizeIdentificationStatusFromApi(vo.identifyStatus ?? vo.status);
  return {
    id: toId(vo.unitId ?? vo.id),
    code: vo.code ?? "",
    unitName: vo.name ?? vo.objectName ?? "",
    unitType: optionDisplayName(vo.unitType, vo.type),
    zoneName: optionDisplayName(vo.area, vo.locationDesc),
    identifyUsers: usersDisplayNames(vo.identifierUsers, vo.identifierUserIds),
    status,
    objectCount: vo.objectCount ?? 0,
    rejectedCount: vo.rejectedCount ?? 0,
    submitTime: formatApiDateTime(vo.submitTime ?? vo.lastIdentifySubmitTime),
  };
}

export function mapReviewFromApi(vo: RiskReviewTaskApiVO): ReviewItemVO {
  const result = vo.reviewResult;
  const reviewResult = result === "APPROVED" || result === "REJECTED" ? result : undefined;
  const statusRaw = reviewResult ?? vo.status;
  let status: ReviewItemVO["status"] = "PENDING";
  if (statusRaw === "APPROVED") status = "APPROVED";
  else if (statusRaw === "REJECTED") status = "REJECTED";
  const objectName = vo.objectName ?? vo.name ?? "";
  const objectId = toId(vo.objectId ?? vo.id);
  return {
    id: toId(vo.id ?? vo.objectId),
    objectId,
    identifyRoundNo: vo.identifyRoundNo,
    objectName,
    unitName: optionDisplayName(vo.unit) || String(vo.unitName ?? "").trim() || (vo.objectName ? String(vo.name ?? "").trim() : ""),
    identifyUser: userDisplayName(vo.identifierUser, vo.identifierUserId ?? vo.userId),
    hazardDesc: vo.hazardDesc ?? "",
    accidentTypes: (vo.accidentTypes ?? "").split(/[,、]/).filter(Boolean),
    submitTime: formatApiDateTime(vo.submitTime),
    status,
    reviewResult,
    rejectReason: vo.rejectReason,
    reviewComment: vo.reviewComment,
    reviewerUserId: vo.reviewerUserId,
    reviewerUser: userDisplayName(vo.reviewerUser, vo.reviewerUserId),
    reviewTime: formatApiDateTime(vo.reviewTime),
    cause: vo.accidentCause ?? "",
    triggerFactors: vo.triggerFactor ?? "",
    emergencyMeasures: vo.emergencyMeasure ?? "",
    responsibleUser: userDisplayName(vo.responsibleUser, vo.responsibleUserId),
  };
}

export function mapAssessmentTaskFromApi(vo: RiskAssessmentTaskApiVO): AssessmentUnitVO {
  const total = vo.objectCount ?? 1;
  const done = vo.completedCount ?? (vo.status === "CONTROL_SET" || vo.status === "EXECUTING" || vo.status === "ACTIVE" ? 1 : 0);
  const unitName = optionDisplayName(vo.unit) || String(vo.unitName ?? "").trim() || vo.name || vo.objectName || "";
  const statusRaw = String(vo.status ?? "").toUpperCase();
  const status =
    statusRaw === "COMPLETED" || statusRaw === "ASSESSING" || statusRaw === "PENDING"
      ? (statusRaw as AssessmentUnitVO["status"])
      : undefined;
  return {
    id: toId(vo.unitId ?? vo.id),
    unitId: toId(vo.unitId ?? vo.id),
    code: vo.code ?? "",
    unitName,
    unitTypeId: toId(vo.unitTypeId ?? vo.unitType?.id),
    unitType: optionDisplayName(vo.unitType, vo.type),
    zoneId: toId(vo.areaId ?? vo.area?.id),
    zoneName: optionDisplayName(vo.area) || vo.locationDesc || "",
    inherentRiskLevel: mapRiskLevelFromApi(vo.inherentRiskLevel),
    controlRiskLevel: mapRiskLevelFromApi(vo.controlRiskLevel),
    riskLevel: mapRiskLevelFromApi(vo.riskLevel ?? vo.controlRiskLevel ?? vo.inherentRiskLevel),
    status,
    completedCount: done,
    objectCount: total,
    progress: `${done}/${total}`,
  };
}

const PLAN_CYCLE_LABEL: Record<string, string> = {
  DAY: "每日",
  DAILY: "每日",
  WEEK: "每周",
  WEEKLY: "每周",
  MONTH: "月度",
  MONTHLY: "月度",
  QUARTER: "季度",
  QUARTERLY: "季度",
  HALF_YEAR: "半年",
  HALF_YEARLY: "半年",
  YEAR: "年度",
  YEARLY: "年度",
};

export function mapEvaluationPlanFromApi(vo: RiskEvaluationPlanApiVO): EvaluationPlanVO {
  const cycleType = vo.cycleType ?? "";
  return {
    id: toId(vo.id),
    name: vo.planName ?? vo.name ?? "",
    unitName: optionDisplayName(vo.unit) || String(vo.unitName ?? "").trim() || vo.objectName || "",
    cycleType,
    cycle: PLAN_CYCLE_LABEL[cycleType] ?? cycleType,
    nextExecuteTime: formatApiDateTime(vo.nextExecuteTime),
    status: vo.status === "DISABLED" || vo.enabled === false ? "DISABLED" : "ENABLED",
    notifyCount: (vo.notifyUserIds ?? []).length,
  };
}

export function mapEvaluationPlanToApi(form: {
  name: string;
  unitId: string;
  cycle: string;
  notifyUserIds: string[];
}): RiskAssessmentPlanParam {
  return {
    planName: form.name.trim(),
    unitId: form.unitId,
    cycleType: form.cycle,
    notifyUserIds: form.notifyUserIds,
    enabled: true,
  };
}

export function mapRejectedIdentificationFromApi(vo: RiskReviewTaskApiVO): RejectedIdentificationVO {
  return {
    id: toId(vo.id),
    objectId: toId(vo.objectId ?? vo.id),
    objectName: vo.objectName ?? vo.name ?? "",
    hazardDesc: vo.hazardDesc ?? "",
    rejectReason: vo.rejectReason ?? vo.reviewComment ?? "",
    reviewTime: formatApiDateTime(vo.reviewTime),
    reviewer: userDisplayName(vo.reviewerUser, vo.reviewerUserId),
  };
}

const IDENTIFICATION_OPERATION_LABEL: Record<string, string> = {
  CREATE: "新增对象",
  UPDATE: "修改对象",
  DELETE: "删除对象",
};

interface IdentificationSnapshot {
  objectId?: string | number;
  code?: string;
  name?: string;
  assetId?: string | number;
  responsibleUserId?: string;
  hazardDesc?: string;
  accidentTypes?: string;
  accidentCause?: string;
  triggerFactor?: string;
  emergencyMeasure?: string;
  deleted?: boolean;
  userId?: string;
}

function parseIdentificationSnapshot(snapshotJson?: string): IdentificationSnapshot {
  if (!snapshotJson) return {};
  try {
    const parsed = JSON.parse(snapshotJson) as IdentificationSnapshot;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function mapIdentificationObjectHistoryFromApi(vo: RiskIdentificationHistoryApiVO): IdentificationHistoryRecordVO {
  const snapshot = parseIdentificationSnapshot(vo.snapshotJson);
  const operationType = vo.operationType ?? (snapshot.deleted ? "DELETE" : "UPDATE");
  const reviewResult = vo.reviewResult === "APPROVED" || vo.reviewResult === "REJECTED" ? vo.reviewResult : undefined;
  return {
    id: toId(vo.id),
    objectId: toId(vo.objectId ?? snapshot.objectId),
    objectName: snapshot.name ?? vo.objectName ?? vo.name ?? "",
    unitName: optionDisplayName(vo.unit) || String(vo.unitName ?? "").trim(),
    identifyRoundNo: vo.identifyRoundNo ?? "",
    operationType,
    operationLabel: IDENTIFICATION_OPERATION_LABEL[operationType] ?? operationType,
    submitTime: formatApiDateTime(vo.submitTime ?? vo.lastIdentifySubmitTime),
    identifyUser: userDisplayName(vo.identifierUser, vo.identifierUserId ?? snapshot.userId ?? vo.userId),
    hazardDesc: snapshot.hazardDesc ?? vo.hazardDesc ?? "",
    accidentTypes: parseAccidentTypes(snapshot.accidentTypes ?? vo.accidentTypes),
    cause: snapshot.accidentCause ?? vo.accidentCause ?? "",
    triggerFactors: snapshot.triggerFactor ?? vo.triggerFactor,
    emergencyMeasures: snapshot.emergencyMeasure ?? vo.emergencyMeasure ?? "",
    responsibleUserId: snapshot.responsibleUserId ?? vo.responsibleUserId,
    deleted: snapshot.deleted ?? operationType === "DELETE",
    reviewResult,
    reviewStatus: reviewResult,
    rejectReason: vo.rejectReason,
    reviewComment: vo.reviewComment,
    reviewerUser: userDisplayName(vo.reviewerUser, vo.reviewerUserId),
    reviewTime: formatApiDateTime(vo.reviewTime),
  };
}

export function mapIdentificationHistoryFromApi(vo: RiskIdentificationHistoryApiVO): {
  id: string;
  unitName: string;
  version: string;
  operator: string;
  time: string;
  changeSummary: string;
} {
  const record = mapIdentificationObjectHistoryFromApi(vo);
  return {
    id: record.id,
    unitName: record.unitName || record.objectName,
    version: record.identifyRoundNo,
    operator: record.identifyUser,
    time: record.submitTime,
    changeSummary: `${record.operationLabel}：${record.objectName || "--"}`,
  };
}

export function mapUnitInventoryRowFromApi(vo: RiskUnitInventoryApiVO): UnitInventoryRowVO {
  const objects = (vo.objects ?? []).map(mapRiskObjectFromApi);
  const measures = (vo.measures ?? []).map(mapMeasureFromApi);
  return {
    unit: mapUnitFromApi(vo),
    objects,
    measures,
    hiddenDangers: [],
    objectCount: vo.objectCount ?? objects.length,
    measureCount: vo.measureCount ?? measures.length,
    completedMeasureCount: vo.completedMeasureCount,
    detailLoaded: objects.length > 0,
  };
}

export function mapMeasureToApi(item: {
  id?: string;
  controlType: string;
  content: string;
  controlLevel: string;
  executor: string;
}): RiskControlMeasureParam {
  const persistedId = item.id && /^\d+$/.test(item.id) ? item.id : undefined;
  return {
    id: persistedId,
    controlType: item.controlType,
    content: item.content.trim(),
    controlLevel: item.controlLevel,
    executorUserId: item.executor,
  };
}

export function mapMeasureFromApi(vo: RiskControlMeasureApiVO): ControlMeasureVO {
  const execMap: Record<string, ControlMeasureVO["execStatus"]> = {
    PENDING: "PENDING",
    EXECUTING: "EXECUTING",
    COMPLETED: "DONE",
    OVERDUE: "OVERDUE",
  };
  const files = (vo.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    path: f.path,
    endpointPath: f.endpointPath,
    suffix: f.suffix,
    size: f.size,
    type: f.type,
  }));
  return {
    id: toId(vo.id ?? vo.measureId),
    unitId: toId(vo.unitId),
    objectId: toId(vo.objectId),
    controlType: vo.controlType ?? "",
    content: vo.content ?? "",
    controlLevel: vo.controlLevel ?? "",
    executorId: vo.executorUserId ?? "",
    executor: userDisplayName(vo.executorUser, vo.executorUserId),
    deadline: vo.deadline,
    execStatus: execMap[vo.executionStatus ?? ""] ?? "PENDING",
    files: files.length ? files : undefined,
  };
}

export function mapRiskObjectFromApi(vo: RiskObjectApiVO): RiskObjectVO {
  const responsibleUserId = vo.responsibleUserId ?? "";
  return {
    id: toId(vo.objectId ?? vo.id),
    unitId: toId(vo.unitId),
    name: vo.name ?? vo.objectName ?? "",
    assetId: vo.assetId != null ? String(vo.assetId) : undefined,
    hazardDesc: vo.hazardDesc ?? "",
    accidentTypes: (vo.accidentTypes ?? "").split(/[,、]/).filter(Boolean),
    cause: vo.accidentCause ?? "",
    triggerFactors: vo.triggerFactor,
    emergencyMeasures: vo.emergencyMeasure ?? "",
    responsibleUserId,
    responsibleUser: userDisplayName(vo.responsibleUser, responsibleUserId),
    status: (vo.status as RiskObjectVO["status"]) ?? "DRAFT",
    innateLevel: mapRiskLevelFromApi(vo.inherentRiskLevel),
    controlLevel: mapRiskLevelFromApi(vo.controlRiskLevel),
  };
}

export function mapWarningRuleFromApi(vo: RiskWarningRuleApiVO): WarningRuleVO {
  const notifyTargets = usersDisplayNames(vo.notifyUsers, vo.notifyUserIds);
  return {
    id: toId(vo.id ?? vo.ruleId),
    title: vo.name ?? vo.planName ?? "",
    type: vo.warningType ?? "",
    condition: vo.conditionJson ?? "",
    notifyTargets: notifyTargets.length ? notifyTargets : (vo.notifyChannels ?? "").split(/[,、]/).filter(Boolean),
    notifyChannels: (vo.notifyChannels ?? "").split(/[,、]/).filter(Boolean),
    deadlineDays: vo.disposeDeadlineDays ?? 7,
    status: vo.enabled === false ? "DISABLED" : "ENABLED",
  };
}

export function mapWarningEventFromApi(vo: RiskWarningEventApiVO): WarningEventVO {
  const warningTypeTitle: Record<string, string> = {
    LEVEL_UPGRADE: "风险等级升级预警",
    ASSESSMENT_OVERDUE: "评估超期预警",
    INDICATOR_EXCEED: "指标超标预警",
  };
  const unitName = optionDisplayName(vo.unit) || String(vo.unitName ?? "").trim() || vo.objectName || vo.name || "";
  return {
    id: toId(vo.id),
    title: vo.name ?? vo.content ?? warningTypeTitle[vo.warningType ?? ""] ?? "风险预警",
    severity: (vo.severity as WarningEventVO["severity"]) ?? "YELLOW",
    warningType: vo.warningType,
    unitId: toId(vo.unitId) || undefined,
    objectId: toId(vo.objectId) || undefined,
    objectCode: vo.objectCode,
    objectName: vo.objectName,
    unitName,
    triggerTime: formatApiDateTime(vo.triggerTime),
    description: vo.description ?? vo.hazardDesc ?? vo.objectName ?? unitName,
    status: vo.warningStatus === "DISPOSED" ? "DISPOSED" : "ACTIVE",
    disposeTime: formatApiDateTime(vo.disposeTime),
    disposeDesc: vo.disposeDesc,
    disposeResult: vo.disposeResult,
  };
}

function uniqueStrings(items: Array<string | undefined>): string[] {
  return Array.from(new Set(items.map((item) => item?.trim()).filter(Boolean) as string[]));
}

/** 按措施 id 去重，保留全部 content（不同措施允许相同文案）。 */
function collectMeasureContents(
  ...sources: Array<Array<{ id?: string | number; measureId?: string | number; content?: string }> | undefined>
): string[] {
  const seenIds = new Set<string>();
  const result: string[] = [];
  for (const list of sources) {
    for (const measure of list ?? []) {
      const id = toId(measure.id ?? measure.measureId);
      if (id) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      const content = measure.content?.trim();
      if (content) result.push(content);
    }
  }
  return result;
}

export function mapNotificationCardFromApi(vo: RiskNoticeCardApiVO): NotificationCardVO {
  const responsibleUserId = vo.responsibleUserId ?? "";
  const objects = vo.objects ?? [];
  const objectMeasures = objects.flatMap((object) => object.measures ?? []);
  const hazardSummary =
    vo.hazardDesc ||
    objects
      .map((object) => object.hazardDesc)
      .filter(Boolean)
      .join("；") ||
    vo.description ||
    "";
  const accidentTypes = uniqueStrings([
    ...parseAccidentTypes(vo.accidentTypes),
    ...objects.flatMap((object) => parseAccidentTypes(object.accidentTypes)),
  ]);
  const measures = collectMeasureContents(vo.measures, objectMeasures);
  const emergencyText = vo.emergencyMeasure || uniqueStrings(objects.map((object) => object.emergencyMeasure)).join("；");
  const inherentRiskLevel = mapRiskLevelFromApi(vo.inherentRiskLevel);
  const controlRiskLevel = mapRiskLevelFromApi(vo.controlRiskLevel);
  return {
    id: toId(vo.unitId ?? vo.id),
    unitCode: vo.code ?? undefined,
    unitName: vo.name ?? "",
    areaName: optionDisplayName(vo.area),
    department: departmentDisplayName(vo.department, vo.departmentId),
    responsibleUser: userDisplayName(vo.responsibleUser, responsibleUserId),
    phone: undefined,
    riskLevel: controlRiskLevel ?? inherentRiskLevel ?? "LOW",
    inherentRiskLevel,
    controlRiskLevel,
    hazardSummary,
    accidentTypes,
    warningSigns: vo.warningSign
      ? [optionDisplayName(vo.warningSign as RiskControlWarningSignRefVO)].filter(Boolean)
      : (vo.warningSigns ?? []).map((s) => optionDisplayName(s as RiskControlWarningSignRefVO)).filter(Boolean),
    measures,
    emergencyText,
    objectCount: vo.objectCount,
    measureCount: vo.measureCount,
    hiddenDangerCount: vo.hiddenDangerCount,
  };
}

export function mapWarningRuleToApi(rule: WarningRuleVO): RiskWarningRuleParam {
  return {
    name: rule.title,
    warningType: rule.type,
    conditionJson: rule.condition,
    notifyUserIds: rule.notifyTargets,
    notifyChannels: rule.notifyChannels.join("、"),
    disposeDeadlineDays: rule.deadlineDays,
    enabled: rule.status === "ENABLED",
  };
}

export function mapIdentificationObjectToApi(obj: {
  objectId?: string;
  code?: string;
  name: string;
  assetId?: string;
  hazardDesc: string;
  accidentTypes: string[];
  accidentCause: string;
  triggerFactor?: string;
  emergencyMeasure: string;
  responsibleUserId: string;
  deleted?: boolean;
  userId?: string;
}): RiskIdentificationObjectParam {
  return {
    objectId: obj.objectId || undefined,
    code: obj.code?.trim() || undefined,
    name: obj.name.trim(),
    assetId: obj.assetId || undefined,
    responsibleUserId: obj.responsibleUserId,
    hazardDesc: obj.hazardDesc.trim(),
    accidentTypes: joinAccidentTypes(obj.accidentTypes),
    accidentCause: obj.accidentCause.trim(),
    triggerFactor: obj.triggerFactor?.trim() || undefined,
    emergencyMeasure: obj.emergencyMeasure.trim(),
    deleted: obj.deleted,
    userId: obj.userId,
  };
}

export function mapDeletedIdentificationObjectToApi(objectId: string, userId?: string): RiskIdentificationObjectParam {
  return {
    objectId,
    deleted: true,
    userId,
  };
}

/** @deprecated 辨识提交请使用 mapIdentificationObjectToApi */
export function mapRiskObjectToApi(obj: {
  id?: string;
  name: string;
  assetId?: string;
  hazardDesc: string;
  accidentTypes: string[];
  cause: string;
  triggerFactors?: string;
  emergencyMeasures: string;
  responsibleUser: string;
}): RiskIdentificationObjectParam {
  return mapIdentificationObjectToApi({
    objectId: obj.id,
    name: obj.name,
    assetId: obj.assetId,
    hazardDesc: obj.hazardDesc,
    accidentTypes: obj.accidentTypes,
    accidentCause: obj.cause,
    triggerFactor: obj.triggerFactors,
    emergencyMeasure: obj.emergencyMeasures,
    responsibleUserId: obj.responsibleUser,
  });
}

export function mapFourColorStatsFromApi(stats?: Record<string, number>): {
  major: number;
  significant: number;
  general: number;
  low: number;
} {
  return {
    major: stats?.MAJOR ?? stats?.major ?? stats?.majorCount ?? 0,
    significant: stats?.LARGE ?? stats?.SIGNIFICANT ?? stats?.significant ?? stats?.largeCount ?? 0,
    general: stats?.GENERAL ?? stats?.general ?? stats?.generalCount ?? 0,
    low: stats?.LOW ?? stats?.low ?? stats?.lowCount ?? 0,
  };
}

export function parseAccidentTypes(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinAccidentTypes(types: string[]): string {
  return types.join("、");
}
