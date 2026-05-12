import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// Prisma configuration for E-waste Management System
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
})
