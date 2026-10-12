import { Injectable, Inject, CONFIG_SERVICE_TOKEN, ConfigService, BadRequestException } from "@dangao/bun-server";
import type { AuthIssueTokenRequest, AuthTokenResponse } from "@g2-contract/auth";

import {
  buildOAuthUpstreamHeaders,
  isBlockedOAuthGrantType,
  normalizeOAuthTokenRequestBody,
  parseOAuthClientMap,
  resolveOAuthClient,
  type OAuthClientCredentials,
} from "./oauth-client";
import { ProxyClient } from "@/clients/proxy-client";

const STRIPPED_CLIENT_KEYS = ["client_id", "client_secret"] as const;

@Injectable()
export class AuthProxyService {
  private readonly ouaaUrl: string;
  private readonly defaultClient: OAuthClientCredentials;
  private readonly clientMap: Record<string, OAuthClientCredentials>;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.ouaaUrl = this.configService.get<string>("app.ouaaUrl") || "";
    this.defaultClient = {
      clientId: this.configService.get<string>("app.oauthClientId") || "client_2",
      clientSecret: this.configService.get<string>("app.oauthClientSecret") || "",
    };
    this.clientMap = parseOAuthClientMap(this.configService.get<string>("app.oauthClientMap"));
  }

  async issueToken(
    body: AuthIssueTokenRequest | FormData | URLSearchParams | string,
    headers: Record<string, string>,
  ): Promise<AuthTokenResponse> {
    const tokenBody = normalizeOAuthTokenRequestBody(body);
    if (!tokenBody) {
      throw new BadRequestException("Request body is required");
    }

    for (const key of STRIPPED_CLIENT_KEYS) {
      if (key in tokenBody && tokenBody[key] !== "") {
        throw new BadRequestException(`client credentials must not be sent by client: ${key}`);
      }
    }

    const grantType = tokenBody.grant_type;
    if (!grantType || String(grantType).trim() === "") {
      throw new BadRequestException("grant_type is required");
    }
    if (isBlockedOAuthGrantType(grantType)) {
      throw new BadRequestException("client_credentials grant_type is not allowed on login BFF");
    }

    const client = resolveOAuthClient(headers, this.defaultClient, this.clientMap);
    if (!client.clientSecret) {
      throw new BadRequestException("OAuth client secret is not configured on BFF");
    }

    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(tokenBody)) {
      form.set(key, value);
    }
    form.set("client_id", client.clientId);
    form.set("client_secret", client.clientSecret);

    const url = `${this.ouaaUrl}/oauth2/token`;
    const response = await this.proxyClient.request<AuthTokenResponse>(url, {
      method: "POST",
      body: form.toString(),
      headers: buildOAuthUpstreamHeaders(headers),
      useAuth: false,
      passthroughError: true,
    });

    return response.data;
  }
}
