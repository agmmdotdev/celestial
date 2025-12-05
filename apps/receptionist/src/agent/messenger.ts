import { Agent } from "agents";
import { Effect } from "@celestial/effect";
import { Schema as S } from "effect";
import { MessagingService } from "../service/effect/facebook/messaging.service.js";

const MessengerAttachmentPayloadSchema = S.Struct({
  url: S.optional(S.String),
  attachment_id: S.optional(S.String),
  is_reusable: S.optional(S.Boolean),
  coordinates: S.optional(
    S.Struct({
      lat: S.Number,
      long: S.Number,
    })
  ),
  title: S.optional(S.String),
});

const MessengerAttachmentSchema = S.Struct({
  type: S.Union(
    S.Literal("audio"),
    S.Literal("file"),
    S.Literal("image"),
    S.Literal("location"),
    S.Literal("video"),
    S.Literal("fallback"),
    S.Literal("template")
  ),
  payload: S.optional(MessengerAttachmentPayloadSchema),
});

const MessengerReferralSchema = S.Struct({
  ref: S.optional(S.String),
  source: S.optional(S.String),
  type: S.optional(S.String),
});

const MessengerMessageSchema = S.Struct({
  mid: S.optional(S.String),
  text: S.optional(S.String),
  is_echo: S.optional(S.Boolean),
  metadata: S.optional(S.String),
  app_id: S.optional(S.Number),
  sticker_id: S.optional(S.Number),
  attachments: S.optional(S.Array(MessengerAttachmentSchema)),
  quick_reply: S.optional(S.Struct({ payload: S.String })),
  reply_to: S.optional(S.Struct({ mid: S.String })),
  referral: S.optional(MessengerReferralSchema),
});

const MessengerEventSchema = S.Struct({
  sender: S.Struct({ id: S.String }),
  recipient: S.Struct({ id: S.String }),
  timestamp: S.Number,
  message: S.optional(MessengerMessageSchema),
  postback: S.optional(
    S.Struct({
      payload: S.String,
      title: S.optional(S.String),
      mid: S.optional(S.String),
      referral: S.optional(MessengerReferralSchema),
    })
  ),
  reaction: S.optional(
    S.Struct({
      action: S.optional(S.String),
      emoji: S.optional(S.String),
      reaction: S.optional(S.String),
      mid: S.optional(S.String),
    })
  ),
  delivery: S.optional(
    S.Struct({
      mids: S.optional(S.Array(S.String)),
      watermark: S.Number,
      seq: S.optional(S.Number),
    })
  ),
  read: S.optional(
    S.Struct({
      watermark: S.Number,
      seq: S.optional(S.Number),
    })
  ),
  referral: S.optional(MessengerReferralSchema),
});

const MessengerAgentPayloadSchema = S.Struct({
  pageId: S.String,
  recipientId: S.String,
  event: MessengerEventSchema,
});

type MessengerEvent = S.Schema.Type<typeof MessengerEventSchema>;
type MessengerAgentPayload = S.Schema.Type<typeof MessengerAgentPayloadSchema>;

type MessengerAgentState = {
  readonly handledCount: number;
  readonly lastAck?: string;
};

class AgentError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "MessengerAgentError";
  }

  toResponse(): Response {
    return new Response(this.message, { status: this.status });
  }
}

const classifyEvent = (event: MessengerEvent): string => {
  const message = event.message;

  if (message) {
    if (message.attachments && message.attachments.length > 0) {
      const [firstAttachment] = message.attachments;
      switch (firstAttachment.type) {
        case "image":
          return "image";
        case "audio":
          return "audio";
        case "video":
          return "video";
        case "file":
          return "file";
        case "location":
          return "location";
        default:
          return `${firstAttachment.type} attachment`;
      }
    }

    if (message.sticker_id !== undefined) {
      return "sticker";
    }

    if (message.text) {
      return "message";
    }
  }

  if (event.postback) {
    return "postback";
  }

  if (event.reaction) {
    return "reaction";
  }

  if (event.read) {
    return "read";
  }

  if (event.delivery) {
    return "delivery";
  }

  return "unknown";
};

const acknowledgementFor = (event: MessengerEvent): string =>
  `i got ${classifyEvent(event)} type`;

const decodePayload = S.decodeUnknown(MessengerAgentPayloadSchema);

const parsePayload = (request: Request) =>
  Effect.tryPromise({
    try: () => request.json() as Promise<unknown>,
    catch: () => new AgentError(400, "Bad Request"),
  }).pipe(
    Effect.flatMap((raw) =>
      decodePayload(raw).pipe(
        Effect.mapError(
          (error) => new AgentError(400, `Invalid payload: ${error}`)
        )
      )
    )
  );

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export class MessengerAgent extends Agent<
  Record<string, unknown>,
  MessengerAgentState
> {
  initialState: MessengerAgentState = {
    handledCount: 0,
    lastAck: undefined,
  };

  async onRequest(request: Request): Promise<Response> {
    const self = this;
    const program: Effect.Effect<Response, AgentError, never> = Effect.gen(
      function* () {
        if (request.method !== "POST") {
          return new AgentError(405, "Method Not Allowed").toResponse();
        }

        const payload = yield* parsePayload(request);
        const acknowledgement = acknowledgementFor(payload.event);

        yield* sendAcknowledgement(
          payload.pageId,
          payload.recipientId,
          acknowledgement
        );
        yield* Effect.sync(() =>
          self.setState({
            handledCount: (self.state?.handledCount ?? 0) + 1,
            lastAck: acknowledgement,
          })
        );

        return jsonResponse({ status: "ok", acknowledgement });
      }
    );

    return Effect.runPromise(
      program.pipe(
        Effect.catchAll((error) => {
          if (error instanceof AgentError) {
            return Effect.succeed(error.toResponse());
          }
          return Effect.succeed(
            new Response("Internal Server Error", { status: 500 })
          );
        })
      )
    );
  }
}

const sendAcknowledgement = (
  pageId: string,
  recipientId: string,
  text: string
) =>
  Effect.gen(function* () {
    const messaging = yield* MessagingService;
    return yield* messaging.sendTextMessage(pageId, recipientId, text);
  }).pipe(
    Effect.provide(MessagingService.Default),
    Effect.catchAll(() =>
      Effect.fail(new AgentError(500, "Failed to dispatch acknowledgement"))
    )
  );
