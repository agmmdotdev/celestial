// Facebook Messenger Message Echoes Webhook Handler
// Handles echo messages sent by the page itself

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

// Echo message handler callback types
export type EchoMessageHandlerCallback = (
  event: EchoMessagingEvent,
  error?: Error
) => void | Promise<void>;

export interface EchoMessageHandlerOptions {
  validateSignature?: boolean;
  verifyToken?: string;
  pageId?: string;
  enableLogging?: boolean;
  handleStandbyEvents?: boolean; // Whether to handle standby events
}

// Main echo message handler class
export class FacebookEchoMessagesHandler {
  private callbacks: Map<string, EchoMessageHandlerCallback[]> = new Map();
  private options: EchoMessageHandlerOptions;

  constructor(options: EchoMessageHandlerOptions = {}) {
    this.options = {
      validateSignature: true,
      enableLogging: false,
      handleStandbyEvents: true,
      ...options,
    };
  }

  /**
   * Register a callback for specific echo message types
   */
  onEchoMessage(callback: EchoMessageHandlerCallback): void;
  onEchoMessage(
    messageType:
      | "text"
      | "attachment"
      | "template"
      | "fallback"
      | "product"
      | "media",
    callback: EchoMessageHandlerCallback
  ): void;
  onEchoMessage(
    messageTypeOrCallback: string | EchoMessageHandlerCallback,
    callback?: EchoMessageHandlerCallback
  ): void {
    if (typeof messageTypeOrCallback === "function") {
      // Register for all echo message types
      this.addCallback("all", messageTypeOrCallback);
    } else if (callback) {
      // Register for specific echo message type
      this.addCallback(messageTypeOrCallback, callback);
    }
  }

  /**
   * Register callback for text echo messages
   */
  onTextEcho(callback: EchoMessageHandlerCallback): void {
    this.addCallback("text", callback);
  }

  /**
   * Register callback for attachment echo messages (image, video, audio, file)
   */
  onAttachmentEcho(callback: EchoMessageHandlerCallback): void {
    this.addCallback("attachment", callback);
  }

  /**
   * Register callback for template echo messages
   */
  onTemplateEcho(callback: EchoMessageHandlerCallback): void {
    this.addCallback("template", callback);
  }

  /**
   * Register callback for fallback echo messages
   */
  onFallbackEcho(callback: EchoMessageHandlerCallback): void {
    this.addCallback("fallback", callback);
  }

  /**
   * Register callback for product echo messages
   */
  onProductEcho(callback: EchoMessageHandlerCallback): void {
    this.addCallback("product", callback);
  }

  /**
   * Register callback for media template echo messages
   */
  onMediaEcho(callback: EchoMessageHandlerCallback): void {
    this.addCallback("media", callback);
  }

  /**
   * Process incoming echo webhook payload
   */
  async processEchoWebhook(payload: FacebookEchoWebhookPayload): Promise<void> {
    if (payload.object !== "page") {
      throw new Error("Invalid webhook object type");
    }

    for (const entry of payload.entry) {
      // Validate page ID if configured
      if (this.options.pageId && entry.id !== this.options.pageId) {
        if (this.options.enableLogging) {
          console.warn(
            `Skipping entry for page ${entry.id}, expected ${this.options.pageId}`
          );
        }
        continue;
      }

      // Process regular messaging events
      if (entry.messaging) {
        for (const event of entry.messaging) {
          await this.handleEchoMessagingEvent(event);
        }
      }

      // Process standby events if enabled
      if (this.options.handleStandbyEvents && entry.standby) {
        for (const event of entry.standby) {
          await this.handleEchoMessagingEvent(event);
        }
      }
    }
  }

  /**
   * Handle individual echo messaging event
   */
  private async handleEchoMessagingEvent(
    event: EchoMessagingEvent
  ): Promise<void> {
    try {
      // Verify this is actually an echo message
      if (!event.message.is_echo) {
        if (this.options.enableLogging) {
          console.warn("Received non-echo message in echo handler");
        }
        return;
      }

      if (this.options.enableLogging) {
        console.log(
          "Processing echo message event:",
          JSON.stringify(event, null, 2)
        );
      }

      // Determine echo message type and trigger appropriate callbacks
      const messageType = this.getEchoMessageType(event.message);

      // Execute callbacks for specific message type
      await this.executeCallbacks(messageType, event);

      // Execute callbacks for all message types
      await this.executeCallbacks("all", event);
    } catch (error) {
      if (this.options.enableLogging) {
        console.error("Error handling echo messaging event:", error);
      }

      // Execute error callbacks if any
      await this.executeCallbacks("error", event, error as Error);
    }
  }

  /**
   * Determine the type of echo message
   */
  private getEchoMessageType(message: FacebookEchoMessage): string {
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
  }

  /**
   * Add callback to the callbacks map
   */
  private addCallback(
    type: string,
    callback: EchoMessageHandlerCallback
  ): void {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, []);
    }
    this.callbacks.get(type)!.push(callback);
  }

  /**
   * Execute all callbacks for a given type
   */
  private async executeCallbacks(
    type: string,
    event: EchoMessagingEvent,
    error?: Error
  ): Promise<void> {
    const callbacks = this.callbacks.get(type) || [];

    for (const callback of callbacks) {
      try {
        await callback(event, error);
      } catch (callbackError) {
        if (this.options.enableLogging) {
          console.error(`Error in ${type} echo callback:`, callbackError);
        }
      }
    }
  }

  /**
   * Get echo message text safely
   */
  static getEchoMessageText(event: EchoMessagingEvent): string | null {
    return event.message.text || null;
  }

  /**
   * Get page ID (sender in echo messages)
   */
  static getPageId(event: EchoMessagingEvent): string {
    return event.sender.id;
  }

  /**
   * Get recipient PSID
   */
  static getRecipientPSID(event: EchoMessagingEvent): string {
    return event.recipient.id;
  }

  /**
   * Get app ID
   */
  static getAppId(event: EchoMessagingEvent): number {
    return event.message.app_id;
  }

  /**
   * Get metadata
   */
  static getMetadata(event: EchoMessagingEvent): string | null {
    return event.message.metadata || null;
  }

  /**
   * Check if echo message has attachments
   */
  static hasAttachments(event: EchoMessagingEvent): boolean {
    return !!(
      event.message.attachments && event.message.attachments.length > 0
    );
  }

  /**
   * Get attachment URLs
   */
  static getAttachmentUrls(event: EchoMessagingEvent): string[] {
    if (!this.hasAttachments(event)) return [];

    return event.message
      .attachments!.map((att) => att.payload?.url || att.url)
      .filter((url): url is string => !!url);
  }

  /**
   * Get attachment types
   */
  static getAttachmentTypes(event: EchoMessagingEvent): string[] {
    if (!this.hasAttachments(event)) return [];

    return event.message.attachments!.map((att) => att.type);
  }

  /**
   * Check if echo message is a template
   */
  static isTemplate(event: EchoMessagingEvent): boolean {
    return (
      this.hasAttachments(event) &&
      event.message.attachments!.some((att) => att.type === "template")
    );
  }

  /**
   * Check if echo message is a product template
   */
  static isProductTemplate(event: EchoMessagingEvent): boolean {
    return (
      this.isTemplate(event) &&
      event.message.attachments!.some(
        (att) => att.type === "template" && att.payload?.product
      )
    );
  }

  /**
   * Get product elements from product template
   */
  static getProductElements(event: EchoMessagingEvent): EchoProductElement[] {
    if (!this.isProductTemplate(event)) return [];

    const productAttachment = event.message.attachments!.find(
      (att) => att.type === "template" && att.payload?.product
    );

    return productAttachment?.payload?.product?.elements || [];
  }

  /**
   * Check if echo message is a fallback attachment
   */
  static isFallback(event: EchoMessagingEvent): boolean {
    return (
      this.hasAttachments(event) &&
      event.message.attachments!.some((att) => att.type === "fallback")
    );
  }

  /**
   * Get template type
   */
  static getTemplateType(event: EchoMessagingEvent): string | null {
    if (!this.isTemplate(event)) return null;

    const templateAttachment = event.message.attachments!.find(
      (att) => att.type === "template"
    );

    return templateAttachment?.payload?.template_type || null;
  }

  /**
   * Check if message was sent from Facebook Page inbox
   */
  static isSentFromPageInbox(event: EchoMessagingEvent): boolean {
    // Facebook Page inbox app id (as mentioned in docs)
    return event.message.app_id === 26390203743090;
  }
}

// Export default instance for easy usage
export const echoMessageHandler = new FacebookEchoMessagesHandler();

// Example usage:
/*
// Text echo messages
echoMessageHandler.onTextEcho(async (event) => {
  const text = FacebookEchoMessagesHandler.getEchoMessageText(event);
  const recipientPSID = FacebookEchoMessagesHandler.getRecipientPSID(event);
  const pageId = FacebookEchoMessagesHandler.getPageId(event);
  console.log(`Page ${pageId} sent text to ${recipientPSID}: ${text}`);
});

// Attachment echo messages
echoMessageHandler.onAttachmentEcho(async (event) => {
  const urls = FacebookEchoMessagesHandler.getAttachmentUrls(event);
  const types = FacebookEchoMessagesHandler.getAttachmentTypes(event);
  console.log('Page sent attachments:', { types, urls });
});

// Template echo messages
echoMessageHandler.onTemplateEcho(async (event) => {
  const templateType = FacebookEchoMessagesHandler.getTemplateType(event);
  console.log('Page sent template:', templateType);
});

// Product echo messages
echoMessageHandler.onProductEcho(async (event) => {
  const products = FacebookEchoMessagesHandler.getProductElements(event);
  console.log('Page sent products:', products);
});

// All echo messages
echoMessageHandler.onEchoMessage(async (event) => {
  const metadata = FacebookEchoMessagesHandler.getMetadata(event);
  const appId = FacebookEchoMessagesHandler.getAppId(event);
  const isFromInbox = FacebookEchoMessagesHandler.isSentFromPageInbox(event);
  console.log('Received echo message:', { metadata, appId, isFromInbox });
});

// Process webhook
app.post('/webhook/echoes', async (req, res) => {
  try {
    await echoMessageHandler.processEchoWebhook(req.body);
    res.status(200).send('OK');
  } catch (error) {
    res.status(400).send('Error processing echo webhook');
  }
});
*/
