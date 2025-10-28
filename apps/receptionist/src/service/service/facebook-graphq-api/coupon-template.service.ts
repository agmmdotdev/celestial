import { Injectable } from "@nestjs/common";
import { AttachmentType } from "./messaging.service";

export interface CouponTemplatePayload {
  template_type: "coupon";
  title: string;
  subtitle?: string;
  coupon_code?: string;
  coupon_pre_message?: string;
  coupon_url?: string;
  coupon_url_button_title?: string;
  image_url?: string;
  payload?: string;
}

export interface CouponTemplateAttachment {
  type: AttachmentType.TEMPLATE;
  payload: CouponTemplatePayload;
}

export interface MessageWithCouponTemplate {
  attachment: CouponTemplateAttachment;
}

@Injectable()
export class CouponTemplateService {
  /**
   * Creates a basic coupon template payload with just title and coupon code.
   * @param title The title to display in the message (80 character limit)
   * @param couponCode The coupon code to send to a person (cannot have spaces)
   * @returns CouponTemplatePayload object
   */
  createBasicCouponTemplatePayload(
    title: string,
    couponCode: string
  ): CouponTemplatePayload {
    this.validateTitle(title);
    this.validateCouponCode(couponCode);

    return {
      template_type: "coupon",
      title: title.trim(),
      coupon_code: couponCode.trim(),
    };
  }

  /**
   * Creates a coupon template payload with URL instead of code.
   * @param title The title to display in the message (80 character limit)
   * @param couponUrl The coupon URL that allows a person to use the coupon
   * @param couponUrlButtonTitle Optional text for the button (defaults to "Shop now")
   * @returns CouponTemplatePayload object
   */
  createUrlCouponTemplatePayload(
    title: string,
    couponUrl: string,
    couponUrlButtonTitle?: string
  ): CouponTemplatePayload {
    this.validateTitle(title);
    this.validateUrl(couponUrl);

    return {
      template_type: "coupon",
      title: title.trim(),
      coupon_url: couponUrl,
      coupon_url_button_title: couponUrlButtonTitle?.trim(),
    };
  }

  /**
   * Creates a complete coupon template payload with all optional properties.
   * @param title The title to display in the message (80 character limit)
   * @param options Object containing all optional coupon properties
   * @returns CouponTemplatePayload object
   */
  createCompleteCouponTemplatePayload(
    title: string,
    options: {
      subtitle?: string;
      couponCode?: string;
      couponPreMessage?: string;
      couponUrl?: string;
      couponUrlButtonTitle?: string;
      imageUrl?: string;
      payload?: string;
    }
  ): CouponTemplatePayload {
    this.validateTitle(title);

    // Either coupon_code or coupon_url must be provided
    if (!options.couponCode && !options.couponUrl) {
      throw new Error("Either coupon code or coupon URL must be provided.");
    }

    if (options.couponCode && options.couponUrl) {
      throw new Error("Cannot provide both coupon code and coupon URL.");
    }

    if (options.couponCode) {
      this.validateCouponCode(options.couponCode);
    }

    if (options.couponUrl) {
      this.validateUrl(options.couponUrl);
    }

    if (options.subtitle) {
      this.validateSubtitle(options.subtitle);
    }

    if (options.imageUrl) {
      this.validateUrl(options.imageUrl);
    }

    const payload: CouponTemplatePayload = {
      template_type: "coupon",
      title: title.trim(),
    };

    if (options.subtitle) {
      payload.subtitle = options.subtitle.trim();
    }

    if (options.couponCode) {
      payload.coupon_code = options.couponCode.trim();
    }

    if (options.couponPreMessage) {
      payload.coupon_pre_message = options.couponPreMessage.trim();
    }

    if (options.couponUrl) {
      payload.coupon_url = options.couponUrl;
    }

    if (options.couponUrlButtonTitle) {
      payload.coupon_url_button_title = options.couponUrlButtonTitle.trim();
    }

    if (options.imageUrl) {
      payload.image_url = options.imageUrl;
    }

    if (options.payload) {
      payload.payload = options.payload.trim();
    }

    return payload;
  }

  /**
   * Creates a coupon template attachment object.
   * @param payload The coupon template payload
   * @returns CouponTemplateAttachment object
   */
  createCouponTemplateAttachment(
    payload: CouponTemplatePayload
  ): CouponTemplateAttachment {
    return {
      type: AttachmentType.TEMPLATE,
      payload,
    };
  }

  /**
   * Validates the title field.
   * @param title The title to validate
   * @throws Error if title is invalid
   */
  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error("Title is required for coupon template.");
    }
    if (title.length > 80) {
      throw new Error("Title must be 80 characters or less.");
    }
  }

  /**
   * Validates the subtitle field.
   * @param subtitle The subtitle to validate
   * @throws Error if subtitle is invalid
   */
  private validateSubtitle(subtitle: string): void {
    if (subtitle.length > 80) {
      throw new Error("Subtitle must be 80 characters or less.");
    }
  }

  /**
   * Validates the coupon code field.
   * @param couponCode The coupon code to validate
   * @throws Error if coupon code is invalid
   */
  private validateCouponCode(couponCode: string): void {
    if (!couponCode || couponCode.trim().length === 0) {
      throw new Error("Coupon code is required when not using coupon URL.");
    }
    if (couponCode.includes(" ")) {
      throw new Error("Coupon code cannot contain spaces.");
    }
  }

  /**
   * Validates URL fields.
   * @param url The URL to validate
   * @throws Error if URL is invalid
   */
  private validateUrl(url: string): void {
    if (!url || url.trim().length === 0) {
      throw new Error("URL cannot be empty.");
    }
    try {
      new URL(url);
    } catch {
      throw new Error("Invalid URL format.");
    }
  }

  /**
   * Helper method to create a coupon with discount percentage.
   * @param discountPercentage The discount percentage (e.g., 10 for 10%)
   * @param description Optional description of what the discount applies to
   * @param couponCode The coupon code
   * @param options Additional options
   * @returns CouponTemplatePayload object
   */
  createPercentageDiscountCoupon(
    discountPercentage: number,
    couponCode: string,
    description: string = "everything",
    options?: {
      subtitle?: string;
      couponPreMessage?: string;
      imageUrl?: string;
      payload?: string;
    }
  ): CouponTemplatePayload {
    if (discountPercentage <= 0 || discountPercentage > 100) {
      throw new Error("Discount percentage must be between 1 and 100.");
    }

    const title = `${discountPercentage}% off ${description}`;

    return this.createCompleteCouponTemplatePayload(title, {
      couponCode,
      ...options,
    });
  }

  /**
   * Helper method to create a coupon with fixed amount discount.
   * @param discountAmount The discount amount
   * @param currency The currency symbol (e.g., "$", "€")
   * @param couponCode The coupon code
   * @param description Optional description of what the discount applies to
   * @param options Additional options
   * @returns CouponTemplatePayload object
   */
  createFixedAmountDiscountCoupon(
    discountAmount: number,
    currency: string,
    couponCode: string,
    description: string = "your order",
    options?: {
      subtitle?: string;
      couponPreMessage?: string;
      imageUrl?: string;
      payload?: string;
    }
  ): CouponTemplatePayload {
    if (discountAmount <= 0) {
      throw new Error("Discount amount must be greater than 0.");
    }

    const title = `${currency}${discountAmount} off ${description}`;

    return this.createCompleteCouponTemplatePayload(title, {
      couponCode,
      ...options,
    });
  }

  /**
   * Helper method to create a free shipping coupon.
   * @param couponCode The coupon code
   * @param options Additional options
   * @returns CouponTemplatePayload object
   */
  createFreeShippingCoupon(
    couponCode: string,
    options?: {
      subtitle?: string;
      couponPreMessage?: string;
      imageUrl?: string;
      payload?: string;
    }
  ): CouponTemplatePayload {
    const title = "Free shipping";

    return this.createCompleteCouponTemplatePayload(title, {
      couponCode,
      ...options,
    });
  }
}
