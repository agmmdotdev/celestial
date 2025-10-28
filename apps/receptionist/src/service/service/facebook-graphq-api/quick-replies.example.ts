import { Injectable } from "@nestjs/common";
import {
  QuickRepliesService,
  QuickReplyContentType,
} from "./quick-replies.service";
import { MessagingService, MessagingType } from "./messaging.service";

/**
 * Example service demonstrating how to use the QuickRepliesService
 * with the MessagingService for Facebook Messenger Platform.
 */
@Injectable()
export class QuickRepliesExampleService {
  constructor(
    private readonly quickRepliesService: QuickRepliesService,
    private readonly messagingService: MessagingService
  ) {}

  /**
   * Example: Send a simple yes/no question
   */
  async sendYesNoQuestion(pageId: string, recipientId: string): Promise<void> {
    await this.messagingService.sendYesNoQuickReplyMessage(
      pageId,
      recipientId,
      "Would you like to receive updates about your order?",
      "SUBSCRIBE_UPDATES",
      "NO_UPDATES"
    );
  }

  /**
   * Example: Send a product category selection
   */
  async sendProductCategorySelection(
    pageId: string,
    recipientId: string
  ): Promise<void> {
    const choices = [
      {
        label: "Electronics",
        value: "CATEGORY_ELECTRONICS",
        imageUrl: "https://example.com/electronics.png",
      },
      {
        label: "Clothing",
        value: "CATEGORY_CLOTHING",
        imageUrl: "https://example.com/clothing.png",
      },
      {
        label: "Books",
        value: "CATEGORY_BOOKS",
        imageUrl: "https://example.com/books.png",
      },
      {
        label: "Home & Garden",
        value: "CATEGORY_HOME",
        imageUrl: "https://example.com/home.png",
      },
    ];

    await this.messagingService.sendMultipleChoiceQuickReplyMessage(
      pageId,
      recipientId,
      "Which category are you interested in?",
      choices
    );
  }

  /**
   * Example: Send a rating request
   */
  async sendRatingRequest(pageId: string, recipientId: string): Promise<void> {
    await this.messagingService.sendRatingQuickReplyMessage(
      pageId,
      recipientId,
      "How would you rate your shopping experience?",
      true // Use star emojis
    );
  }

  /**
   * Example: Send contact information request
   */
  async sendContactInfoRequest(
    pageId: string,
    recipientId: string
  ): Promise<void> {
    const additionalOptions = [
      { title: "Skip", payload: "SKIP_CONTACT" },
      { title: "Later", payload: "CONTACT_LATER" },
    ];

    await this.messagingService.sendContactQuickReplyMessage(
      pageId,
      recipientId,
      "Please share your contact information to complete your order:",
      true, // Include phone
      true, // Include email
      additionalOptions
    );
  }

  /**
   * Example: Send custom quick replies with images
   */
  async sendCustomQuickReplies(
    pageId: string,
    recipientId: string
  ): Promise<void> {
    const quickReplies = [
      this.quickRepliesService.createTextQuickReply(
        "🛒 Shop Now",
        "ACTION_SHOP",
        "https://example.com/shop-icon.png"
      ),
      this.quickRepliesService.createTextQuickReply(
        "📞 Support",
        "ACTION_SUPPORT",
        "https://example.com/support-icon.png"
      ),
      this.quickRepliesService.createTextQuickReply(
        "📦 Track Order",
        "ACTION_TRACK",
        "https://example.com/track-icon.png"
      ),
      this.quickRepliesService.createUserPhoneNumberQuickReply(),
    ];

    await this.messagingService.sendQuickReplyMessage(
      pageId,
      recipientId,
      "How can we help you today?",
      quickReplies
    );
  }

  /**
   * Example: Send size selection for clothing
   */
  async sendSizeSelection(
    pageId: string,
    recipientId: string,
    productId: string
  ): Promise<void> {
    const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
    const sizeOptions = sizes.map((size) => ({
      title: size,
      payload: `SIZE_${size}_PRODUCT_${productId}`,
    }));

    const quickReplies =
      this.quickRepliesService.createTextQuickReplies(sizeOptions);

    await this.messagingService.sendQuickReplyMessage(
      pageId,
      recipientId,
      "Please select your size:",
      quickReplies
    );
  }

  /**
   * Example: Send color selection with images
   */
  async sendColorSelection(
    pageId: string,
    recipientId: string,
    productId: string
  ): Promise<void> {
    const colors = [
      { name: "Red", code: "red", image: "https://example.com/colors/red.png" },
      {
        name: "Blue",
        code: "blue",
        image: "https://example.com/colors/blue.png",
      },
      {
        name: "Green",
        code: "green",
        image: "https://example.com/colors/green.png",
      },
      {
        name: "Black",
        code: "black",
        image: "https://example.com/colors/black.png",
      },
    ];

    const colorOptions = colors.map((color) => ({
      title: color.name,
      payload: `COLOR_${color.code.toUpperCase()}_PRODUCT_${productId}`,
      imageUrl: color.image,
    }));

    const quickReplies =
      this.quickRepliesService.createTextQuickReplies(colorOptions);

    await this.messagingService.sendQuickReplyMessage(
      pageId,
      recipientId,
      "Choose your preferred color:",
      quickReplies
    );
  }

  /**
   * Example: Send shipping options
   */
  async sendShippingOptions(
    pageId: string,
    recipientId: string,
    orderId: string
  ): Promise<void> {
    const shippingOptions = [
      { title: "Standard (5-7 days)", payload: `SHIPPING_STANDARD_${orderId}` },
      { title: "Express (2-3 days)", payload: `SHIPPING_EXPRESS_${orderId}` },
      { title: "Overnight", payload: `SHIPPING_OVERNIGHT_${orderId}` },
    ];

    const quickReplies =
      this.quickRepliesService.createTextQuickReplies(shippingOptions);

    await this.messagingService.sendQuickReplyMessage(
      pageId,
      recipientId,
      "Select your preferred shipping method:",
      quickReplies
    );
  }

  /**
   * Example: Send payment method selection
   */
  async sendPaymentMethodSelection(
    pageId: string,
    recipientId: string
  ): Promise<void> {
    const paymentMethods = [
      { title: "💳 Credit Card", payload: "PAYMENT_CREDIT_CARD" },
      { title: "🏦 Bank Transfer", payload: "PAYMENT_BANK_TRANSFER" },
      { title: "📱 Digital Wallet", payload: "PAYMENT_DIGITAL_WALLET" },
      { title: "💰 Cash on Delivery", payload: "PAYMENT_COD" },
    ];

    const quickReplies =
      this.quickRepliesService.createTextQuickReplies(paymentMethods);

    await this.messagingService.sendQuickReplyMessage(
      pageId,
      recipientId,
      "How would you like to pay?",
      quickReplies
    );
  }

  /**
   * Example: Handle quick reply responses from webhook
   */
  async handleQuickReplyResponse(
    pageId: string,
    recipientId: string,
    messageEvent: any
  ): Promise<void> {
    // Check if the message contains a quick reply
    if (!messageEvent.quick_reply) {
      return;
    }

    const response =
      this.messagingService.processQuickReplyResponse(messageEvent);

    switch (response.type) {
      case "phone":
        await this.handlePhoneNumberResponse(
          pageId,
          recipientId,
          response.phoneNumber!
        );
        break;

      case "email":
        await this.handleEmailResponse(pageId, recipientId, response.email!);
        break;

      case "text":
        await this.handleTextQuickReplyResponse(
          pageId,
          recipientId,
          response.textPayload!
        );
        break;
    }
  }

  /**
   * Handle phone number quick reply response
   */
  private async handlePhoneNumberResponse(
    pageId: string,
    recipientId: string,
    phoneNumber: string
  ): Promise<void> {
    // Save phone number to database
    console.log(
      `Received phone number: ${phoneNumber} for user: ${recipientId}`
    );

    // Send confirmation
    await this.messagingService.sendTextMessage(
      pageId,
      recipientId,
      `Thank you! We've saved your phone number: ${phoneNumber}`
    );

    // Continue with next step
    await this.sendYesNoQuestion(pageId, recipientId);
  }

  /**
   * Handle email quick reply response
   */
  private async handleEmailResponse(
    pageId: string,
    recipientId: string,
    email: string
  ): Promise<void> {
    // Save email to database
    console.log(`Received email: ${email} for user: ${recipientId}`);

    // Send confirmation
    await this.messagingService.sendTextMessage(
      pageId,
      recipientId,
      `Thank you! We've saved your email: ${email}`
    );

    // Continue with next step
    await this.sendContactInfoRequest(pageId, recipientId);
  }

  /**
   * Handle text quick reply response
   */
  private async handleTextQuickReplyResponse(
    pageId: string,
    recipientId: string,
    payload: string
  ): Promise<void> {
    console.log(
      `Received quick reply payload: ${payload} from user: ${recipientId}`
    );

    // Handle different payload types
    if (payload.startsWith("CATEGORY_")) {
      await this.handleCategorySelection(pageId, recipientId, payload);
    } else if (payload.startsWith("SIZE_")) {
      await this.handleSizeSelection(pageId, recipientId, payload);
    } else if (payload.startsWith("COLOR_")) {
      await this.handleColorSelection(pageId, recipientId, payload);
    } else if (payload.startsWith("RATING_")) {
      await this.handleRatingResponse(pageId, recipientId, payload);
    } else if (payload.startsWith("SHIPPING_")) {
      await this.handleShippingSelection(pageId, recipientId, payload);
    } else if (payload.startsWith("PAYMENT_")) {
      await this.handlePaymentMethodSelection(pageId, recipientId, payload);
    } else {
      await this.handleGenericResponse(pageId, recipientId, payload);
    }
  }

  /**
   * Handle category selection
   */
  private async handleCategorySelection(
    pageId: string,
    recipientId: string,
    payload: string
  ): Promise<void> {
    const category = payload.replace("CATEGORY_", "");

    await this.messagingService.sendTextMessage(
      pageId,
      recipientId,
      `Great choice! You selected ${category}. Let me show you our best products in this category.`
    );

    // Continue with product selection or other actions
  }

  /**
   * Handle size selection
   */
  private async handleSizeSelection(
    pageId: string,
    recipientId: string,
    payload: string
  ): Promise<void> {
    const parts = payload.split("_");
    const size = parts[1];
    const productId = parts[3];

    await this.messagingService.sendTextMessage(
      pageId,
      recipientId,
      `Perfect! Size ${size} selected for product ${productId}.`
    );

    // Continue with color selection
    await this.sendColorSelection(pageId, recipientId, productId);
  }

  /**
   * Handle color selection
   */
  private async handleColorSelection(
    pageId: string,
    recipientId: string,
    payload: string
  ): Promise<void> {
    const parts = payload.split("_");
    const color = parts[1];
    const productId = parts[3];

    await this.messagingService.sendTextMessage(
      pageId,
      recipientId,
      `Excellent choice! ${color} color selected for product ${productId}.`
    );

    // Continue with add to cart or checkout
  }

  /**
   * Handle rating response
   */
  private async handleRatingResponse(
    pageId: string,
    recipientId: string,
    payload: string
  ): Promise<void> {
    const rating = payload.replace("RATING_", "");

    await this.messagingService.sendTextMessage(
      pageId,
      recipientId,
      `Thank you for your ${rating}-star rating! Your feedback helps us improve.`
    );

    // Save rating to database and potentially ask for additional feedback
  }

  /**
   * Handle shipping selection
   */
  private async handleShippingSelection(
    pageId: string,
    recipientId: string,
    payload: string
  ): Promise<void> {
    const parts = payload.split("_");
    const shippingType = parts[1];
    const orderId = parts[2];

    await this.messagingService.sendTextMessage(
      pageId,
      recipientId,
      `${shippingType} shipping selected for order ${orderId}.`
    );

    // Continue with payment method selection
    await this.sendPaymentMethodSelection(pageId, recipientId);
  }

  /**
   * Handle payment method selection
   */
  private async handlePaymentMethodSelection(
    pageId: string,
    recipientId: string,
    payload: string
  ): Promise<void> {
    const paymentMethod = payload.replace("PAYMENT_", "");

    await this.messagingService.sendTextMessage(
      pageId,
      recipientId,
      `Payment method ${paymentMethod} selected. Proceeding to checkout...`
    );

    // Continue with checkout process
  }

  /**
   * Handle generic responses
   */
  private async handleGenericResponse(
    pageId: string,
    recipientId: string,
    payload: string
  ): Promise<void> {
    switch (payload) {
      case "YES":
        await this.messagingService.sendTextMessage(
          pageId,
          recipientId,
          "Great! We'll keep you updated."
        );
        break;

      case "NO":
        await this.messagingService.sendTextMessage(
          pageId,
          recipientId,
          "No problem! You can change this setting anytime."
        );
        break;

      case "ACTION_SHOP":
        await this.sendProductCategorySelection(pageId, recipientId);
        break;

      case "ACTION_SUPPORT":
        await this.messagingService.sendContactQuickReplyMessage(
          pageId,
          recipientId,
          "Our support team will contact you. Please share your preferred contact method:"
        );
        break;

      case "ACTION_TRACK":
        await this.messagingService.sendTextMessage(
          pageId,
          recipientId,
          "Please provide your order number to track your shipment."
        );
        break;

      case "SKIP_CONTACT":
        await this.messagingService.sendTextMessage(
          pageId,
          recipientId,
          "No problem! You can provide your contact information later."
        );
        break;

      case "CONTACT_LATER":
        await this.messagingService.sendTextMessage(
          pageId,
          recipientId,
          "Sure! We'll ask for your contact information at checkout."
        );
        break;

      default:
        await this.messagingService.sendTextMessage(
          pageId,
          recipientId,
          "Thank you for your response!"
        );
        break;
    }
  }
}
