type LedgerForm = Record<string, unknown>;
type LedgerPart = Record<string, unknown>;

const stringValue = (value: unknown): string => (value === undefined || value === null ? "" : String(value));

/**
 * 严格按旧风险源台账提交契约组装请求体：界面状态（文件对象、级联数组、配件编辑标识）不能直接透传给后端。
 */
export function buildRiskLedgerPayload(form: LedgerForm, parts: LedgerPart[], routeId?: string): Record<string, unknown> {
  const typeCode = Array.isArray(form.typeCode) ? form.typeCode : [];
  const areaId = Array.isArray(form.areaId) ? form.areaId : [];
  const files = Array.isArray(form.files)
    ? form.files
        .map((file) => (file && typeof file === "object" && "id" in file ? stringValue(file.id) : ""))
        .filter(Boolean)
        .join(",")
    : stringValue(form.files);

  return {
    id: routeId ?? form.id,
    serialNumber: stringValue(form.serialNumber),
    bimCode: stringValue(form.bimCode),
    typeCode: typeCode.length ? stringValue(typeCode[typeCode.length - 1]) : "",
    typeName: stringValue(form.typeName),
    areaId: areaId.join(","),
    stallId: form.stallId,
    sitePointId: form.sitePointId,
    maintenanceDepId: form.maintenanceDepId,
    maintenanceUserId: form.maintenanceUserId,
    receiveDepId: form.receiveDepId,
    receiveUserType: form.receiveUserType,
    receiveUserName: stringValue(form.receiveUserName),
    receiveUserPhone: stringValue(form.receiveUserPhone),
    location: stringValue(form.location),
    latAndLon: stringValue(form.latAndLon),
    name: stringValue(form.name),
    norms: stringValue(form.norms),
    attribute: stringValue(form.attribute),
    usageDate: stringValue(form.usageDate),
    purchasingDate: stringValue(form.purchasingDate),
    mandatoryTestingDate: stringValue(form.mandatoryTestingDate),
    files,
    efficiency: stringValue(form.efficiency),
    insurance: form.insurance,
    plateNumber: stringValue(form.plateNumber),
    produceFactory: stringValue(form.produceFactory),
    produceAddress: stringValue(form.produceAddress),
    deliveryCompany: stringValue(form.deliveryCompany),
    deliveryAddress: stringValue(form.deliveryAddress),
    maintenanceDepName: stringValue(form.maintenanceDepName),
    maintenanceUserName: stringValue(form.maintenanceUserName),
    receiveDepName: stringValue(form.receiveDepName),
    sitePointName: stringValue(form.sitePointName),
    stallName: stringValue(form.stallName),
    partsDetails: parts.map((part) => ({
      code: stringValue(part.code),
      name: stringValue(part.name),
      expireDate: stringValue(part.expireDate),
      remarks: stringValue(part.remarks),
    })),
  };
}
