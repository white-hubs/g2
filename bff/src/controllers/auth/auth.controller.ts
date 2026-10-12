import { Body, Controller, HeaderMap, POST } from "@dangao/bun-server";
import type { AuthIssueTokenRequest, AuthTokenResponse } from "@g2-contract/auth";

import { AuthProxyService } from "@/services/proxy/auth/auth-proxy.service";

@Controller("/gw-bff/auth")
export class AuthController {
  constructor(private readonly authProxyService: AuthProxyService) {}

  @POST("/token")
  public async issueToken(@Body() body: AuthIssueTokenRequest, @HeaderMap() headers: Record<string, string>): Promise<AuthTokenResponse> {
    return this.authProxyService.issueToken(body, headers);
  }
}
