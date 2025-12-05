import { Effect, Either, Layer, Schema as S } from "effect";
import { HttpApp, HttpRouter, HttpServerResponse } from "@effect/platform";
export { CheckoutWorkflow } from "./workflow/test";
import { env } from "cloudflare:workers";
import { WebSdk } from "@effect/opentelemetry";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { JsonConsoleSpanExporter } from "./telemetry/JsonConsoleSpanExporter";
import { getAgentByName, type AgentNamespace } from "agents";
import type { MessengerAgent } from "./agent/messenger.js";

const WebSdkLive = WebSdk.layer(() => ({
  resource: { serviceName: "medusa-effect-hono" },
  // Export span data to the console as structured JSON
  spanProcessor: new SimpleSpanProcessor(new JsonConsoleSpanExporter()),
}));
// Minimal bindings interface to keep env strongly typed without using any/unknown
interface Env {
  readonly MESSENGER_VERIFY_TOKEN?: string;
  readonly MessengerAgent?: AgentNamespace<MessengerAgent>;
}

const MessengerVerificationSchema = S.Struct({
  "hub.mode": S.Literal("subscribe"),
  "hub.challenge": S.String,
  "hub.verify_token": S.String,
});

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

const MessengerEntrySchema = S.Struct({
  id: S.String,
  time: S.optional(S.Number),
  messaging: S.Array(MessengerEventSchema),
});

const MessengerWebhookSchema = S.Struct({
  object: S.Literal("page"),
  entry: S.Array(MessengerEntrySchema),
});

const MessengerAgentPayloadSchema = S.Struct({
  pageId: S.String,
  recipientId: S.String,
  event: MessengerEventSchema,
});

const MessengerVerificationRequestSchema = S.Struct({
  searchParams: MessengerVerificationSchema,
});

const MessengerWebhookRequestSchema = S.Struct({
  body: MessengerWebhookSchema,
});

type MessengerEvent = S.Schema.Type<typeof MessengerEventSchema>;
type MessengerWebhookPayload = S.Schema.Type<typeof MessengerWebhookSchema>;
type MessengerAgentPayload = S.Schema.Type<typeof MessengerAgentPayloadSchema>;

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

const toAgentName = (pageId: string, senderId: string): string =>
  `page:${pageId}:user:${senderId}`;

const forwardToAgent = (
  agentNamespace: AgentNamespace<MessengerAgent>,
  pageId: string,
  event: MessengerEvent
) =>
  Effect.tryPromise({
    try: async () => {
      const agent = await getAgentByName(
        agentNamespace,
        toAgentName(pageId, event.sender.id)
      );
      const agentPayload: MessengerAgentPayload = {
        pageId,
        recipientId: event.sender.id,
        event,
      };
      const agentRequest = new Request("https://agent/messenger", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(agentPayload),
      });

      return agent.fetch(agentRequest);
    },
    catch: (error) => error as Error,
  });

// Define Effect Http routes
const router = HttpRouter.empty;

// Convert router to an HttpApp and then to a Web Fetch handler
class CloudflareWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudflareWorkflowError";
  }
}

const app = router.pipe(
  HttpRouter.get(
    "/webhooks/messenger",
    Effect.gen(function* () {
      const request = yield* HttpRouter.schemaJson(
        MessengerVerificationRequestSchema
      );
      const params = request.searchParams;
      const verifyToken =
        (env as { MESSENGER_VERIFY_TOKEN?: string }).MESSENGER_VERIFY_TOKEN ??
        "dev-verify-token";

      if (params["hub.verify_token"] !== verifyToken) {
        return HttpServerResponse.text("Forbidden", { status: 403 });
      }

      return yield* HttpServerResponse.text(params["hub.challenge"]).pipe(
        Effect.withSpan("verify.messenger")
      );
    }).pipe(Effect.withSpan("GET /webhooks/messenger"))
  ),
  HttpRouter.post(
    "/webhooks/messenger",
    Effect.gen(function* () {
      const request = yield* HttpRouter.schemaJson(
        MessengerWebhookRequestSchema
      );
      const payload: MessengerWebhookPayload = request.body;
      const agentNamespace = (env as Env).MessengerAgent;

      if (!agentNamespace) {
        yield* Effect.logError("MessengerAgent binding is missing on env");
        return yield* HttpServerResponse.json(
          { error: "Messenger agent not configured" },
          { status: 500 }
        );
      }

      const acknowledgements = payload.entry.flatMap((entry) =>
        entry.messaging.map(acknowledgementFor)
      );

      // Forward each event to the MessengerAgent so message sending lives in the agent
      yield* Effect.forEach(payload.entry, (entry) =>
        Effect.forEach(entry.messaging, (event) =>
          forwardToAgent(agentNamespace, entry.id ?? event.recipient.id, event)
        )
      );

      yield* Effect.log(
        `Messenger webhook received (${acknowledgements.length} events)`
      );
      yield* Effect.log(acknowledgements.join(", "));

      return yield* HttpServerResponse.json({
        status: "ok",
        acknowledgements,
      });
    }).pipe(Effect.withSpan("POST /webhooks/messenger"))
  ),
  HttpRouter.get(
    "/",
    HttpServerResponse.text("Hello World").pipe(Effect.withSpan("GET /"))
  ),
  HttpRouter.get(
    "/todo/:id",
    Effect.gen(function* () {
      const { id } = yield* HttpRouter.schemaPathParams(
        S.Struct({ id: S.NumberFromString })
      );
      return yield* HttpServerResponse.text(`Todo ${id}`);
    }).pipe(Effect.withSpan("GET /todo/:id"))
  ),
  HttpRouter.get(
    "/workflow",
    Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan({
        "workflow.name": "checkout-workflow",
      });
      yield* Effect.log("Creating workflow");
      if (Math.random() > 0.5) {
        return yield* Effect.fail(new Error("Error creating workflow"));
      }
      const workflow = yield* Effect.tryPromise(async () => {
        return env.CHECKOUT_WORKFLOW.create();
      }).pipe(
        Effect.map((workflow) => Either.right(`Workflow ${workflow.id}`)),
        Effect.tapError((e) =>
          Effect.logError(`Error creatingworkflow: ${e.toString()}`).pipe(
            Effect.withSpan("ERROR.GET./workflow")
          )
        ),
        Effect.catchAll((e) =>
          Effect.gen(function* () {
            yield* Effect.logError(
              `Error creating workflow: ${e.toString()}`
            ).pipe(Effect.withSpan("ERROR.GET./workflow"));
            return Either.left(new CloudflareWorkflowError(e.message));
          })
        )
      );
      return yield* Either.match(workflow, {
        onRight: (value) => HttpServerResponse.text(value),
        onLeft: (error) =>
          HttpServerResponse.json({ error: error.toString() }, { status: 500 }),
      });
    }).pipe(
      Effect.tapError((e) =>
        Effect.logError(`Error creating workflow: ${e.toString()}`).pipe(
          Effect.withSpan("ERROR.GET./workflow")
        )
      ),
      Effect.catchAll((e) => {
        return HttpServerResponse.json(
          { error: e.toString() },
          { status: 500 }
        );
      }),
      Effect.withSpan("GET /workflow")
    )
  ),
  HttpRouter.all("*", HttpServerResponse.empty({ status: 404 })),
  HttpRouter.catchAll((e) => {
    console.log(e);
    return HttpServerResponse.empty({ status: 400 });
  })
);

const { handler } = HttpApp.toWebHandlerLayer(app, WebSdkLive);

export default {
  async fetch(request: Request) {
    return await handler(request);
  },
};
