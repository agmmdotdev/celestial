import { Effect, Layer } from "@celestial/effect";
import { HttpClient, FetchHttpClient } from "@effect/platform";
import { EnvService } from "../env.service.js";
import { FacebookApiError } from "../../errors/index.js";
import { FacebookGraphApiUrl } from "../../service/facebook-graph-api-constants.js";

/**
 * Available webhook fields for Pages
 */
export enum PageWebhookFields {
  FEED = "feed",
  MESSAGES = "messages",
}

/**
 * Webhook subscription response from Facebook API
 */
export interface WebhookSubscriptionResponse {
  success: string;
}

/**
 * Subscribed app information
 */
export interface SubscribedApp {
  category: string;
  link: string;
  name: string;
  id: string;
}

/**
 * Response containing list of subscribed apps
 */
export interface SubscribedAppsResponse {
  data: SubscribedApp[];
}

/**
 * Page details response from Facebook API
 */
export interface PageDetailsResponse {
  id: string;
  name?: string;
  category?: string;
  [key: string]: unknown;
}

/**
 * Effect-based Webhook Service
 *
 * This service provides methods for managing Facebook Page webhook subscriptions
 * with validation and type safety through Effect.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const webhook = yield* WebhookService;
 *   const pageDetails = yield* webhook.getPageDetails("page-id");
 *   return pageDetails;
 * });
 * ```
 */
export class WebhookService extends Effect.Service<WebhookService>()(
  "app/WebhookService",
  {
    effect: Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;
      const envService = yield* EnvService;

      return {
        /**
         * Fetches page details from Facebook Graph API.
         *
         * @param pageId The Facebook Page ID
         * @param pageAccessToken Optional page access token (uses user access token if not provided)
         * @returns Effect containing page details or FacebookApiError
         *
         * @example
         * ```typescript
         * const pageDetails = yield* webhook.getPageDetails("page-id");
         * console.log("Page name:", pageDetails.name);
         * ```
         */
        getPageDetails: (
          pageId: string,
          pageAccessToken?: string
        ): Effect.Effect<PageDetailsResponse, FacebookApiError> =>
          Effect.gen(function* () {
            const accessToken =
              pageAccessToken ?? (yield* envService.getUserAccessToken());
            const url = `${FacebookGraphApiUrl}/${pageId}?access_token=${accessToken}`;

            const response = yield* httpClient.get(url).pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new FacebookApiError({
                    code: 0,
                    message: `Failed to fetch page details: ${error}`,
                  })
                )
              )
            );

            const data = yield* response.json.pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new FacebookApiError({
                    code: 0,
                    message: `Failed to parse page details response: ${error}`,
                  })
                )
              )
            );

            return data as PageDetailsResponse;
          }),

        /**
         * Subscribes a page to webhooks for specified fields.
         *
         * @param pageId The Facebook Page ID to subscribe
         * @param subscribedFields Array of webhook fields to subscribe to (default: [FEED])
         * @param pageAccessToken Optional page access token (uses user access token if not provided)
         * @returns Effect containing WebhookSubscriptionResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const result = yield* webhook.subscribePageToWebhooks(
         *   "page-id",
         *   [PageWebhookFields.MESSAGES, PageWebhookFields.FEED]
         * );
         * console.log("Subscription success:", result.success);
         * ```
         */
        subscribePageToWebhooks: (
          pageId: string,
          subscribedFields: PageWebhookFields[] = [PageWebhookFields.FEED],
          pageAccessToken?: string
        ): Effect.Effect<WebhookSubscriptionResponse, FacebookApiError> =>
          Effect.gen(function* () {
            const accessToken =
              pageAccessToken ?? (yield* envService.getUserAccessToken());

            const fieldsParam = subscribedFields.join(",");
            const url = `${FacebookGraphApiUrl}/${pageId}/subscribed_apps?subscribed_fields=${fieldsParam}&access_token=${accessToken}`;

            const response = yield* httpClient.post(url).pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new FacebookApiError({
                    code: 0,
                    message: `Failed to subscribe page to webhooks: ${error}`,
                  })
                )
              )
            );

            const data = yield* response.json.pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new FacebookApiError({
                    code: 0,
                    message: `Failed to parse webhook subscription response: ${error}`,
                  })
                )
              )
            );

            return data as WebhookSubscriptionResponse;
          }),

        /**
         * Gets the list of apps that are subscribed to a page's webhooks.
         *
         * @param pageId The Facebook Page ID
         * @param pageAccessToken Optional page access token (uses user access token if not provided)
         * @returns Effect containing SubscribedAppsResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const apps = yield* webhook.getSubscribedApps("page-id");
         * console.log("Subscribed apps:", apps.data);
         * ```
         */
        getSubscribedApps: (
          pageId: string,
          pageAccessToken?: string
        ): Effect.Effect<SubscribedAppsResponse, FacebookApiError> =>
          Effect.gen(function* () {
            const accessToken =
              pageAccessToken ?? (yield* envService.getUserAccessToken());
            const url = `${FacebookGraphApiUrl}/${pageId}/subscribed_apps?access_token=${accessToken}`;

            const response = yield* httpClient.get(url).pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new FacebookApiError({
                    code: 0,
                    message: `Failed to get subscribed apps: ${error}`,
                  })
                )
              )
            );

            const data = yield* response.json.pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new FacebookApiError({
                    code: 0,
                    message: `Failed to parse subscribed apps response: ${error}`,
                  })
                )
              )
            );

            return data as SubscribedAppsResponse;
          }),
      } as const;
    }),
    dependencies: [FetchHttpClient.layer, EnvService.Default],
  }
) {}

// Live layer removed — use `WebhookService.Default` with test or prod layers as needed
