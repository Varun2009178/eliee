import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { nextCookies } from "better-auth/next-js";

// Lazy initialization to prevent build-time errors
let authInstance: ReturnType<typeof betterAuth> | null = null;

function getAuth() {
  if (!authInstance) {
    authInstance = betterAuth({
      database: new Pool({
        connectionString: process.env.DATABASE_URL || "postgresql://placeholder",
        ssl: { rejectUnauthorized: false }, // Required for Supabase
      }),
      secret: process.env.BETTER_AUTH_SECRET || "placeholder-secret-for-build",
      emailAndPassword: {
        enabled: true,
        autoSignIn: true,
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day - update session every day
        cookieCache: {
          enabled: true,
          maxAge: 60 * 5, // 5 minutes
        },
      },
      plugins: [nextCookies()],
    });
  }
  return authInstance;
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(target, prop) {
    return getAuth()[prop as keyof ReturnType<typeof betterAuth>];
  }
});

export type Session = typeof auth.$Infer.Session;

