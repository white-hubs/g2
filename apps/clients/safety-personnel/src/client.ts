// @ts-nocheck — generated client; tighten types in a follow-up
import type { PlatformContext } from "@g2-composition/contract";

import { createDutyClient, type DutyClient } from "./duty-client";

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) return url;
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined);
  if (!entries.length) return url;
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

export type SafetyPersonnelClient = DutyClient & {
  pageCertificates: (params?: unknown) => Promise<unknown>;
  getCertificate: (id?: unknown) => Promise<unknown>;
  createCertificate: (payload?: unknown) => Promise<unknown>;
  updateCertificate: (id?: unknown, payload?: unknown) => Promise<unknown>;
  deleteCertificate: (id?: unknown) => Promise<unknown>;
  exportCertificates: (params?: unknown) => Promise<unknown>;
  getCertCategoryTree: () => Promise<unknown>;
  createCertCategory: (payload?: unknown) => Promise<unknown>;
  createCertCategoryChild: (parentId?: unknown, payload?: unknown) => Promise<unknown>;
  updateCertCategory: (id?: unknown, payload?: unknown) => Promise<unknown>;
  deleteCertCategory: (id?: unknown) => Promise<unknown>;
  pageCertTypes: (params?: unknown) => Promise<unknown>;
  getCertType: (id?: unknown) => Promise<unknown>;
  createCertType: (payload?: unknown) => Promise<unknown>;
  updateCertType: (id?: unknown, payload?: unknown) => Promise<unknown>;
  deleteCertType: (id?: unknown) => Promise<unknown>;
  pageCommittees: (params?: unknown) => Promise<unknown>;
  getCommittee: (id?: unknown) => Promise<unknown>;
  createCommittee: (payload?: unknown) => Promise<unknown>;
  updateCommittee: (id?: unknown, payload?: unknown) => Promise<unknown>;
  deleteCommittee: (id?: unknown) => Promise<unknown>;
  getCommitteeChangeLogs: (id?: unknown) => Promise<unknown>;
  getHomeOrgArchitecture: () => Promise<unknown>;
  getOrgTree: () => Promise<unknown>;
  getOrgNode: (id?: unknown) => Promise<unknown>;
  createOrgNode: (payload?: unknown) => Promise<unknown>;
  createOrgNodeChild: (parentId?: unknown, payload?: unknown) => Promise<unknown>;
  updateOrgNode: (id?: unknown, payload?: unknown) => Promise<unknown>;
  deleteOrgNode: (id?: unknown) => Promise<unknown>;
  saveOrgNodeMembers: (id?: unknown, payload?: unknown) => Promise<unknown>;
  pageOrgUserCandidates: (params?: unknown) => Promise<unknown>;
  pagePersons: (params?: unknown) => Promise<unknown>;
  pagePersonPool: (params?: unknown) => Promise<unknown>;
  linkPersons: (payload?: unknown) => Promise<unknown>;
  deletePerson: (id?: unknown) => Promise<unknown>;
  getPersonProfile: (id?: unknown) => Promise<unknown>;
  getPersonCertificates: (id?: unknown) => Promise<unknown>;
  getPersonResumeTimeline: (id?: unknown, _query?: unknown) => Promise<unknown>;
  getPersonResumeByType: (id?: unknown, type?: unknown, _query?: unknown) => Promise<unknown>;
  exportPersons: (params?: unknown) => Promise<unknown>;
  exportPersonResume: (id?: unknown, _query?: unknown) => Promise<unknown>;
  pageKeyPersons: (params?: unknown) => Promise<unknown>;
  createKeyPerson: (payload?: unknown) => Promise<unknown>;
  getKeyPersonDetail: (id?: unknown) => Promise<unknown>;
  updateKeyPerson: (id?: unknown, payload?: unknown) => Promise<unknown>;
  deleteKeyPerson: (id?: unknown) => Promise<unknown>;
  getKeyPersonOptions: (_keyword?: unknown) => Promise<unknown>;
  pageKeyPersonReports: (params?: unknown) => Promise<unknown>;
  createKeyPersonReport: (personId?: unknown, payload?: unknown) => Promise<unknown>;
  getKeyPersonAreaOptions: (_keyword?: unknown) => Promise<unknown>;
  getKeyPersonSupervisorOptions: (_keyword?: unknown) => Promise<unknown>;
  getKeyPersonStatisticsDashboard: () => Promise<unknown>;
  getKeyPersonAreaSupervisorStats: () => Promise<unknown>;
  getKeyPersonAreaHighRiskStats: () => Promise<unknown>;
};

export function createSafetyPersonnelClient(http: HttpClient): SafetyPersonnelClient {
  return {
    pageCertificates: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/certificates`, { ...params } as Record<string, unknown>)),
    getCertificate: async (id?: unknown) => http.get(`/gw-bff/safety-personnel/certificates/${id}`),
    createCertificate: async (payload?: unknown) => http.post(`/gw-bff/safety-personnel/certificates`, { ...payload }),
    updateCertificate: async (id?: unknown, payload?: unknown) => http.put(`/gw-bff/safety-personnel/certificates/${id}`, { ...payload }),
    deleteCertificate: async (id?: unknown) => http.delete(`/gw-bff/safety-personnel/certificates/${id}`),
    exportCertificates: async (params?: unknown) => http.post(`/gw-bff/safety-personnel/certificates/export`, { ...params }),
    getCertCategoryTree: async () => http.get(`/gw-bff/safety-personnel/cert/categories/tree`),
    createCertCategory: async (payload?: unknown) => http.post(`/gw-bff/safety-personnel/cert/categories`, { ...payload }),
    createCertCategoryChild: async (parentId?: unknown, payload?: unknown) =>
      http.post(`/gw-bff/safety-personnel/cert/categories/${parentId}/children`, { ...payload }),
    updateCertCategory: async (id?: unknown, payload?: unknown) =>
      http.put(`/gw-bff/safety-personnel/cert/categories/${id}`, { ...payload }),
    deleteCertCategory: async (id?: unknown) => http.delete(`/gw-bff/safety-personnel/cert/categories/${id}`),
    pageCertTypes: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/cert/types`, { ...params } as Record<string, unknown>)),
    getCertType: async (id?: unknown) => http.get(`/gw-bff/safety-personnel/cert/types/${id}`),
    createCertType: async (payload?: unknown) => http.post(`/gw-bff/safety-personnel/cert/types`, { ...payload }),
    updateCertType: async (id?: unknown, payload?: unknown) => http.put(`/gw-bff/safety-personnel/cert/types/${id}`, { ...payload }),
    deleteCertType: async (id?: unknown) => http.delete(`/gw-bff/safety-personnel/cert/types/${id}`),
    pageCommittees: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/committees`, { ...params } as Record<string, unknown>)),
    getCommittee: async (id?: unknown) => http.get(`/gw-bff/safety-personnel/committees/${id}`),
    createCommittee: async (payload?: unknown) => http.post(`/gw-bff/safety-personnel/committees`, { ...payload }),
    updateCommittee: async (id?: unknown, payload?: unknown) => http.put(`/gw-bff/safety-personnel/committees/${id}`, { ...payload }),
    deleteCommittee: async (id?: unknown) => http.delete(`/gw-bff/safety-personnel/committees/${id}`),
    getCommitteeChangeLogs: async (id?: unknown) => http.get(`/gw-bff/safety-personnel/committees/${id}/change-logs`),
    getHomeOrgArchitecture: async () => http.get(`/gw-bff/safety-personnel/home/org-architecture`),
    getOrgTree: async () => http.get(`/gw-bff/safety-personnel/org/tree`),
    getOrgNode: async (id?: unknown) => http.get(`/gw-bff/safety-personnel/org/nodes/${id}`),
    createOrgNode: async (payload?: unknown) => http.post(`/gw-bff/safety-personnel/org/nodes`, { ...payload }),
    createOrgNodeChild: async (parentId?: unknown, payload?: unknown) =>
      http.post(`/gw-bff/safety-personnel/org/nodes/${parentId}/children`, { ...payload }),
    updateOrgNode: async (id?: unknown, payload?: unknown) => http.put(`/gw-bff/safety-personnel/org/nodes/${id}`, { ...payload }),
    deleteOrgNode: async (id?: unknown) => http.delete(`/gw-bff/safety-personnel/org/nodes/${id}`),
    saveOrgNodeMembers: async (id?: unknown, payload?: unknown) =>
      http.put(`/gw-bff/safety-personnel/org/nodes/${id}/members`, { ...payload }),
    pageOrgUserCandidates: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/org/user-candidates`, { ...params } as Record<string, unknown>)),
    pagePersons: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/persons`, { ...params } as Record<string, unknown>)),
    pagePersonPool: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/persons/pool`, { ...params } as Record<string, unknown>)),
    linkPersons: async (payload?: unknown) => http.post(`/gw-bff/safety-personnel/persons/link`, { ...payload }),
    deletePerson: async (id?: unknown) => http.delete(`/gw-bff/safety-personnel/persons/${id}`),
    getPersonProfile: async (id?: unknown) => http.get(`/gw-bff/safety-personnel/persons/${id}/profile`),
    getPersonCertificates: async (id?: unknown) => http.get(`/gw-bff/safety-personnel/persons/${id}/certificates`),
    getPersonResumeTimeline: async (id?: unknown, query?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/persons/${id}/resume/timeline`, { ...query } as Record<string, unknown>)),
    getPersonResumeByType: async (id?: unknown, type?: unknown, query?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/persons/${id}/resume/${type}`, { ...query } as Record<string, unknown>)),
    exportPersons: async (params?: unknown) => http.post(`/gw-bff/safety-personnel/persons/export`, { ...params }),
    exportPersonResume: async (id?: unknown, query?: unknown) =>
      http.post(`/gw-bff/safety-personnel/persons/${id}/resume/export`, query ?? {}),
    pageKeyPersons: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/key-personnel/persons`, { ...params } as Record<string, unknown>)),
    createKeyPerson: async (payload?: unknown) => http.post(`/gw-bff/safety-personnel/key-personnel/persons`, { ...payload }),
    getKeyPersonDetail: async (id?: unknown) => http.get(`/gw-bff/safety-personnel/key-personnel/persons/${id}`),
    updateKeyPerson: async (id?: unknown, payload?: unknown) =>
      http.put(`/gw-bff/safety-personnel/key-personnel/persons/${id}`, { ...payload }),
    deleteKeyPerson: async (id?: unknown) => http.delete(`/gw-bff/safety-personnel/key-personnel/persons/${id}`),
    getKeyPersonOptions: async (keyword?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/key-personnel/persons/options`, { keyword })),
    pageKeyPersonReports: async (params?: unknown) => {
      const { personId, ...query } = { ...params } as Record<string, unknown>;
      return http.get(withQuery(`/gw-bff/safety-personnel/key-personnel/persons/${personId}/reports`, query));
    },
    createKeyPersonReport: async (personId?: unknown, payload?: unknown) =>
      http.post(`/gw-bff/safety-personnel/key-personnel/persons/${personId}/reports`, { ...payload }),
    getKeyPersonAreaOptions: async (keyword?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/key-personnel/areas/options`, { keyword })),
    getKeyPersonSupervisorOptions: async (keyword?: unknown) =>
      http.get(withQuery(`/gw-bff/safety-personnel/key-personnel/supervisors/options`, { keyword })),
    getKeyPersonStatisticsDashboard: async () => http.get(`/gw-bff/safety-personnel/key-personnel/statistics/dashboard`),
    getKeyPersonAreaSupervisorStats: async () => http.get(`/gw-bff/safety-personnel/key-personnel/statistics/area-supervisors`),
    getKeyPersonAreaHighRiskStats: async () => http.get(`/gw-bff/safety-personnel/key-personnel/statistics/area-high-risk`),
    ...createDutyClient(http),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<SafetyPersonnelClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createSafetyPersonnelClient(httpModule.createHttpClientForPlatform(ctx));
}
