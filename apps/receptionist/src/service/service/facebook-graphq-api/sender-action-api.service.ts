import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import { EnvService } from "../env.service";
import { FacebookGraphApiUrl } from "../facebook-graph-api-constants";

// Types for sender actions
export enum SenderAction {
  TYPING_ON = "typing_on",
  TYPING_OFF = "typing_off",
  MARK_SEEN = "mark_seen",
}

export interface Recipient {
  id: string; // Page-scoped ID (PSID)
}

export interface SenderActionRequest {
  recipient: Recipient;
  sender_action: SenderAction;
}

export interface SenderActionResponse {
  recipient_id: string;
}

@Injectable()
export class SenderActionApiService {
  private readonly facebookApiUrl = FacebookGraphApiUrl;

  constructor(
    private readonly httpService: HttpService,
    private readonly envService: EnvService
  ) {}

  /**
   * Displays the typing bubble to indicate the page is preparing a response.
   * @param pageId The Facebook Page ID sending the action
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param pageAccessToken Optional page access token (uses user access token if not provided)
   * @returns Response with recipient ID
   */
  async showTypingIndicator(
    pageId: string,
    recipientId: string,
    pageAccessToken?: string
  ): Promise<SenderActionResponse> {
    return this.sendSenderAction(
      pageId,
      recipientId,
      SenderAction.TYPING_ON,
      pageAccessToken
    );
  }

  /**
   * Hides the typing bubble.
   * @param pageId The Facebook Page ID sending the action
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param pageAccessToken Optional page access token (uses user access token if not provided)
   * @returns Response with recipient ID
   */
  async hideTypingIndicator(
    pageId: string,
    recipientId: string,
    pageAccessToken?: string
  ): Promise<SenderActionResponse> {
    return this.sendSenderAction(
      pageId,
      recipientId,
      SenderAction.TYPING_OFF,
      pageAccessToken
    );
  }

  /**
   * Marks messages as seen by the page.
   * @param pageId The Facebook Page ID sending the action
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param pageAccessToken Optional page access token (uses user access token if not provided)
   * @returns Response with recipient ID
   */
  async markMessageAsSeen(
    pageId: string,
    recipientId: string,
    pageAccessToken?: string
  ): Promise<SenderActionResponse> {
    return this.sendSenderAction(
      pageId,
      recipientId,
      SenderAction.MARK_SEEN,
      pageAccessToken
    );
  }

  /**
   * Simulates a natural typing experience by showing typing indicator for a specified duration.
   * @param pageId The Facebook Page ID sending the action
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param durationMs Duration in milliseconds to show typing indicator (default: 2000ms)
   * @param pageAccessToken Optional page access token
   * @returns Promise that resolves when typing sequence is complete
   */
  async simulateTyping(
    pageId: string,
    recipientId: string,
    durationMs: number = 2000,
    pageAccessToken?: string
  ): Promise<void> {
    // Show typing indicator
    await this.showTypingIndicator(pageId, recipientId, pageAccessToken);

    // Wait for specified duration
    await new Promise((resolve) => setTimeout(resolve, durationMs));

    // Hide typing indicator
    await this.hideTypingIndicator(pageId, recipientId, pageAccessToken);
  }

  /**
   * Convenience method to mark message as seen and then show typing indicator.
   * This follows the best practice of acknowledging receipt before indicating response preparation.
   * @param pageId The Facebook Page ID sending the action
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param pageAccessToken Optional page access token
   * @returns Promise that resolves when both actions are complete
   */
  async acknowledgeAndStartTyping(
    pageId: string,
    recipientId: string,
    pageAccessToken?: string
  ): Promise<void> {
    // Mark message as seen first
    await this.markMessageAsSeen(pageId, recipientId, pageAccessToken);

    // Small delay to make it feel natural
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Show typing indicator
    await this.showTypingIndicator(pageId, recipientId, pageAccessToken);
  }

  /**
   * Sends typing indicators in sequence with natural timing.
   * Useful for longer responses where you want to maintain engagement.
   * @param pageId The Facebook Page ID sending the action
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param sequences Array of typing durations in milliseconds
   * @param pageAccessToken Optional page access token
   * @returns Promise that resolves when all typing sequences are complete
   */
  async sendTypingSequence(
    pageId: string,
    recipientId: string,
    sequences: number[],
    pageAccessToken?: string
  ): Promise<void> {
    for (let i = 0; i < sequences.length; i++) {
      await this.simulateTyping(
        pageId,
        recipientId,
        sequences[i],
        pageAccessToken
      );

      // Add a small pause between sequences if not the last one
      if (i < sequences.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  /**
   * Core method to send sender actions to Facebook Graph API.
   * @param pageId The Facebook Page ID sending the action
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param action The sender action to perform
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID
   */
  async sendSenderAction(
    pageId: string,
    recipientId: string,
    action: SenderAction,
    pageAccessToken?: string
  ): Promise<SenderActionResponse> {
    const accessToken = pageAccessToken || this.envService.getUserAccessToken();

    if (!pageId) {
      throw new Error("Page ID is required to send a sender action.");
    }
    if (!accessToken) {
      throw new Error("Access Token is required to send a sender action.");
    }
    if (!recipientId) {
      throw new Error("Recipient ID is required to send a sender action.");
    }

    const url = `${this.facebookApiUrl}/${pageId}/messages`;

    const params = new URLSearchParams({
      access_token: accessToken,
    });

    const actionRequest: SenderActionRequest = {
      recipient: { id: recipientId },
      sender_action: action,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<SenderActionResponse>(url, actionRequest, {
          params: Object.fromEntries(params),
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{
        error?: { message: string; code?: number; error_subcode?: number };
      }>;
      console.error(
        "Error sending sender action via Facebook Graph API:",
        error.response?.data || error.message
      );

      const errorData = error.response?.data?.error;
      const errorMessage =
        errorData?.message || error.message || "Unknown error";
      const errorCode = errorData?.code;
      const errorSubcode = errorData?.error_subcode;

      let detailedError = `Failed to send sender action (${action}): ${errorMessage}`;
      if (errorCode) {
        detailedError += ` (Code: ${errorCode}`;
        if (errorSubcode) {
          detailedError += `, Subcode: ${errorSubcode}`;
        }
        detailedError += ")";
      }

      throw new Error(detailedError);
    }
  }

  /**
   * Validates if the recipient is eligible for sender actions.
   * Note: This is a helper method - actual validation should be done on your backend
   * based on the recipient's sign-in status.
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @returns True if recipient ID is valid format, false otherwise
   */
  isValidRecipient(recipientId: string): boolean {
    // Basic validation - recipient ID should be a non-empty string
    return typeof recipientId === "string" && recipientId.trim().length > 0;
  }

  /**
   * Helper method to calculate appropriate typing duration based on message length.
   * Simulates realistic typing speed.
   * @param messageLength The length of the message that will be sent
   * @param wordsPerMinute Average typing speed (default: 40 WPM)
   * @returns Duration in milliseconds
   */
  calculateTypingDuration(
    messageLength: number,
    wordsPerMinute: number = 40
  ): number {
    // Estimate words (average 5 characters per word)
    const estimatedWords = Math.ceil(messageLength / 5);

    // Calculate duration in milliseconds
    const durationMs = (estimatedWords / wordsPerMinute) * 60 * 1000;

    // Ensure minimum 1 second and maximum 10 seconds
    return Math.max(1000, Math.min(10000, durationMs));
  }
}
