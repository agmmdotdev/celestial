// Facebook Messenger Postback Webhook Handler
// Handles postback events: postback buttons, Get Started button, persistent menu items, etc.

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

// Postback handler callback types
export type PostbackHandlerCallback = (
  event: PostbackEvent,
  error?: Error
) => void | Promise<void>;

export interface PostbackHandlerOptions {
  validateSignature?: boolean;
  verifyToken?: string;
  pageId?: string;
  enableLogging?: boolean;
}

// Main postback handler class
export class FacebookPostbacksHandler {
  private callbacks: Map<string, PostbackHandlerCallback[]> = new Map();
  private options: PostbackHandlerOptions;

  constructor(options: PostbackHandlerOptions = {}) {
    this.options = {
      validateSignature: true,
      enableLogging: false,
      ...options,
    };
  }

  /**
   * Register a callback for specific postback types
   */
  onPostback(callback: PostbackHandlerCallback): void;
  onPostback(
    postbackType:
      | "button"
      | "get_started"
      | "persistent_menu"
      | "referral"
      | "payload",
    callback: PostbackHandlerCallback
  ): void;
  onPostback(
    postbackTypeOrCallback: string | PostbackHandlerCallback,
    callback?: PostbackHandlerCallback
  ): void {
    if (typeof postbackTypeOrCallback === "function") {
      // Register for all postback types
      this.addCallback("all", postbackTypeOrCallback);
    } else if (callback) {
      // Register for specific postback type
      this.addCallback(postbackTypeOrCallback, callback);
    }
  }

  /**
   * Register callback for button postbacks
   */
  onButtonPostback(callback: PostbackHandlerCallback): void {
    this.addCallback("button", callback);
  }

  /**
   * Register callback for Get Started button postbacks
   */
  onGetStartedPostback(callback: PostbackHandlerCallback): void {
    this.addCallback("get_started", callback);
  }

  /**
   * Register callback for persistent menu postbacks
   */
  onPersistentMenuPostback(callback: PostbackHandlerCallback): void {
    this.addCallback("persistent_menu", callback);
  }

  /**
   * Register callback for referral postbacks
   */
  onReferralPostback(callback: PostbackHandlerCallback): void {
    this.addCallback("referral", callback);
  }

  /**
   * Register callback for specific payload postbacks
   */
  onPayloadPostback(payload: string, callback: PostbackHandlerCallback): void {
    this.addCallback(`payload:${payload}`, callback);
  }

  /**
   * Process incoming webhook payload
   */
  async processWebhook(payload: FacebookPostbackWebhookPayload): Promise<void> {
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
        await this.handlePostbackEvent(event);
      }
    }
  }

  /**
   * Handle individual postback event
   */
  private async handlePostbackEvent(event: PostbackEvent): Promise<void> {
    try {
      if (this.options.enableLogging) {
        console.log(
          "Processing postback event:",
          JSON.stringify(event, null, 2)
        );
      }

      // Determine postback type and trigger appropriate callbacks
      const postbackType = this.getPostbackType(event.postback);

      // Execute callbacks for specific postback type
      await this.executeCallbacks(postbackType, event);

      // Execute callbacks for specific payload
      if (event.postback.payload) {
        await this.executeCallbacks(`payload:${event.postback.payload}`, event);
      }

      // Execute callbacks for all postback types
      await this.executeCallbacks("all", event);
    } catch (error) {
      if (this.options.enableLogging) {
        console.error("Error handling postback event:", error);
      }

      // Execute error callbacks if any
      await this.executeCallbacks("error", event, error as Error);
    }
  }

  /**
   * Determine the type of postback
   */
  private getPostbackType(postback: FacebookPostback): string {
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
  }

  /**
   * Add callback to the callbacks map
   */
  private addCallback(type: string, callback: PostbackHandlerCallback): void {
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
    event: PostbackEvent,
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
   * Get postback payload
   */
  static getPostbackPayload(event: PostbackEvent): string {
    return event.postback.payload;
  }

  /**
   * Get postback title
   */
  static getPostbackTitle(event: PostbackEvent): string | null {
    return event.postback.title || null;
  }

  /**
   * Get sender PSID or user reference
   */
  static getSenderPSID(event: PostbackEvent): string | null {
    return event.sender.id || null;
  }

  /**
   * Get sender user reference
   */
  static getSenderUserRef(event: PostbackEvent): string | null {
    return event.sender.user_ref || null;
  }

  /**
   * Get page ID
   */
  static getPageId(event: PostbackEvent): string {
    return event.recipient.id;
  }

  /**
   * Check if postback has referral data
   */
  static hasReferral(event: PostbackEvent): boolean {
    return !!event.postback.referral;
  }

  /**
   * Get referral ref parameter
   */
  static getReferralRef(event: PostbackEvent): string | null {
    return event.postback.referral?.ref || null;
  }

  /**
   * Get referral source
   */
  static getReferralSource(event: PostbackEvent): string | null {
    return event.postback.referral?.source || null;
  }

  /**
   * Get referral type
   */
  static getReferralType(event: PostbackEvent): string | null {
    return event.postback.referral?.type || null;
  }

  /**
   * Check if postback is from m.me link
   */
  static isFromMeLink(event: PostbackEvent): boolean {
    return event.postback.referral?.source === "SHORTLINK";
  }

  /**
   * Check if postback is from ads
   */
  static isFromAds(event: PostbackEvent): boolean {
    return event.postback.referral?.source === "ADS";
  }

  /**
   * Check if postback is Get Started button
   */
  static isGetStarted(event: PostbackEvent): boolean {
    const payload = event.postback.payload?.toLowerCase();
    return (
      payload === "get_started" || payload?.includes("get_started") || false
    );
  }

  /**
   * Check if postback has specific payload
   */
  static hasPayload(event: PostbackEvent, payload: string): boolean {
    return event.postback.payload === payload;
  }

  /**
   * Get message ID if available
   */
  static getMessageId(event: PostbackEvent): string | null {
    return event.postback.mid || null;
  }
}

// Export default instance for easy usage
export const postbackHandler = new FacebookPostbacksHandler();

// Example usage:
/*
// All postbacks
postbackHandler.onPostback(async (event) => {
  const payload = FacebookPostbacksHandler.getPostbackPayload(event);
  const senderPSID = FacebookPostbacksHandler.getSenderPSID(event);
  console.log(`Received postback from ${senderPSID}: ${payload}`);
});

// Get Started button
postbackHandler.onGetStartedPostback(async (event) => {
  const senderPSID = FacebookPostbacksHandler.getSenderPSID(event);
  console.log(`New user started conversation: ${senderPSID}`);
});

// Button postbacks
postbackHandler.onButtonPostback(async (event) => {
  const title = FacebookPostbacksHandler.getPostbackTitle(event);
  console.log(`Button clicked: ${title}`);
});

// Specific payload
postbackHandler.onPayloadPostback("VIEW_PRODUCT", async (event) => {
  console.log("User wants to view product");
});

// Referral postbacks
postbackHandler.onReferralPostback(async (event) => {
  const ref = FacebookPostbacksHandler.getReferralRef(event);
  const source = FacebookPostbacksHandler.getReferralSource(event);
  console.log(`Referral postback - ref: ${ref}, source: ${source}`);
});

// Process webhook
app.post('/webhook/postbacks', async (req, res) => {
  try {
    await postbackHandler.processWebhook(req.body);
    res.status(200).send('OK');
  } catch (error) {
    res.status(400).send('Error processing postback webhook');
  }
});
*/
