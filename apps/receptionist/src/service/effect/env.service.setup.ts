// Setup file for EnvService tests
// This runs before the test file is loaded, ensuring environment variables are set
// before the service module is imported

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
process.env.PORT = "3000";
process.env.COOKIE_SECRET = "test-cookie-secret-16chars";
process.env.SUPERADMIN_USERNAME = "admin";
process.env.SUPERADMIN_PASSWORD = "password";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.MESSENGER_VERIFY_TOKEN = "test-verify-token";
process.env.MESSENGER_APP_SECRET = "test-app-secret";
process.env.USER_ACCESS_TOKEN = "test-user-token";
process.env.CHAT_BOT_APP_ID = "test-app-id";
process.env.CHAT_BOT_APP_SECRET = "test-bot-secret";
process.env.CHAT_BOT_APP_ACCESS_TOKEN = "test-bot-token";
