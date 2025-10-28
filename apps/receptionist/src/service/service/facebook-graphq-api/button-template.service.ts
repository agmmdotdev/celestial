import { Injectable } from "@nestjs/common";
import { AttachmentType } from "./messaging.service";

export enum ButtonType {
  WEB_URL = "web_url",
  POSTBACK = "postback",
  PHONE_NUMBER = "phone_number",
  ACCOUNT_LINK = "account_link",
  ACCOUNT_UNLINK = "account_unlink",
  GAME_PLAY = "game_play",
}

export interface WebUrlButton {
  type: ButtonType.WEB_URL;
  title: string;
  url: string;
  webview_height_ratio?: "compact" | "tall" | "full";
  messenger_extensions?: boolean;
  fallback_url?: string;
  webview_share_button?: "hide";
}

export interface PostbackButton {
  type: ButtonType.POSTBACK;
  title: string;
  payload: string;
}

export interface PhoneNumberButton {
  type: ButtonType.PHONE_NUMBER;
  title: string;
  payload: string; // Phone number in format +1234567890
}

export interface AccountLinkButton {
  type: ButtonType.ACCOUNT_LINK;
  url: string;
}

export interface AccountUnlinkButton {
  type: ButtonType.ACCOUNT_UNLINK;
}

export interface GamePlayButton {
  type: ButtonType.GAME_PLAY;
  title: string;
  payload?: string;
  game_metadata?: {
    player_id?: string;
    context_id?: string;
  };
}

export type Button =
  | WebUrlButton
  | PostbackButton
  | PhoneNumberButton
  | AccountLinkButton
  | AccountUnlinkButton
  | GamePlayButton;

export interface ButtonTemplatePayload {
  template_type: "button";
  text: string;
  buttons: Button[];
}

export interface TemplateAttachment {
  type: AttachmentType.TEMPLATE;
  payload: ButtonTemplatePayload;
}

export interface MessageWithTemplate {
  attachment: TemplateAttachment;
}

@Injectable()
export class ButtonTemplateService {
  createWebUrlButton(
    title: string,
    url: string,
    options?: {
      webview_height_ratio?: "compact" | "tall" | "full";
      messenger_extensions?: boolean;
      fallback_url?: string;
      webview_share_button?: "hide";
    }
  ): WebUrlButton {
    if (title.length > 20) {
      throw new Error("Button title must be 20 characters or less.");
    }
    return {
      type: ButtonType.WEB_URL,
      title,
      url,
      ...options,
    };
  }

  createPostbackButton(title: string, payload: string): PostbackButton {
    if (title.length > 20) {
      throw new Error("Button title must be 20 characters or less.");
    }
    if (payload.length > 1000) {
      throw new Error("Button payload must be 1000 characters or less.");
    }
    return {
      type: ButtonType.POSTBACK,
      title,
      payload,
    };
  }

  createPhoneNumberButton(
    title: string,
    phoneNumber: string
  ): PhoneNumberButton {
    if (title.length > 20) {
      throw new Error("Button title must be 20 characters or less.");
    }
    if (!phoneNumber.startsWith("+")) {
      throw new Error(
        "Phone number must start with + and include country code."
      );
    }
    return {
      type: ButtonType.PHONE_NUMBER,
      title,
      payload: phoneNumber,
    };
  }

  createAccountLinkButton(url: string): AccountLinkButton {
    return {
      type: ButtonType.ACCOUNT_LINK,
      url,
    };
  }

  createAccountUnlinkButton(): AccountUnlinkButton {
    return {
      type: ButtonType.ACCOUNT_UNLINK,
    };
  }

  createGamePlayButton(
    title: string,
    payload?: string,
    gameMetadata?: {
      player_id?: string;
      context_id?: string;
    }
  ): GamePlayButton {
    if (title.length > 20) {
      throw new Error("Button title must be 20 characters or less.");
    }
    return {
      type: ButtonType.GAME_PLAY,
      title,
      payload,
      game_metadata: gameMetadata,
    };
  }

  createButtonTemplatePayload(
    text: string,
    buttons: Button[]
  ): ButtonTemplatePayload {
    if (!text || text.length === 0) {
      throw new Error("Text is required for button template message.");
    }
    if (text.length > 640) {
      throw new Error("Text must be 640 characters or less.");
    }
    if (buttons.length === 0) {
      throw new Error("At least one button is required.");
    }
    if (buttons.length > 3) {
      throw new Error("Maximum of 3 buttons allowed per button template.");
    }
    return {
      template_type: "button",
      text,
      buttons,
    };
  }
}
