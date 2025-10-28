import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import { EnvService } from "../env.service";
import { FacebookGraphApiUrl } from "../facebook-graph-api-constants";
import {
  ButtonTemplateService,
  Button,
  MessageWithTemplate,
  ButtonTemplatePayload,
} from "./button-template.service";
import {
  ReceiptTemplateService,
  ReceiptTemplatePayload,
  MessageWithReceiptTemplate,
} from "./receipt-template.service";
import {
  CouponTemplateService,
  CouponTemplatePayload,
  MessageWithCouponTemplate,
} from "./coupon-template.service";
import {
  GenericTemplateService,
  GenericTemplatePayload,
  MessageWithGenericTemplate,
} from "./generic-tempate.service";
import {
  QuickRepliesService,
  MessageWithQuickReplies,
  QuickReply,
  QuickReplyResponse,
  MessageWithQuickReplyEvent,
} from "./quick-replies.service";

// Types for messaging
export enum MessagingType {
  RESPONSE = "RESPONSE",
  UPDATE = "UPDATE",
  MESSAGE_TAG = "MESSAGE_TAG",
}

export enum MessageTag {
  CONFIRMED_EVENT_UPDATE = "CONFIRMED_EVENT_UPDATE",
  POST_PURCHASE_UPDATE = "POST_PURCHASE_UPDATE",
  ACCOUNT_UPDATE = "ACCOUNT_UPDATE",
  HUMAN_AGENT = "HUMAN_AGENT",
}

export enum AttachmentType {
  AUDIO = "audio",
  FILE = "file",
  IMAGE = "image",
  VIDEO = "video",
  TEMPLATE = "template",
}

export interface Recipient {
  id: string; // Page-scoped ID (PSID)
}

export interface TextMessage {
  text: string;
}

export interface AttachmentPayload {
  url?: string;
  attachment_id?: string;
  is_reusable?: boolean;
}

export interface Attachment {
  type: AttachmentType;
  payload: AttachmentPayload;
}

export interface MessageWithText {
  text: string;
}

export interface MessageWithAttachment {
  attachment: Attachment;
}

export interface MessageWithMultipleAttachments {
  attachments: Attachment[];
}

export type MessageContent =
  | MessageWithText
  | MessageWithAttachment
  | MessageWithMultipleAttachments
  | MessageWithTemplate
  | MessageWithReceiptTemplate
  | MessageWithCouponTemplate
  | MessageWithGenericTemplate
  | MessageWithQuickReplies;

export interface SendMessageRequest {
  recipient: Recipient;
  messaging_type: MessagingType;
  message: MessageContent;
  tag?: MessageTag;
}

export interface SendMessageResponse {
  recipient_id: string;
  message_id: string;
}

@Injectable()
export class MessagingService {
  private readonly facebookApiUrl = FacebookGraphApiUrl;

  constructor(
    private readonly httpService: HttpService,
    private readonly envService: EnvService,
    private readonly buttonTemplateService: ButtonTemplateService,
    private readonly receiptTemplateService: ReceiptTemplateService,
    private readonly couponTemplateService: CouponTemplateService,
    private readonly genericTemplateService: GenericTemplateService,
    private readonly quickRepliesService: QuickRepliesService
  ) {}

  /**
   * Sends a basic text message to a recipient.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param text The text message to send
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token (uses user access token if not provided)
   * @returns Response with recipient ID and message ID
   */
  async sendTextMessage(
    pageId: string,
    recipientId: string,
    text: string,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: { text },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a message with a media attachment (image, video, audio, or file).
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param attachmentType The type of attachment
   * @param mediaUrl The URL of the media to send
   * @param isReusable Whether the attachment should be reusable (default: true)
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendMediaMessage(
    pageId: string,
    recipientId: string,
    attachmentType: AttachmentType,
    mediaUrl: string,
    isReusable: boolean = true,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: attachmentType,
          payload: {
            url: mediaUrl,
            is_reusable: isReusable,
          },
        },
      },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a message with multiple image attachments (up to 30 images).
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param imageUrls Array of image URLs to send (max 30)
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendMultipleImagesMessage(
    pageId: string,
    recipientId: string,
    imageUrls: string[],
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    if (imageUrls.length === 0) {
      throw new Error("At least one image URL is required.");
    }
    if (imageUrls.length > 30) {
      throw new Error("Maximum of 30 images allowed per message.");
    }

    const attachments: Attachment[] = imageUrls.map((url) => ({
      type: AttachmentType.IMAGE,
      payload: { url },
    }));

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: { attachments },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a message using a previously uploaded attachment ID.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param attachmentType The type of attachment
   * @param attachmentId The ID of the previously uploaded attachment
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendMessageWithAttachmentId(
    pageId: string,
    recipientId: string,
    attachmentType: AttachmentType,
    attachmentId: string,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: attachmentType,
          payload: {
            attachment_id: attachmentId,
          },
        },
      },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a tagged message outside the standard messaging window.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param message The message content
   * @param tag The message tag indicating the use case
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendTaggedMessage(
    pageId: string,
    recipientId: string,
    message: MessageContent,
    tag: MessageTag,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: MessagingType.MESSAGE_TAG,
      message,
      tag,
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a button template message with up to 3 buttons.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param text The text to display above the buttons (max 640 characters)
   * @param buttons Array of 1-3 buttons to display
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendButtonTemplateMessage(
    pageId: string,
    recipientId: string,
    text: string,
    buttons: Button[],
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const buttonTemplatePayload: ButtonTemplatePayload =
      this.buttonTemplateService.createButtonTemplatePayload(text, buttons);

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: AttachmentType.TEMPLATE,
          payload: buttonTemplatePayload,
        },
      },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a receipt template message for order confirmations.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param receiptPayload The receipt template payload
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendReceiptTemplateMessage(
    pageId: string,
    recipientId: string,
    receiptPayload: ReceiptTemplatePayload,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: AttachmentType.TEMPLATE,
          payload: receiptPayload,
        },
      },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a basic coupon template message.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param title The coupon title (max 80 characters)
   * @param couponCode The coupon code (cannot contain spaces)
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendBasicCouponMessage(
    pageId: string,
    recipientId: string,
    title: string,
    couponCode: string,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const couponPayload =
      this.couponTemplateService.createBasicCouponTemplatePayload(
        title,
        couponCode
      );

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: AttachmentType.TEMPLATE,
          payload: couponPayload,
        },
      },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a coupon template message with URL instead of code.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param title The coupon title (max 80 characters)
   * @param couponUrl The coupon URL
   * @param couponUrlButtonTitle Optional button text (defaults to "Shop now")
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendCouponUrlMessage(
    pageId: string,
    recipientId: string,
    title: string,
    couponUrl: string,
    couponUrlButtonTitle?: string,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const couponPayload =
      this.couponTemplateService.createUrlCouponTemplatePayload(
        title,
        couponUrl,
        couponUrlButtonTitle
      );

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: AttachmentType.TEMPLATE,
          payload: couponPayload,
        },
      },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a complete coupon template message with all optional properties.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param couponPayload The complete coupon template payload
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendCouponTemplateMessage(
    pageId: string,
    recipientId: string,
    couponPayload: CouponTemplatePayload,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: AttachmentType.TEMPLATE,
          payload: couponPayload,
        },
      },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a percentage discount coupon message.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param discountPercentage The discount percentage (1-100)
   * @param couponCode The coupon code
   * @param description Optional description of what the discount applies to
   * @param options Additional coupon options
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendPercentageDiscountCoupon(
    pageId: string,
    recipientId: string,
    discountPercentage: number,
    couponCode: string,
    description: string = "everything",
    options?: {
      subtitle?: string;
      couponPreMessage?: string;
      imageUrl?: string;
      payload?: string;
    },
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const couponPayload =
      this.couponTemplateService.createPercentageDiscountCoupon(
        discountPercentage,
        couponCode,
        description,
        options
      );

    return this.sendCouponTemplateMessage(
      pageId,
      recipientId,
      couponPayload,
      messagingType,
      pageAccessToken
    );
  }

  /**
   * Sends a fixed amount discount coupon message.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param discountAmount The discount amount
   * @param currency The currency symbol
   * @param couponCode The coupon code
   * @param description Optional description of what the discount applies to
   * @param options Additional coupon options
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendFixedAmountDiscountCoupon(
    pageId: string,
    recipientId: string,
    discountAmount: number,
    currency: string,
    couponCode: string,
    description: string = "your order",
    options?: {
      subtitle?: string;
      couponPreMessage?: string;
      imageUrl?: string;
      payload?: string;
    },
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const couponPayload =
      this.couponTemplateService.createFixedAmountDiscountCoupon(
        discountAmount,
        currency,
        couponCode,
        description,
        options
      );

    return this.sendCouponTemplateMessage(
      pageId,
      recipientId,
      couponPayload,
      messagingType,
      pageAccessToken
    );
  }

  /**
   * Sends a free shipping coupon message.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param couponCode The coupon code
   * @param options Additional coupon options
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendFreeShippingCoupon(
    pageId: string,
    recipientId: string,
    couponCode: string,
    options?: {
      subtitle?: string;
      couponPreMessage?: string;
      imageUrl?: string;
      payload?: string;
    },
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const couponPayload = this.couponTemplateService.createFreeShippingCoupon(
      couponCode,
      options
    );

    return this.sendCouponTemplateMessage(
      pageId,
      recipientId,
      couponPayload,
      messagingType,
      pageAccessToken
    );
  }

  /**
   * Sends a basic generic template message with a single element.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param title The title of the element (max 80 characters)
   * @param options Optional properties for the element and template
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendBasicGenericTemplateMessage(
    pageId: string,
    recipientId: string,
    title: string,
    options?: {
      image_url?: string;
      subtitle?: string;
      default_action?: {
        url: string;
        messenger_extensions?: boolean;
        webview_height_ratio?: "compact" | "tall" | "full";
      };
      buttons?: Button[];
      image_aspect_ratio?: "horizontal" | "square";
    },
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const defaultAction = options?.default_action
      ? this.genericTemplateService.createDefaultAction(
          options.default_action.url,
          {
            messenger_extensions: options.default_action.messenger_extensions,
            webview_height_ratio: options.default_action.webview_height_ratio,
          }
        )
      : undefined;

    const genericPayload =
      this.genericTemplateService.createBasicGenericTemplatePayload(title, {
        image_url: options?.image_url,
        subtitle: options?.subtitle,
        default_action: defaultAction,
        buttons: options?.buttons,
        image_aspect_ratio: options?.image_aspect_ratio,
      });

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: AttachmentType.TEMPLATE,
          payload: genericPayload,
        },
      },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a carousel generic template message with multiple elements.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param elements Array of generic template elements (max 10)
   * @param imageAspectRatio Optional aspect ratio for images
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendCarouselGenericTemplateMessage(
    pageId: string,
    recipientId: string,
    elements: Array<{
      title: string;
      image_url?: string;
      subtitle?: string;
      default_action?: {
        url: string;
        messenger_extensions?: boolean;
        webview_height_ratio?: "compact" | "tall" | "full";
      };
      buttons?: Button[];
    }>,
    imageAspectRatio?: "horizontal" | "square",
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const genericElements = elements.map((element) => {
      const defaultAction = element.default_action
        ? this.genericTemplateService.createDefaultAction(
            element.default_action.url,
            {
              messenger_extensions: element.default_action.messenger_extensions,
              webview_height_ratio: element.default_action.webview_height_ratio,
            }
          )
        : undefined;

      return this.genericTemplateService.createElement(element.title, {
        image_url: element.image_url,
        subtitle: element.subtitle,
        default_action: defaultAction,
        buttons: element.buttons,
      });
    });

    const genericPayload =
      this.genericTemplateService.createCarouselGenericTemplatePayload(
        genericElements,
        imageAspectRatio
      );

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: AttachmentType.TEMPLATE,
          payload: genericPayload,
        },
      },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a complete generic template message with pre-built payload.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param genericPayload The complete generic template payload
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendGenericTemplateMessage(
    pageId: string,
    recipientId: string,
    genericPayload: GenericTemplatePayload,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: AttachmentType.TEMPLATE,
          payload: genericPayload,
        },
      },
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a product showcase carousel using generic template.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param products Array of product information
   * @param options Optional template configuration
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendProductCarouselMessage(
    pageId: string,
    recipientId: string,
    products: Array<{
      title: string;
      price: string;
      imageUrl: string;
      productUrl: string;
      subtitle?: string;
      buttons?: Button[];
    }>,
    options?: {
      image_aspect_ratio?: "horizontal" | "square";
      webview_height_ratio?: "compact" | "tall" | "full";
    },
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const productElements = products.map((product) =>
      this.genericTemplateService.createProductElement(
        product.title,
        product.price,
        product.imageUrl,
        product.productUrl,
        {
          subtitle: product.subtitle,
          buttons: product.buttons,
          webview_height_ratio: options?.webview_height_ratio,
        }
      )
    );

    const genericPayload =
      this.genericTemplateService.createCarouselGenericTemplatePayload(
        productElements,
        options?.image_aspect_ratio
      );

    return this.sendGenericTemplateMessage(
      pageId,
      recipientId,
      genericPayload,
      messagingType,
      pageAccessToken
    );
  }

  /**
   * Sends an article carousel using generic template.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param articles Array of article information
   * @param options Optional template configuration
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendArticleCarouselMessage(
    pageId: string,
    recipientId: string,
    articles: Array<{
      title: string;
      summary: string;
      imageUrl: string;
      articleUrl: string;
      buttons?: Button[];
    }>,
    options?: {
      image_aspect_ratio?: "horizontal" | "square";
      webview_height_ratio?: "compact" | "tall" | "full";
    },
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const articleElements = articles.map((article) =>
      this.genericTemplateService.createArticleElement(
        article.title,
        article.summary,
        article.imageUrl,
        article.articleUrl,
        {
          buttons: article.buttons,
          webview_height_ratio: options?.webview_height_ratio,
        }
      )
    );

    const genericPayload =
      this.genericTemplateService.createCarouselGenericTemplatePayload(
        articleElements,
        options?.image_aspect_ratio
      );

    return this.sendGenericTemplateMessage(
      pageId,
      recipientId,
      genericPayload,
      messagingType,
      pageAccessToken
    );
  }

  /**
   * Sends a location carousel using generic template.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param locations Array of location information
   * @param options Optional template configuration
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendLocationCarouselMessage(
    pageId: string,
    recipientId: string,
    locations: Array<{
      title: string;
      address: string;
      imageUrl: string;
      mapUrl: string;
      buttons?: Button[];
    }>,
    options?: {
      image_aspect_ratio?: "horizontal" | "square";
    },
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const locationElements = locations.map((location) =>
      this.genericTemplateService.createLocationElement(
        location.title,
        location.address,
        location.imageUrl,
        location.mapUrl,
        {
          buttons: location.buttons,
        }
      )
    );

    const genericPayload =
      this.genericTemplateService.createCarouselGenericTemplatePayload(
        locationElements,
        options?.image_aspect_ratio
      );

    return this.sendGenericTemplateMessage(
      pageId,
      recipientId,
      genericPayload,
      messagingType,
      pageAccessToken
    );
  }

  /**
   * Sends a message with quick replies.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param text The message text
   * @param quickReplies Array of quick reply objects
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendQuickReplyMessage(
    pageId: string,
    recipientId: string,
    text: string,
    quickReplies: QuickReply[],
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const quickReplyMessage = this.quickRepliesService.createQuickReplyMessage(
      text,
      quickReplies
    );

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: quickReplyMessage,
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a yes/no quick reply message.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param text The question text
   * @param yesPayload Optional payload for yes button
   * @param noPayload Optional payload for no button
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendYesNoQuickReplyMessage(
    pageId: string,
    recipientId: string,
    text: string,
    yesPayload?: string,
    noPayload?: string,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const quickReplyMessage =
      this.quickRepliesService.createYesNoQuickReplyMessage(
        text,
        yesPayload,
        noPayload
      );

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: quickReplyMessage,
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a contact information quick reply message.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param text The message text
   * @param includePhone Whether to include phone number quick reply
   * @param includeEmail Whether to include email quick reply
   * @param additionalOptions Optional additional text quick replies
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendContactQuickReplyMessage(
    pageId: string,
    recipientId: string,
    text: string,
    includePhone: boolean = true,
    includeEmail: boolean = true,
    additionalOptions?: Array<{
      title: string;
      payload?: string;
      imageUrl?: string;
    }>,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const quickReplyMessage =
      this.quickRepliesService.createContactQuickReplyMessage(
        text,
        includePhone,
        includeEmail,
        additionalOptions
      );

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: quickReplyMessage,
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a rating quick reply message (1-5 stars).
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param text The message text
   * @param useStarEmojis Whether to use star emojis in titles
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendRatingQuickReplyMessage(
    pageId: string,
    recipientId: string,
    text: string,
    useStarEmojis: boolean = true,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const quickReplyMessage =
      this.quickRepliesService.createRatingQuickReplyMessage(
        text,
        useStarEmojis
      );

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: quickReplyMessage,
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Sends a multiple choice quick reply message.
   * @param pageId The Facebook Page ID sending the message
   * @param recipientId The Page-scoped ID (PSID) of the recipient
   * @param text The question text
   * @param choices Array of choice options
   * @param messagingType The type of message (default: RESPONSE)
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendMultipleChoiceQuickReplyMessage(
    pageId: string,
    recipientId: string,
    text: string,
    choices: Array<{
      label: string;
      value: string;
      imageUrl?: string;
    }>,
    messagingType: MessagingType = MessagingType.RESPONSE,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const quickReplyMessage =
      this.quickRepliesService.createMultipleChoiceQuickReplyMessage(
        text,
        choices
      );

    const messageRequest: SendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: quickReplyMessage,
    };

    return this.sendMessage(pageId, messageRequest, pageAccessToken);
  }

  /**
   * Processes a quick reply response from a webhook event.
   * @param messageEvent The message event containing the quick reply response
   * @returns Object with response type and extracted data
   */
  processQuickReplyResponse(messageEvent: MessageWithQuickReplyEvent): {
    type: "text" | "phone" | "email";
    payload: string;
    phoneNumber?: string;
    email?: string;
    textPayload?: string;
  } {
    const quickReplyResponse = messageEvent.quick_reply;

    if (
      this.quickRepliesService.isPhoneNumberQuickReplyResponse(
        quickReplyResponse
      )
    ) {
      const phoneNumber =
        this.quickRepliesService.extractPhoneNumber(quickReplyResponse);
      return {
        type: "phone",
        payload: quickReplyResponse.payload,
        phoneNumber: phoneNumber || undefined,
      };
    }

    if (
      this.quickRepliesService.isEmailQuickReplyResponse(quickReplyResponse)
    ) {
      const email = this.quickRepliesService.extractEmail(quickReplyResponse);
      return {
        type: "email",
        payload: quickReplyResponse.payload,
        email: email || undefined,
      };
    }

    const textPayload =
      this.quickRepliesService.getTextQuickReplyPayload(quickReplyResponse);
    return {
      type: "text",
      payload: quickReplyResponse.payload,
      textPayload: textPayload || undefined,
    };
  }

  /**
   * Core method to send any type of message to Facebook Graph API.
   * @param pageId The Facebook Page ID sending the message
   * @param messageRequest The complete message request object
   * @param pageAccessToken Optional page access token
   * @returns Response with recipient ID and message ID
   */
  async sendMessage(
    pageId: string,
    messageRequest: SendMessageRequest,
    pageAccessToken?: string
  ): Promise<SendMessageResponse> {
    const accessToken = pageAccessToken || this.envService.getUserAccessToken();

    if (!pageId) {
      throw new Error("Page ID is required to send a message.");
    }
    if (!accessToken) {
      throw new Error("Access Token is required to send a message.");
    }
    if (!messageRequest.recipient?.id) {
      throw new Error("Recipient ID is required to send a message.");
    }

    const url = `${this.facebookApiUrl}/${pageId}/messages`;

    const params = new URLSearchParams({
      access_token: accessToken,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<SendMessageResponse>(url, messageRequest, {
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
        "Error sending message via Facebook Graph API:",
        error.response?.data || error.message
      );

      const errorData = error.response?.data?.error;
      const errorMessage =
        errorData?.message || error.message || "Unknown error";
      const errorCode = errorData?.code;
      const errorSubcode = errorData?.error_subcode;

      let detailedError = `Failed to send message: ${errorMessage}`;
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
   * Validates if a message can be sent within the standard messaging window.
   * Note: This is a helper method - actual validation should be done on your backend
   * based on the last interaction timestamp.
   * @param lastInteractionTime The timestamp of the last user interaction
   * @returns True if within 24-hour window, false otherwise
   */
  isWithinStandardMessagingWindow(lastInteractionTime: Date): boolean {
    const now = new Date();
    const timeDifference = now.getTime() - lastInteractionTime.getTime();
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

    return timeDifference <= twentyFourHoursInMs;
  }

  /**
   * Helper method to create a quick reply message structure.
   * @deprecated Use QuickRepliesService methods instead for better type safety and validation
   * @param text The message text
   * @param quickReplies Array of quick reply options
   * @returns Message content with quick replies
   */
  createQuickReplyMessage(
    text: string,
    quickReplies: Array<{
      content_type: string;
      title?: string;
      payload?: string;
    }>
  ): MessageContent {
    return {
      text,
      quick_replies: quickReplies,
    } as any; // Type assertion needed as quick_replies is not in our base types
  }
}
