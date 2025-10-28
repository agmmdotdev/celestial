import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import { EnvService } from "../env.service";
import { FacebookGraphApiUrl } from "../facebook-graph-api-constants";

interface FacebookTokenResponse {
  access_token: string;
  token_type?: string; // Typically 'bearer'
  expires_in?: number; // Typically for short-lived tokens
}

interface FacebookErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

@Injectable()
export class FacebookOAuthService {
  private readonly graphApiBaseUrl = `${FacebookGraphApiUrl}/oauth/access_token`; // It's good practice to version the API
  private readonly logger = new Logger(FacebookOAuthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly envService: EnvService
  ) {}

  /**
   * Exchanges a short-lived user access token for a long-lived one.
   * Long-lived tokens are typically valid for about 60 days.
   * @param shortLivedToken The short-lived user access token.
   * @returns The long-lived access token.
   */
  async exchangeShortLivedToken(shortLivedToken: string): Promise<string> {
    const appId = this.envService.getChatBotAppId();
    const appSecret = this.envService.getChatBotAppSecret();

    if (!appId || !appSecret) {
      this.logger.error("Facebook App ID or App Secret is not configured.");
      throw new InternalServerErrorException(
        "Facebook app credentials are not configured."
      );
    }

    const url =
      `${this.graphApiBaseUrl}?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `fb_exchange_token=${shortLivedToken}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<FacebookTokenResponse>(url)
      );
      if (response.data.access_token) {
        return response.data.access_token;
      }
      this.logger.error(
        "Failed to exchange token, no access_token in response",
        response.data
      );
      throw new InternalServerErrorException(
        "Failed to exchange short-lived token."
      );
    } catch (err) {
      const error = err as AxiosError<FacebookErrorResponse>;
      this.logger.error(
        `Error exchanging short-lived token: ${
          JSON.stringify(error.response?.data) || error.message
        }`,
        error.stack
      );
      throw new InternalServerErrorException(
        `Error exchanging short-lived token: ${
          error.response?.data?.error?.message || "Unknown error"
        }`
      );
    }
  }

  /**
   * Refreshes a long-lived user access token.
   * This can be done if the token is at least 24 hours old but not yet expired.
   * The Facebook Graph API uses the same endpoint and grant_type for refreshing as for the initial exchange.
   * The key difference is that you pass the existing long-lived token as fb_exchange_token.
   * @param longLivedToken The existing long-lived user access token to be refreshed.
   * @returns A new long-lived access token.
   */
  async refreshLongLivedToken(longLivedToken: string): Promise<string> {
    // Facebook's documentation indicates that refreshing a long-lived token
    // uses the same mechanism as exchanging a short-lived token for a long-lived one.
    // You essentially "exchange" your current long-lived token for a new one.
    // See: https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing/
    this.logger.log(`Attempting to refresh long-lived token.`);
    return this.exchangeShortLivedToken(longLivedToken);
  }
}
