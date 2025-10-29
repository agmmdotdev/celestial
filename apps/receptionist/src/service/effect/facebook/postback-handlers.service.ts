// Facebook Messenger Postback Webhook Handler (Effect-based)
// Handles postback events: postback buttons, Get Started button, persistent menu items, etc.

import { Effect } from "@celestial/effect";

export interface PostbackSender {
  id?: string; // Page-scoped ID (PSID)
  user_ref?: string; // Reference for Chat Plugin users
}

export interface PostbackRecipient {
  id: string; // Facebook Page ID
}

export interface PostbackReferral {
  ref?: string; // Arbitrary data passed in ref param (alphanumeric, -, _, = only)
  source?: "SHORTLINK" | "ADS"; // URL source for referral
  type?: "OPEN_THREAD"; // Referral identifier
}

export interface FacebookPostback {
  mid?: string; // Message ID
  title?: string; // Title for the Call To Action (CTA)
  payload: string; // User-defined payload from CTA
  referral?: PostbackReferral; // Referral information
}

export interface PostbackEvent {
  sender: PostbackSender;
  recipient: PostbackRecipient;
  timestamp: number; // Unix timestamp in milliseconds
  postback: FacebookPostback;
}

export interface FacebookPostbackWebhookEntry {
  id: string; // Page ID
  time: number; // Unix timestamp
  messaging: PostbackEvent[];
}

export interface FacebookPostbackWebhookPayload {
  object: "page";
  entry: FacebookPostbackWebhookEntry[];
}

// Postback handler callback types - now returns Effect
export type PostbackHandlerCallback = (
  event: PostbackEvent
) => Effect.Effect<void, never, never>;

export interface PostbackHandlerOptions {
  validateSignature?: boolean;
  verifyToken?: string;
  pageId?: string;
  enableLogging?: boolean;
}

// Service tag for dependency injection
export class FacebookPostbacksHandler extends Effect.Service<FacebookPostbacksHandler>()(
  "app/FacebookPostbacksHandler",
  {
    effect: Effect.gen(function* () {
      const callbacks = new Map<string, PostbackHandlerCallback[]>();
      const options: PostbackHandlerOptions = {
        validateSignature: true,
        enableLogging: false,
      };

      /**
       * Add callback to the callbacks map
       */
      const addCallback = (type: string, callback: PostbackHandlerCallback): void => {
        if (!callbacks.has(type)) {
          callbacks.set(type, []);
        }
        callbacks.get(type)!.push(callback);
      };

      /**
       * Determine the type of postback
       */
      const getPostbackType = (postback: FacebookPostback): string => {
        // Check for referral data
        if (postback.referral) return "referral";

        // Check common payload patterns
        if (postback.payload) {
          const payload = postback.payload.toLowerCase();

          if (payload === "get_started" || payload.includes("get_started")) {
            return "get_started";
          }

          if (payload.includes("menu") || payload.includes("persistent")) {
            return "persistent_menu";
          }
        }

        // Default to button postback
        return "button";
      };

      /**
       * Execute all callbacks for a given type
       */
      const executeCallbacks = (
        type: string,
        event: PostbackEvent
      ): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          const callbackList = callbacks.get(type) || [];

          for (const callback of callbackList) {
            yield* Effect.catchAll(callback(event), (error) =>
              options.enableLogging
                ? Effect.sync(() =>
                    console.error(`Error in ${type} callback:`, error)
                  )
                : Effect.void
            );
          }
        });

      /**
       * Handle individual postback event
       */
      const handlePostbackEvent = (
        event: PostbackEvent
      ): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          if (options.enableLogging) {
            yield* Effect.sync(() =>
              console.log(
                "Processing postback event:",
                JSON.stringify(event, null, 2)
              )
            );
          }

          // Determine postback type and trigger appropriate callbacks
          const postbackType = getPostbackType(event.postback);

          // Execute callbacks for specific postback type
          yield* executeCallbacks(postbackType, event);

          // Execute callbacks for specific payload
          if (event.postback.payload) {
            yield* executeCallbacks(`payload:${event.postback.payload}`, event);
          }

          // Execute callbacks for all postback types
          yield* executeCallbacks("all", event);
        });

      /**
       * Process incoming webhook payload
       */
      const processWebhook = (
        payload: FacebookPostbackWebhookPayload
      ): Effect.Effect<void, Error, never> =>
        Effect.gen(function* () {
          if (payload.object !== "page") {
            return yield* Effect.fail(new Error("Invalid webhook object type"));
          }

          for (const entry of payload.entry) {
            // Validate page ID if configured
            if (options.pageId && entry.id !== options.pageId) {
              if (options.enableLogging) {
                yield* Effect.sync(() =>
                  console.warn(
                    `Skipping entry for page ${entry.id}, expected ${options.pageId}`
                  )
                );
              }
              continue;
            }

            for (const event of entry.messaging) {
              yield* handlePostbackEvent(event);
            }
          }
        });

      /**
       * Register a callback for specific postback types
       */
      const onPostback = (
        postbackTypeOrCallback: string | PostbackHandlerCallback,
        callback?: PostbackHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => {
          if (typeof postbackTypeOrCallback === "function") {
            // Register for all postback types
            addCallback("all", postbackTypeOrCallback);
          } else if (callback) {
            // Register for specific postback type
            addCallback(postbackTypeOrCallback, callback);
          }
        });

      /**
       * Register callback for button postbacks
       */
      const onButtonPostback = (
        callback: PostbackHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("button", callback));

      /**
       * Register callback for Get Started button postbacks
       */
      const onGetStartedPostback = (
        callback: PostbackHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("get_started", callback));

      /**
       * Register callback for persistent menu postbacks
       */
      const onPersistentMenuPostback = (
        callback: PostbackHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("persistent_menu", callback));

      /**
       * Register callback for referral postbacks
       */
      const onReferralPostback = (
        callback: PostbackHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("referral", callback));

      /**
       * Register callback for specific payload postbacks
       */
      const onPayloadPostback = (
        payload: string,
        callback: PostbackHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback(`payload:${payload}`, callback));

      return {
        processWebhook,
        onPostback,
        onButtonPostback,
        onGetStartedPostback,
        onPersistentMenuPostback,
        onReferralPostback,
        onPayloadPostback,
        setOptions: (newOptions: Partial<PostbackHandlerOptions>) =>
          Effect.sync(() => Object.assign(options, newOptions)),
      } as const;
    }),
  }
) {}

// Static helper methods (no dependencies needed)
export const PostbackHandlerHelpers = {
  /**
   * Get postback payload
   */
  getPostbackPayload: (event: PostbackEvent): string => {
    return event.postback.payload;
  },

  /**
   * Get postback title
   */
  getPostbackTitle: (event: PostbackEvent): string | null => {
    return event.postback.title || null;
  },

  /**
   * Get sender PSID or user reference
   */
  getSenderPSID: (event: PostbackEvent): string | null => {
    return event.sender.id || null;
  },

  /**
   * Get sender user reference
   */
  getSenderUserRef: (event: PostbackEvent): string | null => {
    return event.sender.user_ref || null;
  },

  /**
   * Get page ID
   */
  getPageId: (event: PostbackEvent): string => {
    return event.recipient.id;
  },

  /**
   * Check if postback has referral data
   */
  hasReferral: (event: PostbackEvent): boolean => {
    return !!event.postback.referral;
  },

  /**
   * Get referral ref parameter
   */
  getReferralRef: (event: PostbackEvent): string | null => {
    return event.postback.referral?.ref || null;
  },

  /**
   * Get referral source
   */
  getReferralSource: (event: PostbackEvent): string | null => {
    return event.postback.referral?.source || null;
  },

  /**
   * Get referral type
   */
  getReferralType: (event: PostbackEvent): string | null => {
    return event.postback.referral?.type || null;
  },

  /**
   * Check if postback is from m.me link
   */
  isFromMeLink: (event: PostbackEvent): boolean => {
    return event.postback.referral?.source === "SHORTLINK";
  },

  /**
   * Check if postback is from ads
   */
  isFromAds: (event: PostbackEvent): boolean => {
    return event.postback.referral?.source === "ADS";
  },

  /**
   * Check if postback is Get Started button
   */
  isGetStarted: (event: PostbackEvent): boolean => {
    const payload = event.postback.payload?.toLowerCase();
    return (
      payload === "get_started" || payload?.includes("get_started") || false
    );
  },

  /**
   * Check if postback has specific payload
   */
  hasPayload: (event: PostbackEvent, payload: string): boolean => {
    return event.postback.payload === payload;
  },

  /**
   * Get message ID if available
   */
  getMessageId: (event: PostbackEvent): string | null => {
    return event.postback.mid || null;
  },
};
