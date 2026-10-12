import { Body, Controller, DELETE, GET, Param, POST, PUT, QueryMap } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type {
  CommitteeChangeLogVO,
  CommitteeDetailVO,
  CommitteeModifyParam,
  CommitteeVO,
  DutyAppScoreDashboardParam,
  DutyAppScoreDashboardVO,
  DutyDispatchQueryParam,
  DutyDispatchVO,
  DutyLawNameVO,
  DutyLegalClauseVO,
  DutyReportResponsibleUserCandidateQueryParam,
  DutyReportResponsibleUserCandidateVO,
  DutyReportSignatureConfirmParam,
  DutyReportTypeVO,
  DutyReportVO,
  DutySignatureQueryParam,
  DutySignatureVO,
  EmployeeCertVO,
  HomeOrgArchitectureVO,
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
  OrgNodeDetailVO,
  OrgNodeMemberSaveParam,
  OrgNodeModifyParam,
  OrgNodeTreeVO,
  OrgUserCandidateVO,
  PageCommitteesParams,
  PageKeyPersonReportsParams,
  PageKeyPersonsParams,
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
} from "@g2-contract/safety-personnel";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { SafetyPersonnelProxyService } from "@/services/proxy/safety-personnel/safety-personnel-proxy.service";

type ForwardQuery = Record<string, unknown>;

@Controller("/gw-bff/safety-personnel")
export class SafetyPersonnelBusinessController {
  constructor(private readonly proxy: SafetyPersonnelProxyService) {}

  @GET("/committees")
  @CubeAuthProxy()
  public async pageCommittees(@QueryMap() params: PageCommitteesParams): Promise<Pagination<CommitteeVO>> {
    return await this.proxy.forwardGet("/committees", { ...params }, this.proxy.emptyPage());
  }

  @GET("/committees/:id")
  @CubeAuthProxy()
  public async getCommittee(@Param("id") id: string): Promise<CommitteeDetailVO> {
    return await this.proxy.forwardGet(`/committees/${id}`, undefined, {} as CommitteeDetailVO);
  }

  @POST("/committees")
  @CubeAuthProxy()
  public async createCommittee(@Body() payload: CommitteeModifyParam): Promise<CommitteeDetailVO> {
    return await this.proxy.forwardPost("/committees", payload);
  }

  @PUT("/committees/:id")
  @CubeAuthProxy()
  public async updateCommittee(@Param("id") id: string, @Body() payload: CommitteeModifyParam): Promise<CommitteeDetailVO> {
    return await this.proxy.forwardPut(`/committees/${id}`, payload);
  }

  @DELETE("/committees/:id")
  @CubeAuthProxy()
  public async deleteCommittee(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/committees/${id}`);
  }

  @GET("/committees/:id/change-logs")
  @CubeAuthProxy()
  public async getCommitteeChangeLogs(@Param("id") id: string): Promise<CommitteeChangeLogVO[]> {
    return await this.proxy.forwardGet(`/committees/${id}/change-logs`, undefined, []);
  }

  @GET("/home/org-architecture")
  @CubeAuthProxy()
  public async getHomeOrgArchitecture(): Promise<HomeOrgArchitectureVO> {
    return await this.proxy.forwardGet("/home/org-architecture", undefined, {});
  }

  @GET("/org/tree")
  @CubeAuthProxy()
  public async getOrgTree(): Promise<OrgNodeTreeVO[]> {
    return await this.proxy.forwardGet("/org/tree", undefined, []);
  }

  @GET("/org/nodes/:id")
  @CubeAuthProxy()
  public async getOrgNode(@Param("id") id: string): Promise<OrgNodeDetailVO> {
    return await this.proxy.forwardGet(`/org/nodes/${id}`, undefined, {} as OrgNodeDetailVO);
  }

  @POST("/org/nodes")
  @CubeAuthProxy()
  public async createOrgNode(@Body() payload: OrgNodeModifyParam): Promise<OrgNodeDetailVO> {
    return await this.proxy.forwardPost("/org/nodes", payload);
  }

  @POST("/org/nodes/:id/children")
  @CubeAuthProxy()
  public async createOrgNodeChild(@Param("id") id: string, @Body() payload: OrgNodeModifyParam): Promise<OrgNodeDetailVO> {
    return await this.proxy.forwardPost(`/org/nodes/${id}/children`, payload);
  }

  @PUT("/org/nodes/:id")
  @CubeAuthProxy()
  public async updateOrgNode(@Param("id") id: string, @Body() payload: OrgNodeModifyParam): Promise<OrgNodeDetailVO> {
    return await this.proxy.forwardPut(`/org/nodes/${id}`, payload);
  }

  @DELETE("/org/nodes/:id")
  @CubeAuthProxy()
  public async deleteOrgNode(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/org/nodes/${id}`);
  }

  @PUT("/org/nodes/:id/members")
  @CubeAuthProxy()
  public async saveOrgNodeMembers(@Param("id") id: string, @Body() payload: OrgNodeMemberSaveParam): Promise<OrgNodeDetailVO> {
    return await this.proxy.forwardPut(`/org/nodes/${id}/members`, payload);
  }

  @GET("/org/user-candidates")
  @CubeAuthProxy()
  public async pageOrgUserCandidates(@QueryMap() params: PageOrgUserCandidatesParams): Promise<Pagination<OrgUserCandidateVO>> {
    return await this.proxy.forwardGet("/org/user-candidates", { ...params }, this.proxy.emptyPage());
  }

  @GET("/persons")
  @CubeAuthProxy()
  public async pagePersons(@QueryMap() params: PagePersonsParams): Promise<Pagination<PersonVO>> {
    return await this.proxy.forwardGet("/persons", { ...params }, this.proxy.emptyPage());
  }

  @GET("/persons/pool")
  @CubeAuthProxy()
  public async pagePersonPool(@QueryMap() params: PagePersonPoolParams): Promise<Pagination<PersonPoolUserVO>> {
    return await this.proxy.forwardGet("/persons/pool", { ...params }, this.proxy.emptyPage());
  }

  @POST("/persons/link")
  @CubeAuthProxy()
  public async linkPersons(@Body() payload: PersonLinkParam): Promise<void> {
    await this.proxy.forwardPost("/persons/link", payload);
  }

  @DELETE("/persons/:id")
  @CubeAuthProxy()
  public async deletePerson(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/persons/${id}`);
  }

  @GET("/persons/:id/profile")
  @CubeAuthProxy()
  public async getPersonProfile(@Param("id") id: string): Promise<PersonProfileVO> {
    return await this.proxy.forwardGet(`/persons/${id}/profile`, undefined, {} as PersonProfileVO);
  }

  @GET("/persons/:id/certificates")
  @CubeAuthProxy()
  public async getPersonCertificates(@Param("id") id: string): Promise<EmployeeCertVO[]> {
    return await this.proxy.forwardGet(`/persons/${id}/certificates`, undefined, []);
  }

  @GET("/persons/:id/resume/timeline")
  @CubeAuthProxy()
  public async getPersonResumeTimeline(@Param("id") id: string, @QueryMap() query: PersonResumeQuery): Promise<ResumeDayGroupVO[]> {
    return await this.proxy.forwardGet(`/persons/${id}/resume/timeline`, { ...query }, []);
  }

  @GET("/persons/:id/resume/:type")
  @CubeAuthProxy()
  public async getPersonResumeByType(
    @Param("id") id: string,
    @Param("type") type: string,
    @QueryMap() query: PersonResumeQuery,
  ): Promise<ResumeItemVO[]> {
    return await this.proxy.forwardGet(`/persons/${id}/resume/${type}`, { ...query }, []);
  }

  @POST("/persons/export")
  @CubeAuthProxy()
  public async exportPersons(@Body() params: PagePersonsParams): Promise<Response> {
    return await this.proxy.forwardPostDownload("/persons/export", { ...params });
  }

  @POST("/persons/:id/resume/export")
  @CubeAuthProxy()
  public async exportPersonResume(@Param("id") id: string, @Body() query: PersonResumeExportQuery): Promise<Response> {
    return await this.proxy.forwardPostDownload(`/persons/${id}/resume/export`, { ...query });
  }

  @GET("/key-personnel/persons")
  @CubeAuthProxy()
  public async pageKeyPersons(@QueryMap() params: PageKeyPersonsParams): Promise<Pagination<KeyPersonPageVO>> {
    return await this.proxy.forwardGet("/key-personnel/persons", { ...params }, this.proxy.emptyPage());
  }

  @POST("/key-personnel/persons")
  @CubeAuthProxy()
  public async createKeyPerson(@Body() payload: KeyPersonSaveParam): Promise<number> {
    return await this.proxy.forwardPost("/key-personnel/persons", payload);
  }

  @GET("/key-personnel/persons/options")
  @CubeAuthProxy()
  public async getKeyPersonOptions(@QueryMap() query: { keyword?: string }): Promise<KeyPersonOptionVO[]> {
    return await this.proxy.forwardGet("/key-personnel/persons/options", { ...query }, []);
  }

  @GET("/key-personnel/persons/:id")
  @CubeAuthProxy()
  public async getKeyPersonDetail(@Param("id") id: string): Promise<KeyPersonDetailVO> {
    return await this.proxy.forwardGet(`/key-personnel/persons/${id}`, undefined, {} as KeyPersonDetailVO);
  }

  @PUT("/key-personnel/persons/:id")
  @CubeAuthProxy()
  public async updateKeyPerson(@Param("id") id: string, @Body() payload: KeyPersonSaveParam): Promise<void> {
    await this.proxy.forwardPut(`/key-personnel/persons/${id}`, payload);
  }

  @DELETE("/key-personnel/persons/:id")
  @CubeAuthProxy()
  public async deleteKeyPerson(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/key-personnel/persons/${id}`);
  }

  @GET("/key-personnel/persons/:personId/reports")
  @CubeAuthProxy()
  public async pageKeyPersonReports(
    @Param("personId") personId: string,
    @QueryMap() query: Omit<PageKeyPersonReportsParams, "personId">,
  ): Promise<Pagination<KeyPersonReportVO>> {
    return await this.proxy.forwardGet(`/key-personnel/persons/${personId}/reports`, { ...query }, this.proxy.emptyPage());
  }

  @POST("/key-personnel/persons/:personId/reports")
  @CubeAuthProxy()
  public async createKeyPersonReport(@Param("personId") personId: string, @Body() payload: KeyPersonReportSaveParam): Promise<number> {
    return await this.proxy.forwardPost(`/key-personnel/persons/${personId}/reports`, payload);
  }

  @GET("/key-personnel/areas/options")
  @CubeAuthProxy()
  public async getKeyPersonAreaOptions(@QueryMap() query: { keyword?: string }): Promise<KeyPersonAreaOptionVO[]> {
    return await this.proxy.forwardGet("/key-personnel/areas/options", { ...query }, []);
  }

  @GET("/key-personnel/supervisors/options")
  @CubeAuthProxy()
  public async getKeyPersonSupervisorOptions(@QueryMap() query: { keyword?: string }): Promise<KeyPersonSupervisorOptionVO[]> {
    return await this.proxy.forwardGet("/key-personnel/supervisors/options", { ...query }, []);
  }

  @GET("/key-personnel/statistics/dashboard")
  @CubeAuthProxy()
  public async getKeyPersonStatisticsDashboard(): Promise<KeyPersonStatisticsVO> {
    return await this.proxy.forwardGet("/key-personnel/statistics/dashboard", undefined, {
      totalCount: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
    });
  }

  @GET("/key-personnel/statistics/area-supervisors")
  @CubeAuthProxy()
  public async getKeyPersonAreaSupervisorStats(): Promise<KeyPersonAreaCountVO[]> {
    return await this.proxy.forwardGet("/key-personnel/statistics/area-supervisors", undefined, []);
  }

  @GET("/key-personnel/statistics/area-high-risk")
  @CubeAuthProxy()
  public async getKeyPersonAreaHighRiskStats(): Promise<KeyPersonAreaCountVO[]> {
    return await this.proxy.forwardGet("/key-personnel/statistics/area-high-risk", undefined, []);
  }

  @GET("/duty-role-assignments")
  @CubeAuthProxy()
  public async listDutyRoleAssignments(@QueryMap() query: ForwardQuery): Promise<unknown[]> {
    return await this.proxy.forwardGet("/duty-role-assignments", { ...query }, []);
  }

  @GET("/duty-role-assignment-user-candidates")
  @CubeAuthProxy()
  public async pageDutyRoleUserCandidates(@QueryMap() query: ForwardQuery): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet("/duty-role-assignment-user-candidates", { ...query }, this.proxy.emptyPage());
  }

  @PUT("/duty-role-assignments")
  @CubeAuthProxy()
  public async saveDutyRoleAssignments(@Body() payload: unknown): Promise<unknown[]> {
    return await this.proxy.forwardPut("/duty-role-assignments", payload);
  }

  @GET("/duty-templates")
  @CubeAuthProxy()
  public async pageDutyTemplates(@QueryMap() query: ForwardQuery): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet("/duty-templates", { ...query }, this.proxy.emptyPage());
  }

  @GET("/duty-template-items")
  @CubeAuthProxy()
  public async pageDutyTemplateItems(@QueryMap() query: ForwardQuery): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet("/duty-template-items", { ...query }, this.proxy.emptyPage());
  }

  @GET("/duty-template-item-statistics")
  @CubeAuthProxy()
  public async getDutyTemplateItemStatistics(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/duty-template-item-statistics", { ...query }, {});
  }

  @POST("/duty-template-items")
  @CubeAuthProxy()
  public async createDutyTemplateItem(@Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPost("/duty-template-items", payload);
  }

  @POST("/duty-template-items/batch")
  @CubeAuthProxy()
  public async createDutyTemplateItems(@Body() payload: unknown): Promise<unknown[]> {
    return await this.proxy.forwardPost("/duty-template-items/batch", payload);
  }

  @POST("/duty-templates")
  @CubeAuthProxy()
  public async createDutyTemplate(@Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPost("/duty-templates", payload);
  }

  @GET("/duty-templates/:id")
  @CubeAuthProxy()
  public async getDutyTemplate(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`/duty-templates/${id}`, undefined, {});
  }

  @PUT("/duty-templates/:id")
  @CubeAuthProxy()
  public async updateDutyTemplate(@Param("id") id: string, @Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPut(`/duty-templates/${id}`, payload);
  }

  @PUT("/duty-template-items/:id")
  @CubeAuthProxy()
  public async updateDutyTemplateItem(@Param("id") id: string, @Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPut(`/duty-template-items/${id}`, payload);
  }

  @DELETE("/duty-template-items/:id")
  @CubeAuthProxy()
  public async deleteDutyTemplateItem(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/duty-template-items/${id}`);
  }

  @GET("/duty-legal-clauses")
  @CubeAuthProxy()
  public async listDutyLegalClauses(@QueryMap() query: ForwardQuery): Promise<DutyLegalClauseVO[]> {
    return await this.proxy.forwardGet("/duty-legal-clauses", { ...query }, []);
  }

  @GET("/duty-law-names")
  @CubeAuthProxy()
  public async listDutyLawNames(): Promise<DutyLawNameVO[]> {
    return await this.proxy.forwardGet("/duty-law-names", undefined, []);
  }

  @GET("/duty-evidence-source-options")
  @CubeAuthProxy()
  public async listDutyEvidenceSourceOptions(@QueryMap() query: ForwardQuery): Promise<unknown[]> {
    return await this.proxy.forwardGet("/duty-evidence-source-options", { ...query }, []);
  }

  @POST("/duty-template-item-duplicate-checks")
  @CubeAuthProxy()
  public async checkDutyTemplateItemDuplicate(@Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPost("/duty-template-item-duplicate-checks", payload);
  }

  @POST("/duty-template-versions")
  @CubeAuthProxy()
  public async createDutyTemplateVersion(@Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPost("/duty-template-versions", payload);
  }

  @GET("/duty-templates/:id/versions")
  @CubeAuthProxy()
  public async listDutyTemplateVersions(@Param("id") id: string): Promise<unknown[]> {
    return await this.proxy.forwardGet(`/duty-templates/${id}/versions`, undefined, []);
  }

  @POST("/duty-template-version-rollbacks")
  @CubeAuthProxy()
  public async rollbackDutyTemplateVersion(@Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPost("/duty-template-version-rollbacks", payload);
  }

  @GET("/duty-assignments/overview-statistics")
  @CubeAuthProxy()
  public async getDutyAssignmentOverviewStatistics(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/duty-assignments/overview-statistics", { ...query }, {});
  }

  @GET("/duty-assignments/overview-role-groups")
  @CubeAuthProxy()
  public async listDutyAssignmentOverviewRoleGroups(@QueryMap() query: ForwardQuery): Promise<unknown[]> {
    return await this.proxy.forwardGet("/duty-assignments/overview-role-groups", { ...query }, []);
  }

  @GET("/duty-assignments")
  @CubeAuthProxy()
  public async pageDutyAssignments(@QueryMap() query: ForwardQuery): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet("/duty-assignments", { ...query }, this.proxy.emptyPage());
  }

  @GET("/duty-assignments/:id")
  @CubeAuthProxy()
  public async getDutyAssignment(@Param("id") id: string, @QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet(`/duty-assignments/${id}`, { ...query }, {});
  }

  @GET("/duty-my-assignments/current")
  @CubeAuthProxy()
  public async getCurrentDutyAssignment(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/duty-my-assignments/current", { ...query }, {});
  }

  @GET("/duty-signatures/tracking-statistics")
  @CubeAuthProxy()
  public async getDutySignatureTrackingStatistics(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/duty-signatures/tracking-statistics", { ...query }, {});
  }

  @GET("/duty-dispatch-options")
  @CubeAuthProxy()
  public async getDutyDispatchOptions(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/duty-dispatch-options", { ...query }, {});
  }

  @POST("/duty-dispatches")
  @CubeAuthProxy()
  public async createDutyDispatch(@Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPost("/duty-dispatches", payload);
  }

  @GET("/duty-dispatches")
  @CubeAuthProxy()
  public async pageDutyDispatches(@QueryMap() query: DutyDispatchQueryParam): Promise<Pagination<DutyDispatchVO>> {
    return await this.proxy.forwardGet("/duty-dispatches", { ...query }, this.proxy.emptyPage());
  }

  @GET("/duty-dispatches/:dispatchId/signatures")
  @CubeAuthProxy()
  public async pageDutySignatures(
    @Param("dispatchId") dispatchId: string,
    @QueryMap() query: DutySignatureQueryParam,
  ): Promise<Pagination<DutySignatureVO>> {
    return await this.proxy.forwardGet(`/duty-dispatches/${dispatchId}/signatures`, { ...query }, this.proxy.emptyPage());
  }

  @GET("/duty-my-assignments/sign-preview")
  @CubeAuthProxy()
  public async getDutySignPreview(): Promise<unknown> {
    return await this.proxy.forwardGet("/duty-my-assignments/sign-preview", undefined, {});
  }

  @POST("/duty-signatures")
  @CubeAuthProxy()
  public async signDutyAssignment(@Body() payload: unknown): Promise<unknown[]> {
    return await this.proxy.forwardPost("/duty-signatures", payload);
  }

  @GET("/duty-assignment-items/:assignmentItemId/records")
  @CubeAuthProxy()
  public async listDutyAssignmentItemRecords(@Param("assignmentItemId") assignmentItemId: string): Promise<unknown[]> {
    return await this.proxy.forwardGet(`/duty-assignment-items/${assignmentItemId}/records`, undefined, []);
  }

  @GET("/app/duty-assignment-items/:assignmentItemId/records")
  @CubeAuthProxy()
  public async listCurrentDutyAssignmentItemRecords(@Param("assignmentItemId") assignmentItemId: string): Promise<unknown[]> {
    return await this.proxy.forwardGet(`/app/duty-assignment-items/${assignmentItemId}/records`, undefined, []);
  }

  @POST("/duty-records")
  @CubeAuthProxy()
  public async createDutyManualRecord(@Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPost("/duty-records", payload);
  }

  @GET("/duty-records/:id")
  @CubeAuthProxy()
  public async getDutyRecord(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`/duty-records/${id}`, undefined, {});
  }

  @GET("/app/duty-records/:id")
  @CubeAuthProxy()
  public async getCurrentDutyRecord(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`/app/duty-records/${id}`, undefined, {});
  }

  @GET("/duty-report-types")
  @CubeAuthProxy()
  public async listDutyReportTypes(@QueryMap() query: ForwardQuery): Promise<DutyReportTypeVO[]> {
    return await this.proxy.forwardGet("/duty-report-types", { ...query }, []);
  }

  @GET("/duty-reports/generate-confirmation")
  @CubeAuthProxy()
  public async getDutyReportGenerateConfirmation(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/duty-reports/generate-confirmation", { ...query }, {});
  }

  @GET("/duty-reports/responsible-user-candidates")
  @CubeAuthProxy()
  public async pageDutyReportResponsibleUserCandidates(
    @QueryMap() query: DutyReportResponsibleUserCandidateQueryParam,
  ): Promise<Pagination<DutyReportResponsibleUserCandidateVO>> {
    return await this.proxy.forwardGet("/duty-reports/responsible-user-candidates", { ...query }, this.proxy.emptyPage());
  }

  @POST("/duty-reports")
  @CubeAuthProxy()
  public async createDutyReport(@Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPost("/duty-reports", payload);
  }

  @GET("/duty-reports")
  @CubeAuthProxy()
  public async pageDutyReports(@QueryMap() query: ForwardQuery): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet("/duty-reports", { ...query }, this.proxy.emptyPage());
  }

  @GET("/duty-reports/:id")
  @CubeAuthProxy()
  public async getDutyReport(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`/duty-reports/${id}`, undefined, {});
  }

  @POST("/duty-reports/:id/signature-confirmations")
  @CubeAuthProxy()
  public async confirmDutyReportSignature(
    @Param("id") id: string,
    @Body() payload: DutyReportSignatureConfirmParam,
  ): Promise<DutyReportVO> {
    return await this.proxy.forwardPost(`/duty-reports/${id}/signature-confirmations`, payload);
  }

  @GET("/duty-reports/:id/mappings")
  @CubeAuthProxy()
  public async listDutyReportMappings(@Param("id") id: string, @QueryMap() query: ForwardQuery): Promise<unknown[]> {
    return await this.proxy.forwardGet(`/duty-reports/${id}/mappings`, { ...query }, []);
  }

  @GET("/duty-reports/:id/mappings/:mappingId")
  @CubeAuthProxy()
  public async getDutyReportMapping(@Param("id") id: string, @Param("mappingId") mappingId: string): Promise<unknown> {
    return await this.proxy.forwardGet(`/duty-reports/${id}/mappings/${mappingId}`, undefined, {});
  }

  @GET("/duty-reports/:id/mappings/:mappingId/evidences")
  @CubeAuthProxy()
  public async listDutyReportMappingEvidences(
    @Param("id") id: string,
    @Param("mappingId") mappingId: string,
    @QueryMap() query: ForwardQuery,
  ): Promise<unknown[]> {
    return await this.proxy.forwardGet(`/duty-reports/${id}/mappings/${mappingId}/evidences`, { ...query }, []);
  }

  @GET("/duty-reports/:id/mappings/:mappingId/gap-detail")
  @CubeAuthProxy()
  public async getDutyReportGapDetail(@Param("id") id: string, @Param("mappingId") mappingId: string): Promise<unknown> {
    return await this.proxy.forwardGet(`/duty-reports/${id}/mappings/${mappingId}/gap-detail`, undefined, {});
  }

  @GET("/duty-reports/:id/evidences")
  @CubeAuthProxy()
  public async listDutyReportEvidences(@Param("id") id: string, @QueryMap() query: ForwardQuery): Promise<unknown[]> {
    return await this.proxy.forwardGet(`/duty-reports/${id}/evidences`, { ...query }, []);
  }

  @GET("/app/duty-reports")
  @CubeAuthProxy()
  public async pageCurrentDutyReports(@QueryMap() query: ForwardQuery): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet("/app/duty-reports", { ...query }, this.proxy.emptyPage());
  }

  @GET("/app/duty-reports/:id")
  @CubeAuthProxy()
  public async getCurrentDutyReport(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`/app/duty-reports/${id}`, undefined, {});
  }

  @GET("/app/duty-reports/:id/mappings")
  @CubeAuthProxy()
  public async listCurrentDutyReportMappings(@Param("id") id: string, @QueryMap() query: ForwardQuery): Promise<unknown[]> {
    return await this.proxy.forwardGet(`/app/duty-reports/${id}/mappings`, { ...query }, []);
  }

  @GET("/app/duty-reports/:id/mappings/:mappingId")
  @CubeAuthProxy()
  public async getCurrentDutyReportMapping(@Param("id") id: string, @Param("mappingId") mappingId: string): Promise<unknown> {
    return await this.proxy.forwardGet(`/app/duty-reports/${id}/mappings/${mappingId}`, undefined, {});
  }

  @GET("/app/duty-reports/:id/mappings/:mappingId/evidences")
  @CubeAuthProxy()
  public async listCurrentDutyReportMappingEvidences(
    @Param("id") id: string,
    @Param("mappingId") mappingId: string,
    @QueryMap() query: ForwardQuery,
  ): Promise<unknown[]> {
    return await this.proxy.forwardGet(`/app/duty-reports/${id}/mappings/${mappingId}/evidences`, { ...query }, []);
  }

  @GET("/app/duty-reports/:id/mappings/:mappingId/gap-detail")
  @CubeAuthProxy()
  public async getCurrentDutyReportGapDetail(@Param("id") id: string, @Param("mappingId") mappingId: string): Promise<unknown> {
    return await this.proxy.forwardGet(`/app/duty-reports/${id}/mappings/${mappingId}/gap-detail`, undefined, {});
  }

  @GET("/app/duty-reports/:id/evidences")
  @CubeAuthProxy()
  public async listCurrentDutyReportEvidences(@Param("id") id: string, @QueryMap() query: ForwardQuery): Promise<unknown[]> {
    return await this.proxy.forwardGet(`/app/duty-reports/${id}/evidences`, { ...query }, []);
  }

  @GET("/duty-score-models/current")
  @CubeAuthProxy()
  public async getDutyScoreModel(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/duty-score-models/current", { ...query }, {});
  }

  @PUT("/duty-score-models/current")
  @CubeAuthProxy()
  public async saveDutyScoreModel(@Body() payload: unknown): Promise<unknown> {
    return await this.proxy.forwardPut("/duty-score-models/current", payload);
  }

  @GET("/duty-score-dashboard/summary")
  @CubeAuthProxy()
  public async getDutyScoreDashboardSummary(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/duty-score-dashboard/summary", { ...query }, {});
  }

  @GET("/duty-score-department-summaries")
  @CubeAuthProxy()
  public async listDutyScoreDepartmentSummaries(@QueryMap() query: ForwardQuery): Promise<unknown[]> {
    return await this.proxy.forwardGet("/duty-score-department-summaries", { ...query }, []);
  }

  @GET("/duty-score-rankings")
  @CubeAuthProxy()
  public async pageDutyScoreRankings(@QueryMap() query: ForwardQuery): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet("/duty-score-rankings", { ...query }, this.proxy.emptyPage());
  }

  @POST("/duty-score-ranking-exports")
  @CubeAuthProxy()
  public async exportDutyScoreRankings(@Body() payload: ForwardQuery): Promise<Response> {
    return await this.proxy.forwardPostDownload("/duty-score-ranking-exports", { ...payload });
  }

  @GET("/duty-score-reports/:userId")
  @CubeAuthProxy()
  public async getDutyPersonalScoreReport(@Param("userId") userId: string, @QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet(`/duty-score-reports/${userId}`, { ...query }, {});
  }

  @GET("/app/duty-score-reports/current")
  @CubeAuthProxy()
  public async getDutyAppPersonalScoreReport(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/app/duty-score-reports/current", { ...query }, {});
  }

  @GET("/duty-score-publicities")
  @CubeAuthProxy()
  public async getDutyScorePublicity(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/duty-score-publicities", { ...query }, {});
  }

  @GET("/duty-score-publicity-rankings")
  @CubeAuthProxy()
  public async pageDutyScorePublicityRankings(@QueryMap() query: ForwardQuery): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet("/duty-score-publicity-rankings", { ...query }, this.proxy.emptyPage());
  }

  @GET("/app/duty-score-publicities")
  @CubeAuthProxy()
  public async getDutyAppScorePublicity(@QueryMap() query: ForwardQuery): Promise<unknown> {
    return await this.proxy.forwardGet("/app/duty-score-publicities", { ...query }, {});
  }

  @GET("/duty-score-notify-targets")
  @CubeAuthProxy()
  public async listDutyScoreNotifyTargets(@QueryMap() query: ForwardQuery): Promise<unknown[]> {
    return await this.proxy.forwardGet("/duty-score-notify-targets", { ...query }, []);
  }

  @PUT("/duty-score-notify-targets")
  @CubeAuthProxy()
  public async saveDutyScoreNotifyTargets(@Body() payload: unknown): Promise<unknown[]> {
    return await this.proxy.forwardPut("/duty-score-notify-targets", payload);
  }

  @GET("/duty-score-notify-target-candidates")
  @CubeAuthProxy()
  public async pageDutyScoreNotifyTargetCandidates(@QueryMap() query: ForwardQuery): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet("/duty-score-notify-target-candidates", { ...query }, this.proxy.emptyPage());
  }

  @GET("/app/duty-score-dashboard")
  @CubeAuthProxy()
  public async getDutyAppScoreDashboard(@QueryMap() query: DutyAppScoreDashboardParam): Promise<DutyAppScoreDashboardVO> {
    return await this.proxy.forwardGet("/app/duty-score-dashboard", { ...query }, {});
  }
}
