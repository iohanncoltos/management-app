import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  PROTON_SMTP_HOST: z.string().min(1),
  PROTON_SMTP_PORT: z.string().default("465"),
  PROTON_SMTP_USER: z.string().min(1),
  PROTON_SMTP_PASSWORD: z.string().min(1),
  PROTON_FROM_EMAIL: z.string().email(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_BASE_URL: z.string().url(),
  ONLYOFFICE_BASE_URL: z.string().url(),
  ONLYOFFICE_JWT_SECRET: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  APP_BASE_URL: z.string().url(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("Intermax Management App"),
  NEXT_PUBLIC_ENABLE_PASSKEYS: z.string().optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

function loadEnv() {
  const serverResult = serverSchema.safeParse(process.env);
  if (!serverResult.success) {
    const formatted = serverResult.error.issues
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`Invalid server environment configuration:\n${formatted}`);
  }

  const clientResult = clientSchema.safeParse(process.env);
  if (!clientResult.success) {
    const formatted = clientResult.error.issues
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`Invalid client environment configuration:\n${formatted}`);
  }

  return {
    server: serverResult.data,
    client: clientResult.data,
  } satisfies { server: ServerEnv; client: ClientEnv };
}

export const env = loadEnv();
