import { Injectable } from "@nestjs/common";

// Quick Reply Content Types
export enum QuickReplyContentType {
  TEXT = "text",
  USER_PHONE_NUMBER = "user_phone_number",
  USER_EMAIL = "user_email",
}

// Base Quick Reply interface
export interface BaseQuickReply {
  content_type: QuickReplyContentType;
}

// Text Quick Reply interface
export interface TextQuickReply extends BaseQuickReply {
  content_type: QuickReplyContentType.TEXT;
  title: string; // Required for text quick replies, max 20 characters
  payload?: string; // Optional developer-defined payload, max 1000 characters
  image_url?: string; // Optional image URL for icon beside title
}

// User Phone Number Quick Reply interface
export interface UserPhoneNumberQuickReply extends BaseQuickReply {
  content_type: QuickReplyContentType.USER_PHONE_NUMBER;
}

// User Email Quick Reply interface
export interface UserEmailQuickReply extends BaseQuickReply {
  content_type: QuickReplyContentType.USER_EMAIL;
}

// Union type for all quick reply types
export type QuickReply =
  | TextQuickReply
  | UserPhoneNumberQuickReply
  | UserEmailQuickReply;

// Message with Quick Replies interface
export interface MessageWithQuickReplies {
  text: string;
  quick_replies: QuickReply[];
}

// Quick Reply Response from webhook
export interface QuickReplyResponse {
  payload: string;
}

// Webhook message event with quick reply
export interface MessageWithQuickReplyEvent {
  quick_reply: QuickReplyResponse;
  mid: string;
  text: string;
}

@Injectable()
export class QuickRepliesService {
  private readonly MAX_QUICK_REPLIES = 13;
  private readonly MAX_TITLE_LENGTH = 20;
  private readonly MAX_PAYLOAD_LENGTH = 1000;

  /**
   * Creates a text quick reply button.
   * @param title The button text (max 20 characters)
   * @param payload Optional developer-defined payload (max 1000 characters)
   * @param imageUrl Optional image URL for icon beside title
   * @returns Text quick reply object
   */
  createTextQuickReply(
    title: string,
    payload?: string,
    imageUrl?: string
  ): TextQuickReply {
    this.validateTitle(title);
    if (payload) {
      this.validatePayload(payload);
    }

    const quickReply: TextQuickReply = {
      content_type: QuickReplyContentType.TEXT,
      title: title.trim(),
    };

    if (payload) {
      quickReply.payload = payload;
    }

    if (imageUrl) {
      quickReply.image_url = imageUrl;
    }

    return quickReply;
  }

  /**
   * Creates a user phone number quick reply.
   * This will automatically pre-fill with the user's phone number from their profile.
   * @returns User phone number quick reply object
   */
  createUserPhoneNumberQuickReply(): UserPhoneNumberQuickReply {
    return {
      content_type: QuickReplyContentType.USER_PHONE_NUMBER,
    };
  }

  /**
   * Creates a user email quick reply.
   * This will automatically pre-fill with the user's email from their profile.
   * @returns User email quick reply object
   */
  createUserEmailQuickReply(): UserEmailQuickReply {
    return {
      content_type: QuickReplyContentType.USER_EMAIL,
    };
  }

  /**
   * Creates a message with quick replies.
   * @param text The message text
   * @param quickReplies Array of quick reply objects (max 13)
   * @returns Message with quick replies object
   */
  createQuickReplyMessage(
    text: string,
    quickReplies: QuickReply[]
  ): MessageWithQuickReplies {
    this.validateQuickReplies(quickReplies);

    return {
      text: text.trim(),
      quick_replies: quickReplies,
    };
  }

  /**
   * Creates multiple text quick replies from an array of options.
   * @param options Array of text options with optional payloads and images
   * @returns Array of text quick replies
   */
  createTextQuickReplies(
    options: Array<{
      title: string;
      payload?: string;
      imageUrl?: string;
    }>
  ): TextQuickReply[] {
    if (options.length > this.MAX_QUICK_REPLIES) {
      throw new Error(
        `Maximum of ${this.MAX_QUICK_REPLIES} quick replies allowed.`
      );
    }

    return options.map((option) =>
      this.createTextQuickReply(option.title, option.payload, option.imageUrl)
    );
  }

  /**
   * Creates a quick reply message for yes/no questions.
   * @param text The question text
   * @param yesPayload Optional payload for yes button
   * @param noPayload Optional payload for no button
   * @returns Message with yes/no quick replies
   */
  createYesNoQuickReplyMessage(
    text: string,
    yesPayload?: string,
    noPayload?: string
  ): MessageWithQuickReplies {
    const quickReplies = [
      this.createTextQuickReply("Yes", yesPayload || "YES"),
      this.createTextQuickReply("No", noPayload || "NO"),
    ];

    return this.createQuickReplyMessage(text, quickReplies);
  }

  /**
   * Creates a quick reply message for collecting contact information.
   * @param text The message text
   * @param includePhone Whether to include phone number quick reply
   * @param includeEmail Whether to include email quick reply
   * @param additionalOptions Optional additional text quick replies
   * @returns Message with contact quick replies
   */
  createContactQuickReplyMessage(
    text: string,
    includePhone: boolean = true,
    includeEmail: boolean = true,
    additionalOptions?: Array<{
      title: string;
      payload?: string;
      imageUrl?: string;
    }>
  ): MessageWithQuickReplies {
    const quickReplies: QuickReply[] = [];

    if (includePhone) {
      quickReplies.push(this.createUserPhoneNumberQuickReply());
    }

    if (includeEmail) {
      quickReplies.push(this.createUserEmailQuickReply());
    }

    if (additionalOptions) {
      const textQuickReplies = this.createTextQuickReplies(additionalOptions);
      quickReplies.push(...textQuickReplies);
    }

    return this.createQuickReplyMessage(text, quickReplies);
  }

  /**
   * Creates a quick reply message for rating/feedback (1-5 stars).
   * @param text The message text
   * @param useStarEmojis Whether to use star emojis in titles
   * @returns Message with rating quick replies
   */
  createRatingQuickReplyMessage(
    text: string,
    useStarEmojis: boolean = true
  ): MessageWithQuickReplies {
    const ratings = [1, 2, 3, 4, 5];
    const quickReplies = ratings.map((rating) => {
      const title = useStarEmojis
        ? "⭐".repeat(rating)
        : `${rating} Star${rating > 1 ? "s" : ""}`;

      return this.createTextQuickReply(title, `RATING_${rating}`);
    });

    return this.createQuickReplyMessage(text, quickReplies);
  }

  /**
   * Creates a quick reply message for multiple choice questions.
   * @param text The question text
   * @param choices Array of choice options
   * @returns Message with multiple choice quick replies
   */
  createMultipleChoiceQuickReplyMessage(
    text: string,
    choices: Array<{
      label: string;
      value: string;
      imageUrl?: string;
    }>
  ): MessageWithQuickReplies {
    const quickReplies = choices.map((choice) =>
      this.createTextQuickReply(choice.label, choice.value, choice.imageUrl)
    );

    return this.createQuickReplyMessage(text, quickReplies);
  }

  /**
   * Validates the title length for text quick replies.
   * @param title The title to validate
   */
  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error("Title is required for text quick replies.");
    }

    if (title.length > this.MAX_TITLE_LENGTH) {
      throw new Error(
        `Title must be ${this.MAX_TITLE_LENGTH} characters or less.`
      );
    }
  }

  /**
   * Validates the payload length.
   * @param payload The payload to validate
   */
  private validatePayload(payload: string): void {
    if (payload.length > this.MAX_PAYLOAD_LENGTH) {
      throw new Error(
        `Payload must be ${this.MAX_PAYLOAD_LENGTH} characters or less.`
      );
    }
  }

  /**
   * Validates the quick replies array.
   * @param quickReplies The quick replies array to validate
   */
  private validateQuickReplies(quickReplies: QuickReply[]): void {
    if (!quickReplies || quickReplies.length === 0) {
      throw new Error("At least one quick reply is required.");
    }

    if (quickReplies.length > this.MAX_QUICK_REPLIES) {
      throw new Error(
        `Maximum of ${this.MAX_QUICK_REPLIES} quick replies allowed.`
      );
    }

    // Validate each quick reply
    quickReplies.forEach((quickReply, index) => {
      if (quickReply.content_type === QuickReplyContentType.TEXT) {
        const textQuickReply = quickReply as TextQuickReply;
        if (!textQuickReply.title) {
          throw new Error(
            `Quick reply at index ${index} is missing required title.`
          );
        }
      }
    });
  }

  /**
   * Checks if a quick reply response is from a text quick reply.
   * @param quickReplyResponse The quick reply response from webhook
   * @returns True if it's a text quick reply response
   */
  isTextQuickReplyResponse(quickReplyResponse: QuickReplyResponse): boolean {
    // Text quick replies will have custom payloads, while phone/email will have the actual values
    const payload = quickReplyResponse.payload;

    // Phone numbers typically start with + or contain only digits and common phone characters
    const phonePattern = /^[\+]?[0-9\-\(\)\s]+$/;

    // Email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return !phonePattern.test(payload) && !emailPattern.test(payload);
  }

  /**
   * Checks if a quick reply response is from a phone number quick reply.
   * @param quickReplyResponse The quick reply response from webhook
   * @returns True if it's a phone number quick reply response
   */
  isPhoneNumberQuickReplyResponse(
    quickReplyResponse: QuickReplyResponse
  ): boolean {
    const payload = quickReplyResponse.payload;
    const phonePattern = /^[\+]?[0-9\-\(\)\s]+$/;
    return phonePattern.test(payload);
  }

  /**
   * Checks if a quick reply response is from an email quick reply.
   * @param quickReplyResponse The quick reply response from webhook
   * @returns True if it's an email quick reply response
   */
  isEmailQuickReplyResponse(quickReplyResponse: QuickReplyResponse): boolean {
    const payload = quickReplyResponse.payload;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(payload);
  }

  /**
   * Extracts the phone number from a phone number quick reply response.
   * @param quickReplyResponse The quick reply response from webhook
   * @returns The phone number or null if not a valid phone response
   */
  extractPhoneNumber(quickReplyResponse: QuickReplyResponse): string | null {
    if (this.isPhoneNumberQuickReplyResponse(quickReplyResponse)) {
      return quickReplyResponse.payload;
    }
    return null;
  }

  /**
   * Extracts the email address from an email quick reply response.
   * @param quickReplyResponse The quick reply response from webhook
   * @returns The email address or null if not a valid email response
   */
  extractEmail(quickReplyResponse: QuickReplyResponse): string | null {
    if (this.isEmailQuickReplyResponse(quickReplyResponse)) {
      return quickReplyResponse.payload;
    }
    return null;
  }

  /**
   * Gets the custom payload from a text quick reply response.
   * @param quickReplyResponse The quick reply response from webhook
   * @returns The custom payload or null if not a text quick reply
   */
  getTextQuickReplyPayload(
    quickReplyResponse: QuickReplyResponse
  ): string | null {
    if (this.isTextQuickReplyResponse(quickReplyResponse)) {
      return quickReplyResponse.payload;
    }
    return null;
  }
}
