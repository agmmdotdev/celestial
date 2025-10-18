import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // Expected to be provided by the caller's environment
    url: process.env.DATABASE_URL as string,
  },
})
