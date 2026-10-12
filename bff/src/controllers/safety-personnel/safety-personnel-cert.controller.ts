import { Body, Controller, DELETE, GET, Param, POST, PUT, QueryMap } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type {
  CertCategoryModifyParam,
  CertCategoryTreeVO,
  CertTypeModifyParam,
  CertTypeVO,
  EmployeeCertModifyParam,
  EmployeeCertVO,
  PageCertificatesParams,
  PageCertTypesParams,
} from "@g2-contract/safety-personnel";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { SafetyPersonnelProxyService } from "@/services/proxy/safety-personnel/safety-personnel-proxy.service";

@Controller("/gw-bff/safety-personnel")
export class SafetyPersonnelCertController {
  constructor(private readonly proxy: SafetyPersonnelProxyService) {}

  @GET("/certificates")
  @CubeAuthProxy()
  public async pageCertificates(@QueryMap() params: PageCertificatesParams): Promise<Pagination<EmployeeCertVO>> {
    return await this.proxy.forwardGet("/certificates", { ...params }, this.proxy.emptyPage());
  }

  @GET("/certificates/:id")
  @CubeAuthProxy()
  public async getCertificate(@Param("id") id: string): Promise<EmployeeCertVO> {
    return await this.proxy.forwardGet(`/certificates/${id}`, undefined, {} as EmployeeCertVO);
  }

  @POST("/certificates")
  @CubeAuthProxy()
  public async createCertificate(@Body() payload: EmployeeCertModifyParam): Promise<EmployeeCertVO> {
    return await this.proxy.forwardPost("/certificates", payload);
  }

  @PUT("/certificates/:id")
  @CubeAuthProxy()
  public async updateCertificate(@Param("id") id: string, @Body() payload: EmployeeCertModifyParam): Promise<EmployeeCertVO> {
    return await this.proxy.forwardPut(`/certificates/${id}`, payload);
  }

  @DELETE("/certificates/:id")
  @CubeAuthProxy()
  public async deleteCertificate(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/certificates/${id}`);
  }

  @POST("/certificates/export")
  @CubeAuthProxy()
  public async exportCertificates(@Body() params: PageCertificatesParams): Promise<Response> {
    return await this.proxy.forwardPostDownload("/certificates/export", { ...params });
  }

  @GET("/cert/categories/tree")
  @CubeAuthProxy()
  public async getCertCategoryTree(): Promise<CertCategoryTreeVO[]> {
    return await this.proxy.forwardGet("/cert/categories/tree", undefined, []);
  }

  @POST("/cert/categories")
  @CubeAuthProxy()
  public async createCertCategory(@Body() payload: CertCategoryModifyParam): Promise<CertCategoryTreeVO> {
    return await this.proxy.forwardPost("/cert/categories", payload);
  }

  @POST("/cert/categories/:id/children")
  @CubeAuthProxy()
  public async createCertCategoryChild(@Param("id") id: string, @Body() payload: CertCategoryModifyParam): Promise<CertCategoryTreeVO> {
    return await this.proxy.forwardPost(`/cert/categories/${id}/children`, payload);
  }

  @PUT("/cert/categories/:id")
  @CubeAuthProxy()
  public async updateCertCategory(@Param("id") id: string, @Body() payload: CertCategoryModifyParam): Promise<CertCategoryTreeVO> {
    return await this.proxy.forwardPut(`/cert/categories/${id}`, payload);
  }

  @DELETE("/cert/categories/:id")
  @CubeAuthProxy()
  public async deleteCertCategory(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/cert/categories/${id}`);
  }

  @GET("/cert/types")
  @CubeAuthProxy()
  public async pageCertTypes(@QueryMap() params: PageCertTypesParams): Promise<Pagination<CertTypeVO>> {
    return await this.proxy.forwardGet("/cert/types", { ...params }, this.proxy.emptyPage());
  }

  @GET("/cert/types/:id")
  @CubeAuthProxy()
  public async getCertType(@Param("id") id: string): Promise<CertTypeVO> {
    return await this.proxy.forwardGet(`/cert/types/${id}`, undefined, {} as CertTypeVO);
  }

  @POST("/cert/types")
  @CubeAuthProxy()
  public async createCertType(@Body() payload: CertTypeModifyParam): Promise<CertTypeVO> {
    return await this.proxy.forwardPost("/cert/types", payload);
  }

  @PUT("/cert/types/:id")
  @CubeAuthProxy()
  public async updateCertType(@Param("id") id: string, @Body() payload: CertTypeModifyParam): Promise<CertTypeVO> {
    return await this.proxy.forwardPut(`/cert/types/${id}`, payload);
  }

  @DELETE("/cert/types/:id")
  @CubeAuthProxy()
  public async deleteCertType(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/cert/types/${id}`);
  }
}
