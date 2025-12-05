// Facebook Messenger Message Echoes Webhook Handler (Effect-based)
// Handles echo messages sent by the page itself

import { Effect } from "@celestial/effect";

export interface EchoMessageSender {
  id: string; // Facebook Page ID
}

export interface EchoMessageRecipient {
  id: string; // Page-scoped ID (PSID) of the recipient
}

export interface EchoAttachmentPayload {
  url?: string; // URL for media attachments
  title?: string; // Title for fallback attachments
  template_type?: string; // Template type (e.g., "button", "media")
  buttons?: any[]; // Button elements for button templates
  elements?: any[]; // Elements for media templates
  product?: EchoProductTemplate; // Product template data
}

export interface EchoProductElement {
  id: string; // Product ID from Facebook catalog
  retailer_id: string; // External ID (SKU/Content ID)
  image_url: string; // Product image URL
  title: string; // Product title
  subtitle: string; // Product subtitle (e.g., price)
}

export interface EchoProductTemplate {
  elements: EchoProductElement[]; // Array of product elements for horizontal scroll
}

export interface EchoMessageAttachment {
  type: "image" | "video" | "audio" | "file" | "template" | "fallback";
  title?: string; // Title for fallback attachments
  url?: string; // URL for fallback attachments
  payload: EchoAttachmentPayload | null;
}

export interface FacebookEchoMessage {
  mid: string; // Message ID
  is_echo: true; // Always true for echo messages
  app_id: number; // ID of the app from which the message was sent
  metadata?: string; // Custom metadata string (optional)
  text?: string; // Message text (for text messages)
  attachments?: EchoMessageAttachment[]; // Message attachments
}

export interface EchoMessagingEvent {
  sender: EchoMessageSender;
  recipient: EchoMessageRecipient;
  timestamp: number; // Unix timestamp in milliseconds
  message: FacebookEchoMessage;
}

export interface FacebookEchoWebhookEntry {
  id: string; // Page ID
  time: number; // Unix timestamp
  messaging?: EchoMessagingEvent[]; // Regular messaging events
  standby?: EchoMessagingEvent[]; // Standby messaging events
}

export interface FacebookEchoWebhookPayload {
  object: "page";
  entry: FacebookEchoWebhookEntry[];
}

// Echo message handler callback types - now returns Effect
export type EchoMessageHandlerCallback = (
  event: EchoMessagingEvent
) => Effect.Effect<void, never, never>;

export interface EchoMessageHandlerOptions {
  validateSignature?: boolean;
  verifyToken?: string;
  pageId?: string;
  enableLogging?: boolean;
  handleStandbyEvents?: boolean; // Whether to handle standby events
}

// Service tag for dependency injection
export class FacebookEchoMessagesHandler extends Effect.Service<FacebookEchoMessagesHandler>()(
  "app/FacebookEchoMessagesHandler",
  {
    effect: Effect.gen(function* () {
      const callbacks = new Map<string, EchoMessageHandlerCallback[]>();
      const options: EchoMessageHandlerOptions = {
        validateSignature: true,
        enableLogging: false,
        handleStandbyEvents: true,
      };

      /**
       * Add callback to the callbacks map
       */
      const addCallback = (
        type: string,
        callback: EchoMessageHandlerCallback
      ): void => {
        if (!callbacks.has(type)) {
          callbacks.set(type, []);
        }
        callbacks.get(type)!.push(callback);
      };

      /**
       * Determine the type of echo message
       */
      const getEchoMessageType = (message: FacebookEchoMessage): string => {
        if (message.attachments && message.attachments.length > 0) {
          const attachment = message.attachments[0];

          switch (attachment.type) {
            case "template":
              // Check for product template
              if (attachment.payload?.product) {
                return "product";
              }
              // Check for media template
              if (attachment.payload?.template_type === "media") {
                return "media";
              }
              return "template";

            case "fallback":
              return "fallback";

            case "image":
            case "video":
            case "audio":
            case "file":
              return "attachment";

            default:
              return "attachment";
          }
        }

        if (message.text) {
          return "text";
        }

        return "unknown";
      };

      /**
       * Execute all callbacks for a given type
       */
      const executeCallbacks = (
        type: string,
        event: EchoMessagingEvent
      ): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          const callbackList = callbacks.get(type) || [];

          yield* Effect.forEach(callbackList, (callback) =>
            Effect.catchAll(callback(event), (error) =>
              options.enableLogging
                ? Effect.sync(() =>
                    console.error(`Error in ${type} echo callback:`, error)
                  )
                : Effect.void
            )
          );
        });

      /**
       * Handle individual echo messaging event
       */
      const handleEchoMessagingEvent = (
        event: EchoMessagingEvent
      ): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          // Verify this is actually an echo message
          if (!event.message.is_echo) {
            if (options.enableLogging) {
              yield* Effect.sync(() =>
                console.warn("Received non-echo message in echo handler")
              );
            }
            return;
          }

          if (options.enableLogging) {
            yield* Effect.sync(() =>
              console.log(
                "Processing echo message event:",
                JSON.stringify(event, null, 2)
              )
            );
          }

          // Determine echo message type and trigger appropriate callbacks
          const messageType = getEchoMessageType(event.message);

          // Execute callbacks for specific message type
          yield* executeCallbacks(messageType, event);

          // Execute callbacks for all message types
          yield* executeCallbacks("all", event);
        });

      /**
       * Process incoming echo webhook payload
       */
      const processEchoWebhook = (
        payload: FacebookEchoWebhookPayload
      ): Effect.Effect<void, Error, never> =>
        Effect.gen(function* () {
          if (payload.object !== "page") {
            return yield* Effect.fail(new Error("Invalid webhook object type"));
          }

          yield* Effect.forEach(payload.entry, (entry) =>
            options.pageId && entry.id !== options.pageId
              ? options.enableLogging
                ? Effect.sync(() =>
                    console.warn(
                      `Skipping entry for page ${entry.id}, expected ${options.pageId}`
                    )
                  )
                : Effect.void
              : Effect.gen(function* () {
                  if (entry.messaging) {
                    yield* Effect.forEach(entry.messaging, (event) =>
                      handleEchoMessagingEvent(event)
                    );
                  }

                  if (options.handleStandbyEvents && entry.standby) {
                    yield* Effect.forEach(entry.standby, (event) =>
                      handleEchoMessagingEvent(event)
                    );
                  }
                })
          );
        });

      /**
       * Register a callback for specific echo message types
       */
      const onEchoMessage = (
        messageTypeOrCallback: string | EchoMessageHandlerCallback,
        callback?: EchoMessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => {
          if (typeof messageTypeOrCallback === "function") {
            // Register for all echo message types
            addCallback("all", messageTypeOrCallback);
          } else if (callback) {
            // Register for specific echo message type
            addCallback(messageTypeOrCallback, callback);
          }
        });

      /**
       * Register callback for text echo messages
       */
      const onTextEcho = (
        callback: EchoMessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("text", callback));

      /**
       * Register callback for attachment echo messages (image, video, audio, file)
       */
      const onAttachmentEcho = (
        callback: EchoMessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("attachment", callback));

      /**
       * Register callback for template echo messages
       */
      const onTemplateEcho = (
        callback: EchoMessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("template", callback));

      /**
       * Register callback for fallback echo messages
       */
      const onFallbackEcho = (
        callback: EchoMessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("fallback", callback));

      /**
       * Register callback for product echo messages
       */
      const onProductEcho = (
        callback: EchoMessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("product", callback));

      /**
       * Register callback for media template echo messages
       */
      const onMediaEcho = (
        callback: EchoMessageHandlerCallback
      ): Effect.Effect<void, never, never> =>
        Effect.sync(() => addCallback("media", callback));

      return {
        processEchoWebhook,
        onEchoMessage,
        onTextEcho,
        onAttachmentEcho,
        onTemplateEcho,
        onFallbackEcho,
        onProductEcho,
        onMediaEcho,
        setOptions: (newOptions: Partial<EchoMessageHandlerOptions>) =>
          Effect.sync(() => Object.assign(options, newOptions)),
      } as const;
    }),
  }
) {}

// Static helper methods (no dependencies needed)
export const EchoHandlerHelpers = {
  /**
   * Get echo message text safely
   */
  getEchoMessageText: (event: EchoMessagingEvent): string | null => {
    return event.message.text || null;
  },

  /**
   * Get page ID (sender in echo messages)
   */
  getPageId: (event: EchoMessagingEvent): string => {
    return event.sender.id;
  },

  /**
   * Get recipient PSID
   */
  getRecipientPSID: (event: EchoMessagingEvent): string => {
    return event.recipient.id;
  },

  /**
   * Get app ID
   */
  getAppId: (event: EchoMessagingEvent): number => {
    return event.message.app_id;
  },

  /**
   * Get metadata
   */
  getMetadata: (event: EchoMessagingEvent): string | null => {
    return event.message.metadata || null;
  },

  /**
   * Check if echo message has attachments
   */
  hasAttachments: (event: EchoMessagingEvent): boolean => {
    return !!(
      event.message.attachments && event.message.attachments.length > 0
    );
  },

  /**
   * Get attachment URLs
   */
  getAttachmentUrls: (event: EchoMessagingEvent): string[] => {
    if (!EchoHandlerHelpers.hasAttachments(event)) return [];

    return event.message
      .attachments!.map((att) => att.payload?.url || att.url)
      .filter((url): url is string => !!url);
  },

  /**
   * Get attachment types
   */
  getAttachmentTypes: (event: EchoMessagingEvent): string[] => {
    if (!EchoHandlerHelpers.hasAttachments(event)) return [];

    return event.message.attachments!.map((att) => att.type);
  },

  /**
   * Check if echo message is a template
   */
  isTemplate: (event: EchoMessagingEvent): boolean => {
    return (
      EchoHandlerHelpers.hasAttachments(event) &&
      event.message.attachments!.some((att) => att.type === "template")
    );
  },

  /**
   * Check if echo message is a product template
   */
  isProductTemplate: (event: EchoMessagingEvent): boolean => {
    return (
      EchoHandlerHelpers.isTemplate(event) &&
      event.message.attachments!.some(
        (att) => att.type === "template" && att.payload?.product
      )
    );
  },

  /**
   * Get product elements from product template
   */
  getProductElements: (event: EchoMessagingEvent): EchoProductElement[] => {
    if (!EchoHandlerHelpers.isProductTemplate(event)) return [];

    const productAttachment = event.message.attachments!.find(
      (att) => att.type === "template" && att.payload?.product
    );

    return productAttachment?.payload?.product?.elements || [];
  },

  /**
   * Check if echo message is a fallback attachment
   */
  isFallback: (event: EchoMessagingEvent): boolean => {
    return (
      EchoHandlerHelpers.hasAttachments(event) &&
      event.message.attachments!.some((att) => att.type === "fallback")
    );
  },

  /**
   * Get template type
   */
  getTemplateType: (event: EchoMessagingEvent): string | null => {
    if (!EchoHandlerHelpers.isTemplate(event)) return null;

    const templateAttachment = event.message.attachments!.find(
      (att) => att.type === "template"
    );

    return templateAttachment?.payload?.template_type || null;
  },

  /**
   * Check if message was sent from Facebook Page inbox
   */
  isSentFromPageInbox: (event: EchoMessagingEvent): boolean => {
    // Facebook Page inbox app id (as mentioned in docs)
    return event.message.app_id === 26390203743090;
  },
};
