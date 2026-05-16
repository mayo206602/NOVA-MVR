import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().default("nova_session"),
  APP_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  APP_URL: process.env.APP_URL,
});
