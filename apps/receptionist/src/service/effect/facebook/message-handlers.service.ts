// Facebook Messenger Message Webhook Handler (Effect-based)
// Handles all message types: text, attachments, product templates, referrals, commands, etc.

import { Effect } from "@celestial/effect";

export interface MessageSender {
  id: string; // Page-scoped ID (PSID)
  user_ref?: string; // Reference for Chat Plugin users
}

export interface MessageRecipient {
  id: string; // Facebook Page ID
}

export interface QuickReply {
  payload: string; // Custom data provided by the app
}

export interface ReplyTo {
  mid: string; // Message ID being replied to
}

export interface AttachmentPayload {
  url?: string; // URL for media attachments
  title?: string; // Title for fallback, reel, ig_reel
  sticker_id?: number; // Sticker ID for image stickers
  reel_video_id?: number; // Video ID for reels
  product?: ProductTemplate; // Product template data
}

export interface ProductElement {
  id: string; // Product ID from Facebook catalog
  retailer_id: string; // External ID (SKU/Content ID)
  image_url: string; // Product image URL
  title: string; // Product title
  subtitle: string; // Product subtitle (e.g., price)
}

export interface ProductTemplate {
  elements: ProductElement[]; // Array of product elements for horizontal scroll
}

export interface MessageAttachment {
  type:
    | "image"
    | "video"
    | "audio"
    | "file"
    | "reel"
    | "ig_reel"
    | "template"
    | "fallback";
  payload: AttachmentPayload;
}

export interface ReferralProduct {
  id: string; // Product ID
}

export interface AdsContextData {
  ad_title: string; // Ad title from Ads Manager
  photo_url?: string; // Image URL from ad
  video_url?: string; // Video thumbnail URL from ad
  post_id: string; // Ad post ID
  product_id?: string; // Product ID from ad
  flow_id?: string; // Welcome message flow ID
}

export interface MessageReferral {
  product?: ReferralProduct; // For Shops product detail page
  source?: "ADS"; // Referral source
  type?: "OPEN_THREAD"; // Referral type
  ref?: string; // Optional ref attribute
  ad_id?: string; // Advertisement ID
  ads_context_data?: AdsContextData; // Ad context data
}

export interface MessageCommand {
  name: string; // Command name
}

export interface FacebookMessage {
  mid: string; // Message ID
  text?: string; // Message text
  quick_reply?: QuickReply; // Quick reply data
  reply_to?: ReplyTo; // Reply reference
  attachments?: MessageAttachment[]; // Message attachments
  referral?: MessageReferral; // Referral information
  commands?: MessageCommand[]; // Message commands
}

export interface MessagingEvent {
  sender: MessageSender;
  recipient: MessageRecipient;
  timestamp: number; // Unix timestamp in milliseconds
  message: FacebookMessage;
}

export interface FacebookWebhookEntry {
  id: string; // Page ID
  time: number; // Unix timestamp
  messaging: MessagingEvent[];
}

export interface FacebookWebhookPayload {
  object: "page";
  entry: FacebookWebhookEntry[];
}

// Message handler callback types - now returns Effect
export type MessageHandlerCallback = (
  event: MessagingEvent
) => Effect.Effect<void, never, never>;

export interface MessageHandlerOptions {
  validateSignature?: boolean;
  verifyToken?: string;
  pageId?: string;
  enableLogging?: boolean;
}

// Service tag for dependency injection
export class FacebookMessagesHandler extends Effect.Service<FacebookMessagesHandler>()(
  "app/FacebookMessagesHandler",
  {
    effect: Effect.gen(function* () {
      const callbacks = new Map<string, MessageHandlerCallback[]>();
      const options: MessageHandlerOptions = {
        validateSignature: true,
        enableLogging: false,
      };

      /**
       * Add callback to the callbacks map
       */
      const addCallback = (
        type: string,
        callback: MessageHandlerCallback
      ): void => {
        if (!callbacks.has(type)) {
          callbacks.set(type, []);
        }
        callbacks.get(type)!.push(callback);
      };

      /**
       * Determine the type of message
       */
      const getMessageType = (message: FacebookMessage): string => {
        if (message.quick_reply) return "quick_reply";
        if (message.commands && message.commands.length > 0) return "command";
        if (message.referral) return "referral";
        if (message.attachments && message.attachments.length > 0) {
          // Check for product template
          const hasProductTemplate = message.attachments.some(
            (att) => att.type === "template" && att.payload.product
          );
          return hasProductTemplate ? "product" : "attachment";
        }
        if (message.text) return "text";

        return "unknown";
      };

      /**
       * Execute all callbacks for a given type
       */
      const executeCallbacks = (
        type: string,
        event: MessagingEvent
      ): Effect.Effect<void, never, never> => {
        const callbackList = callbacks.get(type) || [];

        return Effect.forEach(callbackList, (callback) =>
          Effect.catchAll(callback(event), (error) =>
            options.enableLogging
              ? Effect.sync(() =>
                  console.error(`Error in ${type} callback:`, error)
                )
              : Effect.void
          )
        );
      };

      /**
       * Handle individual messaging event
       */
      const handleMessagingEvent = (
        event: MessagingEvent
      ): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          if (options.enableLogging) {
            yield* Effect.sync(() =>
              console.log(
                "Processing message event:",
                JSON.stringify(event, null, 2)
              )
            );
          }

          // Determine message type and trigger appropriate callbacks
          const messageType = getMessageType(event.message);

          // Execute callbacks for specific message type
          yield* executeCallbacks(messageType, event);

          // Execute callbacks for all message types
          yield* executeCallbacks("all", event);
        });

      /**
       * Process incoming webhook payload
       */
      const processWebhook = (
        payload: FacebookWebhookPayload
      ): Effect.Effect<void, Error, never> =>
        Effect.gen(function* () {
          if (payload.object !== "page") {
            return yield* Effect.fail(new Error("Invalid webhook object type"));
          }

          // Filter entries by page ID if configured
          const validEntries = options.pageId
            ? payload.entry.filter((entry) => entry.id === options.pageId)
            : payload.entry;

          // Log skipped entries if logging is enabled
          if (options.enableLogging && options.pageId) {
            const skippedEntries = payload.entry.filter(
              (entry) => entry.id !== options.pageId
            );
            yield* Effect.forEach(skippedEntries, (entry) =>
              Effect.sync(() =>
                console.warn(
                  `Skipping entry for page ${entry.id}, expected ${options.pageId}`
                )
              )
            );
          }

          // Process all valid entries
          yield* Effect.forEach(validEntries, (entry) =>
            Effect.forEach(entry.messaging, (event) =>
              handleMessagingEvent(event)
            )
          );
        });

      /**
       * Register a callback for specific message types
       */
      const onMessage = (
        messageTypeOrCallback: string | MessageHandlerCallback,
        callback?: MessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => {
          if (typeof messageTypeOrCallback === "function") {
            // Register for all message types
            addCallback("all", messageTypeOrCallback);
          } else if (callback) {
            // Register for specific message type
            addCallback(messageTypeOrCallback, callback);
          }
        });

      /**
       * Register callback for text messages
       */
      const onTextMessage = (
        callback: MessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("text", callback));

      /**
       * Register callback for attachment messages
       */
      const onAttachmentMessage = (
        callback: MessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("attachment", callback));

      /**
       * Register callback for product template messages
       */
      const onProductMessage = (
        callback: MessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("product", callback));

      /**
       * Register callback for referral messages
       */
      const onReferralMessage = (
        callback: MessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("referral", callback));

      /**
       * Register callback for command messages
       */
      const onCommandMessage = (
        callback: MessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("command", callback));

      /**
       * Register callback for quick reply messages
       */
      const onQuickReplyMessage = (
        callback: MessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("quick_reply", callback));

      return {
        processWebhook,
        onMessage,
        onTextMessage,
        onAttachmentMessage,
        onProductMessage,
        onReferralMessage,
        onCommandMessage,
        onQuickReplyMessage,
        setOptions: (newOptions: Partial<MessageHandlerOptions>) =>
          Effect.sync(() => Object.assign(options, newOptions)),
      } as const;
    }),
  }
) {}

// Static helper methods (no dependencies needed)
export const MessageHandlerHelpers = {
  /**
   * Get message text safely
   */
  getMessageText: (event: MessagingEvent): string | null => {
    return event.message.text || null;
  },

  /**
   * Get sender PSID
   */
  getSenderPSID: (event: MessagingEvent): string => {
    return event.sender.id;
  },

  /**
   * Get page ID
   */
  getPageId: (event: MessagingEvent): string => {
    return event.recipient.id;
  },

  /**
   * Check if message has attachments
   */
  hasAttachments: (event: MessagingEvent): boolean => {
    return !!(
      event.message.attachments && event.message.attachments.length > 0
    );
  },

  /**
   * Get attachment URLs
   */
  getAttachmentUrls: (event: MessagingEvent): string[] => {
    if (!MessageHandlerHelpers.hasAttachments(event)) return [];

    return event.message
      .attachments!.map((att) => att.payload.url)
      .filter((url): url is string => !!url);
  },

  /**
   * Check if message is a quick reply
   */
  isQuickReply: (event: MessagingEvent): boolean => {
    return !!event.message.quick_reply;
  },

  /**
   * Get quick reply payload
   */
  getQuickReplyPayload: (event: MessagingEvent): string | null => {
    return event.message.quick_reply?.payload || null;
  },

  /**
   * Check if message has referral data
   */
  hasReferral: (event: MessagingEvent): boolean => {
    return !!event.message.referral;
  },

  /**
   * Get product ID from referral (if any)
   */
  getReferralProductId: (event: MessagingEvent): string | null => {
    return event.message.referral?.product?.id || null;
  },

  /**
   * Get ad ID from referral (if any)
   */
  getReferralAdId: (event: MessagingEvent): string | null => {
    return event.message.referral?.ad_id || null;
  },

  /**
   * Check if message has commands
   */
  hasCommands: (event: MessagingEvent): boolean => {
    return !!(event.message.commands && event.message.commands.length > 0);
  },

  /**
   * Get command names
   */
  getCommandNames: (event: MessagingEvent): string[] => {
    if (!MessageHandlerHelpers.hasCommands(event)) return [];

    return event.message.commands!.map((cmd) => cmd.name);
  },
};
