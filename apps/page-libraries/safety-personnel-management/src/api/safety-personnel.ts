import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { SafetyPersonnelClient } from "@g2-client/safety-personnel/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import type { SafetyPersonnelGateway } from "@g2-contract/safety-personnel";
export interface PersonnelDependencies {
  file: () => Promise<FileClient>;
  ouaa: () => Promise<OuaaClient>;
  alarm: () => Promise<AlarmCenterClient>;
  dictionary: () => Promise<{ getDictionaryByItem: (params: { itemCode: string }) => Promise<unknown> }>;
}
let client: SafetyPersonnelClient;
let dependencies: PersonnelDependencies;
export function installSafetyPersonnelPages(value: SafetyPersonnelClient, providers: PersonnelDependencies): void {
  client = value;
  dependencies = providers;
}
export function services(): PersonnelDependencies {
  if (!dependencies) {
    throw new Error("安全人员服务未安装");
  }
  return dependencies;
}
export function unwrapResponse<T>(raw: unknown): T {
  let value = raw;
  for (let i = 0; i < 3 && value && typeof value === "object"; i++) {
    if ("code" in value && value.code !== undefined && ![0, 200, "0", "200", "SUCCESS"].includes(value.code as string | number)) {
      throw new Error("message" in value ? String(value.message) : "请求失败");
    }
    if ("data" in value) {
      value = value.data;
    } else if ("result" in value) {
      value = value.result;
    } else {
      break;
    }
  }
  return value as T;
}
export const pageCertificates = async (
  ...args: Parameters<SafetyPersonnelGateway["pageCertificates"]>
): ReturnType<SafetyPersonnelGateway["pageCertificates"]> => unwrapResponse(await client.pageCertificates(...args));
export const getCertificate = async (
  ...args: Parameters<SafetyPersonnelGateway["getCertificate"]>
): ReturnType<SafetyPersonnelGateway["getCertificate"]> => unwrapResponse(await client.getCertificate(...args));
export const createCertificate = async (
  ...args: Parameters<SafetyPersonnelGateway["createCertificate"]>
): ReturnType<SafetyPersonnelGateway["createCertificate"]> => unwrapResponse(await client.createCertificate(...args));
export const updateCertificate = async (
  ...args: Parameters<SafetyPersonnelGateway["updateCertificate"]>
): ReturnType<SafetyPersonnelGateway["updateCertificate"]> => unwrapResponse(await client.updateCertificate(...args));
export const deleteCertificate = async (
  ...args: Parameters<SafetyPersonnelGateway["deleteCertificate"]>
): ReturnType<SafetyPersonnelGateway["deleteCertificate"]> => unwrapResponse(await client.deleteCertificate(...args));
export const exportCertificates = async (
  ...args: Parameters<SafetyPersonnelGateway["exportCertificates"]>
): ReturnType<SafetyPersonnelGateway["exportCertificates"]> => unwrapResponse(await client.exportCertificates(...args));
export const getCertCategoryTree = async (
  ...args: Parameters<SafetyPersonnelGateway["getCertCategoryTree"]>
): ReturnType<SafetyPersonnelGateway["getCertCategoryTree"]> => unwrapResponse(await client.getCertCategoryTree(...args));
export const createCertCategory = async (
  ...args: Parameters<SafetyPersonnelGateway["createCertCategory"]>
): ReturnType<SafetyPersonnelGateway["createCertCategory"]> => unwrapResponse(await client.createCertCategory(...args));
export const createCertCategoryChild = async (
  ...args: Parameters<SafetyPersonnelGateway["createCertCategoryChild"]>
): ReturnType<SafetyPersonnelGateway["createCertCategoryChild"]> => unwrapResponse(await client.createCertCategoryChild(...args));
export const updateCertCategory = async (
  ...args: Parameters<SafetyPersonnelGateway["updateCertCategory"]>
): ReturnType<SafetyPersonnelGateway["updateCertCategory"]> => unwrapResponse(await client.updateCertCategory(...args));
export const deleteCertCategory = async (
  ...args: Parameters<SafetyPersonnelGateway["deleteCertCategory"]>
): ReturnType<SafetyPersonnelGateway["deleteCertCategory"]> => unwrapResponse(await client.deleteCertCategory(...args));
export const pageCertTypes = async (
  ...args: Parameters<SafetyPersonnelGateway["pageCertTypes"]>
): ReturnType<SafetyPersonnelGateway["pageCertTypes"]> => unwrapResponse(await client.pageCertTypes(...args));
export const getCertType = async (
  ...args: Parameters<SafetyPersonnelGateway["getCertType"]>
): ReturnType<SafetyPersonnelGateway["getCertType"]> => unwrapResponse(await client.getCertType(...args));
export const createCertType = async (
  ...args: Parameters<SafetyPersonnelGateway["createCertType"]>
): ReturnType<SafetyPersonnelGateway["createCertType"]> => unwrapResponse(await client.createCertType(...args));
export const updateCertType = async (
  ...args: Parameters<SafetyPersonnelGateway["updateCertType"]>
): ReturnType<SafetyPersonnelGateway["updateCertType"]> => unwrapResponse(await client.updateCertType(...args));
export const deleteCertType = async (
  ...args: Parameters<SafetyPersonnelGateway["deleteCertType"]>
): ReturnType<SafetyPersonnelGateway["deleteCertType"]> => unwrapResponse(await client.deleteCertType(...args));
export const pageCommittees = async (
  ...args: Parameters<SafetyPersonnelGateway["pageCommittees"]>
): ReturnType<SafetyPersonnelGateway["pageCommittees"]> => unwrapResponse(await client.pageCommittees(...args));
export const getCommittee = async (
  ...args: Parameters<SafetyPersonnelGateway["getCommittee"]>
): ReturnType<SafetyPersonnelGateway["getCommittee"]> => unwrapResponse(await client.getCommittee(...args));
export const createCommittee = async (
  ...args: Parameters<SafetyPersonnelGateway["createCommittee"]>
): ReturnType<SafetyPersonnelGateway["createCommittee"]> => unwrapResponse(await client.createCommittee(...args));
export const updateCommittee = async (
  ...args: Parameters<SafetyPersonnelGateway["updateCommittee"]>
): ReturnType<SafetyPersonnelGateway["updateCommittee"]> => unwrapResponse(await client.updateCommittee(...args));
export const deleteCommittee = async (
  ...args: Parameters<SafetyPersonnelGateway["deleteCommittee"]>
): ReturnType<SafetyPersonnelGateway["deleteCommittee"]> => unwrapResponse(await client.deleteCommittee(...args));
export const getCommitteeChangeLogs = async (
  ...args: Parameters<SafetyPersonnelGateway["getCommitteeChangeLogs"]>
): ReturnType<SafetyPersonnelGateway["getCommitteeChangeLogs"]> => unwrapResponse(await client.getCommitteeChangeLogs(...args));
export const getHomeOrgArchitecture = async (
  ...args: Parameters<SafetyPersonnelGateway["getHomeOrgArchitecture"]>
): ReturnType<SafetyPersonnelGateway["getHomeOrgArchitecture"]> => unwrapResponse(await client.getHomeOrgArchitecture(...args));
export const getOrgTree = async (
  ...args: Parameters<SafetyPersonnelGateway["getOrgTree"]>
): ReturnType<SafetyPersonnelGateway["getOrgTree"]> => unwrapResponse(await client.getOrgTree(...args));
export const getOrgNode = async (
  ...args: Parameters<SafetyPersonnelGateway["getOrgNode"]>
): ReturnType<SafetyPersonnelGateway["getOrgNode"]> => unwrapResponse(await client.getOrgNode(...args));
export const createOrgNode = async (
  ...args: Parameters<SafetyPersonnelGateway["createOrgNode"]>
): ReturnType<SafetyPersonnelGateway["createOrgNode"]> => unwrapResponse(await client.createOrgNode(...args));
export const createOrgNodeChild = async (
  ...args: Parameters<SafetyPersonnelGateway["createOrgNodeChild"]>
): ReturnType<SafetyPersonnelGateway["createOrgNodeChild"]> => unwrapResponse(await client.createOrgNodeChild(...args));
export const updateOrgNode = async (
  ...args: Parameters<SafetyPersonnelGateway["updateOrgNode"]>
): ReturnType<SafetyPersonnelGateway["updateOrgNode"]> => unwrapResponse(await client.updateOrgNode(...args));
export const deleteOrgNode = async (
  ...args: Parameters<SafetyPersonnelGateway["deleteOrgNode"]>
): ReturnType<SafetyPersonnelGateway["deleteOrgNode"]> => unwrapResponse(await client.deleteOrgNode(...args));
export const saveOrgNodeMembers = async (
  ...args: Parameters<SafetyPersonnelGateway["saveOrgNodeMembers"]>
): ReturnType<SafetyPersonnelGateway["saveOrgNodeMembers"]> => unwrapResponse(await client.saveOrgNodeMembers(...args));
export const pageOrgUserCandidates = async (
  ...args: Parameters<SafetyPersonnelGateway["pageOrgUserCandidates"]>
): ReturnType<SafetyPersonnelGateway["pageOrgUserCandidates"]> => unwrapResponse(await client.pageOrgUserCandidates(...args));
export const pagePersons = async (
  ...args: Parameters<SafetyPersonnelGateway["pagePersons"]>
): ReturnType<SafetyPersonnelGateway["pagePersons"]> => unwrapResponse(await client.pagePersons(...args));
export const pagePersonPool = async (
  ...args: Parameters<SafetyPersonnelGateway["pagePersonPool"]>
): ReturnType<SafetyPersonnelGateway["pagePersonPool"]> => unwrapResponse(await client.pagePersonPool(...args));
export const linkPersons = async (
  ...args: Parameters<SafetyPersonnelGateway["linkPersons"]>
): ReturnType<SafetyPersonnelGateway["linkPersons"]> => unwrapResponse(await client.linkPersons(...args));
export const deletePerson = async (
  ...args: Parameters<SafetyPersonnelGateway["deletePerson"]>
): ReturnType<SafetyPersonnelGateway["deletePerson"]> => unwrapResponse(await client.deletePerson(...args));
export const getPersonProfile = async (
  ...args: Parameters<SafetyPersonnelGateway["getPersonProfile"]>
): ReturnType<SafetyPersonnelGateway["getPersonProfile"]> => unwrapResponse(await client.getPersonProfile(...args));
export const getPersonCertificates = async (
  ...args: Parameters<SafetyPersonnelGateway["getPersonCertificates"]>
): ReturnType<SafetyPersonnelGateway["getPersonCertificates"]> => unwrapResponse(await client.getPersonCertificates(...args));
export const getPersonResumeTimeline = async (
  ...args: Parameters<SafetyPersonnelGateway["getPersonResumeTimeline"]>
): ReturnType<SafetyPersonnelGateway["getPersonResumeTimeline"]> => unwrapResponse(await client.getPersonResumeTimeline(...args));
export const getPersonResumeByType = async (
  ...args: Parameters<SafetyPersonnelGateway["getPersonResumeByType"]>
): ReturnType<SafetyPersonnelGateway["getPersonResumeByType"]> => unwrapResponse(await client.getPersonResumeByType(...args));
export const exportPersons = async (
  ...args: Parameters<SafetyPersonnelGateway["exportPersons"]>
): ReturnType<SafetyPersonnelGateway["exportPersons"]> => unwrapResponse(await client.exportPersons(...args));
export const exportPersonResume = async (
  ...args: Parameters<SafetyPersonnelGateway["exportPersonResume"]>
): ReturnType<SafetyPersonnelGateway["exportPersonResume"]> => unwrapResponse(await client.exportPersonResume(...args));
export const pageKeyPersons = async (
  ...args: Parameters<SafetyPersonnelGateway["pageKeyPersons"]>
): ReturnType<SafetyPersonnelGateway["pageKeyPersons"]> => unwrapResponse(await client.pageKeyPersons(...args));
export const createKeyPerson = async (
  ...args: Parameters<SafetyPersonnelGateway["createKeyPerson"]>
): ReturnType<SafetyPersonnelGateway["createKeyPerson"]> => unwrapResponse(await client.createKeyPerson(...args));
export const getKeyPersonDetail = async (
  ...args: Parameters<SafetyPersonnelGateway["getKeyPersonDetail"]>
): ReturnType<SafetyPersonnelGateway["getKeyPersonDetail"]> => unwrapResponse(await client.getKeyPersonDetail(...args));
export const updateKeyPerson = async (
  ...args: Parameters<SafetyPersonnelGateway["updateKeyPerson"]>
): ReturnType<SafetyPersonnelGateway["updateKeyPerson"]> => unwrapResponse(await client.updateKeyPerson(...args));
export const deleteKeyPerson = async (
  ...args: Parameters<SafetyPersonnelGateway["deleteKeyPerson"]>
): ReturnType<SafetyPersonnelGateway["deleteKeyPerson"]> => unwrapResponse(await client.deleteKeyPerson(...args));
export const getKeyPersonOptions = async (
  ...args: Parameters<SafetyPersonnelGateway["getKeyPersonOptions"]>
): ReturnType<SafetyPersonnelGateway["getKeyPersonOptions"]> => unwrapResponse(await client.getKeyPersonOptions(...args));
export const pageKeyPersonReports = async (
  ...args: Parameters<SafetyPersonnelGateway["pageKeyPersonReports"]>
): ReturnType<SafetyPersonnelGateway["pageKeyPersonReports"]> => unwrapResponse(await client.pageKeyPersonReports(...args));
export const createKeyPersonReport = async (
  ...args: Parameters<SafetyPersonnelGateway["createKeyPersonReport"]>
): ReturnType<SafetyPersonnelGateway["createKeyPersonReport"]> => unwrapResponse(await client.createKeyPersonReport(...args));
export const getKeyPersonAreaOptions = async (
  ...args: Parameters<SafetyPersonnelGateway["getKeyPersonAreaOptions"]>
): ReturnType<SafetyPersonnelGateway["getKeyPersonAreaOptions"]> => unwrapResponse(await client.getKeyPersonAreaOptions(...args));
export const getKeyPersonSupervisorOptions = async (
  ...args: Parameters<SafetyPersonnelGateway["getKeyPersonSupervisorOptions"]>
): ReturnType<SafetyPersonnelGateway["getKeyPersonSupervisorOptions"]> =>
  unwrapResponse(await client.getKeyPersonSupervisorOptions(...args));
export const getKeyPersonStatisticsDashboard = async (
  ...args: Parameters<SafetyPersonnelGateway["getKeyPersonStatisticsDashboard"]>
): ReturnType<SafetyPersonnelGateway["getKeyPersonStatisticsDashboard"]> =>
  unwrapResponse(await client.getKeyPersonStatisticsDashboard(...args));
export const getKeyPersonAreaSupervisorStats = async (
  ...args: Parameters<SafetyPersonnelGateway["getKeyPersonAreaSupervisorStats"]>
): ReturnType<SafetyPersonnelGateway["getKeyPersonAreaSupervisorStats"]> =>
  unwrapResponse(await client.getKeyPersonAreaSupervisorStats(...args));
export const getKeyPersonAreaHighRiskStats = async (
  ...args: Parameters<SafetyPersonnelGateway["getKeyPersonAreaHighRiskStats"]>
): ReturnType<SafetyPersonnelGateway["getKeyPersonAreaHighRiskStats"]> =>
  unwrapResponse(await client.getKeyPersonAreaHighRiskStats(...args));
