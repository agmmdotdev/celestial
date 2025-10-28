// Facebook Messenger Message Webhook Handler
// Handles all message types: text, attachments, product templates, referrals, commands, etc.

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

// Message handler callback types
export type MessageHandlerCallback = (
  event: MessagingEvent,
  error?: Error
) => void | Promise<void>;

export interface MessageHandlerOptions {
  validateSignature?: boolean;
  verifyToken?: string;
  pageId?: string;
  enableLogging?: boolean;
}

// Main message handler class
export class FacebookMessagesHandler {
  private callbacks: Map<string, MessageHandlerCallback[]> = new Map();
  private options: MessageHandlerOptions;

  constructor(options: MessageHandlerOptions = {}) {
    this.options = {
      validateSignature: true,
      enableLogging: false,
      ...options,
    };
  }

  /**
   * Register a callback for specific message types
   */
  onMessage(callback: MessageHandlerCallback): void;
  onMessage(
    messageType:
      | "text"
      | "attachment"
      | "product"
      | "referral"
      | "command"
      | "quick_reply",
    callback: MessageHandlerCallback
  ): void;
  onMessage(
    messageTypeOrCallback: string | MessageHandlerCallback,
    callback?: MessageHandlerCallback
  ): void {
    if (typeof messageTypeOrCallback === "function") {
      // Register for all message types
      this.addCallback("all", messageTypeOrCallback);
    } else if (callback) {
      // Register for specific message type
      this.addCallback(messageTypeOrCallback, callback);
    }
  }

  /**
   * Register callback for text messages
   */
  onTextMessage(callback: MessageHandlerCallback): void {
    this.addCallback("text", callback);
  }

  /**
   * Register callback for attachment messages
   */
  onAttachmentMessage(callback: MessageHandlerCallback): void {
    this.addCallback("attachment", callback);
  }

  /**
   * Register callback for product template messages
   */
  onProductMessage(callback: MessageHandlerCallback): void {
    this.addCallback("product", callback);
  }

  /**
   * Register callback for referral messages
   */
  onReferralMessage(callback: MessageHandlerCallback): void {
    this.addCallback("referral", callback);
  }

  /**
   * Register callback for command messages
   */
  onCommandMessage(callback: MessageHandlerCallback): void {
    this.addCallback("command", callback);
  }

  /**
   * Register callback for quick reply messages
   */
  onQuickReplyMessage(callback: MessageHandlerCallback): void {
    this.addCallback("quick_reply", callback);
  }

  /**
   * Process incoming webhook payload
   */
  async processWebhook(payload: FacebookWebhookPayload): Promise<void> {
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

      for (const event of entry.messaging) {
        await this.handleMessagingEvent(event);
      }
    }
  }

  /**
   * Handle individual messaging event
   */
  private async handleMessagingEvent(event: MessagingEvent): Promise<void> {
    try {
      if (this.options.enableLogging) {
        console.log(
          "Processing message event:",
          JSON.stringify(event, null, 2)
        );
      }

      // Determine message type and trigger appropriate callbacks
      const messageType = this.getMessageType(event.message);

      // Execute callbacks for specific message type
      await this.executeCallbacks(messageType, event);

      // Execute callbacks for all message types
      await this.executeCallbacks("all", event);
    } catch (error) {
      if (this.options.enableLogging) {
        console.error("Error handling messaging event:", error);
      }

      // Execute error callbacks if any
      await this.executeCallbacks("error", event, error as Error);
    }
  }

  /**
   * Determine the type of message
   */
  private getMessageType(message: FacebookMessage): string {
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
  }

  /**
   * Add callback to the callbacks map
   */
  private addCallback(type: string, callback: MessageHandlerCallback): void {
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
    event: MessagingEvent,
    error?: Error
  ): Promise<void> {
    const callbacks = this.callbacks.get(type) || [];

    for (const callback of callbacks) {
      try {
        await callback(event, error);
      } catch (callbackError) {
        if (this.options.enableLogging) {
          console.error(`Error in ${type} callback:`, callbackError);
        }
      }
    }
  }

  /**
   * Get message text safely
   */
  static getMessageText(event: MessagingEvent): string | null {
    return event.message.text || null;
  }

  /**
   * Get sender PSID
   */
  static getSenderPSID(event: MessagingEvent): string {
    return event.sender.id;
  }

  /**
   * Get page ID
   */
  static getPageId(event: MessagingEvent): string {
    return event.recipient.id;
  }

  /**
   * Check if message has attachments
   */
  static hasAttachments(event: MessagingEvent): boolean {
    return !!(
      event.message.attachments && event.message.attachments.length > 0
    );
  }

  /**
   * Get attachment URLs
   */
  static getAttachmentUrls(event: MessagingEvent): string[] {
    if (!this.hasAttachments(event)) return [];

    return event.message
      .attachments!.map((att) => att.payload.url)
      .filter((url): url is string => !!url);
  }

  /**
   * Check if message is a quick reply
   */
  static isQuickReply(event: MessagingEvent): boolean {
    return !!event.message.quick_reply;
  }

  /**
   * Get quick reply payload
   */
  static getQuickReplyPayload(event: MessagingEvent): string | null {
    return event.message.quick_reply?.payload || null;
  }

  /**
   * Check if message has referral data
   */
  static hasReferral(event: MessagingEvent): boolean {
    return !!event.message.referral;
  }

  /**
   * Get product ID from referral (if any)
   */
  static getReferralProductId(event: MessagingEvent): string | null {
    return event.message.referral?.product?.id || null;
  }

  /**
   * Get ad ID from referral (if any)
   */
  static getReferralAdId(event: MessagingEvent): string | null {
    return event.message.referral?.ad_id || null;
  }

  /**
   * Check if message has commands
   */
  static hasCommands(event: MessagingEvent): boolean {
    return !!(event.message.commands && event.message.commands.length > 0);
  }

  /**
   * Get command names
   */
  static getCommandNames(event: MessagingEvent): string[] {
    if (!this.hasCommands(event)) return [];

    return event.message.commands!.map((cmd) => cmd.name);
  }
}

// Export default instance for easy usage
export const messageHandler = new FacebookMessagesHandler();

// Example usage:
/*
// Text messages
messageHandler.onTextMessage(async (event) => {
  const text = FacebookMessageHandler.getMessageText(event);
  const senderPSID = FacebookMessageHandler.getSenderPSID(event);
  console.log(`Received text from ${senderPSID}: ${text}`);
});

// Attachment messages
messageHandler.onAttachmentMessage(async (event) => {
  const urls = FacebookMessageHandler.getAttachmentUrls(event);
  console.log('Received attachments:', urls);
});

// Quick replies
messageHandler.onQuickReplyMessage(async (event) => {
  const payload = FacebookMessageHandler.getQuickReplyPayload(event);
  console.log('Quick reply payload:', payload);
});

// Product messages
messageHandler.onProductMessage(async (event) => {
  console.log('Received product template message');
});

// All messages
messageHandler.onMessage(async (event) => {
  console.log('Received any message type');
});

// Process webhook
app.post('/webhook', async (req, res) => {
  try {
    await messageHandler.processWebhook(req.body);
    res.status(200).send('OK');
  } catch (error) {
    res.status(400).send('Error processing webhook');
  }
});
*/
