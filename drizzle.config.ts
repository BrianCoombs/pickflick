/*
<ai_context>
Configures Drizzle for the app.
</ai_context>
*/

import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config({ path: ".env.local" })

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations use the direct (unpooled) Neon connection when available
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!
  }
})
