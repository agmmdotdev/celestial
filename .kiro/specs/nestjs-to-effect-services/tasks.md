# Implementation Plan

- [x] 1. Set up foundation and error types






  - Create error type definitions for configuration, validation, and Facebook API errors
  - Set up project structure for Effect services
  - Install required Effect packages (@effect/platform, @effect/platform-node)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Implement EnvService with Effect







  - [x] 2.1 Create EnvService as Effect.Service class


    - Define service with tag "app/EnvService"
    - Use Effect.try to parse environment variables with znv
    - Map parsing errors to ConfigError
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.4_

  
  - [x] 2.2 Implement environment configuration methods

    - Create methods returning Effect.succeed for each config value
    - Implement getDatabaseUrl, getPort, getCookieSecret
    - Implement getGeminiApiKey, getMessengerVerifyToken, getMessengerAppSecret
    - Implement getUserAccessToken, getChatBotAppId, getChatBotAppSecret, getChatBotAppAccessToken



    - _Requirements: 5.3, 7.2_
  
  - [x] 2.3 Write unit tests for EnvService

    - Test successful environment parsing
    - Test ConfigError on invalid environment variables
    - Test all getter methods return correct values
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Implement ButtonTemplateService with Effect





  - [x] 3.1 Create ButtonTemplateService as Effect.Service class


    - Define service with tag "app/ButtonTemplateService"
    - Provide default implementation with Effect.succeed
    - _Requirements: 1.1, 1.2, 1.3, 6.2_
  
  - [x] 3.2 Implement button creation methods with pattern matching


    - Implement createWebUrlButton with Match.value for validation
    - Implement createPostbackButton with Match.value for validation
    - Implement createPhoneNumberButton, createAccountLinkButton, createAccountUnlinkButton
    - Implement createGamePlayButton
    - Use ValidationError for title length validation
    - _Requirements: 3.5, 7.1, 7.4, 11.4_
  
  - [x] 3.3 Implement template payload creation


    - Implement createButtonTemplatePayload with button count validation
    - Use Match.value to validate 1-3 buttons requirement
    - Return plain values from Effect.gen (auto-wrapped)
    - _Requirements: 7.1, 7.4_
  
  - [x] 3.4 Write unit tests for ButtonTemplateService



    - Test successful button creation
    - Test ValidationError for invalid title lengths
    - Test ValidationError for invalid button counts
    - _Requirements: 8.1, 8.4_

- [x] 4. Implement QuickRepliesService with Effect




  - [x] 4.1 Create QuickRepliesService as Effect.Service class


    - Define service with tag "app/QuickRepliesService"
    - Provide default implementation with Effect.succeed
    - _Requirements: 1.1, 1.2, 1.3, 6.3_
  
  - [x] 4.2 Implement quick reply creation methods


    - Implement createTextQuickReply with Match.value for title/payload validation
    - Implement createUserPhoneNumberQuickReply
    - Implement createUserEmailQuickReply
    - Implement createTextQuickReplies for batch creation
    - _Requirements: 3.5, 7.1, 7.4, 11.4_
  
  - [x] 4.3 Implement quick reply message creation


    - Implement createQuickReplyMessage with Match.value for count validation
    - Implement helper methods (createYesNoQuickReplyMessage, createRatingQuickReplyMessage, etc.)
    - Validate maximum 13 quick replies
    - _Requirements: 7.1, 7.4_
  
  - [x] 4.4 Implement quick reply response processing


    - Implement isTextQuickReplyResponse, isPhoneNumberQuickReplyResponse, isEmailQuickReplyResponse
    - Implement extractPhoneNumber, extractEmail, getTextQuickReplyPayload
    - _Requirements: 7.2_
  



  - [ ] 4.5 Write unit tests for QuickRepliesService
    - QuickRepliesService has no dependencies, use `QuickRepliesService.Default` directly
    - Test quick reply creation with valid inputs
    - Test ValidationError for invalid title/payload lengths
    - Test ValidationError for exceeding 13 quick replies
    - Test response processing methods
    - _Requirements: 8.1, 8.4_

- [ ] 5. Implement CouponTemplateService with Effect
  - [ ] 5.1 Create CouponTemplateService as Effect.Service class
    - Define service with tag "app/CouponTemplateService"
    - Provide default implementation with Effect.succeed
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 5.2 Implement coupon template creation methods
    - Implement createBasicCouponTemplatePayload with validation
    - Implement createUrlCouponTemplatePayload
    - Implement createCompleteCouponTemplatePayload
    - Use Match.value for title, subtitle, and coupon code validation
    - _Requirements: 3.5, 7.1, 7.4, 11.4_
  
  - [ ] 5.3 Implement helper coupon methods
    - Implement createPercentageDiscountCoupon
    - Implement createFixedAmountDiscountCoupon
    - Implement createFreeShippingCoupon
    - _Requirements: 7.2_
  
  - [ ] 5.4 Write unit tests for CouponTemplateService
    - CouponTemplateService has no dependencies, use `CouponTemplateService.Default` directly
    - Test coupon creation with valid inputs
    - Test ValidationError for invalid title/subtitle/code
    - _Requirements: 8.1, 8.4_

- [ ] 6. Implement GenericTemplateService with Effect
  - [ ] 6.1 Create GenericTemplateService as Effect.Service class
    - Define service with tag "app/GenericTemplateService"
    - Provide default implementation with Effect.succeed
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 6.2 Implement generic template element creation
    - Implement createElement with validation
    - Implement createDefaultAction
    - Use Match.value for title and subtitle validation
    - _Requirements: 3.5, 7.1, 7.4, 11.4_
  
  - [ ] 6.3 Implement generic template payload creation
    - Implement createBasicGenericTemplatePayload
    - Implement createCarouselGenericTemplatePayload with element count validation
    - Implement createCompleteGenericTemplatePayload
    - _Requirements: 7.1, 7.4_
  
  - [ ] 6.4 Implement helper template methods
    - Implement createProductElement
    - Implement createLocationElement
    - Implement createArticleElement
    - _Requirements: 7.2_
  
  - [ ] 6.5 Write unit tests for GenericTemplateService
    - GenericTemplateService has no dependencies, use `GenericTemplateService.Default` directly
    - Test element and template creation
    - Test ValidationError for invalid inputs
    - _Requirements: 8.1, 8.4_

- [ ] 7. Implement ReceiptTemplateService with Effect
  - [ ] 7.1 Create ReceiptTemplateService as Effect.Service class
    - Define service with tag "app/ReceiptTemplateService"
    - Provide default implementation with Effect.succeed
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 7.2 Implement receipt template methods
    - Implement createElement for receipt items
    - Implement createAddress
    - Implement createSummary
    - Implement createAdjustment
    - Use validation for required fields
    - _Requirements: 3.5, 7.1, 7.4_
  
  - [ ] 7.3 Implement receipt template payload creation
    - Implement createReceiptTemplatePayload
    - Implement createReceiptTemplateAttachment
    - Validate required fields (recipient_name, order_number, currency, payment_method, summary)
    - _Requirements: 7.1, 7.4_
  
  - [ ] 7.4 Write unit tests for ReceiptTemplateService
    - ReceiptTemplateService has no dependencies, use `ReceiptTemplateService.Default` directly
    - Test receipt creation with valid inputs
    - Test ValidationError for missing required fields
    - _Requirements: 8.1, 8.4_

- [x] 8. Implement MessagingService with Effect and HttpClient






  - [x] 8.1 Create MessagingService as Effect.Service class


    - Define service with tag "app/MessagingService"
    - Inject dependencies (HttpClient, EnvService, and template services) via yield* in the effect implementation
    - Use Effect.gen for service implementation
    - Note: Do NOT use the dependencies array - provide dependencies via Layer.provide for better testability
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 6.1, 11.2_
  
  - [x] 8.2 Implement basic messaging methods with HttpClient


    - Implement sendTextMessage using HttpClient.HttpClient
    - Use HttpClientRequest.post with jsonBody
    - Use HttpClientResponse.json to parse response
    - Inject EnvService for access token
    - _Requirements: 2.3, 4.2, 4.3, 7.1, 9.1, 9.2, 11.2_
  
  - [x] 8.3 Implement template messaging methods


    - Implement sendButtonTemplateMessage with ButtonTemplateService dependency
    - Implement sendGenericTemplateMessage with GenericTemplateService dependency
    - Implement sendCouponTemplateMessage with CouponTemplateService dependency
    - Implement sendReceiptTemplateMessage with ReceiptTemplateService dependency
    - Use yield* to inject and call template services
    - _Requirements: 2.3, 6.1, 6.2, 7.1, 9.1_
  


  - [x] 8.4 Implement quick reply messaging methods

    - Implement sendQuickReplyMessage with QuickRepliesService dependency
    - Implement sendYesNoQuickReplyMessage
    - Implement sendMultipleChoiceQuickReplyMessage
    - Implement sendRatingQuickReplyMessage
    - Implement sendContactQuickReplyMessage


    - _Requirements: 2.3, 6.3, 7.1, 9.1_
  
  - [x] 8.5 Implement media and attachment messaging methods

    - Implement sendMediaMessage for image/video/audio/file
    - Implement sendMultipleImagesMessage


    - Implement sendMessageWithAttachmentId
    - Use HttpClient for all HTTP requests
    - _Requirements: 4.2, 4.3, 7.1, 11.2_
  
  - [x] 8.6 Implement carousel messaging methods


    - Implement sendCarouselGenericTemplateMessage
    - Implement sendProductCarouselMessage
    - Implement sendLocationCarouselMessage



    - Implement sendArticleCarouselMessage
    - _Requirements: 7.1, 9.1_
  
  - [x] 8.7 Implement tagged messaging

    - Implement sendTaggedMessage for messages outside 24-hour window
    - Implement isWithinStandardMessagingWindow helper
    - _Requirements: 7.2_
  
  - [x] 8.8 Write unit tests for MessagingService

    - Create mock HttpClient layer
    - Create mock EnvService layer
    - Test sendTextMessage with mocks
    - Test template messaging methods
    - Test error handling for HTTP failures
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
-

- [x] 9. Implement WebhookService with Effect and HttpClient



  - [x] 9.1 Create WebhookService as Effect.Service class


    - Define service with tag "app/WebhookService"
    - Inject dependencies (HttpClient and EnvService) via yield* in the effect implementation
    - Use Effect.gen for service implementation
    - Note: Do NOT use the dependencies array - provide dependencies via Layer.provide for better testability
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 11.2_
  
  - [x] 9.2 Implement webhook API methods

    - Implement getPageDetails using HttpClient.HttpClient
    - Implement subscribePageToWebhooks
    - Implement getSubscribedApps
    - Use HttpClientRequest.get and HttpClientRequest.post
    - Use HttpClientResponse.json for response parsing
    - _Requirements: 4.2, 4.3, 7.1, 11.2_
  
  - [x] 9.3 Write unit tests for WebhookService


    - Create mock HttpClient layer
    - Test getPageDetails with mock response
    - Test subscribePageToWebhooks
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 10. Implement FacebookOAuthService with Effect and HttpClient





  - [x] 10.1 Create FacebookOAuthService as Effect.Service class


    - Define service with tag "app/FacebookOAuthService"
    - Inject dependencies (HttpClient and EnvService) via yield* in the effect implementation
    - Use Effect.gen for service implementation
    - Note: Do NOT use the dependencies array - provide dependencies via Layer.provide for better testability
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 11.2_
  
  - [x] 10.2 Implement OAuth methods

    - Implement exchangeShortLivedToken using HttpClient
    - Implement refreshLongLivedToken
    - Parse Facebook error responses into FacebookApiError
    - _Requirements: 3.4, 4.2, 4.3, 7.1, 11.2_
  
  - [x] 10.3 Write unit tests for FacebookOAuthService


    - Test token exchange with mock HttpClient
    - Test error handling for Facebook API errors
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 11. Implement SenderActionService with Effect and HttpClient




  - [x] 11.1 Create SenderActionService as Effect.Service class


    - Define service with tag "app/SenderActionService"
    - Inject dependencies (HttpClient and EnvService) via yield* in the effect implementation
    - Note: Do NOT use the dependencies array - provide dependencies via Layer.provide for better testability
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 11.2_
  
  - [x] 11.2 Implement sender action methods

    - Implement sendTypingOn, sendTypingOff, sendMarkSeen
    - Use HttpClient for API requests
    - _Requirements: 4.2, 4.3, 7.1, 11.2_
  
  - [x] 11.3 Write unit tests for SenderActionService


    - Test sender actions with mock HttpClient
    - _Requirements: 8.1, 8.2_

- [x] 12. Implement ConversationApiService with Effect and HttpClient




  - [x] 12.1 Create ConversationApiService as Effect.Service class


    - Define service with tag "app/ConversationApiService"
    - Inject dependencies (HttpClient and EnvService) via yield* in the effect implementation
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 11.2_
  
  - [x] 12.2 Implement conversation API methods

    - Implement methods for conversation management
    - Use HttpClient for all HTTP requests
    - _Requirements: 4.2, 4.3, 7.1, 11.2_
  
  - [x] 12.3 Write unit tests for ConversationApiService


    - Use `ConversationApiService.DefaultWithoutDependencies.pipe(Layer.provide(...))` pattern
    - Test conversation methods with mock HttpClient
    - _Requirements: 8.1, 8.2_

- [x] 13. Migrate message event handlers to Effect




  - [x] 13.1 Update FacebookMessagesHandler to use Effect


    - Convert callback-based handlers to Effect-based handlers
    - Use Effect.gen for event processing
    - Keep handler registration API similar for backward compatibility
    - _Requirements: 1.5, 6.4, 9.1_
  
  - [x] 13.2 Update FacebookPostbacksHandler to use Effect


    - Convert postback handlers to Effect-based
    - Use Effect.gen for postback processing
    - _Requirements: 1.5, 6.4, 9.1_
  
  - [x] 13.3 Update FacebookEchoMessagesHandler to use Effect


    - Convert echo message handlers to Effect-based
    - Use Effect.gen for echo processing
    - _Requirements: 1.5, 6.4, 9.1_
  
  - [x] 13.4 Write unit tests for event handlers


    - Use `DefaultWithoutDependencies` pattern if handlers have dependencies
    - Test message handlers with mock events
    - Test postback handlers
    - Test echo message handlers
    - _Requirements: 8.1, 8.4_

- [ ] 14. Create application layers and wiring
  - [ ] 14.1 Create main application layer
    - Create AppLayer that composes all service layers
    - Use Layer.mergeAll to combine layers
    - Ensure proper dependency ordering
    - _Requirements: 2.5, 10.1, 10.2_
  
  - [ ] 14.2 Create test layer with mocks
    - Create TestLayer with mock implementations using `Service.DefaultWithoutDependencies`
    - Provide mock HttpClient, EnvService using `Layer.provide`
    - Document how to use `DefaultWithoutDependencies` pattern in tests
    - _Requirements: 8.1, 8.2, 8.3, 12.3_
  
  - [ ] 14.3 Document layer composition
    - Add JSDoc comments explaining layer wiring
    - Provide examples of how to provide layers
    - Document dependency graph
    - _Requirements: 12.1, 12.2, 12.4_

- [ ] 15. Update controllers to use Effect services
  - [ ] 15.1 Update webhook controller
    - Import Effect services
    - Build Effect programs in controller methods
    - Use Effect.runPromise at controller boundary only
    - Handle errors at boundary with try/catch
    - _Requirements: 9.3, 9.4, 10.4_
  
  - [ ] 15.2 Update messaging controller
    - Replace NestJS service calls with Effect service calls
    - Execute Effects only at controller methods
    - Map Effect errors to HTTP responses
    - _Requirements: 9.3, 9.4, 10.4_
  
  - [ ] 15.3 Document controller integration pattern
    - Add comments showing Effect execution at boundaries
    - Document error handling pattern
    - Show examples of Effect.runPromise usage
    - _Requirements: 9.4, 12.1, 12.5_

- [ ] 16. Remove NestJS service dependencies
  - [ ] 16.1 Remove @Injectable decorators from migrated services
    - Remove NestJS decorators
    - Remove constructor-based dependency injection
    - Verify all consumers use Effect services
    - _Requirements: 10.5_
  
  - [ ] 16.2 Remove NestJS HttpService dependency
    - Remove @nestjs/axios imports
    - Verify all HTTP calls use Effect's HttpClient
    - _Requirements: 10.5_
  
  - [ ] 16.3 Clean up old service files
    - Move old NestJS services to archive or delete
    - Update imports throughout codebase
    - _Requirements: 10.5_

- [ ] 17. Final documentation and examples
  - [ ] 17.1 Create comprehensive service usage examples
    - Create example file showing service composition
    - Show how to wire services with layers
    - Demonstrate error handling patterns
    - _Requirements: 12.2, 12.5_
  
  - [ ] 17.2 Update README with Effect service documentation
    - Document Effect service architecture
    - Explain layer-based dependency injection
    - Provide migration guide for future services
    - _Requirements: 12.1, 12.4_
  
  - [ ] 17.3 Document testing patterns
    - Create testing guide with examples
    - Show how to create mock layers using `DefaultWithoutDependencies`
    - Document the difference between `Service.Default` and `Service.DefaultWithoutDependencies`
    - Document test utilities
    - _Requirements: 8.3, 12.2_
