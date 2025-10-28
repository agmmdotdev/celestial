import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import { EnvService } from "../env.service";
import {
  FacebookGraphApiUrl,
  CHAT_BOT_APP_ID,
  USER_ID,
  userAccessToken,
  CHAT_BOT_APP_SECRET,
} from "../facebook-graph-api-constants";

// Types for webhook responses
interface WebhookSubscriptionResponse {
  success: string;
}

interface SubscribedApp {
  category: string;
  link: string;
  name: string;
  id: string;
}

interface SubscribedAppsResponse {
  data: SubscribedApp[];
}

// Available webhook fields for Pages
export enum PageWebhookFields {
  FEED = "feed",
  MESSAGES = "messages",
}

@Injectable()
export class WebhookService {
  private readonly facebookApiUrl = FacebookGraphApiUrl;

  constructor(
    private readonly httpService: HttpService,
    private readonly envService: EnvService
  ) {}

  /**
   * Fetches page details from Facebook Graph API.
   * Corresponds to: curl -i -X GET "https://graph.facebook.com/PAGE-ID?access_token=ACCESS-TOKEN"
   * @param pageId Optional Page ID. If not provided, uses FACEBOOK_PAGE_ID from env.
   * @returns The page details from Facebook Graph API.
   */
  async getPageDetails(pageId?: string): Promise<any> {
    const targetPageId = pageId;
    // || this.envService.getFacebookPageId();
    const accessToken = this.envService.getUserAccessToken();

    if (!targetPageId) {
      throw new Error("Facebook Page ID is not configured.");
    }
    if (!accessToken) {
      throw new Error("Facebook Access Token is not configured.");
    }

    const url = `${this.facebookApiUrl}/${targetPageId}?access_token=${accessToken}`;

    try {
      const response = await firstValueFrom(this.httpService.get<any>(url));
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ error?: { message: string } }>;
      // It's good practice to log the error and potentially rethrow a custom error
      console.error(
        "Error fetching page details from Facebook Graph API:",
        error.response?.data || error.message
      );
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Unknown error";
      throw new Error(
        `Failed to fetch page details from Facebook: ${errorMessage}`
      );
    }
  }

  /**
   * Subscribes a page to webhooks for specified fields.
   * Corresponds to: curl -i -X POST "https://graph.facebook.com/{page-id}/subscribed_apps?subscribed_fields=feed&access_token={page-access-token}"
   * @param pageId The Facebook Page ID to subscribe
   * @param subscribedFields Array of webhook fields to subscribe to (feed, messages, etc.)
   * @param pageAccessToken Page access token (if not provided, uses user access token)
   * @returns Success response from Facebook API
   */
  async subscribePageToWebhooks(
    pageId: string,
    subscribedFields: PageWebhookFields[] = [PageWebhookFields.FEED],
    pageAccessToken?: string
  ): Promise<WebhookSubscriptionResponse> {
    const accessToken = pageAccessToken || this.envService.getUserAccessToken();

    if (!pageId) {
      throw new Error("Page ID is required for webhook subscription.");
    }
    if (!accessToken) {
      throw new Error("Access Token is required for webhook subscription.");
    }

    const fieldsParam = subscribedFields.join(",");
    const url = `${this.facebookApiUrl}/${pageId}/subscribed_apps`;

    const params = new URLSearchParams({
      subscribed_fields: fieldsParam,
      access_token: accessToken,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<WebhookSubscriptionResponse>(url, null, {
          params: Object.fromEntries(params),
        })
      );
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ error?: { message: string } }>;
      console.error(
        "Error subscribing page to webhooks:",
        error.response?.data || error.message
      );
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Unknown error";
      throw new Error(`Failed to subscribe page to webhooks: ${errorMessage}`);
    }
  }

  /**
   * Gets the list of apps that are subscribed to a page's webhooks.
   * Corresponds to: curl -i -X GET "https://graph.facebook.com/{page-id}/subscribed_apps&access_token={page-access-token}"
   * @param pageId The Facebook Page ID
   * @param pageAccessToken Page access token (if not provided, uses user access token)
   * @returns List of subscribed apps
   */
  async getSubscribedApps(
    pageId: string,
    pageAccessToken?: string
  ): Promise<SubscribedAppsResponse> {
    const accessToken = pageAccessToken || this.envService.getUserAccessToken();

    if (!pageId) {
      throw new Error("Page ID is required to get subscribed apps.");
    }
    if (!accessToken) {
      throw new Error("Access Token is required to get subscribed apps.");
    }

    const url = `${this.facebookApiUrl}/${pageId}/subscribed_apps`;

    const params = new URLSearchParams({
      access_token: accessToken,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.get<SubscribedAppsResponse>(url, {
          params: Object.fromEntries(params),
        })
      );
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ error?: { message: string } }>;
      console.error(
        "Error getting subscribed apps:",
        error.response?.data || error.message
      );
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Unknown error";
      throw new Error(`Failed to get subscribed apps: ${errorMessage}`);
    }
  }

  /**
   * Unsubscribes a page from webhooks.
   * Corresponds to: curl -i -X DELETE "https://graph.facebook.com/{page-id}/subscribed_apps?access_token={page-access-token}"
   * @param pageId The Facebook Page ID to unsubscribe
   * @param pageAccessToken Page access token (if not provided, uses user access token)
   * @returns Success response from Facebook API
   */
  async unsubscribePageFromWebhooks(
    pageId: string,
    pageAccessToken?: string
  ): Promise<WebhookSubscriptionResponse> {
    const accessToken = pageAccessToken || this.envService.getUserAccessToken();

    if (!pageId) {
      throw new Error("Page ID is required for webhook unsubscription.");
    }
    if (!accessToken) {
      throw new Error("Access Token is required for webhook unsubscription.");
    }

    const url = `${this.facebookApiUrl}/${pageId}/subscribed_apps`;

    const params = new URLSearchParams({
      access_token: accessToken,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.delete<WebhookSubscriptionResponse>(url, {
          params: Object.fromEntries(params),
        })
      );
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ error?: { message: string } }>;
      console.error(
        "Error unsubscribing page from webhooks:",
        error.response?.data || error.message
      );
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Unknown error";
      throw new Error(
        `Failed to unsubscribe page from webhooks: ${errorMessage}`
      );
    }
  }
}
