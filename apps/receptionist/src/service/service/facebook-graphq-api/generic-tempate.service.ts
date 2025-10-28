import { Injectable } from "@nestjs/common";
import { AttachmentType } from "./messaging.service";
import { Button } from "./button-template.service";

export interface DefaultAction {
  type: "web_url";
  url: string;
  messenger_extensions?: boolean;
  webview_height_ratio?: "compact" | "tall" | "full";
}

export interface GenericTemplateElement {
  title: string;
  image_url?: string;
  subtitle?: string;
  default_action?: DefaultAction;
  buttons?: Button[];
}

export interface GenericTemplatePayload {
  template_type: "generic";
  elements: GenericTemplateElement[];
  image_aspect_ratio?: "horizontal" | "square";
}

export interface GenericTemplateAttachment {
  type: AttachmentType.TEMPLATE;
  payload: GenericTemplatePayload;
}

export interface MessageWithGenericTemplate {
  attachment: GenericTemplateAttachment;
}

@Injectable()
export class GenericTemplateService {
  /**
   * Creates a default action object for generic template elements.
   * @param url The URL to open when the template is tapped
   * @param options Optional configuration for the default action
   * @returns DefaultAction object
   */
  createDefaultAction(
    url: string,
    options?: {
      messenger_extensions?: boolean;
      webview_height_ratio?: "compact" | "tall" | "full";
    }
  ): DefaultAction {
    this.validateUrl(url);

    return {
      type: "web_url",
      url,
      ...options,
    };
  }

  /**
   * Creates a generic template element.
   * @param title The title of the element (80 character limit)
   * @param options Optional properties for the element
   * @returns GenericTemplateElement object
   */
  createElement(
    title: string,
    options?: {
      image_url?: string;
      subtitle?: string;
      default_action?: DefaultAction;
      buttons?: Button[];
    }
  ): GenericTemplateElement {
    this.validateTitle(title);

    if (options?.subtitle) {
      this.validateSubtitle(options.subtitle);
    }

    if (options?.image_url) {
      this.validateUrl(options.image_url);
    }

    if (options?.buttons && options.buttons.length > 3) {
      throw new Error(
        "Maximum of 3 buttons allowed per generic template element."
      );
    }

    const element: GenericTemplateElement = {
      title: title.trim(),
    };

    if (options?.image_url) {
      element.image_url = options.image_url;
    }

    if (options?.subtitle) {
      element.subtitle = options.subtitle.trim();
    }

    if (options?.default_action) {
      element.default_action = options.default_action;
    }

    if (options?.buttons && options.buttons.length > 0) {
      element.buttons = options.buttons;
    }

    return element;
  }

  /**
   * Creates a basic generic template payload with a single element.
   * @param title The title of the element
   * @param options Optional properties for the element and template
   * @returns GenericTemplatePayload object
   */
  createBasicGenericTemplatePayload(
    title: string,
    options?: {
      image_url?: string;
      subtitle?: string;
      default_action?: DefaultAction;
      buttons?: Button[];
      image_aspect_ratio?: "horizontal" | "square";
    }
  ): GenericTemplatePayload {
    const element = this.createElement(title, options);

    return {
      template_type: "generic",
      elements: [element],
      image_aspect_ratio: options?.image_aspect_ratio,
    };
  }

  /**
   * Creates a carousel generic template payload with multiple elements.
   * @param elements Array of generic template elements (max 10)
   * @param imageAspectRatio Optional aspect ratio for images
   * @returns GenericTemplatePayload object
   */
  createCarouselGenericTemplatePayload(
    elements: GenericTemplateElement[],
    imageAspectRatio?: "horizontal" | "square"
  ): GenericTemplatePayload {
    if (!elements || elements.length === 0) {
      throw new Error("At least one element is required for generic template.");
    }

    if (elements.length > 10) {
      throw new Error(
        "Maximum of 10 elements allowed in generic template carousel."
      );
    }

    return {
      template_type: "generic",
      elements,
      image_aspect_ratio: imageAspectRatio,
    };
  }

  /**
   * Creates a complete generic template payload with all options.
   * @param elements Array of generic template elements
   * @param options Optional template configuration
   * @returns GenericTemplatePayload object
   */
  createCompleteGenericTemplatePayload(
    elements: GenericTemplateElement[],
    options?: {
      image_aspect_ratio?: "horizontal" | "square";
    }
  ): GenericTemplatePayload {
    return this.createCarouselGenericTemplatePayload(
      elements,
      options?.image_aspect_ratio
    );
  }

  /**
   * Creates a generic template attachment object.
   * @param payload The generic template payload
   * @returns GenericTemplateAttachment object
   */
  createGenericTemplateAttachment(
    payload: GenericTemplatePayload
  ): GenericTemplateAttachment {
    return {
      type: AttachmentType.TEMPLATE,
      payload,
    };
  }

  /**
   * Helper method to create a product showcase element.
   * @param title Product name
   * @param price Product price
   * @param imageUrl Product image URL
   * @param productUrl Product page URL
   * @param options Additional options
   * @returns GenericTemplateElement object
   */
  createProductElement(
    title: string,
    price: string,
    imageUrl: string,
    productUrl: string,
    options?: {
      subtitle?: string;
      buttons?: Button[];
      webview_height_ratio?: "compact" | "tall" | "full";
    }
  ): GenericTemplateElement {
    const subtitle = options?.subtitle
      ? `${price} - ${options.subtitle}`
      : price;

    const defaultAction = this.createDefaultAction(productUrl, {
      webview_height_ratio: options?.webview_height_ratio || "tall",
    });

    return this.createElement(title, {
      image_url: imageUrl,
      subtitle,
      default_action: defaultAction,
      buttons: options?.buttons,
    });
  }

  /**
   * Helper method to create an article element.
   * @param title Article title
   * @param summary Article summary
   * @param imageUrl Article image URL
   * @param articleUrl Article URL
   * @param options Additional options
   * @returns GenericTemplateElement object
   */
  createArticleElement(
    title: string,
    summary: string,
    imageUrl: string,
    articleUrl: string,
    options?: {
      buttons?: Button[];
      webview_height_ratio?: "compact" | "tall" | "full";
    }
  ): GenericTemplateElement {
    const defaultAction = this.createDefaultAction(articleUrl, {
      webview_height_ratio: options?.webview_height_ratio || "full",
    });

    return this.createElement(title, {
      image_url: imageUrl,
      subtitle: summary,
      default_action: defaultAction,
      buttons: options?.buttons,
    });
  }

  /**
   * Helper method to create a location element.
   * @param title Location name
   * @param address Location address
   * @param imageUrl Location image URL
   * @param mapUrl Map URL or directions URL
   * @param options Additional options
   * @returns GenericTemplateElement object
   */
  createLocationElement(
    title: string,
    address: string,
    imageUrl: string,
    mapUrl: string,
    options?: {
      buttons?: Button[];
    }
  ): GenericTemplateElement {
    const defaultAction = this.createDefaultAction(mapUrl);

    return this.createElement(title, {
      image_url: imageUrl,
      subtitle: address,
      default_action: defaultAction,
      buttons: options?.buttons,
    });
  }

  // Validation methods
  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error("Title is required for generic template element.");
    }
    if (title.length > 80) {
      throw new Error("Title must be 80 characters or less.");
    }
  }

  private validateSubtitle(subtitle: string): void {
    if (subtitle.length > 80) {
      throw new Error("Subtitle must be 80 characters or less.");
    }
  }

  private validateUrl(url: string): void {
    if (!url || url.trim().length === 0) {
      throw new Error("URL is required.");
    }

    try {
      new URL(url);
    } catch {
      throw new Error("Invalid URL format.");
    }
  }
}
