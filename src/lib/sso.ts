/**
 * SSO (Single Sign-On) Service for Synchro PM
 * Supports SAML, OIDC, and custom OAuth providers
 */

import { db } from "@/lib/db";

export interface SSOProvider {
  id: string;
  organizationId: string;
  name: string;
  type: "saml" | "oidc" | "oauth2";
  config: Record<string, any>;
  isActive: boolean;
  autoProvision: boolean;
  defaultRole: string;
  domain?: string;
}

export interface SSOAuthenticationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    role: string;
  };
  error?: string;
  redirectUrl?: string;
}

/**
 * SSO Service
 */
export class SSOService {
  /**
   * Get SSO providers for an organization
   */
  async getProviders(organizationId: string): Promise<SSOProvider[]> {
    const providers = await db.sSOProvider.findMany({
      where: { organizationId, isActive: true },
    });

    return providers.map(p => ({
      id: p.id,
      organizationId: p.organizationId,
      name: p.name,
      type: p.type as "saml" | "oidc" | "oauth2",
      config: p.config as Record<string, any>,
      isActive: p.isActive,
      autoProvision: p.autoProvision,
      defaultRole: p.defaultRole,
      domain: p.domain || undefined,
    }));
  }

  /**
   * Get SSO provider by domain
   */
  async getProviderByDomain(domain: string): Promise<SSOProvider | null> {
    const provider = await db.sSOProvider.findFirst({
      where: { domain, isActive: true },
    });

    if (!provider) return null;

    return {
      id: provider.id,
      organizationId: provider.organizationId,
      name: provider.name,
      type: provider.type as "saml" | "oidc" | "oauth2",
      config: provider.config as Record<string, any>,
      isActive: provider.isActive,
      autoProvision: provider.autoProvision,
      defaultRole: provider.defaultRole,
      domain: provider.domain || undefined,
    };
  }

  /**
   * Initiate SSO login
   */
  async initiateLogin(
    providerId: string,
    returnUrl?: string
  ): Promise<{ redirectUrl: string }> {
    const provider = await db.sSOProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider || !provider.isActive) {
      throw new Error("Provider not found or inactive");
    }

    const config = provider.config as Record<string, any>;
    const state = this.generateState(providerId, returnUrl);

    switch (provider.type) {
      case "oidc":
      case "oauth2": {
        const authUrl = this.buildOAuthUrl(config, state);
        return { redirectUrl: authUrl };
      }
      case "saml": {
        // SAML requires a different flow - redirect to SAML endpoint
        return { redirectUrl: `/api/sso/saml/login?provider=${providerId}` };
      }
      default:
        throw new Error("Unsupported provider type");
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    providerId: string,
    code: string,
    state: string
  ): Promise<SSOAuthenticationResult> {
    const provider = await db.sSOProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    const config = provider.config as Record<string, any>;

    try {
      // Exchange code for token
      const tokenResponse = await this.exchangeCodeForToken(config, code);
      
      // Get user info
      const userInfo = await this.getUserInfo(config, tokenResponse.access_token);

      // Find or create user
      const user = await this.findOrCreateUser(
        userInfo.email,
        userInfo.name,
        provider.organizationId,
        provider.autoProvision,
        provider.defaultRole
      );

      if (!user) {
        return { success: false, error: "User not found and auto-provision disabled" };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || "",
          organizationId: provider.organizationId,
          role: user.memberships[0]?.role || provider.defaultRole,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Build OAuth authorization URL
   */
  private buildOAuthUrl(config: Record<string, any>, state: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scope || "openid email profile",
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for token
   */
  private async exchangeCodeForToken(
    config: Record<string, any>,
    code: string
  ): Promise<{ access_token: string; refresh_token?: string }> {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code for token");
    }

    return response.json();
  }

  /**
   * Get user info from OAuth provider
   */
  private async getUserInfo(
    config: Record<string, any>,
    accessToken: string
  ): Promise<{ email: string; name: string }> {
    const response = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to get user info");
    }

    const data = await response.json();
    return {
      email: data.email || data.upn || data.preferred_username,
      name: data.name || data.given_name || data.email,
    };
  }

  /**
   * Find or create user
   */
  private async findOrCreateUser(
    email: string,
    name: string,
    organizationId: string,
    autoProvision: boolean,
    defaultRole: string
  ): Promise<any> {
    // Find existing user
    let user = await db.user.findUnique({
      where: { email },
      include: { memberships: { where: { organizationId } } },
    });

    if (!user && autoProvision) {
      // Create new user
      user = await db.user.create({
        data: {
          email,
          name,
          emailVerified: new Date(),
          memberships: {
            create: {
              organizationId,
              role: defaultRole as any,
            },
          },
        },
        include: { memberships: true },
      });
    }

    return user;
  }

  /**
   * Generate state parameter
   */
  private generateState(providerId: string, returnUrl?: string): string {
    const state = {
      providerId,
      returnUrl,
      nonce: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
    };
    return Buffer.from(JSON.stringify(state)).toString("base64");
  }

  /**
   * Parse state parameter
   */
  parseState(state: string): { providerId: string; returnUrl?: string } {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      return {
        providerId: decoded.providerId,
        returnUrl: decoded.returnUrl,
      };
    } catch {
      throw new Error("Invalid state parameter");
    }
  }

  /**
   * Create SSO provider
   */
  async createProvider(data: {
    organizationId: string;
    name: string;
    type: "saml" | "oidc" | "oauth2";
    config: Record<string, any>;
    domain?: string;
    autoProvision?: boolean;
    defaultRole?: string;
  }): Promise<SSOProvider> {
    const provider = await db.sSOProvider.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        type: data.type,
        config: data.config,
        domain: data.domain,
        autoProvision: data.autoProvision ?? true,
        defaultRole: data.defaultRole ?? "MEMBER",
        isActive: true,
      },
    });

    return {
      id: provider.id,
      organizationId: provider.organizationId,
      name: provider.name,
      type: provider.type as "saml" | "oidc" | "oauth2",
      config: provider.config as Record<string, any>,
      isActive: provider.isActive,
      autoProvision: provider.autoProvision,
      defaultRole: provider.defaultRole,
      domain: provider.domain || undefined,
    };
  }

  /**
   * Delete SSO provider
   */
  async deleteProvider(providerId: string, organizationId: string): Promise<void> {
    await db.sSOProvider.deleteMany({
      where: { id: providerId, organizationId },
    });
  }
}

// Export singleton
export const ssoService = new SSOService();
