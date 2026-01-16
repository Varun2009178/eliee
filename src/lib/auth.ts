import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { nextCookies } from "better-auth/next-js";

// Get base URL for production
function getBaseURL() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

// Initialize auth instance
export const auth = betterAuth({
  trustedOrigins: [
    "http://localhost:3000",
    "https://eliee.vercel.app",
    "https://eliee.com",
    "https://eliee.sh",
    "https://www.eliee.sh"
  ],
  baseURL: getBaseURL(),
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

export type Session = typeof auth.$Infer.Session;

