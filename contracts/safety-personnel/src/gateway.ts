import type { Pagination } from "@g2-contract/base";

import type { DutyGateway } from "./duty-types";
import type {
  KeyPersonAreaCountVO,
  KeyPersonAreaOptionVO,
  KeyPersonDetailVO,
  KeyPersonOptionVO,
  KeyPersonPageVO,
  KeyPersonReportSaveParam,
  KeyPersonReportVO,
  KeyPersonSaveParam,
  KeyPersonStatisticsVO,
  KeyPersonSupervisorOptionVO,
  PageKeyPersonReportsParams,
  PageKeyPersonsParams,
} from "./key-personnel-types";
import type {
  CertCategoryModifyParam,
  CertCategoryTreeVO,
  CertTypeModifyParam,
  CertTypeVO,
  CommitteeChangeLogVO,
  CommitteeDetailVO,
  CommitteeModifyParam,
  CommitteeVO,
  EmployeeCertModifyParam,
  EmployeeCertVO,
  HomeOrgArchitectureVO,
  OrgNodeDetailVO,
  OrgNodeMemberSaveParam,
  OrgNodeModifyParam,
  OrgNodeTreeVO,
  OrgUserCandidateVO,
  PageCertificatesParams,
  PageCertTypesParams,
  PageCommitteesParams,
  PageOrgUserCandidatesParams,
  PagePersonPoolParams,
  PagePersonsParams,
  PersonLinkParam,
  PersonPoolUserVO,
  PersonProfileVO,
  PersonResumeExportQuery,
  PersonResumeQuery,
  PersonVO,
  ResumeDayGroupVO,
  ResumeItemVO,
} from "./types";

/** 安全人员管理 BFF 契约（1:1 透传开河 safety-personnel 后端） */
export interface SafetyPersonnelGateway extends DutyGateway {
  pageCertificates: (params: PageCertificatesParams) => Promise<Pagination<EmployeeCertVO>>;
  getCertificate: (id: string) => Promise<EmployeeCertVO>;
  createCertificate: (payload: EmployeeCertModifyParam) => Promise<EmployeeCertVO>;
  updateCertificate: (id: string, payload: EmployeeCertModifyParam) => Promise<EmployeeCertVO>;
  deleteCertificate: (id: string) => Promise<void>;
  exportCertificates: (params: PageCertificatesParams) => Promise<Blob>;

  getCertCategoryTree: () => Promise<CertCategoryTreeVO[]>;
  createCertCategory: (payload: CertCategoryModifyParam) => Promise<CertCategoryTreeVO>;
  createCertCategoryChild: (parentId: string, payload: CertCategoryModifyParam) => Promise<CertCategoryTreeVO>;
  updateCertCategory: (id: string, payload: CertCategoryModifyParam) => Promise<CertCategoryTreeVO>;
  deleteCertCategory: (id: string) => Promise<void>;

  pageCertTypes: (params: PageCertTypesParams) => Promise<Pagination<CertTypeVO>>;
  getCertType: (id: string) => Promise<CertTypeVO>;
  createCertType: (payload: CertTypeModifyParam) => Promise<CertTypeVO>;
  updateCertType: (id: string, payload: CertTypeModifyParam) => Promise<CertTypeVO>;
  deleteCertType: (id: string) => Promise<void>;

  pageCommittees: (params: PageCommitteesParams) => Promise<Pagination<CommitteeVO>>;
  getCommittee: (id: string) => Promise<CommitteeDetailVO>;
  createCommittee: (payload: CommitteeModifyParam) => Promise<CommitteeDetailVO>;
  updateCommittee: (id: string, payload: CommitteeModifyParam) => Promise<CommitteeDetailVO>;
  deleteCommittee: (id: string) => Promise<void>;
  getCommitteeChangeLogs: (id: string) => Promise<CommitteeChangeLogVO[]>;

  getHomeOrgArchitecture: () => Promise<HomeOrgArchitectureVO>;
  getOrgTree: () => Promise<OrgNodeTreeVO[]>;
  getOrgNode: (id: string) => Promise<OrgNodeDetailVO>;
  createOrgNode: (payload: OrgNodeModifyParam) => Promise<OrgNodeDetailVO>;
  createOrgNodeChild: (parentId: string, payload: OrgNodeModifyParam) => Promise<OrgNodeDetailVO>;
  updateOrgNode: (id: string, payload: OrgNodeModifyParam) => Promise<OrgNodeDetailVO>;
  deleteOrgNode: (id: string) => Promise<void>;
  saveOrgNodeMembers: (id: string, payload: OrgNodeMemberSaveParam) => Promise<OrgNodeDetailVO>;
  pageOrgUserCandidates: (params: PageOrgUserCandidatesParams) => Promise<Pagination<OrgUserCandidateVO>>;

  pagePersons: (params: PagePersonsParams) => Promise<Pagination<PersonVO>>;
  pagePersonPool: (params: PagePersonPoolParams) => Promise<Pagination<PersonPoolUserVO>>;
  linkPersons: (payload: PersonLinkParam) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  getPersonProfile: (id: string) => Promise<PersonProfileVO>;
  getPersonCertificates: (id: string) => Promise<EmployeeCertVO[]>;
  getPersonResumeTimeline: (id: string, query?: PersonResumeQuery) => Promise<ResumeDayGroupVO[]>;
  getPersonResumeByType: (id: string, type: string, query?: PersonResumeQuery) => Promise<ResumeItemVO[]>;
  exportPersons: (params: PagePersonsParams) => Promise<Blob>;
  exportPersonResume: (id: string, query?: PersonResumeExportQuery) => Promise<Blob>;

  /** 重点人员（原 key-personnel-management） */
  pageKeyPersons: (params: PageKeyPersonsParams) => Promise<Pagination<KeyPersonPageVO>>;
  createKeyPerson: (payload: KeyPersonSaveParam) => Promise<number>;
  getKeyPersonDetail: (id: number) => Promise<KeyPersonDetailVO>;
  updateKeyPerson: (id: number, payload: KeyPersonSaveParam) => Promise<void>;
  deleteKeyPerson: (id: number) => Promise<void>;
  getKeyPersonOptions: (keyword?: string) => Promise<KeyPersonOptionVO[]>;
  pageKeyPersonReports: (params: PageKeyPersonReportsParams) => Promise<Pagination<KeyPersonReportVO>>;
  createKeyPersonReport: (personId: number, payload: KeyPersonReportSaveParam) => Promise<number>;
  getKeyPersonAreaOptions: (keyword?: string) => Promise<KeyPersonAreaOptionVO[]>;
  getKeyPersonSupervisorOptions: (keyword?: string) => Promise<KeyPersonSupervisorOptionVO[]>;
  getKeyPersonStatisticsDashboard: () => Promise<KeyPersonStatisticsVO>;
  getKeyPersonAreaSupervisorStats: () => Promise<KeyPersonAreaCountVO[]>;
  getKeyPersonAreaHighRiskStats: () => Promise<KeyPersonAreaCountVO[]>;
}
