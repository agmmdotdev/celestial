import { Injectable } from "@nestjs/common";
import { AttachmentType } from "./messaging.service";

export interface ReceiptAddress {
  street_1: string;
  street_2?: string;
  city: string;
  postal_code: string;
  state: string;
  country: string;
}

export interface ReceiptSummary {
  subtotal?: number;
  shipping_cost?: number;
  total_tax?: number;
  total_cost: number;
}

export interface ReceiptAdjustment {
  name: string;
  amount: number;
}

export interface ReceiptElement {
  title: string;
  subtitle?: string;
  quantity?: number;
  price: number;
  currency?: string;
  image_url?: string;
}

export interface ReceiptTemplatePayload {
  template_type: "receipt";
  sharable?: boolean;
  recipient_name: string;
  merchant_name?: string;
  order_number: string;
  currency: string;
  payment_method: string;
  timestamp?: string;
  elements?: ReceiptElement[];
  address?: ReceiptAddress;
  summary: ReceiptSummary;
  adjustments?: ReceiptAdjustment[];
}

export interface ReceiptTemplateAttachment {
  type: AttachmentType.TEMPLATE;
  payload: ReceiptTemplatePayload;
}

export interface MessageWithReceiptTemplate {
  attachment: ReceiptTemplateAttachment;
}

@Injectable()
export class ReceiptTemplateService {
  /**
   * Creates a receipt address object.
   * @param street1 The street address, line 1
   * @param city The city name
   * @param postalCode The postal code
   * @param state The state abbreviation (US) or region/province (non-US)
   * @param country The two-letter country abbreviation
   * @param street2 Optional street address, line 2
   * @returns ReceiptAddress object
   */
  createAddress(
    street1: string,
    city: string,
    postalCode: string,
    state: string,
    country: string,
    street2?: string
  ): ReceiptAddress {
    if (!street1 || !city || !postalCode || !state || !country) {
      throw new Error(
        "Street 1, city, postal code, state, and country are required for address."
      );
    }
    if (country.length !== 2) {
      throw new Error("Country must be a two-letter abbreviation.");
    }

    return {
      street_1: street1,
      street_2: street2,
      city,
      postal_code: postalCode,
      state,
      country: country.toUpperCase(),
    };
  }

  /**
   * Creates a receipt summary object.
   * @param totalCost The total cost of the order (required)
   * @param subtotal Optional subtotal
   * @param shippingCost Optional shipping cost
   * @param totalTax Optional tax amount
   * @returns ReceiptSummary object
   */
  createSummary(
    totalCost: number,
    subtotal?: number,
    shippingCost?: number,
    totalTax?: number
  ): ReceiptSummary {
    if (totalCost < 0) {
      throw new Error("Total cost cannot be negative.");
    }
    if (subtotal !== undefined && subtotal < 0) {
      throw new Error("Subtotal cannot be negative.");
    }
    if (shippingCost !== undefined && shippingCost < 0) {
      throw new Error("Shipping cost cannot be negative.");
    }
    if (totalTax !== undefined && totalTax < 0) {
      throw new Error("Total tax cannot be negative.");
    }

    return {
      total_cost: totalCost,
      subtotal,
      shipping_cost: shippingCost,
      total_tax: totalTax,
    };
  }

  /**
   * Creates a receipt adjustment object (discount, coupon, etc.).
   * @param name The name of the adjustment
   * @param amount The amount of the adjustment
   * @returns ReceiptAdjustment object
   */
  createAdjustment(name: string, amount: number): ReceiptAdjustment {
    if (!name || name.trim().length === 0) {
      throw new Error("Adjustment name is required.");
    }
    if (amount === 0) {
      throw new Error("Adjustment amount cannot be zero.");
    }

    return {
      name: name.trim(),
      amount,
    };
  }

  /**
   * Creates a receipt element (item in the order).
   * @param title The name of the item
   * @param price The price of the item
   * @param options Optional properties like subtitle, quantity, currency, image_url
   * @returns ReceiptElement object
   */
  createElement(
    title: string,
    price: number,
    options?: {
      subtitle?: string;
      quantity?: number;
      currency?: string;
      image_url?: string;
    }
  ): ReceiptElement {
    if (!title || title.trim().length === 0) {
      throw new Error("Element title is required.");
    }
    if (price < 0) {
      throw new Error("Element price cannot be negative.");
    }
    if (options?.quantity !== undefined && options.quantity <= 0) {
      throw new Error("Element quantity must be greater than 0.");
    }

    return {
      title: title.trim(),
      price,
      subtitle: options?.subtitle?.trim(),
      quantity: options?.quantity,
      currency: options?.currency?.toUpperCase(),
      image_url: options?.image_url,
    };
  }

  /**
   * Creates a complete receipt template payload.
   * @param recipientName The recipient's name
   * @param orderNumber The order number (must be unique)
   * @param currency The currency of the payment
   * @param paymentMethod The payment method used
   * @param summary The payment summary
   * @param options Optional properties like merchant_name, timestamp, elements, address, adjustments, sharable
   * @returns ReceiptTemplatePayload object
   */
  createReceiptTemplatePayload(
    recipientName: string,
    orderNumber: string,
    currency: string,
    paymentMethod: string,
    summary: ReceiptSummary,
    options?: {
      merchantName?: string;
      timestamp?: string;
      elements?: ReceiptElement[];
      address?: ReceiptAddress;
      adjustments?: ReceiptAdjustment[];
      sharable?: boolean;
    }
  ): ReceiptTemplatePayload {
    if (!recipientName || recipientName.trim().length === 0) {
      throw new Error("Recipient name is required.");
    }
    if (!orderNumber || orderNumber.trim().length === 0) {
      throw new Error("Order number is required.");
    }
    if (!currency || currency.trim().length === 0) {
      throw new Error("Currency is required.");
    }
    if (!paymentMethod || paymentMethod.trim().length === 0) {
      throw new Error("Payment method is required.");
    }
    if (!summary) {
      throw new Error("Summary is required.");
    }
    if (options?.elements && options.elements.length > 100) {
      throw new Error("Maximum of 100 elements allowed per receipt.");
    }

    const payload: ReceiptTemplatePayload = {
      template_type: "receipt",
      recipient_name: recipientName.trim(),
      order_number: orderNumber.trim(),
      currency: currency.toUpperCase(),
      payment_method: paymentMethod.trim(),
      summary,
    };

    if (options?.merchantName) {
      payload.merchant_name = options.merchantName.trim();
    }
    if (options?.timestamp) {
      payload.timestamp = options.timestamp;
    }
    if (options?.elements && options.elements.length > 0) {
      payload.elements = options.elements;
    }
    if (options?.address) {
      payload.address = options.address;
    }
    if (options?.adjustments && options.adjustments.length > 0) {
      payload.adjustments = options.adjustments;
    }
    if (options?.sharable !== undefined) {
      payload.sharable = options.sharable;
    }

    return payload;
  }

  /**
   * Creates a receipt template attachment.
   * @param payload The receipt template payload
   * @returns ReceiptTemplateAttachment object
   */
  createReceiptTemplateAttachment(
    payload: ReceiptTemplatePayload
  ): ReceiptTemplateAttachment {
    return {
      type: AttachmentType.TEMPLATE,
      payload,
    };
  }

  /**
   * Helper method to create a timestamp string from a Date object.
   * @param date The date to convert
   * @returns Timestamp string in seconds since epoch
   */
  createTimestamp(date: Date = new Date()): string {
    return Math.floor(date.getTime() / 1000).toString();
  }

  /**
   * Helper method to validate currency format (3-letter ISO code).
   * @param currency The currency code to validate
   * @returns True if valid, false otherwise
   */
  isValidCurrency(currency: string): boolean {
    const currencyRegex = /^[A-Z]{3}$/;
    return currencyRegex.test(currency);
  }

  /**
   * Helper method to format price with proper decimal places for currency.
   * @param amount The amount to format
   * @param decimalPlaces Number of decimal places (default: 2)
   * @returns Formatted number
   */
  formatPrice(amount: number, decimalPlaces: number = 2): number {
    return (
      Math.round(amount * Math.pow(10, decimalPlaces)) /
      Math.pow(10, decimalPlaces)
    );
  }
}
